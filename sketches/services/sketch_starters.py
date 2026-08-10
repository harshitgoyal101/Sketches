from ..models import Sketch

P5JS_STARTER_CODE = """
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
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(255);
  let mx = pointerX();
  let my = pointerY();
  fill(55);
  ellipse(mx, my, 20, 20);
}
"""

PROCESSING_STARTER_CODE = """
void setup() {
  size(screenWidth, screenHeight);
  noStroke();
}

void draw() {
  background(255);
  fill(55);
  ellipse(mouseX, mouseY, 20, 20);
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
