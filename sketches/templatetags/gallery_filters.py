from django import template

from sketches.services import gallery_filters
from sketches.services.embed_cache import embed_cache_version as sketch_embed_cache_version

register = template.Library()


@register.simple_tag(takes_context=True)
def gallery_filter_url(context, **kwargs):
    params = {
        "query": context.get("query", ""),
        "tag_slugs": context.get("tag_slugs", []),
        "sketch_types": context.get("sketch_types", []),
        "author_usernames": context.get("author_usernames", []),
    }
    params.update(kwargs)
    return gallery_filters.build_filter_url(**params)


@register.filter
def embed_cache_version(sketch):
    if not sketch:
        return ""
    return sketch_embed_cache_version(sketch)
