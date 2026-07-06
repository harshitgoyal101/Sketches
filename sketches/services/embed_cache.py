import hashlib

from django.conf import settings
from django.utils.http import http_date

from sketches.models import Sketch


def embed_content_fingerprint(sketch):
    """Stable hash of sketch source used for ETags and cache-busting query params."""
    hasher = hashlib.sha256()
    hasher.update(str(sketch.pk).encode())
    hasher.update(sketch.sketch_type.encode())
    hasher.update(sketch.entry_filename.encode())
    hasher.update(sketch.code.encode())
    for asset in sketch.assets.all():
        hasher.update(asset.filename.encode())
        hasher.update(asset.asset_type.encode())
        hasher.update(asset.content.encode())
    return hasher.hexdigest()[:32]


def embed_cache_version(sketch):
    return embed_content_fingerprint(sketch)[:12]


def embed_etag(sketch):
    return f'"{embed_content_fingerprint(sketch)}"'


def embed_last_modified(sketch):
    return sketch.updated_at


def apply_embed_cache_headers(response, sketch):
    if sketch.status != Sketch.Status.PUBLISHED:
        response["Cache-Control"] = "private, no-cache"
        return response

    if sketch.is_home_background:
        max_age = getattr(settings, "HOME_BACKGROUND_EMBED_MAX_AGE", 86400)
    else:
        max_age = getattr(settings, "PUBLISHED_EMBED_MAX_AGE", 300)

    response["Cache-Control"] = f"public, max-age={max_age}"
    response["ETag"] = embed_etag(sketch)
    if sketch.updated_at:
        response["Last-Modified"] = http_date(sketch.updated_at.timestamp())
    return response
