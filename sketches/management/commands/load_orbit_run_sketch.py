"""
Load / refresh the Orbit Run playable game sketch.

Creates a published is_game sketch that posts scores to the `orbit-run` Game.

Usage:
  python manage.py load_orbit_run_sketch
  python manage.py load_orbit_run_sketch --force
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from sketches.models import Game, Sketch

ORBIT_CODE = r"""
let ship;
let asteroids = [];
let rings = [];
let score = 0;
let alive = true;
let started = false;
let thrust = false;

const STAR = { x: 0, y: 0, r: 36 };

function setup() {
  const c = createCanvas(windowWidth, windowHeight);
  c.elt.style.touchAction = "none";
  resetRun();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function resetRun() {
  ship = {
    x: width * 0.35,
    y: height * 0.5,
    vx: 0,
    vy: -1.2,
    r: 8,
  };
  asteroids = [];
  rings = [];
  score = 0;
  alive = true;
  for (let i = 0; i < 14; i++) spawnAsteroid();
  for (let i = 0; i < 5; i++) spawnRing();
}

function spawnAsteroid() {
  const ang = random(TWO_PI);
  const dist = random(160, max(width, height) * 0.55);
  asteroids.push({
    x: STAR.x + cos(ang) * dist,
    y: STAR.y + sin(ang) * dist,
    r: random(10, 22),
    spin: random(-0.04, 0.04),
    a: random(TWO_PI),
  });
}

function spawnRing() {
  const ang = random(TWO_PI);
  const dist = random(90, max(width, height) * 0.42);
  rings.push({
    x: STAR.x + cos(ang) * dist,
    y: STAR.y + sin(ang) * dist,
    r: 14,
    pulse: random(TWO_PI),
  });
}

function pointerAim() {
  if (touches.length > 0) return createVector(touches[0].x, touches[0].y);
  if (typeof window._parentMouseX === "number") {
    return createVector(window._parentMouseX, window._parentMouseY);
  }
  return createVector(mouseX, mouseY);
}

function draw() {
  background(8, 8, 14);
  translate(width / 2, height / 2);
  STAR.x = 0;
  STAR.y = 0;

  noStroke();
  for (let i = 5; i >= 1; i--) {
    fill(123, 97, 255, 18 * i);
    circle(0, 0, STAR.r * 2 + i * 28);
  }
  fill(180, 160, 255);
  circle(0, 0, STAR.r * 2);

  if (!started) {
    resetMatrix();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("Orbit Run — tap / space to start", width / 2, height / 2);
    textSize(13);
    fill(180);
    text("WASD / arrows / drag toward cursor to thrust", width / 2, height / 2 + 28);
    return;
  }

  if (alive) {
    score += 0.1;
    steer();
    const dx = STAR.x - ship.x;
    const dy = STAR.y - ship.y;
    const d2 = max(dx * dx + dy * dy, 80);
    const g = 2800 / d2;
    ship.vx += (dx / sqrt(d2)) * g * 0.016;
    ship.vy += (dy / sqrt(d2)) * g * 0.016;
    ship.x += ship.vx;
    ship.y += ship.vy;

    if (dist(ship.x, ship.y, 0, 0) < STAR.r + ship.r) die();

    for (const a of asteroids) {
      a.a += a.spin;
      if (dist(ship.x, ship.y, a.x, a.y) < ship.r + a.r) die();
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.pulse += 0.08;
      if (dist(ship.x, ship.y, ring.x, ring.y) < ship.r + ring.r) {
        score += 50;
        rings.splice(i, 1);
        spawnRing();
      }
    }
  }

  noFill();
  stroke(123, 97, 255, 160);
  strokeWeight(2);
  for (const ring of rings) {
    const pr = ring.r + sin(ring.pulse) * 3;
    circle(ring.x, ring.y, pr * 2);
  }

  noStroke();
  fill(90, 95, 120);
  for (const a of asteroids) {
    push();
    translate(a.x, a.y);
    rotate(a.a);
    beginShape();
    for (let i = 0; i < 6; i++) {
      const ang = (TWO_PI * i) / 6;
      vertex(cos(ang) * a.r, sin(ang) * a.r * 0.85);
    }
    endShape(CLOSE);
    pop();
  }

  push();
  translate(ship.x, ship.y);
  const ang = atan2(ship.vy, ship.vx);
  rotate(ang);
  fill(255);
  triangle(14, 0, -10, 7, -10, -7);
  if (thrust && alive) {
    fill(255, 160, 80);
    triangle(-10, 0, -18, 4, -18, -4);
  }
  pop();

  resetMatrix();
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(16);
  text("Score: " + floor(score), 16, 16 + (window.visualViewport ? 0 : 0));
  if (!alive) {
    textAlign(CENTER, CENTER);
    textSize(22);
    text("Game over — tap to retry", width / 2, height / 2);
  }
}

function steer() {
  thrust = false;
  let ax = 0;
  let ay = 0;
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) ax -= 1;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) ax += 1;
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) ay -= 1;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) ay += 1;

  const pressing = mouseIsPressed || touches.length > 0;
  if (pressing) {
    const aim = pointerAim();
    const wx = aim.x - width / 2;
    const wy = aim.y - height / 2;
    const to = createVector(wx - ship.x, wy - ship.y);
    if (to.mag() > 8) {
      to.normalize();
      ax += to.x;
      ay += to.y;
    }
  }

  if (ax !== 0 || ay !== 0) {
    thrust = true;
    const m = createVector(ax, ay).normalize().mult(0.085);
    ship.vx += m.x;
    ship.vy += m.y;
  }
  ship.vx *= 0.995;
  ship.vy *= 0.995;
}

function die() {
  if (!alive) return;
  alive = false;
  const points = floor(score);
  if (points > 0 && window.parent) {
    parent.postMessage(
      { type: "sketches101-score", game: "orbit-run", score: points },
      "*"
    );
  }
}

function keyPressed() {
  if (key === " " || keyCode === 32) {
    if (!started) started = true;
    else if (!alive) {
      resetRun();
      started = true;
    }
    return false;
  }
}

function mousePressed() {
  if (!started) started = true;
  else if (!alive) {
    resetRun();
    started = true;
  }
}

function touchStarted() {
  mousePressed();
  return false;
}
""".strip()

ORBIT_DESCRIPTION = """
Pilot a tiny ship in the gravity well of a violet star. Drift, thrust, and survive as rock debris fills the field.

**Controls:** WASD or arrow keys, or hold/drag toward the cursor. Space / tap to start and restart.

**Score:** Survival time × 10, plus 50 per energy ring. On game over the sketch posts your score to sketches101 (`orbit-run`).
""".strip()


class Command(BaseCommand):
    help = "Create or refresh the Orbit Run game sketch (is_game + orbit-run scoreboard)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite code/description on an existing Orbit Run sketch.",
        )
        parser.add_argument(
            "--username",
            default="sketches101",
            help="Author username (created with an unusable password if missing).",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"]
        force = options["force"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": f"{username}@example.com"},
        )
        if created:
            user.set_unusable_password()
            user.is_active = True
            user.save()
            self.stdout.write(
                f"Created author {username} with an unusable password "
                "(set a password via createsuperuser / changepassword if needed)."
            )

        Game.objects.update_or_create(
            slug="orbit-run",
            defaults={
                "title": "Orbit Run",
                "description": "Survive the gravity well.",
                "max_score": 1_000_000,
                "is_active": True,
            },
        )

        sketch = (
            Sketch.objects.filter(title__iexact="Orbit Run", author=user).first()
            or Sketch.objects.filter(slug__in=[
                "harshitgoyal101-untitled-sketch",
                "harshitgoyal101-orbit-run",
                "orbit-run",
            ]).first()
        )

        if sketch and not force:
            sketch.is_game = True
            sketch.scoreboard_slug = "orbit-run"
            if sketch.status != Sketch.Status.PUBLISHED:
                sketch.status = Sketch.Status.PUBLISHED
                sketch.published_at = sketch.published_at or timezone.now()
            sketch.save(
                update_fields=[
                    "is_game",
                    "scoreboard_slug",
                    "status",
                    "published_at",
                ]
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated flags on existing sketch {sketch.slug} "
                    "(use --force to refresh code)."
                )
            )
            return

        if not sketch:
            sketch = Sketch(
                author=user,
                title="Orbit Run",
                sketch_type=Sketch.SketchType.P5JS,
            )

        sketch.description = ORBIT_DESCRIPTION
        sketch.code = ORBIT_CODE
        sketch.entry_filename = "sketch.js"
        sketch.status = Sketch.Status.PUBLISHED
        sketch.published_at = sketch.published_at or timezone.now()
        sketch.is_game = True
        sketch.scoreboard_slug = "orbit-run"
        sketch.save()
        self.stdout.write(
            self.style.SUCCESS(f"Orbit Run ready at /games/{sketch.slug}")
        )
