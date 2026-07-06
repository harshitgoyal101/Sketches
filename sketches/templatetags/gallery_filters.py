from django import template

from sketches.services import gallery_filters
from sketches.services.embed_cache import embed_cache_version as sketch_embed_cache_version

register = template.Library()


@register.simple_tag(takes_context=True)
def gallery_filter_url(context, **kwargs):
    params = {
        "query": context.get("query", ""),
        "tag_slug": context.get("tag_slug", ""),
        "sketch_type": context.get("sketch_type", ""),
        "author_username": context.get("author_username", ""),
    }
    params.update(kwargs)
    return gallery_filters.build_filter_url(**params)


@register.filter
def embed_cache_version(sketch):
    if not sketch:
        return ""
    return sketch_embed_cache_version(sketch)
