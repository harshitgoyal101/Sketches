from pathlib import Path

from django.core.management.base import BaseCommand

from sketches.models import Sketch, SketchAsset, Tag

SKETCH_DIR = Path(__file__).resolve().parents[3] / "Pixels_2026_06_13_17_10_33"

SKETCH_JS = """var pixel = [];
let border_buffer = 10;

function setup() {
  createCanvas(windowWidth, windowHeight);
  initPixels();
  window.addEventListener("message", (event) => {
    if (!event.data) return;
    if (event.data.type === "sketch-mouse") {
      window._parentMouseX = event.data.x;
      window._parentMouseY = event.data.y;
    }
    if (event.data.type === "sketch-restart") {
      initPixels();
    }
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initPixels();
}

function initPixels() {
  pixel = [];
  let count = floor((width * height) / 6400);
  count = constrain(count, 80, 160);
  for (let i = 0; i < count; i++) {
    pixel[i] = new Pixel(
      random(border_buffer, width - border_buffer),
      random(border_buffer, height - border_buffer)
    );
  }
}

function draw() {
  background(255);

  let push_strength = 0.6;
  let mouse_radius = 150;
  let mx = window._parentMouseX !== undefined ? window._parentMouseX : mouseX;
  let my = window._parentMouseY !== undefined ? window._parentMouseY : mouseY;

  for (let i = 0; i < pixel.length; i++) {
    let p = pixel[i];
    let fx = 0;
    let fy = 0;

    if (p.x < border_buffer) {
      let proximity = map(p.x, 0, border_buffer, 1, 0);
      fx += proximity * push_strength;
    } else if (p.x > width - border_buffer) {
      let proximity = map(p.x, width - border_buffer, width, 0, 1);
      fx -= proximity * push_strength;
    }

    let d_mouse = dist(p.x, p.y, mx, my);
    if (d_mouse < mouse_radius && d_mouse > 0) {
      let diffX = p.x - mx;
      let diffY = p.y - my;
      let force = map(d_mouse, 0, mouse_radius, 1.5, 0);
      fx += (diffX / d_mouse) * force;
      fy += (diffY / d_mouse) * force;
    }

    p.apply_force(fx, fy);
    p.update();

    for (let j = i + 1; j < pixel.length; j++) {
      let d = dist(p.x, p.y, pixel[j].x, pixel[j].y);
      if (d <= 150) {
        stroke(59, 144, 235, 255 - map(d, 0, 200, 0, 255));
        line(p.x, p.y, pixel[j].x, pixel[j].y);
      }
    }
  }
}
"""

DESCRIPTION = """## Pixels

A connected particle network inspired by constellation-style backgrounds. Nodes drift slowly and link together when nearby, forming shifting blue geometric meshes on a white canvas.

Moving the cursor gently repels nearby particles, creating interactive ripples through the network.

### Files

- `Pixel.js` — particle class with force and movement
- `sketch.js` — setup, connections, and mouse interaction
"""


class Command(BaseCommand):
    help = "Load the Pixels sketch from Pixels_2026_06_13_17_10_33/"

    def handle(self, *args, **options):
        pixel_path = SKETCH_DIR / "Pixel.js"
        if not pixel_path.exists():
            self.stderr.write(self.style.ERROR(f"Missing {pixel_path}"))
            return

        pixel_code = pixel_path.read_text(encoding="utf-8")

        tag, _ = Tag.objects.get_or_create(
            name="generative",
            defaults={"slug": "generative"},
        )
        network_tag, _ = Tag.objects.get_or_create(
            name="network",
            defaults={"slug": "network"},
        )

        sketch, created = Sketch.objects.update_or_create(
            slug="pixels",
            defaults={
                "title": "Pixels",
                "sketch_type": Sketch.SketchType.P5JS,
                "entry_filename": "sketch.js",
                "description": DESCRIPTION,
                "code": SKETCH_JS,
                "status": Sketch.Status.PUBLISHED,
                "is_home_background": True,
            },
        )
        sketch.tags.set([tag, network_tag])

        SketchAsset.objects.update_or_create(
            sketch=sketch,
            filename="Pixel.js",
            defaults={
                "content": pixel_code,
                "asset_type": SketchAsset.AssetType.JS,
                "order": 0,
            },
        )

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} Pixels sketch (home background)"))
