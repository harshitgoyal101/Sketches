from django.core.management.base import BaseCommand

from sketches.models import Sketch, SketchAsset, Tag

PIXEL_JS = """class Pixel {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.xspeed = random(-1, 1);
    this.yspeed = random(-1, 1);
  }

  apply_force(x_acc, y_acc) {
    this.xspeed += x_acc;
    this.yspeed += y_acc;
  }

  update() {
    this.xspeed *= 0.95;
    this.yspeed *= 0.95;

    this.xspeed += random(-0.1, 0.1);
    this.yspeed += random(-0.1, 0.1);

    this.xspeed = constrain(this.xspeed, -5, 5);
    this.yspeed = constrain(this.yspeed, -5, 5);

    this.x += this.xspeed;
    this.y += this.yspeed;

    if (this.x < 0 || this.x > width) this.xspeed *= -1;
    if (this.y < 0 || this.y > height) this.yspeed *= -1;

    this.x = constrain(this.x, 0, width);
    this.y = constrain(this.y, 0, height);
  }
}
"""

SKETCH_JS = """var pixel = [];
let border_buffer = 10;

function pointerX() {
  if (touches.length > 0) return touches[0].x;
  if (typeof window._parentMouseX === "number") return window._parentMouseX;
  return mouseX;
}

function pointerY() {
  if (touches.length > 0) return touches[0].y;
  if (typeof window._parentMouseY === "number") return window._parentMouseY;
  return mouseY;
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = "none";
  initPixels();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initPixels();
}

function touchStarted() {
  return false;
}

function touchMoved() {
  return false;
}

function initPixels() {
  pixel = [];
  let count = floor((width * height) / 8000);
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
  let mx = pointerX();
  let my = pointerY();

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

    fill(59, 130, 246);
    noStroke();
    ellipse(p.x, p.y, 5, 5);

    for (let j = i + 1; j < pixel.length; j++) {
      let d = dist(p.x, p.y, pixel[j].x, pixel[j].y);
      if (d <= 150) {
        stroke(59, 130, 246, 255 - map(d, 0, 150, 0, 255));
        strokeWeight(1);
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
    help = "Load the Pixels sketch (home background)."

    def handle(self, *args, **options):
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
                "content": PIXEL_JS,
                "asset_type": SketchAsset.AssetType.JS,
                "order": 0,
            },
        )

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} Pixels sketch (home background)"))
