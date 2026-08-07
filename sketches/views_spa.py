import html
import re
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.csrf import ensure_csrf_cookie

from sketches.models import Sketch


def _spa_dir() -> Path:
    return Path(getattr(settings, "SPA_DIR", settings.BASE_DIR / "sketches" / "static" / "spa"))


def _inject_share_meta(index_html: str, request, path: str) -> str:
    """Inject title / description / OG tags for sketch and game SPA routes."""
    match = re.match(r"^(?:games|sketches)/([^/]+)/?$", (path or "").strip("/"))
    if not match:
        return index_html

    slug = match.group(1)
    sketch = (
        Sketch.objects.filter(slug=slug, status=Sketch.Status.PUBLISHED)
        .only("title", "description", "thumbnail", "is_game", "slug")
        .first()
    )
    if sketch is None:
        return index_html

    is_game_path = path.startswith("games/")
    title = html.escape(
        f"{sketch.title} · {'Play' if is_game_path or sketch.is_game else 'Sketch'} · Sketches101"
    )
    raw_desc = (sketch.description or "").strip() or (
        f"Play {sketch.title} on Sketches101."
        if sketch.is_game or is_game_path
        else f"View {sketch.title} on Sketches101."
    )
    description = html.escape(raw_desc[:160])
    page_url = html.escape(request.build_absolute_uri(request.path))
    image = ""
    if sketch.thumbnail:
        image = html.escape(request.build_absolute_uri(sketch.thumbnail.url))

    meta_bits = [
        f"<title>{title}</title>",
        f'<meta name="description" content="{description}" />',
        f'<meta property="og:type" content="website" />',
        f'<meta property="og:title" content="{title}" />',
        f'<meta property="og:description" content="{description}" />',
        f'<meta property="og:url" content="{page_url}" />',
    ]
    if image:
        meta_bits.append(f'<meta property="og:image" content="{image}" />')
    injection = "\n    ".join(meta_bits)

    # Replace default title + description from the built index when present.
    updated = re.sub(
        r"<title>[^<]*</title>",
        f"<title>{title}</title>",
        index_html,
        count=1,
    )
    if '<meta name="description"' in updated:
        updated = re.sub(
            r'<meta\s+name="description"\s+content="[^"]*"\s*/?>',
            f'<meta name="description" content="{description}" />',
            updated,
            count=1,
        )
    else:
        updated = updated.replace("</head>", f"    {injection}\n  </head>", 1)

    if 'property="og:title"' not in updated:
        updated = updated.replace("</head>", f"    {injection}\n  </head>", 1)

    return updated


@ensure_csrf_cookie
@xframe_options_sameorigin
def spa_app(request, path=""):
    """
    Serve the Vite React build under / (or /app/).

    Existing files (JS/CSS/assets) are returned directly; everything else
    falls back to index.html for client-side routing.
    """
    spa_dir = _spa_dir().resolve()
    if not spa_dir.is_dir():
        return HttpResponse(
            "React SPA is not built yet. Run: npm run build:frontend",
            status=503,
            content_type="text/plain; charset=utf-8",
        )

    if path:
        candidate = (spa_dir / path).resolve()
        try:
            candidate.relative_to(spa_dir)
        except ValueError as exc:
            raise Http404 from exc
        if candidate.is_file():
            return FileResponse(candidate.open("rb"))

    index = spa_dir / "index.html"
    if not index.is_file():
        return HttpResponse(
            "React SPA index.html missing. Run: npm run build:frontend",
            status=503,
            content_type="text/plain; charset=utf-8",
        )
    html_text = index.read_text(encoding="utf-8")
    html_text = _inject_share_meta(html_text, request, path or "")
    return HttpResponse(
        html_text,
        content_type="text/html; charset=utf-8",
    )
