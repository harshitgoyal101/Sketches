"""
Seed playable games for production when the Games catalog is empty.

Creates published is_game sketches + matching Game scoreboard rows:
  - Orbit Run (scoreboard: orbit-run)
  - Finger on the App
  - Pulse Hold
  - Grid Drag

Usage (PythonAnywhere Bash console):
  python manage.py seed_production_games
  python manage.py seed_production_games --force
  python manage.py generate_thumbnails --force   # optional after seed
"""

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from sketches.models import Game, Sketch

POINTER_HELPERS = """
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
""".strip()


def finger_game_code(game_slug, accent=(180, 170, 255), bg=(13, 13, 18), step=15):
    r, g, b = accent
    br, bgc, bb = bg
    return f"""
let score = 0;
let dragStart = 0;
let submitted = false;

{POINTER_HELPERS}

function setup() {{
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = "none";
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
}}

function draw() {{
  let mx = pointerX();
  let my = pointerY();
  let isDragging = mouseIsPressed || touches.length > 0;

  if (isDragging) {{
    if (dragStart === 0) {{
      dragStart = millis();
      submitted = false;
    }}
    score = Math.floor((millis() - dragStart) / 10);
  }} else if (dragStart > 0 && !submitted) {{
    submitScore(score);
    submitted = true;
    dragStart = 0;
  }}

  background_create(mx, my);
  if (isDragging) {{
    fill(55);
    ellipse(mx, my, 20, 20);
  }}
  fill(255);
  noStroke();
  textSize(16);
  text("Score: " + score, 16, 28);
}}

function submitScore(points) {{
  if (points <= 0) return;
  parent.postMessage(
    {{
      type: "sketches101-score",
      game: "{game_slug}",
      score: Math.floor(points),
    }},
    "*"
  );
}}

function background_create(px, py) {{
  background({br}, {bgc}, {bb});
  let isDragging = mouseIsPressed || touches.length > 0;

  for (let i = 0; i < width; i += {step}) {{
    for (let j = 0; j < height; j += {step}) {{
      let d = dist(i, j, px, py);
      let s = isDragging ? map(d, 0, 200, 8, 1) : 2;
      fill({r}, {g}, {b}, isDragging ? map(d, 0, 250, 220, 40) : 90);
      noStroke();
      rect(i, j, s, s);
    }}
  }}
}}
""".strip()


GAMES = (
    {
        "title": "Finger on the App",
        "slug_suffix": "finger-on-the-app",
        "game_slug": None,  # same as sketch slug
        "accent": (180, 170, 255),
        "bg": (13, 13, 18),
        "step": 15,
        "description": "Hold or drag to score. Release to submit your best.",
    },
    {
        "title": "Pulse Hold",
        "slug_suffix": "pulse-hold",
        "game_slug": None,
        "accent": (255, 120, 160),
        "bg": (18, 10, 16),
        "step": 18,
        "description": "Hold or drag on the pink pulse grid to score.",
    },
    {
        "title": "Grid Drag",
        "slug_suffix": "grid-drag",
        "game_slug": None,
        "accent": (80, 220, 190),
        "bg": (8, 16, 14),
        "step": 12,
        "description": "Hold or drag on the teal grid to score.",
    },
)


class Command(BaseCommand):
    help = "Seed published playable games for the /games catalog."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite code/description on existing game sketches.",
        )
        parser.add_argument(
            "--username",
            default="harshitgoyal101",
            help="Author username (created if missing).",
        )
        parser.add_argument(
            "--skip-orbit",
            action="store_true",
            help="Do not create/refresh Orbit Run.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"]
        force = options["force"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": f"{username}@example.com"},
        )
        if created or not user.has_usable_password():
            user.set_password("Secret@42")
            user.is_active = True
            user.save()
            self.stdout.write(f"User {username} ready (password set).")

        now = timezone.now()
        prefix = username

        for spec in GAMES:
            slug = f"{prefix}-{spec['slug_suffix']}"
            game_slug = spec["game_slug"] or slug
            Game.objects.update_or_create(
                slug=game_slug,
                defaults={
                    "title": spec["title"],
                    "description": spec["description"],
                    "max_score": 1_000_000,
                    "is_active": True,
                },
            )
            code = finger_game_code(
                game_slug,
                accent=spec["accent"],
                bg=spec["bg"],
                step=spec["step"],
            )
            defaults = {
                "title": spec["title"],
                "author": user,
                "sketch_type": Sketch.SketchType.P5JS,
                "entry_filename": "sketch.js",
                "description": spec["description"],
                "status": Sketch.Status.PUBLISHED,
                "published_at": now,
                "is_game": True,
                "scoreboard_slug": game_slug,
            }
            existing = Sketch.objects.filter(slug=slug).first()
            if existing and not force:
                existing.is_game = True
                existing.scoreboard_slug = game_slug
                existing.status = Sketch.Status.PUBLISHED
                existing.published_at = existing.published_at or now
                existing.author = existing.author or user
                existing.save(
                    update_fields=[
                        "is_game",
                        "scoreboard_slug",
                        "status",
                        "published_at",
                        "author",
                    ]
                )
                self.stdout.write(f"Updated flags: {slug}")
            else:
                defaults["code"] = code
                sketch, was_created = Sketch.objects.update_or_create(
                    slug=slug,
                    defaults=defaults,
                )
                # update_or_create may not set slug on create path correctly if blank
                if not sketch.slug:
                    sketch.slug = slug
                    sketch.save(update_fields=["slug"])
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{'Created' if was_created else 'Refreshed'} {slug}"
                    )
                )

        if not options["skip_orbit"]:
            call_command(
                "load_orbit_run_sketch",
                force=force,
                username=username,
            )

        count = Sketch.objects.filter(
            status=Sketch.Status.PUBLISHED, is_game=True
        ).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {count} published game(s). Open /games and hard-refresh."
            )
        )
