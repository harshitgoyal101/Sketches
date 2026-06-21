from django.db.models import Q
from django.core.paginator import Paginator
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.clickjacking import xframe_options_sameorigin

from .models import Sketch, Tag
from .permissions import can_edit_sketch
from .services.embed_builder import build_embed_html
from .services.highlighter import get_highlight_css
from .services.sketch_context import build_sketch_detail_context

PUBLISHED = Sketch.Status.PUBLISHED
SITE_DESCRIPTION = (
    "Interactive p5.js and Processing sketches with live previews, "
    "source code, and markdown descriptions — sketches101."
)


def _published_sketches():
    return Sketch.objects.filter(status=PUBLISHED).prefetch_related(
        "tags", "author", "assets"
    )


def _home_featured_sketches():
    """Published sketches shown on the home page grid (excludes live background)."""
    return _published_sketches().filter(is_home_background=False)


def _gallery_sketches():
    """All published sketches for gallery list, tags, and search."""
    return _published_sketches()


def _get_sketch_file_content(sketch, filename):
    if filename == sketch.entry_filename:
        return sketch.code
    asset = sketch.assets.filter(filename=filename).first()
    if asset:
        return asset.content
    return None


def _apply_sketch_filters(queryset, request):
    query = request.GET.get("q", "").strip()
    tag_slug = request.GET.get("tag", "").strip()

    if tag_slug:
        queryset = queryset.filter(tags__slug=tag_slug)

    if query:
        queryset = queryset.filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(code__icontains=query)
            | Q(tags__name__icontains=query)
        ).distinct()

    return queryset, query, tag_slug


def _paginate_sketches(request, queryset, per_page=12):
    paginator = Paginator(queryset, per_page)
    page_obj = paginator.get_page(request.GET.get("page"))
    return page_obj


def _filter_tags():
    return Tag.objects.filter(sketches__status=PUBLISHED).distinct().order_by("name")


def _build_filter_context(request, page_obj, query="", tag_slug="", active_tag=None):
    params = request.GET.copy()
    if "page" in params:
        del params["page"]
    return {
        "page_obj": page_obj,
        "tags": _filter_tags(),
        "query": query,
        "tag_slug": tag_slug,
        "active_tag": active_tag,
        "filter_querystring": params.urlencode(),
    }


def home(request):
    sketches = _home_featured_sketches()[:6]
    background_sketch = Sketch.objects.filter(
        status=PUBLISHED,
        is_home_background=True,
    ).prefetch_related("assets").first()
    return render(
        request,
        "sketches/home.html",
        {
            "sketches": sketches,
            "background_sketch": background_sketch,
            "body_class": "home-page",
            "meta_description": SITE_DESCRIPTION,
        },
    )


def sketch_list(request):
    queryset, query, tag_slug = _apply_sketch_filters(_gallery_sketches(), request)
    page_obj = _paginate_sketches(request, queryset)
    active_tag = Tag.objects.filter(slug=tag_slug).first() if tag_slug else None
    context = _build_filter_context(request, page_obj, query, tag_slug, active_tag)
    return render(request, "sketches/sketch_list.html", context)


def tag_detail(request, slug):
    tag = get_object_or_404(Tag, slug=slug)
    queryset = _gallery_sketches().filter(tags=tag)
    queryset, query, _tag_slug = _apply_sketch_filters(queryset, request)
    page_obj = _paginate_sketches(request, queryset)
    context = _build_filter_context(request, page_obj, query, slug, tag)
    return render(request, "sketches/tag_detail.html", context)


def sketch_detail(request, slug):
    sketch = get_object_or_404(
        Sketch.objects.prefetch_related("tags", "author", "assets"),
        slug=slug,
    )
    if sketch.status != PUBLISHED:
        if not can_edit_sketch(request.user, sketch):
            raise Http404
    context = build_sketch_detail_context(sketch)
    context["can_edit"] = can_edit_sketch(request.user, sketch)
    return render(request, "sketches/sketch_detail.html", context)


def pygments_css(request):
    return HttpResponse(get_highlight_css(), content_type="text/css; charset=utf-8")


@xframe_options_sameorigin
def sketch_embed(request, slug):
    sketch = get_object_or_404(
        Sketch.objects.prefetch_related("assets"),
        slug=slug,
    )
    if sketch.status != PUBLISHED and not can_edit_sketch(request.user, sketch):
        raise Http404
    if not sketch.is_interactive:
        raise Http404("This sketch has no interactive preview.")
    fullscreen = sketch.is_home_background
    html = build_embed_html(sketch, fullscreen=fullscreen)
    return HttpResponse(html, content_type="text/html; charset=utf-8")

