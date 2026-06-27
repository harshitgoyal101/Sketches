from ..models import Sketch

P5JS_STARTER_CODE = """function setup() {
  createCanvas(400, 300);
}

function draw() {
  background(248, 250, 252);
  noStroke();
  fill(59, 130, 246);
  circle(mouseX, mouseY, 48);
}
"""

PROCESSING_STARTER_CODE = """void setup() {
  size(400, 300);
}

void draw() {
  background(248, 250, 252);
  noStroke();
  fill(59, 130, 246);
  ellipse(mouseX, mouseY, 48, 48);
}
"""

STARTERS = {
    Sketch.SketchType.P5JS: {
        "label": "p5.js",
        "filename": "sketch.js",
        "extension": ".js",
        "code": P5JS_STARTER_CODE,
        "hint": "JavaScript with setup() and draw()",
    },
    Sketch.SketchType.PROCESSING: {
        "label": "Processing",
        "filename": "sketch.pde",
        "extension": ".pde",
        "code": PROCESSING_STARTER_CODE,
        "hint": "Java-mode .pde with setup() and draw()",
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
