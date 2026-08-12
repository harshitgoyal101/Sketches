from ..models import Sketch

P5JS_STARTER_CODE = """
// Sketches101 starter — works fullscreen in the embed, and can become a scored game.
//
// FULLSCREEN
// - createCanvas(windowWidth, windowHeight) + windowResized keep the sketch edge-to-edge.
// - touchAction = "none" stops the browser from scrolling while you drag on mobile.
// - pointerX / pointerY read touch first, then parent-iframe mouse (window._parentMouse*),
//   then local mouseX/mouseY so the cursor works inside the site embed and fullscreen play.
//
// SCORES (turn this into a game)
// 1. Sketch Settings → enable "Game" and set Scoreboard slug (e.g. my-cool-game).
// 2. In submitScore(), set game: to that same slug.
// 3. Call submitScore(points) when a round ends — the parent page listens for
//    { type: "sketches101-score", game, score } and records the high score.
// 4. Only submit once per round (see `submitted` below).

let score = 0;
let dragStart = 0;
let submitted = false;

function pointerX() {
  if (touches.length > 0) return touches[0].x;
  // Parent embed injects mouse when the sketch runs inside sketches101 fullscreen / iframe.
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
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  let mx = pointerX();
  let my = pointerY();
  let isDragging = mouseIsPressed || touches.length > 0;

  // Example scoring: hold / drag to earn points; submit when the drag ends.
  if (isDragging) {
    if (dragStart === 0) {
      dragStart = millis();
      submitted = false;
    }
    score = Math.floor((millis() - dragStart) / 10);
  } else if (dragStart > 0 && !submitted) {
    submitScore(score);
    submitted = true;
    dragStart = 0;
  }

  background_create(mx, my);

  fill(55);
  ellipse(mx, my, 20, 20);
  fill(180, 170, 255);
  noStroke();
  textSize(32);
  textAlign(CENTER);
  textStyle(BOLD);
  text("SCORE - " + score, width/2, height-50);
}

function submitScore(points) {
  if (points <= 0) return;
  // Replace "your-scoreboard-slug" with Sketch Settings → Scoreboard slug.
  parent.postMessage(
    {
      type: "sketches101-score",
      game: "your-scoreboard-slug",
      score: Math.floor(points),
    },
    "*"
  );
}

function background_create(px, py) {
  background(13, 13, 18);
  let isDragging = mouseIsPressed || touches.length > 0;

  for (let i = 0; i < width; i += 15) {
    for (let j = 0; j < height; j += 15) {
      let d = dist(i, j, px, py);
      if (isDragging) {
        let alphaVal = map(d, 0, 300, 255, 30, true);
        let f = map(d, 0, 255, 8, 0, true);
        fill(180, 170, 255, alphaVal);
        ellipse(i, j, 5 + f, 5 + f);
      } else {
        fill(180, 170, 255, 150);
        ellipse(i, j, 5, 5);
      }
    }
  }
}
"""

PROCESSING_STARTER_CODE = """
// Sketches101 Processing starter — fullscreen embed + scored game hooks.
//
// FULLSCREEN / TOUCH
// - size(screenWidth, screenHeight) fills the embed (bootstrap also resizes on rotate).
// - Processing.js maps touch → mouseX / mouseY / mousePressed automatically.
// - The embed sets touch-action: none so dragging does not scroll the page.
// - Parent-iframe pointer (window._parentMouse*) is synced into mouseX / mouseY for you.
//
// SCORES (turn this into a game)
// 1. Sketch Settings → enable "Game" and set Scoreboard slug (e.g. my-cool-game).
// 2. In submitScore(), set the game string to that same slug.
// 3. Call submitScore(points) when a round ends — the embed bridge posts
//    { type: "sketches101-score", game, score } to the parent page.
// 4. Only submit once per round (see `submitted` below).

float score = 0;
float dragStart = 0;
boolean submitted = false;

// Bound by sketches101 embed (Processing.js ↔ parent postMessage).
interface ScoreBridge {
  void submit(String game, float score);
}
ScoreBridge scoreBridge = null;
void setScoreBridge(ScoreBridge bridge) {
  scoreBridge = bridge;
}

void setup() {
  size(screenWidth, screenHeight);
  noStroke();
  textAlign(CENTER);
}

void draw() {
  float mx = mouseX;
  float my = mouseY;
  // mousePressed is true for mouse click OR finger down (Processing.js touch → mouse).
  boolean isDragging = mousePressed;

  // Example scoring: hold / drag to earn points; submit when the drag ends.
  if (isDragging) {
    if (dragStart == 0) {
      dragStart = millis();
      submitted = false;
    }
    score = floor((millis() - dragStart) / 10.0);
  } else if (dragStart > 0 && !submitted) {
    submitScore(score);
    submitted = true;
    dragStart = 0;
  }

  background_create(mx, my);

  fill(55);
  ellipse(mx, my, 20, 20);
  fill(180, 170, 255);
  textSize(32);
  text("SCORE - " + int(score), width/2, height-50);
}

void submitScore(float points) {
  if (points <= 0 || scoreBridge == null) return;
  // Replace "your-scoreboard-slug" with Sketch Settings → Scoreboard slug.
  scoreBridge.submit("your-scoreboard-slug", points);
}

void background_create(float px, float py) {
  background(13, 13, 18);
  boolean isDragging = mousePressed;

  for (int i = 0; i < width; i += 15) {
    for (int j = 0; j < height; j += 15) {
      float d = dist(i, j, px, py);
      if (isDragging) {
        float alphaVal = constrain(map(d, 0, 300, 255, 30), 30, 255);
        float f = constrain(map(d, 0, 255, 8, 0), 0, 8);
        fill(180, 170, 255, alphaVal);
        ellipse(i, j, 5 + f, 5 + f);
      } else {
        fill(180, 170, 255, 150);
        ellipse(i, j, 5, 5);
      }
    }
  }
}
"""

STARTERS = {
    Sketch.SketchType.P5JS: {
        "label": "p5.js",
        "filename": "sketch.js",
        "extension": ".js",
        "code": P5JS_STARTER_CODE,
        "hint": "JavaScript",
    },
    Sketch.SketchType.PROCESSING: {
        "label": "Processing",
        "filename": "sketch.pde",
        "extension": ".pde",
        "code": PROCESSING_STARTER_CODE,
        "hint": "Java",
    },
}


def normalize_sketch_type(sketch_type):
    if sketch_type in STARTERS:
        return sketch_type
    return Sketch.SketchType.P5JS


def get_starter(sketch_type):
    return STARTERS[normalize_sketch_type(sketch_type)]


def get_starter_code(sketch_type):
    return get_starter(sketch_type)["code"]


def get_default_filename(sketch_type):
    return get_starter(sketch_type)["filename"]


def get_starter_payload():
    return {
        sketch_type: {
            "filename": starter["filename"],
            "extension": starter["extension"],
            "code": starter["code"],
            "label": starter["label"],
            "hint": starter["hint"],
        }
        for sketch_type, starter in STARTERS.items()
    }
