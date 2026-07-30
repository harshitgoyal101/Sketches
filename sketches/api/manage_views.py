import uuid

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.http import QueryDict
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from sketches.forms import SketchDetailsForm, SketchEditForm, _clean_sketch_path
from sketches.models import Sketch, SketchAsset, Tag
from sketches.permissions import can_edit_sketch, can_fork_sketch
from sketches.services.embed_builder import build_p5_embed_html, build_processing_embed_html
from sketches.services.sketch_fork import fork_sketch_from_source
from sketches.services.sketch_publish import publish_sketch
from sketches.services.sketch_starters import (
    get_default_filename,
    get_starter_code,
    get_starter_payload,
    normalize_sketch_type,
)
from sketches.services.thumbnail_generator import (
    save_sketch_app_icon_bytes,
    save_sketch_thumbnail_bytes,
    schedule_sketch_thumbnail_generation,
)
from sketches.views_manage import PREVIEW_CACHE_TIMEOUT, _preview_cache_key

from .auth_views import serialize_user
from .http import form_errors, json_response, parse_json_body, require_login
from .serializers import serialize_sketch_card, serialize_sketch_detail, serialize_tag


def _editable_sketch(request, slug):
    sketch = get_object_or_404(
        Sketch.objects.select_related("author", "forked_from", "forked_from__author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks")),
        slug=slug,
    )
    if not can_edit_sketch(request.user, sketch):
        return None, json_response(
            {"ok": False, "error": "You do not have permission to edit this sketch."},
            status=403,
        )
    return sketch, None


def _querydict_from_mapping(data, *, list_fields=None):
    qd = QueryDict(mutable=True)
    list_fields = set(list_fields or [])
    for key, value in data.items():
        if key in list_fields:
            if value is None:
                qd.setlist(key, [])
            elif isinstance(value, (list, tuple)):
                qd.setlist(key, [str(item) for item in value])
            else:
                qd.setlist(key, [str(value)])
        elif value is None:
            continue
        else:
            qd[key] = str(value)
    return qd


@require_GET
def api_starters(request):
    return json_response({"starters": get_starter_payload()})


@require_GET
def api_manage_tags(request):
    denied = require_login(request)
    if denied:
        return denied
    tags = Tag.objects.filter(is_active=True).order_by("name")
    return json_response({"results": [serialize_tag(tag) for tag in tags]})


@require_http_methods(["GET", "POST"])
def api_account_sketches_collection(request):
    denied = require_login(request)
    if denied:
        return denied

    if request.method == "GET":
        sketches = (
            Sketch.objects.filter(author=request.user)
            .select_related("author")
            .prefetch_related("tags", "assets")
            .annotate(fork_count=Count("forks"))
            .order_by("-updated_at")
        )
        sketch_list = list(sketches)

        return json_response(
            {
                "user": serialize_user(request.user),
                "results": [serialize_sketch_card(s, request) for s in sketch_list],
                "published_count": sum(
                    1 for s in sketch_list if s.status == Sketch.Status.PUBLISHED
                ),
                "draft_count": sum(
                    1 for s in sketch_list if s.status == Sketch.Status.DRAFT
                ),
            }
        )

    # POST create
    is_admin = request.user.is_staff
    data = parse_json_body(request)
    sketch_type = normalize_sketch_type(data.get("sketch_type"))
    title = (data.get("title") or "").strip()
    entry_filename = (data.get("entry_filename") or "").strip()
    code = data.get("code")
    if code is None or code == "":
        code = get_starter_code(sketch_type)
    if not entry_filename:
        entry_filename = get_default_filename(sketch_type)

    form_data = _querydict_from_mapping(
        {
            "title": title,
            "sketch_type": sketch_type,
            "entry_filename": entry_filename,
            "code": code,
        }
    )
    form = SketchEditForm(form_data, is_admin=is_admin, editor_mode=True)
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    sketch = form.save(commit=False)
    sketch.author = request.user
    sketch.status = Sketch.Status.DRAFT
    sketch.save()
    form.save_m2m()
    sketch = (
        Sketch.objects.select_related("author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
        .get(pk=sketch.pk)
    )
    return json_response(
        {
            "ok": True,
            "sketch": serialize_sketch_detail(
                sketch,
                request,
                can_edit=True,
                can_fork=False,
            ),
        },
        status=201,
    )


@require_http_methods(["GET", "PATCH"])
def api_account_sketch_detail(request, slug):
    denied = require_login(request)
    if denied:
        return denied

    sketch, error = _editable_sketch(request, slug)
    if error:
        return error

    if request.method == "GET":
        return json_response(
            serialize_sketch_detail(
                sketch,
                request,
                can_edit=True,
                can_fork=can_fork_sketch(request.user, sketch),
            )
        )

    data = parse_json_body(request)
    payload = {
        "title": data.get("title", sketch.title),
        "entry_filename": data.get("entry_filename", sketch.entry_filename),
        "code": data.get("code", sketch.code),
    }
    form = SketchEditForm(
        _querydict_from_mapping(payload),
        instance=sketch,
        is_admin=request.user.is_staff,
        editor_mode=True,
        lock_sketch_type=True,
    )
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    sketch = form.save()
    sketch = (
        Sketch.objects.select_related("author", "forked_from", "forked_from__author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
        .get(pk=sketch.pk)
    )
    return json_response(
        {
            "ok": True,
            "sketch": serialize_sketch_detail(
                sketch,
                request,
                can_edit=True,
                can_fork=can_fork_sketch(request.user, sketch),
            ),
        }
    )


@require_http_methods(["GET", "PATCH"])
def api_account_sketch_settings(request, slug):
    denied = require_login(request)
    if denied:
        return denied

    sketch, error = _editable_sketch(request, slug)
    if error:
        return error

    is_admin = request.user.is_staff

    if request.method == "GET":
        return json_response(
            {
                "sketch": serialize_sketch_detail(
                    sketch,
                    request,
                    can_edit=True,
                    can_fork=can_fork_sketch(request.user, sketch),
                ),
                "is_admin": is_admin,
                "status_choices": [
                    {"value": value, "label": label}
                    for value, label in Sketch.Status.choices
                ]
                if is_admin
                else [],
            }
        )

    data = parse_json_body(request)
    mapping = {
        "title": data.get("title", sketch.title),
        "description": data.get("description", sketch.description),
    }
    if is_admin and "status" in data:
        mapping["status"] = data["status"]

    if "tags" in data:
        tag_slugs = data.get("tags") or []
        if not isinstance(tag_slugs, list):
            return json_response(
                {"ok": False, "errors": {"tags": ["Expected a list of tag slugs."]}},
                status=400,
            )
        tag_ids = list(
            Tag.objects.filter(slug__in=tag_slugs, is_active=True).values_list(
                "pk", flat=True
            )
        )
        mapping["tags"] = tag_ids
    else:
        mapping["tags"] = list(sketch.tags.values_list("pk", flat=True))

    form = SketchDetailsForm(
        _querydict_from_mapping(mapping, list_fields={"tags"}),
        instance=sketch,
        is_admin=is_admin,
    )
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    previous_status = sketch.status
    sketch = form.save()
    publishing = (
        is_admin
        and sketch.status == Sketch.Status.PUBLISHED
        and previous_status != Sketch.Status.PUBLISHED
    )
    if publishing or not sketch.thumbnail:
        schedule_sketch_thumbnail_generation(sketch)

    sketch = (
        Sketch.objects.select_related("author", "forked_from", "forked_from__author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
        .get(pk=sketch.pk)
    )
    return json_response(
        {
            "ok": True,
            "sketch": serialize_sketch_detail(
                sketch,
                request,
                can_edit=True,
                can_fork=can_fork_sketch(request.user, sketch),
            ),
        }
    )


@require_POST
def api_account_sketch_publish(request, slug):
    denied = require_login(request)
    if denied:
        return denied

    sketch, error = _editable_sketch(request, slug)
    if error:
        return error

    if sketch.status != Sketch.Status.PUBLISHED:
        publish_sketch(sketch)

    sketch.refresh_from_db()
    sketch = (
        Sketch.objects.select_related("author", "forked_from", "forked_from__author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
        .get(pk=sketch.pk)
    )
    return json_response(
        {
            "ok": True,
            "sketch": serialize_sketch_detail(
                sketch,
                request,
                can_edit=True,
                can_fork=can_fork_sketch(request.user, sketch),
            ),
        }
    )


@require_POST
def api_account_sketch_thumbnail(request, slug):
    denied = require_login(request)
    if denied:
        return denied

    sketch, error = _editable_sketch(request, slug)
    if error:
        return error

    upload = request.FILES.get("image")
    if not upload:
        return json_response({"ok": False, "error": "No image uploaded."}, status=400)
    if not (upload.content_type or "").startswith("image/"):
        return json_response({"ok": False, "error": "Invalid image type."}, status=400)
    if upload.size > 5 * 1024 * 1024:
        return json_response({"ok": False, "error": "Image is too large."}, status=400)

    saved = save_sketch_thumbnail_bytes(sketch, upload.read(), force=True)
    if not saved:
        return json_response(
            {"ok": False, "error": "Could not save thumbnail."},
            status=500,
        )

    sketch.refresh_from_db()
    url = sketch.thumbnail.url if sketch.thumbnail else None
    return json_response(
        {
            "ok": True,
            "url": url,
            "thumbnail": url,
            "thumbnail_card_url": sketch.thumbnail_card_url or url,
        }
    )


@require_POST
def api_account_sketch_app_icon(request, slug):
    denied = require_login(request)
    if denied:
        return denied

    sketch, error = _editable_sketch(request, slug)
    if error:
        return error

    upload = request.FILES.get("image")
    if not upload:
        return json_response({"ok": False, "error": "No image uploaded."}, status=400)
    if not (upload.content_type or "").startswith("image/"):
        return json_response({"ok": False, "error": "Invalid image type."}, status=400)
    if upload.size > 2 * 1024 * 1024:
        return json_response({"ok": False, "error": "Image is too large."}, status=400)

    try:
        saved = save_sketch_app_icon_bytes(sketch, upload.read(), force=True)
    except Exception:
        return json_response(
            {"ok": False, "error": "Could not process app icon."},
            status=500,
        )
    if not saved:
        return json_response(
            {"ok": False, "error": "Could not save app icon."},
            status=500,
        )

    sketch.refresh_from_db()
    url = sketch.app_icon.url if sketch.app_icon else None
    return json_response({"ok": True, "url": url, "app_icon": url})


def _infer_asset_type(filename):
    lower = (filename or "").lower()
    if lower.endswith(".css"):
        return SketchAsset.AssetType.CSS
    if lower.endswith(".json"):
        return SketchAsset.AssetType.JSON
    if lower.endswith((".js", ".mjs")):
        return SketchAsset.AssetType.JS
    return SketchAsset.AssetType.OTHER


def _reload_sketch(pk):
    return (
        Sketch.objects.select_related("author", "forked_from", "forked_from__author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
        .get(pk=pk)
    )


@require_POST
def api_preview(request):
    """Cache live-preview HTML and return an embed URL (p5 + Processing)."""
    data = parse_json_body(request)
    sketch_type = normalize_sketch_type(data.get("sketch_type"))
    main_code = data.get("main_code", "")
    assets = data.get("assets") or []
    mode = data.get("mode") or "live"
    run_id = data.get("run_id")

    if not isinstance(assets, list):
        return json_response({"ok": False, "error": "assets must be a list"}, status=400)

    if sketch_type == Sketch.SketchType.PROCESSING:
        html = build_processing_embed_html(
            main_code,
            assets=assets,
            mode=mode,
            run_id=run_id,
        )
    else:
        html = build_p5_embed_html(
            main_code,
            assets=assets,
            mode=mode,
            run_id=run_id,
        )

    preview_id = uuid.uuid4().hex
    cache.set(
        _preview_cache_key(request, preview_id),
        html,
        PREVIEW_CACHE_TIMEOUT,
    )
    return json_response(
        {"ok": True, "url": reverse("sketch_preview_embed", kwargs={"preview_id": preview_id})}
    )


@require_POST
def api_account_sketch_source(request, slug):
    """Save multi-file source: update main + assets, create new, delete removed."""
    denied = require_login(request)
    if denied:
        return denied

    sketch, error = _editable_sketch(request, slug)
    if error:
        return error

    data = parse_json_body(request)
    files = data.get("files")
    if not isinstance(files, list) or not files:
        return json_response({"ok": False, "error": "No files provided"}, status=400)

    main_file = next((item for item in files if item.get("is_main")), None)
    if not main_file:
        return json_response({"ok": False, "error": "Main file is required"}, status=400)

    try:
        if "entry_filename" in data and data["entry_filename"]:
            sketch.entry_filename = _clean_sketch_path(
                data["entry_filename"], field_label="Main file path"
            )
        elif main_file.get("filename"):
            sketch.entry_filename = _clean_sketch_path(
                main_file["filename"], field_label="Main file path"
            )
    except ValidationError as exc:
        return json_response(
            {"ok": False, "errors": {"entry_filename": list(exc.messages)}},
            status=400,
        )

    if "title" in data and data["title"] is not None:
        title = str(data["title"]).strip()
        if not title:
            return json_response(
                {"ok": False, "errors": {"title": ["Title is required."]}},
                status=400,
            )
        sketch.title = title

    sketch.code = main_file.get("content", "")
    sketch.save()

    deleted_ids = data.get("deleted_asset_ids") or []
    if not isinstance(deleted_ids, list):
        return json_response(
            {"ok": False, "error": "deleted_asset_ids must be a list"},
            status=400,
        )
    if deleted_ids:
        sketch.assets.filter(pk__in=deleted_ids).delete()

    asset_files = [item for item in files if not item.get("is_main")]
    seen_names = {sketch.entry_filename}
    for index, item in enumerate(asset_files):
        try:
            filename = _clean_sketch_path(
                item.get("filename"), field_label="Filename"
            )
        except ValidationError as exc:
            return json_response(
                {"ok": False, "errors": {"files": list(exc.messages)}},
                status=400,
            )
        if filename in seen_names:
            return json_response(
                {
                    "ok": False,
                    "error": f"Duplicate filename: {filename}",
                },
                status=400,
            )
        seen_names.add(filename)

        asset_type = item.get("asset_type") or _infer_asset_type(filename)
        if asset_type not in SketchAsset.AssetType.values:
            asset_type = _infer_asset_type(filename)

        asset_id = item.get("asset_id")
        content = item.get("content", "")
        if asset_id:
            try:
                asset = sketch.assets.get(pk=asset_id)
            except SketchAsset.DoesNotExist:
                return json_response(
                    {"ok": False, "error": f"Unknown asset: {filename}"},
                    status=400,
                )
            asset.filename = filename
            asset.content = content
            asset.asset_type = asset_type
            asset.order = index
            asset.save(
                update_fields=["filename", "content", "asset_type", "order"]
            )
        else:
            SketchAsset.objects.create(
                sketch=sketch,
                filename=filename,
                content=content,
                asset_type=asset_type,
                order=index,
            )

    sketch = _reload_sketch(sketch.pk)
    return json_response(
        {
            "ok": True,
            "sketch": serialize_sketch_detail(
                sketch,
                request,
                can_edit=True,
                can_fork=can_fork_sketch(request.user, sketch),
            ),
        }
    )


@require_POST
def api_fork_sketch(request, slug):
    denied = require_login(request)
    if denied:
        return denied

    source = get_object_or_404(
        Sketch.objects.select_related("author").prefetch_related("assets"),
        slug=slug,
    )
    if not can_fork_sketch(request.user, source):
        return json_response(
            {"ok": False, "error": "You cannot fork this sketch."},
            status=403,
        )

    fork = fork_sketch_from_source(source, author=request.user)
    fork = _reload_sketch(fork.pk)
    return json_response(
        {
            "ok": True,
            "sketch": serialize_sketch_detail(
                fork,
                request,
                can_edit=True,
                can_fork=False,
            ),
        },
        status=201,
    )
