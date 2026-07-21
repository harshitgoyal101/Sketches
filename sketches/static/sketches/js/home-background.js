document.addEventListener("DOMContentLoaded", () => {
  const frames = Array.from(document.querySelectorAll(".home-bg-sketch"));
  if (!frames.length) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function currentTheme() {
    return document.documentElement.classList.contains("theme-light") ? "light" : "dark";
  }

  function activeIframe() {
    const theme = currentTheme();
    const match = frames.find((el) => el.dataset.themeBg === theme);
    if (match) return match;
    return frames.find((el) => el.classList.contains("is-active")) || frames[0];
  }

  function ensureSrc(iframe) {
    if (!iframe || iframe.getAttribute("src")) return;
    const src = iframe.dataset.src;
    if (src) iframe.src = src;
  }

  function wakeSketch(iframe) {
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.dispatchEvent(new Event("resize"));
    } catch (e) {
      /* ignore */
    }
    iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
  }

  function syncThemeBackgrounds() {
    const theme = currentTheme();
    let active = frames.find((el) => el.dataset.themeBg === theme) || frames[0];

    frames.forEach((frame) => {
      const on = frame === active;
      frame.classList.toggle("is-active", on);
      if (on) ensureSrc(frame);
    });

    // Give the newly shown iframe a beat to layout, then resize/restart.
    if (active) {
      ensureSrc(active);
      requestAnimationFrame(() => {
        wakeSketch(active);
        setTimeout(() => wakeSketch(active), 120);
      });
    }
  }

  function restartBackgroundSketch() {
    const iframe = activeIframe();
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
  }

  function isInteractiveTarget(target) {
    return target.closest(
      "a, button, input, textarea, select, label, summary, [role='button'], [role='link']"
    );
  }

  function sendSketchPointer(clientX, clientY, phase) {
    const iframe = activeIframe();
    if (!iframe || !iframe.contentWindow) return;
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

  syncThemeBackgrounds();
  document.addEventListener("sketches101:themechange", syncThemeBackgrounds);

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
