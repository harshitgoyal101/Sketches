(function () {
  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;

  function restartSketch() {
    if (typeof window.onSketchRestart === "function") {
      window.onSketchRestart();
    } else if (typeof initPixels === "function") {
      initPixels();
    } else if (typeof resetSketch === "function") {
      resetSketch();
    }
  }

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "sketch-restart") return;
    restartSketch();
  });

  document.addEventListener(
    "touchstart",
    function (event) {
      if (event.touches.length === 0) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchStartTime = Date.now();
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    function (event) {
      if (event.changedTouches.length === 0) return;
      var touch = event.changedTouches[0];
      var dx = touch.clientX - touchStartX;
      var dy = touch.clientY - touchStartY;
      var elapsed = Date.now() - touchStartTime;
      var isTap = elapsed < 350 && Math.hypot(dx, dy) < 12;
      if (isTap) {
        restartSketch();
      }
    },
    { passive: true }
  );
})();
