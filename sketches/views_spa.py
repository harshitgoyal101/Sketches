from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.csrf import ensure_csrf_cookie


def _spa_dir() -> Path:
    return Path(getattr(settings, "SPA_DIR", settings.BASE_DIR / "sketches" / "static" / "spa"))


@ensure_csrf_cookie
@xframe_options_sameorigin
def spa_app(request, path=""):
    """
    Serve the Vite React build under /app/.

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
    return HttpResponse(
        index.read_text(encoding="utf-8"),
        content_type="text/html; charset=utf-8",
    )
