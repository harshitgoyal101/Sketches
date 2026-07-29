from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from sketches.models import Sketch
from sketches.permissions import can_edit_sketch, can_fork_sketch
from sketches.services.gallery_filters import (
    active_sketch_formats,
    apply_sketch_filters,
    published_tags_queryset,
)
from sketches.services.home_background import get_home_background_sketches

from .serializers import (
    serialize_format,
    serialize_home,
    serialize_sketch_card,
    serialize_sketch_detail,
    serialize_tag,
)

PUBLISHED = Sketch.Status.PUBLISHED


def _published_sketches():
    return (
        Sketch.objects.filter(status=PUBLISHED)
        .select_related("author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
    )


def _home_featured_sketches():
    return _published_sketches().filter(is_home_background=False).exclude(
        Q(is_landing_ide=True) | Q(landing_ide_theme__in=["dark", "light"])
    )


def _json(data, *, status=200):
    return JsonResponse(data, status=status, json_dumps_params={"ensure_ascii": False})


@require_GET
def api_home(request):
    featured = list(_home_featured_sketches()[:6])
    published = Sketch.objects.filter(status=PUBLISHED)
    stats = {
        "sketch_count": published.count(),
        "artist_count": published.exclude(author=None)
        .values("author")
        .distinct()
        .count(),
        "format_count": published.values("sketch_type").distinct().count(),
    }
    background_dark, background_light = get_home_background_sketches()
    return _json(
        serialize_home(
            request,
            featured,
            stats,
            background_dark=background_dark,
            background_light=background_light,
        )
    )


@require_GET
def api_sketch_list(request):
    queryset, filter_params = apply_sketch_filters(_published_sketches(), request)
    paginator = Paginator(queryset, 12)
    page_obj = paginator.get_page(request.GET.get("page"))
    return _json(
        {
            "results": [serialize_sketch_card(s, request) for s in page_obj.object_list],
            "page": page_obj.number,
            "page_size": paginator.per_page,
            "total": paginator.count,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "filters": {
                "q": filter_params["query"],
                "tag": filter_params["tag_slugs"],
                "type": filter_params["sketch_types"],
                "author": filter_params["author_usernames"],
                "sort": filter_params["sort"],
            },
        }
    )


@require_GET
def api_sketch_detail(request, slug):
    sketch = get_object_or_404(
        Sketch.objects.select_related(
            "author", "forked_from", "forked_from__author"
        )
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks")),
        slug=slug,
    )
    if sketch.status != PUBLISHED and not can_edit_sketch(request.user, sketch):
        raise Http404
    return _json(
        serialize_sketch_detail(
            sketch,
            request,
            can_edit=can_edit_sketch(request.user, sketch),
            can_fork=can_fork_sketch(request.user, sketch),
        )
    )


@require_GET
def api_formats(request):
    formats = active_sketch_formats()
    return _json({"results": [serialize_format(fmt) for fmt in formats]})


@require_GET
def api_tags(request):
    tags = published_tags_queryset()
    return _json({"results": [serialize_tag(tag) for tag in tags]})
