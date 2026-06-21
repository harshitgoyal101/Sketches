window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "sketch-restart") return;
  if (typeof window.onSketchRestart === "function") {
    window.onSketchRestart();
  } else if (typeof initPixels === "function") {
    initPixels();
  } else if (typeof resetSketch === "function") {
    resetSketch();
  }
});
