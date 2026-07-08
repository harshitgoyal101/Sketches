import base64
import logging
import threading
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.contrib.staticfiles import finders
from django.core.files.base import ContentFile
from django.db import close_old_connections
from PIL import Image

from .embed_builder import build_embed_html

logger = logging.getLogger(__name__)

CAPTURE_READY_SCRIPT = """
<script>
(function () {
  var started = Date.now();
  var maxWait = 20000;
  var settleFrames = 0;
  var requiredFrames = 45;
  var selectors = [
    "#sketch-canvas-host canvas",
    ".p5Canvas canvas",
    "main canvas",
    "canvas",
  ];

  function findCanvas() {
    for (var i = 0; i < selectors.length; i += 1) {
      var candidate = document.querySelector(selectors[i]);
      if (candidate && candidate.width > 0 && candidate.height > 0) {
        return candidate;
      }
    }
    return null;
  }

  function check() {
    var canvas = findCanvas();
    if (canvas) {
      settleFrames += 1;
      if (settleFrames >= requiredFrames) {
        window.__SKETCH_THUMBNAIL_READY__ = true;
        return;
      }
      requestAnimationFrame(check);
      return;
    }
    settleFrames = 0;
    if (Date.now() - started < maxWait) {
      requestAnimationFrame(check);
    }
  }
  requestAnimationFrame(check);
})();
</script>
"""


def _thumbnail_size():
    return getattr(settings, "SKETCH_THUMBNAIL_SIZE", (1280, 720))


def _capture_timeout_ms():
    return int(getattr(settings, "SKETCH_THUMBNAIL_CAPTURE_TIMEOUT_MS", 20000))


def _settle_ms():
    return int(getattr(settings, "SKETCH_THUMBNAIL_SETTLE_MS", 1000))


def _prepare_embed_html_for_capture(sketch):
    html = build_embed_html(sketch, mode="preview")
    static_path = "/static/sketches/embed/processing.min.js"
    found = finders.find("sketches/embed/processing.min.js")
    if found:
        html = html.replace(static_path, Path(found).as_uri())
    if CAPTURE_READY_SCRIPT not in html:
        html = html.replace("</body>", f"{CAPTURE_READY_SCRIPT}\n</body>")
    return html


def _capture_canvas_png(html):
    from playwright.sync_api import sync_playwright

    width, height = _thumbnail_size()
    timeout_ms = _capture_timeout_ms()
    settle_ms = _settle_ms()
    export_script = """
() => {
  const selectors = [
    "#sketch-canvas-host canvas",
    ".p5Canvas canvas",
    "main canvas",
    "canvas",
  ];
  let canvas = null;
  for (const selector of selectors) {
    const candidate = document.querySelector(selector);
    if (candidate && candidate.width > 0 && candidate.height > 0) {
      canvas = candidate;
      break;
    }
  }
  if (!canvas) {
    return null;
  }
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const context = exportCanvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.drawImage(canvas, 0, 0, canvas.width, canvas.height);
  return exportCanvas.toDataURL("image/png").split(",")[1];
}
"""

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--disable-dev-shm-usage", "--no-sandbox"],
        )
        try:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.set_content(html, wait_until="networkidle")
            page.wait_for_function(
                "window.__SKETCH_THUMBNAIL_READY__ === true",
                timeout=timeout_ms,
            )
            page.wait_for_timeout(settle_ms)
            encoded = page.evaluate(export_script)
            if not encoded:
                return None
            return base64.b64decode(encoded)
        finally:
            browser.close()


def _prepare_thumbnail_image(png_bytes, size):
    max_w, max_h = size
    image = Image.open(BytesIO(png_bytes)).convert("RGBA")
    image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()


def save_sketch_thumbnail_bytes(sketch, png_bytes, *, force=False):
    """Resize and persist thumbnail bytes on a sketch."""
    if not png_bytes:
        return False
    if sketch.thumbnail and not force:
        return False

    processed = _prepare_thumbnail_image(png_bytes, _thumbnail_size())
    if sketch.thumbnail:
        sketch.thumbnail.delete(save=False)
    sketch.thumbnail.save(
        f"{sketch.slug}-thumbnail.png",
        ContentFile(processed),
        save=False,
    )
    sketch.save(update_fields=["thumbnail", "updated_at"])
    return True


def generate_sketch_thumbnail(sketch, *, force=False):
    """
    Server-side capture via Playwright (fallback when browser capture is unavailable).

    Returns True when a thumbnail was generated and saved.
    """
    if not getattr(settings, "SKETCH_THUMBNAIL_AUTO_GENERATE", True):
        return False
    if sketch.thumbnail and not force:
        return False
    if not sketch.is_interactive:
        return False

    html = _prepare_embed_html_for_capture(sketch)
    try:
        png_bytes = _capture_canvas_png(html)
    except ImportError:
        logger.warning(
            "Playwright is not installed; skipped thumbnail for %s", sketch.slug
        )
        return False
    except Exception:
        logger.exception("Thumbnail capture failed for %s", sketch.slug)
        return False

    if not png_bytes:
        logger.warning("No canvas screenshot produced for %s", sketch.slug)
        return False

    return save_sketch_thumbnail_bytes(sketch, png_bytes, force=force)


def schedule_sketch_thumbnail_generation(sketch, *, force=False):
    """Generate a thumbnail in a background thread so requests stay responsive."""
    if not getattr(settings, "SKETCH_THUMBNAIL_AUTO_GENERATE", True):
        return
    if sketch.thumbnail and not force:
        return
    if not sketch.is_interactive:
        return

    sketch_id = sketch.pk

    def _run():
        close_old_connections()
        try:
            from sketches.models import Sketch

            instance = Sketch.objects.prefetch_related("assets").get(pk=sketch_id)
            generate_sketch_thumbnail(instance, force=force)
        except Exception:
            logger.exception("Background thumbnail generation failed for sketch %s", sketch_id)

    threading.Thread(target=_run, daemon=True).start()
