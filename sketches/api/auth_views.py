import hashlib
import json
import re

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.utils.text import slugify
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from sketches.forms import (
    ResendVerificationForm,
    SignUpForm,
    StyledAuthenticationForm,
    StyledPasswordResetForm,
    StyledSetPasswordForm,
)
from sketches.models import Game, GuestMigrationLog, Sketch, SketchAsset, UserProfile
from sketches.services.email_verification import send_verification_email
from sketches.services.game_scores import create_score_for_user, parse_played_at
from sketches.services.google_auth import GoogleAuthError, verify_google_id_token
from sketches.services.sketch_fork import fork_sketch_from_source
from sketches.services.sketch_starters import (
    get_default_filename,
    get_starter_code,
    normalize_sketch_type,
)

from .http import (
    client_ip,
    enforce_rate_limit,
    form_errors,
    json_response,
    parse_json_body,
    require_login,
)

User = get_user_model()

MIGRATE_DRAFT_CAP = 20
MIGRATE_SCORE_CAP = 50
MIGRATE_FORK_CAP = 10
MIGRATE_MAX_BODY_BYTES = 1_500_000
_SESSION_BACKEND = "django.contrib.auth.backends.ModelBackend"


def _get_or_create_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def serialize_user(user):
    profile = getattr(user, "profile", None)
    if profile is None:
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            profile = None
    display_name = (profile.display_name if profile else "") or ""
    return {
        "id": user.pk,
        "username": user.username,
        "email": user.email or "",
        "is_staff": user.is_staff,
        "display_name": display_name or user.username,
    }


def _unique_username(base: str) -> str:
    base = slugify(base) or "user"
    base = re.sub(r"[^a-zA-Z0-9_]+", "", base)[:30] or "user"
    candidate = base
    n = 2
    while User.objects.filter(username__iexact=candidate).exists():
        suffix = f"-{n}"
        candidate = f"{base[: max(1, 30 - len(suffix))]}{suffix}"
        n += 1
    return candidate


def _asset_type_for(filename: str, fallback: str = "js") -> str:
    lower = (filename or "").lower()
    if lower.endswith(".css"):
        return SketchAsset.AssetType.CSS
    if lower.endswith(".json"):
        return SketchAsset.AssetType.JSON
    if lower.endswith((".js", ".mjs", ".pde")):
        return SketchAsset.AssetType.JS
    allowed = {c.value for c in SketchAsset.AssetType}
    if fallback in allowed:
        return fallback
    return SketchAsset.AssetType.OTHER


def _create_draft_from_guest(user, draft: dict) -> Sketch:
    sketch_type = normalize_sketch_type(draft.get("sketch_type"))
    files = draft.get("files") if isinstance(draft.get("files"), list) else []
    main = next((f for f in files if f.get("is_main")), None)
    if main is None and files:
        main = files[0]
    title = (draft.get("title") or "Untitled sketch").strip()[:200] or "Untitled sketch"
    entry = (
        (draft.get("entry_filename") or "")
        or (main.get("filename") if isinstance(main, dict) else "")
        or get_default_filename(sketch_type)
    )
    entry = str(entry).strip()[:100] or get_default_filename(sketch_type)
    code = ""
    if isinstance(main, dict):
        code = main.get("content") or ""
    if code == "":
        code = get_starter_code(sketch_type)

    sketch = Sketch(
        author=user,
        title=title,
        sketch_type=sketch_type,
        entry_filename=entry,
        code=code,
        status=Sketch.Status.DRAFT,
    )
    sketch.save()

    order = 0
    for item in files:
        if not isinstance(item, dict) or item.get("is_main"):
            continue
        filename = str(item.get("filename") or "").strip()[:200]
        if not filename or filename == entry:
            continue
        SketchAsset.objects.create(
            sketch=sketch,
            filename=filename,
            content=item.get("content") or "",
            asset_type=_asset_type_for(
                filename, str(item.get("asset_type") or "js")
            ),
            order=order,
        )
        order += 1
    return sketch


@require_GET
@ensure_csrf_cookie
def api_csrf(request):
    return json_response({"ok": True})


@require_GET
@ensure_csrf_cookie
def api_me(request):
    if not request.user.is_authenticated:
        return json_response({"user": None})
    return json_response({"user": serialize_user(request.user)})


@require_POST
def api_login(request):
    if request.user.is_authenticated:
        return json_response({"ok": True, "user": serialize_user(request.user)})

    data = parse_json_body(request)
    form = StyledAuthenticationForm(
        request,
        data={
            "username": data.get("username", ""),
            "password": data.get("password", ""),
        },
    )
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    user = form.get_user()
    login(request, user)
    if data.get("remember"):
        request.session.set_expiry(60 * 60 * 24 * 30)
    else:
        request.session.set_expiry(0)
    return json_response({"ok": True, "user": serialize_user(user)})


@require_POST
def api_logout(request):
    logout(request)
    return json_response({"ok": True, "user": None})


@require_POST
def api_signup(request):
    if request.user.is_authenticated:
        return json_response(
            {"ok": False, "errors": {"__all__": ["Already signed in."]}},
            status=400,
        )

    data = parse_json_body(request)
    form = SignUpForm(
        data={
            "username": data.get("username", ""),
            "email": data.get("email", ""),
            "password1": data.get("password1", ""),
            "password2": data.get("password2", ""),
        }
    )
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    user = form.save()
    try:
        send_verification_email(request, user)
    except Exception:
        user.delete()
        return json_response(
            {
                "ok": False,
                "errors": {
                    "__all__": [
                        "We could not send the verification email. "
                        "Check your SMTP settings and try again."
                    ]
                },
            },
            status=502,
        )

    return json_response(
        {
            "ok": True,
            "verification_required": True,
            "email": user.email,
        },
        status=201,
    )


@require_POST
def api_password_reset(request):
    data = parse_json_body(request)
    form = StyledPasswordResetForm(data={"email": data.get("email", "")})
    if form.is_valid():
        form.save(
            request=request,
            use_https=request.is_secure(),
            from_email=None,
            email_template_name="registration/email/password_reset_email.txt",
            html_email_template_name="registration/email/password_reset_email.html",
            subject_template_name="registration/email/password_reset_subject.txt",
            extra_email_context={"site_name": settings.SITE_NAME},
        )
    # Always OK — avoid account enumeration
    return json_response({"ok": True})


@require_POST
def api_password_reset_confirm(request):
    data = parse_json_body(request)
    uidb64 = data.get("uid") or data.get("uidb64") or ""
    token = data.get("token") or ""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist, UnicodeDecodeError):
        return json_response(
            {"ok": False, "errors": {"__all__": ["Invalid or expired reset link."]}},
            status=400,
        )

    if not default_token_generator.check_token(user, token):
        return json_response(
            {"ok": False, "errors": {"__all__": ["Invalid or expired reset link."]}},
            status=400,
        )

    form = StyledSetPasswordForm(
        user,
        data={
            "new_password1": data.get("password1") or data.get("new_password1") or "",
            "new_password2": data.get("password2") or data.get("new_password2") or "",
        },
    )
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    form.save()
    login(request, user, backend=_SESSION_BACKEND)
    return json_response({"ok": True, "user": serialize_user(user)})


@require_POST
def api_resend_verification(request):
    data = parse_json_body(request)
    form = ResendVerificationForm(data={"email": data.get("email", "")})
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    email = form.cleaned_data["email"]
    user = User.objects.filter(email__iexact=email, is_active=False).first()
    if user:
        try:
            send_verification_email(request, user)
        except Exception:
            return json_response(
                {
                    "ok": False,
                    "errors": {"__all__": ["We could not send the email. Try again later."]},
                },
                status=502,
            )
    return json_response({"ok": True})


@require_POST
def api_google(request):
    """Exchange a Google Identity Services ID token for a Django session."""
    limited = enforce_rate_limit(
        f"google:{client_ip(request)}",
        limit=30,
        window_seconds=60,
    )
    if limited:
        return limited

    if request.user.is_authenticated:
        return json_response({"ok": True, "user": serialize_user(request.user)})

    data = parse_json_body(request)
    credential = data.get("credential") or ""
    try:
        claims = verify_google_id_token(credential)
    except GoogleAuthError as exc:
        return json_response(
            {"ok": False, "errors": {"__all__": [str(exc)]}},
            status=400,
        )

    email = (claims.get("email") or "").strip().lower()
    if not email:
        return json_response(
            {"ok": False, "errors": {"__all__": ["Google account has no email."]}},
            status=400,
        )

    user = User.objects.filter(email__iexact=email).first()
    created = False
    if user is None:
        base = (claims.get("given_name") or email.split("@", 1)[0] or "user")
        user = User(
            username=_unique_username(base),
            email=email,
            is_active=True,
        )
        user.set_unusable_password()
        user.save()
        created = True
    elif not user.is_active:
        return json_response(
            {
                "ok": False,
                "errors": {
                    "__all__": [
                        "This account is not active yet. Verify your email, "
                        "or use resend verification."
                    ]
                },
            },
            status=400,
        )

    profile = _get_or_create_profile(user)
    if not profile.display_name:
        name = (claims.get("name") or claims.get("given_name") or "").strip()[:80]
        if name:
            profile.display_name = name
            profile.save(update_fields=["display_name"])

    login(request, user, backend=_SESSION_BACKEND)
    request.session.set_expiry(60 * 60 * 24 * 30)
    return json_response(
        {"ok": True, "user": serialize_user(user), "created": created},
    )


@require_POST
def api_migrate_guest(request):
    """Import guest drafts/scores/forks into the authenticated account (idempotent)."""
    denied = require_login(request)
    if denied:
        return denied

    limited = enforce_rate_limit(
        f"migrate:{request.user.pk}",
        limit=10,
        window_seconds=3600,
    )
    if limited:
        return limited

    if len(request.body or b"") > MIGRATE_MAX_BODY_BYTES:
        return json_response(
            {
                "ok": False,
                "errors": {
                    "__all__": [
                        f"Payload too large (max {MIGRATE_MAX_BODY_BYTES} bytes)."
                    ]
                },
            },
            status=413,
        )

    data = parse_json_body(request)
    guest_id = str(data.get("guest_id") or "").strip()[:64]
    display_name = str(data.get("display_name") or "").strip()[:80]
    drafts = data.get("drafts") if isinstance(data.get("drafts"), list) else []
    scores = data.get("scores") if isinstance(data.get("scores"), list) else []
    pending_forks = (
        data.get("pending_forks")
        if isinstance(data.get("pending_forks"), list)
        else []
    )

    if not guest_id:
        return json_response(
            {"ok": False, "errors": {"guest_id": ["guest_id is required."]}},
            status=400,
        )

    existing = GuestMigrationLog.objects.filter(
        user=request.user, guest_id=guest_id
    ).first()
    if existing:
        result = existing.result if isinstance(existing.result, dict) else {}
        return json_response(
            {
                "ok": True,
                "idempotent": True,
                "sketches": result.get("sketches") or [],
                "forks": result.get("forks") or [],
                "scores_imported": result.get("scores_imported") or 0,
                "display_name": serialize_user(request.user).get("display_name"),
            }
        )

    payload_hash = hashlib.sha256(
        json.dumps(
            {
                "guest_id": guest_id,
                "drafts": drafts[:MIGRATE_DRAFT_CAP],
                "scores": scores[:MIGRATE_SCORE_CAP],
                "pending_forks": pending_forks[:MIGRATE_FORK_CAP],
            },
            sort_keys=True,
            default=str,
        ).encode("utf-8")
    ).hexdigest()

    with transaction.atomic():
        profile = _get_or_create_profile(request.user)
        if display_name and not profile.display_name:
            profile.display_name = display_name
            profile.save(update_fields=["display_name"])

        sketches_out = []
        for draft in drafts[:MIGRATE_DRAFT_CAP]:
            if not isinstance(draft, dict):
                continue
            client_id = str(draft.get("client_id") or "").strip()[:64]
            sketch = _create_draft_from_guest(request.user, draft)
            sketches_out.append({"client_id": client_id, "slug": sketch.slug})

        forks_out = []
        for item in pending_forks[:MIGRATE_FORK_CAP]:
            if not isinstance(item, dict):
                continue
            source_slug = str(item.get("source_slug") or "").strip()
            if not source_slug:
                continue
            source = (
                Sketch.objects.filter(
                    slug=source_slug, status=Sketch.Status.PUBLISHED
                )
                .prefetch_related("assets")
                .first()
            )
            if source is None:
                continue
            files = item.get("files") if isinstance(item.get("files"), list) else None
            main = None
            assets = None
            if files:
                main = next((f for f in files if f.get("is_main")), None)
                if main is None and files:
                    main = files[0]
                assets = [
                    {
                        "filename": f.get("filename"),
                        "content": f.get("content") or "",
                        "asset_type": f.get("asset_type") or "js",
                        "order": i,
                    }
                    for i, f in enumerate(files)
                    if isinstance(f, dict) and not f.get("is_main")
                ]
            fork = fork_sketch_from_source(
                source,
                author=request.user,
                code=(main.get("content") if isinstance(main, dict) else None),
                entry_filename=(
                    main.get("filename") if isinstance(main, dict) else None
                ),
                assets=assets,
                include_assets=True,
            )
            forks_out.append({"source_slug": source_slug, "slug": fork.slug})

        scores_imported = 0
        for item in scores[:MIGRATE_SCORE_CAP]:
            if not isinstance(item, dict):
                continue
            game_slug = str(item.get("game") or item.get("game_id") or "").strip()
            if not game_slug:
                continue
            game = Game.objects.filter(slug=game_slug, is_active=True).first()
            if game is None:
                continue
            try:
                score_val = int(item.get("score"))
            except (TypeError, ValueError):
                continue
            try:
                create_score_for_user(
                    request.user,
                    game,
                    score=score_val,
                    meta=item.get("meta") if isinstance(item.get("meta"), dict) else {},
                    played_at=parse_played_at(item.get("played_at")),
                    guest_id=guest_id,
                )
                scores_imported += 1
            except ValueError:
                continue

        result = {
            "sketches": sketches_out,
            "forks": forks_out,
            "scores_imported": scores_imported,
        }
        GuestMigrationLog.objects.create(
            user=request.user,
            guest_id=guest_id,
            payload_hash=payload_hash,
            result=result,
        )

    return json_response(
        {
            "ok": True,
            "idempotent": False,
            "sketches": sketches_out,
            "forks": forks_out,
            "scores_imported": scores_imported,
            "display_name": serialize_user(request.user).get("display_name"),
        }
    )
