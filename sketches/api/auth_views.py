from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from sketches.forms import (
    ResendVerificationForm,
    SignUpForm,
    StyledAuthenticationForm,
    StyledPasswordResetForm,
    StyledSetPasswordForm,
)
from sketches.services.email_verification import send_verification_email

from .http import form_errors, json_response, parse_json_body

User = get_user_model()


def serialize_user(user):
    return {
        "id": user.pk,
        "username": user.username,
        "email": user.email or "",
        "is_staff": user.is_staff,
    }


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
    login(request, user)
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
