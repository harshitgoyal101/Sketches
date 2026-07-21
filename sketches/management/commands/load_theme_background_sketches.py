from django.core.management.base import BaseCommand
from django.utils import timezone

from sketches.models import Sketch

# Figma Make particle mesh — identical logic; only palette differs by theme.
# Dark: white on #0D0D0D. Light: muted #7B61FF on #F8FAFC (lower opacity).

MESH_PALETTES = {
    Sketch.HomeBackgroundTheme.DARK: {
        "bg": (13, 13, 13),
        "dot_a": 0.5,
        "line_max_a": 0.13,
        "col": (255, 255, 255),
    },
    Sketch.HomeBackgroundTheme.LIGHT: {
        "bg": (248, 250, 252),
        "dot_a": 0.35,
        "line_max_a": 0.08,
        "col": (123, 97, 255),
    },
}


def build_mesh_code(*, bg, dot_a, line_max_a, col):
    return f"""const N = 90;
const MAX_DIST = 150;
const REPEL_R = 110;
const REPEL_F = 0.9;
const MAX_SPEED = 1.2;
const BG = [{bg[0]}, {bg[1]}, {bg[2]}];
const DOT_A = {dot_a};
const LINE_MAX_A = {line_max_a};
const COL = [{col[0]}, {col[1]}, {col[2]}];

let nodes = [];

function pointerX() {{
  if (touches.length > 0) return touches[0].x;
  if (typeof window._parentMouseX === "number") return window._parentMouseX;
  return mouseX;
}}

function pointerY() {{
  if (touches.length > 0) return touches[0].y;
  if (typeof window._parentMouseY === "number") return window._parentMouseY;
  return mouseY;
}}

function targetPixelDensity() {{
  const dpr = window.devicePixelRatio || 1;
  const area = windowWidth * windowHeight;
  if (area >= 2073600) return Math.min(dpr, 1);
  if (area >= 921600) return Math.min(dpr, 1.25);
  if (area >= 480000) return Math.min(dpr, 1.5);
  return Math.min(dpr, 2);
}}

function applyCanvas() {{
  resizeCanvas(windowWidth, windowHeight);
  pixelDensity(targetPixelDensity());
}}

function setup() {{
  const c = createCanvas(windowWidth, windowHeight);
  c.elt.style.touchAction = "none";
  pixelDensity(targetPixelDensity());
  initNodes();
}}

function windowResized() {{
  resetSketch();
}}

function initNodes() {{
  nodes = [];
  for (let i = 0; i < N; i++) {{
    nodes.push({{
      x: random(width),
      y: random(height),
      vx: random(-0.25, 0.25),
      vy: random(-0.25, 0.25),
      r: random(1.5, 3.0),
    }});
  }}
}}

function resetSketch() {{
  applyCanvas();
  initNodes();
}}
window.onSketchRestart = resetSketch;

function draw() {{
  background(BG[0], BG[1], BG[2]);
  const mx = pointerX();
  const my = pointerY();

  for (const n of nodes) {{
    const rx = n.x - mx;
    const ry = n.y - my;
    const rd = Math.sqrt(rx * rx + ry * ry);
    if (rd < REPEL_R && rd > 0) {{
      const f = (1 - rd / REPEL_R) * REPEL_F;
      n.vx += (rx / rd) * f;
      n.vy += (ry / rd) * f;
    }}
    n.vx *= 0.97;
    n.vy *= 0.97;
    const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (spd > MAX_SPEED) {{
      n.vx = (n.vx / spd) * MAX_SPEED;
      n.vy = (n.vy / spd) * MAX_SPEED;
    }}
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < -10) n.x = width + 10;
    else if (n.x > width + 10) n.x = -10;
    if (n.y < -10) n.y = height + 10;
    else if (n.y > height + 10) n.y = -10;
  }}

  strokeWeight(0.8);
  for (let i = 0; i < nodes.length; i++) {{
    for (let j = i + 1; j < nodes.length; j++) {{
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > MAX_DIST) continue;
      const a = (1 - d / MAX_DIST) * LINE_MAX_A;
      stroke(COL[0], COL[1], COL[2], a * 255);
      line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
    }}
  }}

  noStroke();
  fill(COL[0], COL[1], COL[2], DOT_A * 255);
  for (const n of nodes) {{
    circle(n.x, n.y, n.r * 2);
  }}
}}

function touchStarted() {{
  return false;
}}
function touchMoved() {{
  return false;
}}
"""


SPECS = [
    {
        "slug": "sketches101-figma-mesh-dark",
        "title": "Figma Mesh — Dark",
        "theme": Sketch.HomeBackgroundTheme.DARK,
        "description": "White particle network on #0D0D0D — Figma Make dark hero background.",
    },
    {
        "slug": "sketches101-figma-mesh-light",
        "title": "Figma Mesh — Light",
        "theme": Sketch.HomeBackgroundTheme.LIGHT,
        "description": "Purple (#7B61FF) particle network on #F8FAFC — Figma Make light hero background.",
    },
]


class Command(BaseCommand):
    help = "Create/update dark and light Figma-matched home background sketches."

    def handle(self, *args, **options):
        for spec in SPECS:
            palette = MESH_PALETTES[spec["theme"]]
            code = build_mesh_code(**palette)
            sketch, created = Sketch.objects.update_or_create(
                slug=spec["slug"],
                defaults={
                    "title": spec["title"],
                    "sketch_type": Sketch.SketchType.P5JS,
                    "entry_filename": "sketch.js",
                    "code": code,
                    "description": spec["description"],
                    "status": Sketch.Status.PUBLISHED,
                    "published_at": timezone.now(),
                    "home_background_theme": spec["theme"],
                    "is_home_background": True,
                    "author": None,
                },
            )
            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{action} {sketch.slug} ({spec['theme']})"))
