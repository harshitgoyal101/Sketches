from django import template
from django.db.models import Count

from sketches.models import Sketch
from sketches.services import gallery_filters
from sketches.services.embed_cache import embed_cache_version as sketch_embed_cache_version

register = template.Library()

PUBLISHED = Sketch.Status.PUBLISHED


@register.simple_tag(takes_context=True)
def gallery_filter_url(context, **kwargs):
    params = {
        "query": context.get("query", ""),
        "tag_slugs": context.get("tag_slugs", []),
        "sketch_types": context.get("sketch_types", []),
        "author_usernames": context.get("author_usernames", []),
        "sort": context.get("gallery_sort", "featured"),
    }
    params.update(kwargs)
    return gallery_filters.build_filter_url(**params)


@register.simple_tag
def published_format_counts():
    """Return list of {format, count} for sidebar tech filters."""
    counts = {
        row["sketch_type"]: row["c"]
        for row in Sketch.objects.filter(status=PUBLISHED)
        .values("sketch_type")
        .annotate(c=Count("id"))
    }
    result = []
    for fmt in gallery_filters.active_sketch_formats():
        result.append({"format": fmt, "count": counts.get(fmt.slug, 0)})
    return result


@register.filter
def embed_cache_version(sketch):
    if not sketch:
        return ""
    return sketch_embed_cache_version(sketch)
