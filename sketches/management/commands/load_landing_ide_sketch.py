from django.core.management.base import BaseCommand
from django.utils import timezone

from sketches.models import Sketch

STAR_FIELD_PALETTES = {
    Sketch.HomeBackgroundTheme.DARK: {
        "bg": (8, 8, 16),
        "star": (210, 230, 255),
    },
    Sketch.HomeBackgroundTheme.LIGHT: {
        "bg": (248, 250, 252),
        "star": (123, 97, 255),
    },
}


def build_star_field_code(*, bg, star):
    return f"""let stars = [], noOfStars = 2000, rotX = 0, rotY = 0, autoAngle = 0;

function setup() {{
  createCanvas(640, 400, WEBGL);
  for (let i = 0; i < noOfStars; i++) {{
    let r = 200 * pow(random(1), 2.2);
    stars.push({{
      r: r,
      theta: random(TWO_PI),
      phi: acos(random(-1, 1)),
      speed: map(r, 0, 200, 0.012, 0.002),
      size: map(r, 0, 200, 3.2, 1.0),
      opacity: map(r, 0, 200, 255, 50)
    }});
  }}
}}

function draw() {{
  background({bg[0]}, {bg[1]}, {bg[2]});
  autoAngle += 0.002;

  rotY = lerp(rotY, map(mouseX, 0, width, -PI, PI), 0.03);
  rotX = lerp(rotX, map(mouseY, 0, height, PI / 2, -PI / 2), 0.03);

  rotateX(rotX);
  rotateY(rotY + autoAngle);

  noStroke();
  for (let s of stars) {{
    s.theta += s.speed;
    let x = s.r * sin(s.phi) * cos(s.theta);
    let y = s.r * sin(s.phi) * sin(s.theta);
    let z = s.r * cos(s.phi);
    push();
    translate(x, y, z);
    fill({star[0]}, {star[1]}, {star[2]}, s.opacity);
    sphere(s.size, 4, 4);
    pop();
  }}
}}
"""


LANDING_IDE_DESCRIPTION = """## The Interactive IDE

A WEBGL star-field sketch used on the sketches101 home page to demo the live editor.

Drag or move the pointer to tilt the camera around a dense sphere of stars. Each star orbits at a speed tied to its distance from the core.

### Techniques

- Spherical coordinates with `sin`, `cos`, and `acos`
- Core-weighted distribution via `pow(random(1), 2.2)`
- Mouse-driven camera with `lerp` smoothing
"""

SPECS = [
    {
        "slug": "sketches101-interactive-ide-dark",
        "title": "The Interactive IDE — Dark",
        "theme": Sketch.HomeBackgroundTheme.DARK,
    },
    {
        "slug": "sketches101-interactive-ide-light",
        "title": "The Interactive IDE — Light",
        "theme": Sketch.HomeBackgroundTheme.LIGHT,
    },
]


class Command(BaseCommand):
    help = "Create/update dark and light home page Interactive IDE star-field sketches."

    def handle(self, *args, **options):
        for spec in SPECS:
            palette = STAR_FIELD_PALETTES[spec["theme"]]
            code = build_star_field_code(**palette)
            sketch, created = Sketch.objects.update_or_create(
                slug=spec["slug"],
                defaults={
                    "title": spec["title"],
                    "sketch_type": Sketch.SketchType.P5JS,
                    "entry_filename": "sketch.js",
                    "code": code,
                    "description": LANDING_IDE_DESCRIPTION,
                    "status": Sketch.Status.PUBLISHED,
                    "published_at": timezone.now(),
                    "landing_ide_theme": spec["theme"],
                    "is_landing_ide": True,
                    "author": None,
                },
            )
            action = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(f"{action} {sketch.slug} ({spec['theme']})")
            )

        Sketch.objects.filter(slug="sketches101-interactive-ide").update(
            is_landing_ide=False,
            landing_ide_theme="",
        )
