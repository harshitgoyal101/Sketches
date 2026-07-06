import json
import uuid

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.http import require_POST

from .forms import SketchAssetFormSet, SketchEditForm
from .models import Sketch, SketchAsset
from .permissions import can_access_sketch_editor, can_edit_sketch
from .services.embed_builder import build_p5_embed_html, build_processing_embed_html
from .services.file_tree import build_file_tree
from .services.sketch_context import build_sketch_detail_context
from .services.sketch_starters import (
    get_default_filename,
    get_starter_code,
    get_starter_payload,
    normalize_sketch_type,
)

PUBLISHED = Sketch.Status.PUBLISHED
PREVIEW_CACHE_TIMEOUT = 120


def _preview_cache_key(request, preview_id):
    if request.user.is_authenticated:
        owner = str(request.user.pk)
    else:
        if not request.session.session_key:
            request.session.create()
        owner = f"anon:{request.session.session_key}"
    return f"sketch_preview:{owner}:{preview_id}"


@require_POST
def sketch_preview_cache(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    sketch_type = normalize_sketch_type(data.get("sketch_type"))
    main_code = data.get("main_code", "")
    assets = data.get("assets", [])
    mode = data.get("mode", "live")
    run_id = data.get("run_id")

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
    return JsonResponse({"url": reverse("sketch_preview_embed", kwargs={"preview_id": preview_id})})


@xframe_options_sameorigin
def sketch_preview_embed(request, preview_id):
    html = cache.get(_preview_cache_key(request, preview_id))
    if html is None:
        raise Http404
    return HttpResponse(html, content_type="text/html; charset=utf-8")


def _get_editable_sketch(request, slug):
    sketch = get_object_or_404(Sketch.objects.prefetch_related("tags", "assets"), slug=slug)
    if not can_edit_sketch(request.user, sketch):
        raise PermissionDenied
    return sketch


def _get_editor_sketch(request, slug):
    sketch = get_object_or_404(Sketch.objects.prefetch_related("tags", "assets"), slug=slug)
    if not can_access_sketch_editor(request.user, sketch):
        raise PermissionDenied
    return sketch


def _build_edit_file_tree(form, formset, sketch=None):
    """Build file tree for the edit/create form from bound or initial values."""
    if sketch and sketch.pk:
        return build_file_tree(sketch.get_source_files(), panel_mode="edit")

    entry = (form.initial.get("entry_filename") or "sketch.js").strip()
    return build_file_tree([{"filename": entry, "is_main": True}], panel_mode="edit")


@login_required
def sketch_create(request):
    is_admin = request.user.is_staff

    if request.method == "POST":
        form = SketchEditForm(request.POST, request.FILES, is_admin=is_admin, editor_mode=True)
        formset = SketchAssetFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            sketch = form.save(commit=False)
            sketch.author = request.user
            if not is_admin:
                sketch.status = Sketch.Status.DRAFT
            sketch.save()
            form.save_m2m()
            formset.instance = sketch
            formset.save()
            messages.success(request, f"“{sketch.title}” created.")
            return redirect("sketch_edit", slug=sketch.slug)
    else:
        sketch_type = normalize_sketch_type(request.GET.get("type"))
        form = SketchEditForm(
            is_admin=is_admin,
            editor_mode=True,
            initial={
                "sketch_type": sketch_type,
                "entry_filename": get_default_filename(sketch_type),
                "code": get_starter_code(sketch_type),
            },
        )
        formset = SketchAssetFormSet()

    return render(
        request,
        "sketches/sketch_edit.html",
        {
            "form": form,
            "formset": formset,
            "file_tree": _build_edit_file_tree(form, formset),
            "is_create": True,
            "is_admin": is_admin,
            "can_edit": True,
            "submit_label": "Create sketch",
            "sketch_starters": get_starter_payload(),
            "body_class": "edit-page",
        },
    )


def sketch_edit(request, slug):
    sketch = _get_editor_sketch(request, slug)
    can_save = can_edit_sketch(request.user, sketch)
    is_admin = request.user.is_authenticated and request.user.is_staff

    if request.method == "POST":
        if not can_save:
            raise PermissionDenied
        form = SketchEditForm(
            request.POST,
            request.FILES,
            instance=sketch,
            is_admin=is_admin,
            editor_mode=True,
        )
        formset = SketchAssetFormSet(request.POST, instance=sketch)
        if form.is_valid() and formset.is_valid():
            publishing = request.POST.get("action") == "publish"
            sketch = form.save(commit=False)
            if publishing:
                sketch.status = Sketch.Status.PUBLISHED
            sketch.save()
            form.save_m2m()
            formset.save()
            if publishing:
                messages.success(request, f"“{sketch.title}” published.")
                return redirect("sketch_detail", slug=sketch.slug)
            messages.success(request, f"“{sketch.title}” saved.")
            return redirect("sketch_edit", slug=sketch.slug)
    else:
        form = SketchEditForm(instance=sketch, is_admin=is_admin, editor_mode=True)
        formset = SketchAssetFormSet(instance=sketch)

    context = build_sketch_detail_context(sketch)
    context.update(
        {
            "form": form,
            "formset": formset,
            "file_tree": _build_edit_file_tree(form, formset, sketch=sketch),
            "is_create": False,
            "is_admin": is_admin,
            "can_edit": can_save,
            "submit_label": "Save changes",
            "body_class": "edit-page",
        }
    )
    return render(request, "sketches/sketch_edit.html", context)


@login_required
@require_POST
def sketch_publish(request, slug):
    sketch = _get_editable_sketch(request, slug)
    if sketch.status != Sketch.Status.PUBLISHED:
        sketch.status = Sketch.Status.PUBLISHED
        sketch.save()
        messages.success(request, f"“{sketch.title}” published.")
    return redirect("sketch_detail", slug=sketch.slug)


@login_required
@require_POST
def sketch_save_source(request, slug):
    sketch = _get_editable_sketch(request, slug)
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    files = payload.get("files")
    if not isinstance(files, list) or not files:
        return JsonResponse({"error": "No files provided"}, status=400)

    main_file = next((item for item in files if item.get("is_main")), None)
    if not main_file:
        return JsonResponse({"error": "Main file is required"}, status=400)

    sketch.code = main_file.get("content", "")
    sketch.save(update_fields=["code", "updated_at"])

    asset_files = [item for item in files if not item.get("is_main")]
    for index, item in enumerate(asset_files):
        asset_id = item.get("asset_id")
        if not asset_id:
            continue
        try:
            asset = sketch.assets.get(pk=asset_id)
        except SketchAsset.DoesNotExist:
            return JsonResponse(
                {"error": f"Unknown asset: {item.get('filename', asset_id)}"},
                status=400,
            )
        asset.content = item.get("content", "")
        asset.order = index
        asset.save(update_fields=["content", "order"])

    return JsonResponse({"ok": True})
