document.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("home-bg-sketch");
  if (!iframe) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function restartBackgroundSketch() {
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
  }

  function isInteractiveTarget(target) {
    return target.closest(
      "a, button, input, textarea, select, label, summary, [role='button'], [role='link']"
    );
  }

  function sendSketchPointer(clientX, clientY, phase) {
    if (!iframe.contentWindow) return;
    const rect = iframe.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    iframe.contentWindow.postMessage(
      {
        type: "sketch-mouse",
        x,
        y,
        phase: phase || "move",
      },
      "*"
    );
  }

  document.addEventListener("mousemove", (event) => {
    sendSketchPointer(event.clientX, event.clientY, "move");
  });

  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length === 0) return;
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      sendSketchPointer(touch.clientX, touch.clientY, "start");
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length === 0) return;
      const touch = event.touches[0];
      sendSketchPointer(touch.clientX, touch.clientY, "move");
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    (event) => {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      sendSketchPointer(touch.clientX, touch.clientY, "end");

      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;
      const isTap = elapsed < 350 && Math.hypot(dx, dy) < 12;

      if (isTap && !isInteractiveTarget(event.target)) {
        restartBackgroundSketch();
      }
    },
    { passive: true }
  );

  document.addEventListener("click", (event) => {
    if (isInteractiveTarget(event.target)) return;
    restartBackgroundSketch();
  });
});
