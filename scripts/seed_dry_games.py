"""Seed dry games + dummy gallery sketches for local testing."""
from django.contrib.auth import get_user_model
from django.utils import timezone

from sketches.models import Game, Sketch

User = get_user_model()

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


def ensure_user(username, email):
    user, created = User.objects.get_or_create(
        username=username, defaults={"email": email}
    )
    if created:
        user.set_unusable_password()
    user.email = email or user.email
    user.is_active = True
    user.save()
    return user


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
      if (isDragging) {{
        let alphaVal = map(d, 0, 300, 255, 30, true);
        let f = map(d, 0, 255, 5, 0, true);
        fill({r}, {g}, {b}, alphaVal);
        ellipse(i, j, 5 + f, 5 + f);
      }} else {{
        fill({r}, {g}, {b}, 150);
        ellipse(i, j, 5, 5);
      }}
    }}
  }}
}}
""".strip()


DUMMY_CODES = {
    "orbit-bloom": """
function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function draw() {
  background(8, 10, 18, 40);
  translate(width/2, height/2);
  for (let i = 0; i < 24; i++) {
    let a = i * 0.4 + frameCount * 0.02;
    let r = 40 + i * 12;
    fill(120 + i * 4, 140, 255, 90);
    ellipse(cos(a) * r, sin(a) * r, 18, 18);
  }
}
""".strip(),
    "noise-grid": """
function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function draw() {
  background(12);
  let s = 20;
  for (let x = 0; x < width; x += s) {
    for (let y = 0; y < height; y += s) {
      let n = noise(x * 0.01, y * 0.01, frameCount * 0.01);
      fill(40 + n * 180, 80, 200, 180);
      rect(x, y, s - 2, s - 2);
    }
  }
}
""".strip(),
    "ink-flow": """
let pts = [];
function setup() {
  createCanvas(windowWidth, windowHeight);
  background(245, 242, 235);
  stroke(20, 40);
  noFill();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); background(245, 242, 235); }
function draw() {
  if (mouseIsPressed) pts.push([mouseX, mouseY]);
  beginShape();
  for (let p of pts) vertex(p[0], p[1]);
  endShape();
  if (pts.length > 800) pts.splice(0, 40);
}
""".strip(),
    "pulse-field": """
function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function draw() {
  background(6, 8, 14);
  for (let i = 0; i < 40; i++) {
    let x = (i * 97 + frameCount) % width;
    let y = height/2 + sin(frameCount * 0.04 + i) * 80;
    fill(100, 180, 255, 50);
    ellipse(x, y, 30 + (i % 7) * 4);
  }
}
""".strip(),
    "crystal-walk": """
function setup() {
  createCanvas(windowWidth, windowHeight);
  stroke(200, 230, 255, 120);
  noFill();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function draw() {
  background(10, 12, 20, 30);
  translate(width/2, height/2);
  rotate(frameCount * 0.01);
  for (let i = 0; i < 8; i++) {
    rotate(PI / 4);
    triangle(0, -120, 40, 80, -40, 80);
  }
}
""".strip(),
}


def run():
    demo = ensure_user("demo", "demo@example.com")
    maya = ensure_user("maya", "maya@example.com")
    kai = ensure_user("kai", "kai@example.com")

    now = timezone.now()
    game_sketches = [
        {
            "title": "Finger on the App",
            "slug": "demo-finger-on-the-app",
            "author": demo,
            "game_slug": "demo-finger-on-the-app",
            "accent": (180, 170, 255),
            "bg": (13, 13, 18),
            "step": 15,
            "description": "Dry game — hold or drag to score.",
        },
        {
            "title": "Pulse Hold",
            "slug": "demo-pulse-hold",
            "author": demo,
            "game_slug": "demo-pulse-hold",
            "accent": (255, 120, 160),
            "bg": (18, 10, 16),
            "step": 18,
            "description": "Dry game — pink pulse grid.",
        },
        {
            "title": "Grid Drag",
            "slug": "demo-grid-drag",
            "author": demo,
            "game_slug": "demo-grid-drag",
            "accent": (80, 220, 190),
            "bg": (8, 16, 14),
            "step": 12,
            "description": "Dry game — teal dense grid.",
        },
    ]

    for spec in game_sketches:
        Game.objects.update_or_create(
            slug=spec["game_slug"],
            defaults={
                "title": spec["title"],
                "description": spec["description"],
                "max_score": 1_000_000,
                "is_active": True,
            },
        )
        code = finger_game_code(
            spec["game_slug"],
            accent=spec["accent"],
            bg=spec["bg"],
            step=spec["step"],
        )
        sketch, created = Sketch.objects.update_or_create(
            slug=spec["slug"],
            defaults={
                "title": spec["title"],
                "author": spec["author"],
                "sketch_type": Sketch.SketchType.P5JS,
                "code": code,
                "entry_filename": "sketch.js",
                "description": spec["description"],
                "status": Sketch.Status.PUBLISHED,
                "published_at": now,
                "is_game": True,
                "scoreboard_slug": spec["game_slug"],
            },
        )
        print(("created" if created else "updated"), "game", sketch.slug)

    from django.core.management import call_command

    call_command("load_orbit_run_sketch", force=True)

    dummies = [
        ("Orbit Bloom", "maya-orbit-bloom", maya, "orbit-bloom", "Soft orbiting dots."),
        ("Noise Grid", "kai-noise-grid", kai, "noise-grid", "Animated noise tiles."),
        ("Ink Flow", "maya-ink-flow", maya, "ink-flow", "Draw with the mouse."),
        ("Pulse Field", "kai-pulse-field", kai, "pulse-field", "Horizontal pulse field."),
        (
            "Crystal Walk",
            "demo-crystal-walk",
            demo,
            "crystal-walk",
            "Rotating crystal.",
        ),
    ]
    for title, slug, author, code_key, desc in dummies:
        sketch, created = Sketch.objects.update_or_create(
            slug=slug,
            defaults={
                "title": title,
                "author": author,
                "sketch_type": Sketch.SketchType.P5JS,
                "code": DUMMY_CODES[code_key],
                "entry_filename": "sketch.js",
                "description": desc,
                "status": Sketch.Status.PUBLISHED,
                "published_at": now,
                "is_game": False,
            },
        )
        print(("created" if created else "updated"), "dummy", sketch.slug)

    print("---")
    print("games", Sketch.objects.filter(is_game=True).count())
    print(
        "gallery",
        Sketch.objects.filter(is_game=False, status=Sketch.Status.PUBLISHED).count(),
    )


if __name__ == "__main__":
    run()
