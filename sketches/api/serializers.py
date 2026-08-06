from django.urls import reverse

from sketches.services.embed_cache import embed_cache_version
from sketches.services.markdown import render_markdown


def _absolute_url(request, path):
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if request is None:
        return path
    return request.build_absolute_uri(path)


def _cache_busted_url(url, sketch):
    """Append updated_at so browsers do not keep stale thumbnail/app-icon bytes."""
    if not url or not sketch:
        return url
    updated = getattr(sketch, "updated_at", None)
    if not updated:
        return url
    version = int(updated.timestamp())
    join = "&" if "?" in url else "?"
    return f"{url}{join}v={version}"


def serialize_author(user):
    if user is None:
        return None
    return {"username": user.username}


def serialize_tag(tag):
    return {"name": tag.name, "slug": tag.slug}


def serialize_format(fmt):
    return {
        "name": fmt.name,
        "slug": fmt.slug,
        "sort_order": getattr(fmt, "sort_order", 0),
    }


def serialize_sketch_card(sketch, request=None):
    fork_count = getattr(sketch, "fork_count", None)
    if fork_count is None:
        fork_count = 0

    thumbnail = ""
    if sketch.thumbnail:
        thumbnail = _cache_busted_url(
            _absolute_url(request, sketch.thumbnail.url), sketch
        )

    card_url = sketch.thumbnail_card_url or (sketch.thumbnail.url if sketch.thumbnail else "")
    if card_url:
        card_url = _cache_busted_url(_absolute_url(request, card_url), sketch)

    app_icon = ""
    if sketch.app_icon:
        app_icon = _cache_busted_url(
            _absolute_url(request, sketch.app_icon.url), sketch
        )

    srcset = sketch.thumbnail_srcset
    if srcset and request is not None:
        # Rebuild srcset with absolute URLs when possible
        parts = []
        for part in srcset.split(","):
            part = part.strip()
            if not part:
                continue
            url, _, descriptor = part.partition(" ")
            abs_url = _cache_busted_url(_absolute_url(request, url), sketch)
            parts.append(f"{abs_url} {descriptor}".strip())
        srcset = ", ".join(parts)
    elif srcset:
        parts = []
        for part in srcset.split(","):
            part = part.strip()
            if not part:
                continue
            url, _, descriptor = part.partition(" ")
            parts.append(f"{_cache_busted_url(url, sketch)} {descriptor}".strip())
        srcset = ", ".join(parts)

    return {
        "id": sketch.pk,
        "title": sketch.title,
        "slug": sketch.slug,
        "sketch_type": sketch.sketch_type,
        "sketch_type_label": sketch.get_sketch_type_display(),
        "description": sketch.description or "",
        "status": sketch.status,
        "author": serialize_author(sketch.author),
        "thumbnail": thumbnail or None,
        "thumbnail_card_url": card_url or None,
        "thumbnail_srcset": srcset or "",
        "app_icon": app_icon or None,
        "published_at": sketch.published_at.isoformat() if sketch.published_at else None,
        "updated_at": sketch.updated_at.isoformat() if sketch.updated_at else None,
        "fork_count": fork_count,
        "tags": [serialize_tag(tag) for tag in sketch.tags.all()],
        "description_html": render_markdown(sketch.description or ""),
        "is_game": bool(getattr(sketch, "is_game", False)),
    }


def serialize_source_file(file_info):
    return {
        "filename": file_info["filename"],
        "content": file_info["content"],
        "language": file_info["language"],
        "is_main": file_info["is_main"],
        "asset_type": file_info["asset_type"],
        "asset_id": file_info["asset_id"],
    }


def serialize_background_sketch(sketch, request=None):
    if sketch is None:
        return None
    path = reverse("sketch_embed", kwargs={"slug": sketch.slug})
    version = embed_cache_version(sketch)
    embed = f"{path}?v={version}"
    return {
        "slug": sketch.slug,
        "title": sketch.title,
        "embed_url": _absolute_url(request, embed),
    }


def serialize_sketch_detail(
    sketch,
    request,
    *,
    can_edit=False,
    can_fork=False,
    include_source=True,
):
    data = serialize_sketch_card(sketch, request)
    data.update(
        {
            "entry_filename": sketch.entry_filename,
            "embed_url": _absolute_url(
                request, reverse("sketch_embed", kwargs={"slug": sketch.slug})
            ),
            "can_edit": can_edit,
            "can_fork": can_fork,
            "forked_from": None,
        }
    )
    if sketch.forked_from_id:
        source = sketch.forked_from
        data["forked_from"] = {
            "slug": source.slug,
            "title": source.title,
            "author": serialize_author(source.author),
        }
    if include_source:
        data["code"] = sketch.code
        data["assets"] = [
            {
                "filename": asset.filename,
                "asset_type": asset.asset_type,
                "asset_id": asset.pk,
                "order": asset.order,
            }
            for asset in sketch.assets.all()
        ]
        data["files"] = [
            serialize_source_file(item) for item in sketch.get_source_files()
        ]
    else:
        data["code"] = ""
        data["assets"] = []
        data["files"] = []
    return data


def serialize_home(request, featured, stats, *, background_dark=None, background_light=None):
    return {
        "featured": [serialize_sketch_card(s, request) for s in featured],
        "stats": stats,
        "background": {
            "dark": serialize_background_sketch(background_dark, request),
            "light": serialize_background_sketch(background_light, request),
        },
    }
