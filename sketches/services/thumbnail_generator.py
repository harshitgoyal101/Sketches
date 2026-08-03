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

  function processingReady() {
    if (typeof Processing === "undefined") {
      return true;
    }
    return Boolean(window.__processingInstance);
  }

  function check() {
    var canvas = findCanvas();
    if (canvas && processingReady()) {
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
    return getattr(settings, "SKETCH_THUMBNAIL_SIZE", (1280, 800))


def _thumbnail_background():
    # Dark fill so any residual letterbox/matte matches the product UI.
    return getattr(settings, "SKETCH_THUMBNAIL_BACKGROUND", (13, 13, 13))


def _capture_timeout_ms():
    return int(getattr(settings, "SKETCH_THUMBNAIL_CAPTURE_TIMEOUT_MS", 20000))


def _settle_ms():
    return int(getattr(settings, "SKETCH_THUMBNAIL_SETTLE_MS", 1000))


def _prepare_embed_html_for_capture(sketch):
    html = build_embed_html(sketch, mode="fullscreen")
    static_path = "/static/sketches/embed/processing.min.js"
    found = finders.find("sketches/embed/processing.min.js")
    if found:
        html = html.replace(static_path, Path(found).as_uri())

    # Force a known viewport before p5 reads windowWidth/windowHeight.
    width, height = _thumbnail_size()
    viewport_force = f"""
<script>
(function (w, h) {{
  function force(obj, prop, value) {{
    try {{
      Object.defineProperty(obj, prop, {{
        configurable: true,
        enumerable: true,
        get: function () {{ return value; }},
      }});
    }} catch (err) {{}}
  }}
  force(window, "innerWidth", w);
  force(window, "innerHeight", h);
  force(window, "outerWidth", w);
  force(window, "outerHeight", h);
}})({width}, {height});
</script>
<style>
html, body {{
  width: {width}px !important;
  height: {height}px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: #0d0d0d !important;
}}
canvas {{
  display: block !important;
}}
</style>
"""
    if "<head>" in html:
        html = html.replace("<head>", f"<head>{viewport_force}", 1)

    if CAPTURE_READY_SCRIPT not in html:
        html = html.replace("</body>", f"{CAPTURE_READY_SCRIPT}\n</body>")
    return html


def _capture_sketch_png(sketch):
    """Run Playwright capture for a sketch; return PNG bytes or None."""
    if not sketch.is_interactive:
        return None
    html = _prepare_embed_html_for_capture(sketch)
    try:
        return _capture_canvas_png(html)
    except ImportError:
        logger.warning(
            "Playwright is not installed; skipped capture for %s", sketch.slug
        )
        return None
    except Exception:
        logger.exception("Canvas capture failed for %s", sketch.slug)
        return None


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


def _cover_image_to_box(image, box_w, box_h):
    """Scale image to cover the box and center-crop (no matte bars)."""
    src_w, src_h = image.size
    if src_w < 1 or src_h < 1:
        raise ValueError("Thumbnail source image has invalid dimensions.")
    scale = max(box_w / src_w, box_h / src_h)
    new_w = max(1, round(src_w * scale))
    new_h = max(1, round(src_h * scale))
    resized = (
        image
        if (new_w, new_h) == image.size
        else image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    )
    left = max(0, (resized.width - box_w) // 2)
    top = max(0, (resized.height - box_h) // 2)
    return resized.crop((left, top, left + box_w, top + box_h))


def _pixel_near(pixel, color, tol=14):
    return all(abs(int(pixel[i]) - int(color[i])) <= tol for i in range(3))


def _trim_light_letterbox(image):
    """
    Strip legacy light pillar/letterbox columns/rows (≈ #eff6ff).

    Older thumbnails were fitted onto a pale matte; after cover-crop into a
    16:10 frame a 1px strip of that matte often remained on the sides.
    """
    legacy_matte = (239, 246, 255)
    rgb = image.convert("RGBA")
    width, height = rgb.size
    if width < 4 or height < 4:
        return image

    px = rgb.load()
    max_trim_x = max(1, width // 4)
    max_trim_y = max(1, height // 4)

    def column_is_matte(x):
        samples = [px[x, y] for y in range(0, height, max(1, height // 40))]
        return all(_pixel_near(sample, legacy_matte) for sample in samples)

    def row_is_matte(y):
        samples = [px[x, y] for x in range(0, width, max(1, width // 40))]
        return all(_pixel_near(sample, legacy_matte) for sample in samples)

    left = 0
    while left < max_trim_x and column_is_matte(left):
        left += 1
    right = width
    while right > width - max_trim_x and right > left + 1 and column_is_matte(right - 1):
        right -= 1
    top = 0
    while top < max_trim_y and row_is_matte(top):
        top += 1
    bottom = height
    while bottom > height - max_trim_y and bottom > top + 1 and row_is_matte(bottom - 1):
        bottom -= 1

    if left == 0 and top == 0 and right == width and bottom == height:
        return image
    return rgb.crop((left, top, right, bottom))


def _card_thumbnail_size():
    return getattr(settings, "SKETCH_THUMBNAIL_CARD_SIZE", (640, 400))


def _webp_quality():
    return int(getattr(settings, "SKETCH_THUMBNAIL_WEBP_QUALITY", 80))


def _prepare_thumbnail_rgb(png_bytes, size):
    box_w, box_h = size
    image = Image.open(BytesIO(png_bytes)).convert("RGBA")
    image = _trim_light_letterbox(image)
    # Cover-crop fills the card frame; dark matte only shows through transparency.
    covered = _cover_image_to_box(image, box_w, box_h)
    background = Image.new("RGBA", (box_w, box_h), (*_thumbnail_background(), 255))
    background.paste(covered, (0, 0), covered)
    return background.convert("RGB")


def _encode_thumbnail_webp(image_rgb):
    output = BytesIO()
    image_rgb.save(
        output,
        format="WEBP",
        quality=_webp_quality(),
        method=4,
    )
    return output.getvalue()


def _prepare_thumbnail_image(png_bytes, size):
    """Letterbox source bytes into `size` and encode as WebP."""
    return _encode_thumbnail_webp(_prepare_thumbnail_rgb(png_bytes, size))


def card_thumbnail_storage_name(thumbnail_name):
    """Derive the 640w companion path from the primary thumbnail name."""
    if not thumbnail_name:
        return ""
    root, ext = thumbnail_name.rsplit(".", 1) if "." in thumbnail_name else (thumbnail_name, "webp")
    if root.endswith("-640"):
        return thumbnail_name
    return f"{root}-640.{ext}"


def _delete_card_thumbnail(sketch):
    from django.core.files.storage import default_storage

    if not sketch.thumbnail:
        return
    card_name = card_thumbnail_storage_name(sketch.thumbnail.name)
    if card_name and default_storage.exists(card_name):
        default_storage.delete(card_name)


def save_sketch_thumbnail_bytes(sketch, png_bytes, *, force=False):
    """Resize and persist thumbnail bytes on a sketch (WebP + 640w card variant)."""
    if not png_bytes:
        return False
    if sketch.thumbnail and not force:
        return False

    from django.core.files.storage import default_storage

    full_bytes = _prepare_thumbnail_image(png_bytes, _thumbnail_size())
    card_bytes = _prepare_thumbnail_image(png_bytes, _card_thumbnail_size())

    if sketch.thumbnail:
        _delete_card_thumbnail(sketch)
        sketch.thumbnail.delete(save=False)

    sketch.thumbnail.save(
        f"{sketch.slug}-thumbnail.webp",
        ContentFile(full_bytes),
        save=False,
    )
    sketch.save(update_fields=["thumbnail", "updated_at"])

    card_name = card_thumbnail_storage_name(sketch.thumbnail.name)
    if default_storage.exists(card_name):
        default_storage.delete(card_name)
    default_storage.save(card_name, ContentFile(card_bytes))
    return True


def generate_sketch_thumbnail(sketch, *, force=False):
    """
    Server-side capture via Playwright (fallback when browser capture is unavailable).

    Returns True when a thumbnail was generated and saved.
    """
    if not getattr(settings, "SKETCH_THUMBNAIL_AUTO_GENERATE", True) and not force:
        return False
    if sketch.thumbnail and not force:
        return False
    if not sketch.is_interactive:
        return False

    png_bytes = _capture_sketch_png(sketch)
    if not png_bytes:
        logger.warning("No canvas screenshot produced for %s", sketch.slug)
        return False

    return save_sketch_thumbnail_bytes(sketch, png_bytes, force=force)


def generate_sketch_app_icon(sketch, *, force=False):
    """Server-side capture cropped to a square app icon."""
    if sketch.app_icon and not force:
        return False
    if not sketch.is_interactive:
        return False

    png_bytes = _capture_sketch_png(sketch)
    if not png_bytes:
        logger.warning("No canvas screenshot produced for app icon %s", sketch.slug)
        return False

    return save_sketch_app_icon_bytes(sketch, png_bytes, force=force)


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


APP_ICON_SIZE = (192, 192)


def _prepare_app_icon_webp(image_bytes):
    """Center-crop to square and encode a 192×192 WebP app icon."""
    source = Image.open(BytesIO(image_bytes)).convert("RGBA")
    width, height = source.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    cropped = source.crop((left, top, left + side, top + side))
    icon = cropped.resize(APP_ICON_SIZE, Image.Resampling.LANCZOS)
    # Flatten onto brand-ish dark if needed for opaque webp
    background = Image.new("RGB", APP_ICON_SIZE, (13, 13, 13))
    background.paste(icon, mask=icon.split()[3] if icon.mode == "RGBA" else None)
    return _encode_thumbnail_webp(background)


def save_sketch_app_icon_bytes(sketch, image_bytes, *, force=False):
    """Persist a square app icon for mobile gallery lists."""
    if not image_bytes:
        return False
    if sketch.app_icon and not force:
        return False

    icon_bytes = _prepare_app_icon_webp(image_bytes)
    if sketch.app_icon:
        sketch.app_icon.delete(save=False)

    sketch.app_icon.save(
        f"{sketch.slug}-app-icon.webp",
        ContentFile(icon_bytes),
        save=False,
    )
    sketch.save(update_fields=["app_icon", "updated_at"])
    return True
