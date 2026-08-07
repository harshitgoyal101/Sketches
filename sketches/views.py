from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.http import condition

from .models import Sketch, Tag
from .permissions import can_edit_sketch, can_fork_sketch
from .services.embed_builder import build_embed_html
from .services.embed_cache import (
    apply_embed_cache_headers,
    embed_content_fingerprint,
    embed_last_modified,
)
from .services.gallery_filters import (
    active_filter_count,
    active_sketch_formats,
    active_tags_for_params,
    apply_sketch_filters,
    filter_tag_categories,
    format_labels_for_slugs,
    published_authors,
    published_tags_queryset,
)
from .services.home_background import get_home_background_sketches
from .services.sketch_context import build_sketch_detail_context

PUBLISHED = Sketch.Status.PUBLISHED
THEME_COOKIE = "sketches101-theme"
SITE_DESCRIPTION = (
    "Interactive p5.js and Processing sketches with live previews, "
    "source code, and markdown descriptions — sketches101."
)


def _published_sketches():
    return (
        Sketch.objects.filter(status=PUBLISHED)
        .select_related("author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
    )


def _home_featured_sketches():
    """Published sketches shown on the home page grid (excludes live background)."""
    return _published_sketches().filter(is_home_background=False, is_game=False).exclude(
        Q(is_landing_ide=True) | Q(landing_ide_theme__in=["dark", "light"])
    )


def _landing_ide_sketch_for_theme(theme):
    sketch = (
        Sketch.objects.filter(status=PUBLISHED, landing_ide_theme=theme)
        .prefetch_related("assets")
        .first()
    )
    if sketch or theme != Sketch.HomeBackgroundTheme.DARK:
        return sketch
    return (
        Sketch.objects.filter(status=PUBLISHED, is_landing_ide=True, landing_ide_theme="")
        .prefetch_related("assets")
        .first()
    )


def _resolve_request_theme(request):
    query = request.GET.get("theme", "").strip().lower()
    if query in ("light", "dark"):
        return query
    cookie = request.COOKIES.get(THEME_COOKIE, "").strip().lower()
    if cookie in ("light", "dark"):
        return cookie
    return Sketch.HomeBackgroundTheme.DARK


def landing_ide_redirect(request):
    theme = _resolve_request_theme(request)
    sketch = _landing_ide_sketch_for_theme(theme)
    if not sketch:
        sketch = _landing_ide_sketch_for_theme(Sketch.HomeBackgroundTheme.DARK)
    if not sketch:
        return redirect("sketch_list")
    return redirect("sketch_edit", slug=sketch.slug)


def _gallery_sketches():
    """All published sketches for gallery list, tags, and search (excludes games)."""
    return _published_sketches().filter(is_game=False)


def _get_sketch_file_content(sketch, filename):
    if filename == sketch.entry_filename:
        return sketch.code
    asset = sketch.assets.filter(filename=filename).first()
    if asset:
        return asset.content
    return None


def _paginate_sketches(request, queryset, per_page=12):
    paginator = Paginator(queryset, per_page)
    page_obj = paginator.get_page(request.GET.get("page"))
    return page_obj


def _is_gallery_partial_request(request):
    return (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or request.GET.get("partial") == "1"
    )


def _build_filter_context(request, page_obj, filter_params, active_tag=None):
    params = request.GET.copy()
    if "page" in params:
        del params["page"]
    return {
        "page_obj": page_obj,
        "tags": published_tags_queryset(),
        "tag_groups": filter_tag_categories(),
        "gallery_authors": published_authors(),
        "sketch_formats": active_sketch_formats(),
        "query": filter_params["query"],
        "tag_slugs": filter_params["tag_slugs"],
        "active_tags": active_tags_for_params(filter_params),
        "sketch_types": filter_params["sketch_types"],
        "sketch_type_labels": format_labels_for_slugs(filter_params["sketch_types"]),
        "author_usernames": filter_params["author_usernames"],
        "gallery_sort": filter_params.get("sort", "featured"),
        "active_filter_count": active_filter_count(filter_params),
        "filter_querystring": params.urlencode(),
    }


def home(request):
    sketches = list(_home_featured_sketches()[:6])
    background_sketch_dark, background_sketch_light = get_home_background_sketches()
    published = Sketch.objects.filter(status=PUBLISHED)
    return render(
        request,
        "sketches/home.html",
        {
            "sketches": sketches,
            "featured_sketches": sketches[:3],
            "background_sketch_dark": background_sketch_dark,
            "background_sketch_light": background_sketch_light,
            "background_sketch": background_sketch_dark or background_sketch_light,
            "landing_ide_sketch_dark": _landing_ide_sketch_for_theme(
                Sketch.HomeBackgroundTheme.DARK
            ),
            "landing_ide_sketch_light": _landing_ide_sketch_for_theme(
                Sketch.HomeBackgroundTheme.LIGHT
            ),
            "meta_description": SITE_DESCRIPTION,
            "stats_sketch_count": published.count(),
            "stats_artist_count": published.exclude(author=None)
            .values("author")
            .distinct()
            .count(),
            "stats_format_count": published.values("sketch_type").distinct().count(),
        },
    )


def sketch_list(request):
    queryset, filter_params = apply_sketch_filters(_gallery_sketches(), request)
    page_obj = _paginate_sketches(request, queryset)
    context = _build_filter_context(request, page_obj, filter_params)
    sort = filter_params.get("sort", "featured")
    context["gallery_show_featured"] = (
        page_obj.number == 1
        and active_filter_count(filter_params) == 0
        and sort == "featured"
    )
    if _is_gallery_partial_request(request):
        return render(request, "sketches/partials/gallery_load_more_fragment.html", context)
    return render(request, "sketches/sketch_list.html", context)


def tag_detail(request, slug):
    tag = get_object_or_404(Tag, slug=slug, is_active=True)
    queryset = _gallery_sketches().filter(tags=tag)
    queryset, filter_params = apply_sketch_filters(queryset, request, active_tag=tag)
    page_obj = _paginate_sketches(request, queryset)
    context = _build_filter_context(request, page_obj, filter_params, tag)
    context["active_tag"] = tag
    context["gallery_show_featured"] = False
    if _is_gallery_partial_request(request):
        return render(request, "sketches/partials/gallery_load_more_fragment.html", context)
    return render(request, "sketches/tag_detail.html", context)


def sketch_detail(request, slug):
    sketch = get_object_or_404(
        Sketch.objects.select_related("forked_from", "forked_from__author", "fork_by").prefetch_related(
            "tags", "author", "assets"
        ),
        slug=slug,
    )
    if sketch.status != PUBLISHED:
        if not can_edit_sketch(request.user, sketch):
            raise Http404
    context = build_sketch_detail_context(sketch)
    context["can_edit"] = can_edit_sketch(request.user, sketch)
    context["can_fork"] = can_fork_sketch(request.user, sketch)
    first_tag = sketch.tags.first()
    if first_tag:
        context["related_sketches"] = (
            _published_sketches()
            .filter(tags=first_tag)
            .exclude(pk=sketch.pk)[:4]
        )
    else:
        context["related_sketches"] = _published_sketches().exclude(pk=sketch.pk)[:4]
    context["breadcrumb_tag"] = first_tag
    return render(request, "sketches/sketch_detail.html", context)


def pygments_css(request):
    return HttpResponse(get_highlight_css(), content_type="text/css; charset=utf-8")


def _embed_sketch_for_cache(slug):
    return Sketch.objects.prefetch_related("assets").filter(slug=slug).first()


def sketch_embed_etag(request, slug):
    sketch = _embed_sketch_for_cache(slug)
    if not sketch or sketch.status != PUBLISHED or not sketch.is_interactive:
        return None
    return embed_content_fingerprint(sketch)


def sketch_embed_last_modified(request, slug):
    sketch = _embed_sketch_for_cache(slug)
    if not sketch or sketch.status != PUBLISHED or not sketch.is_interactive:
        return None
    return embed_last_modified(sketch)


@xframe_options_sameorigin
@condition(etag_func=sketch_embed_etag, last_modified_func=sketch_embed_last_modified)
def sketch_embed(request, slug):
    sketch = get_object_or_404(
        Sketch.objects.prefetch_related("assets"),
        slug=slug,
    )
    if sketch.status != PUBLISHED and not can_edit_sketch(request.user, sketch):
        raise Http404
    if not sketch.is_interactive:
        raise Http404("This sketch has no interactive preview.")
    fullscreen = sketch.is_home_background or request.GET.get("fullscreen") in ("1", "true", "yes")
    html = build_embed_html(sketch, fullscreen=fullscreen)
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    return apply_embed_cache_headers(response, sketch)

