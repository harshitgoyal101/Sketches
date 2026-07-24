(function () {
  var grids = [];
  var rafId = 0;
  var pendingX = 0;
  var pendingY = 0;
  var desktopMq = window.matchMedia("(min-width: 768px)");

  function refreshGrids() {
    grids = Array.prototype.slice.call(document.querySelectorAll(".network-grid"));
  }

  function clearGlow() {
    grids.forEach(function (grid) {
      grid.classList.remove("is-interactive-active");
    });
  }

  function apply(clientX, clientY) {
    grids.forEach(function (grid) {
      var rect = grid.getBoundingClientRect();
      if (
        clientX < rect.left - 220 ||
        clientX > rect.right + 220 ||
        clientY < rect.top - 220 ||
        clientY > rect.bottom + 220
      ) {
        grid.classList.remove("is-interactive-active");
        return;
      }

      grid.style.setProperty("--network-grid-x", (clientX - rect.left).toFixed(1) + "px");
      grid.style.setProperty("--network-grid-y", (clientY - rect.top).toFixed(1) + "px");
      grid.classList.add("is-interactive-active");
    });
  }

  function onMove(event) {
    if (!desktopMq.matches) return;
    pendingX = event.clientX;
    pendingY = event.clientY;
    if (rafId) return;
    rafId = window.requestAnimationFrame(function () {
      rafId = 0;
      apply(pendingX, pendingY);
    });
  }

  function syncGlowColor() {
    var primary =
      getComputedStyle(document.documentElement).getPropertyValue("--gallery-primary").trim() ||
      "#7b61ff";
    grids.forEach(function (grid) {
      grid.style.setProperty("--network-grid-glow", primary);
    });
  }

  function onBreakpointChange() {
    if (!desktopMq.matches) clearGlow();
  }

  function init() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    refreshGrids();
    if (!grids.length) return;

    grids.forEach(function (grid) {
      var style = window.getComputedStyle(grid);
      if (style.position === "static") {
        grid.style.position = "relative";
      }
    });

    syncGlowColor();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("sketches101:themechange", syncGlowColor);
    if (desktopMq.addEventListener) {
      desktopMq.addEventListener("change", onBreakpointChange);
    } else if (desktopMq.addListener) {
      desktopMq.addListener(onBreakpointChange);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
