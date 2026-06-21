from django.core.management.base import BaseCommand

from sketches.models import Sketch, SketchAsset, Tag

LOOPS_CODE = """function drawLoop(t, index, count) {
  stroke((t * 40 + index * (360 / count)) % 360, 70, 90);
  beginShape();
  for (let a = 0; a < TWO_PI; a += 0.08) {
    let r = 80 + sin(a * 3 + t + index) * 25;
    vertex(cos(a) * r, sin(a) * r);
  }
  endShape(CLOSE);
}
"""

DEMO_CODE = """let t = 0;
const LOOP_COUNT = 12;

function setup() {
  createCanvas(400, 300);
  colorMode(HSB, 360, 100, 100);
  noFill();
}

function draw() {
  background(0, 0, 8);
  translate(width / 2, height / 2);
  strokeWeight(1.5);
  for (let i = 0; i < LOOP_COUNT; i++) {
    drawLoop(t, i, LOOP_COUNT);
  }
  t += 0.02;
}
"""

DEMO_DESCRIPTION = """## Flow Loop

A simple generative sketch that draws twelve animated loops using **p5.js**.

Each loop uses a sine wave to modulate the radius, creating an organic pulsing effect. Colors cycle through the HSB spectrum over time.

This demo is split across two files: `loops.js` holds the drawing helper, and `sketch.js` is the entry point.

### Techniques

- Polar coordinates with `cos` / `sin`
- `colorMode(HSB)` for smooth color transitions
- Layered shapes with phase offsets
"""


class Command(BaseCommand):
    help = "Load a demo p5.js sketch for testing."

    def handle(self, *args, **options):
        tag, _ = Tag.objects.get_or_create(
            name="generative",
            defaults={"slug": "generative"},
        )

        sketch, created = Sketch.objects.update_or_create(
            slug="flow-loop",
            defaults={
                "title": "Flow Loop",
                "sketch_type": Sketch.SketchType.P5JS,
                "entry_filename": "sketch.js",
                "description": DEMO_DESCRIPTION,
                "code": DEMO_CODE,
                "status": Sketch.Status.PUBLISHED,
            },
        )
        sketch.tags.add(tag)

        SketchAsset.objects.update_or_create(
            sketch=sketch,
            filename="loops.js",
            defaults={
                "content": LOOPS_CODE,
                "asset_type": SketchAsset.AssetType.JS,
                "order": 0,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS("Created demo sketch: Flow Loop"))
        else:
            self.stdout.write(self.style.SUCCESS("Updated demo sketch: Flow Loop"))
