document.addEventListener("DOMContentLoaded", () => {
  const workspace = document.querySelector("[data-edit-workspace]");
  if (!workspace) return;

  const resizer = workspace.querySelector(".sketch-edit-resizer");
  const sidebar = workspace.querySelector(".sketch-edit-sidebar");
  const main = workspace.querySelector(".sketch-edit-main");
  if (!resizer || !sidebar || !main) return;

  const STORAGE_KEY = "sketches101-edit-sidebar-width";
  const MIN_SIDEBAR = 280;
  const MIN_MAIN = 320;
  const RESIZER_WIDTH = resizer.offsetWidth || 12;
  const desktopQuery = window.matchMedia("(min-width: 1025px)");

  function isDesktopLayout() {
    return desktopQuery.matches;
  }

  function maxSidebarWidth() {
    const available = workspace.clientWidth - MIN_MAIN - RESIZER_WIDTH;
    return Math.max(MIN_SIDEBAR, available);
  }

  function clampSidebarWidth(width) {
    return Math.min(Math.max(width, MIN_SIDEBAR), maxSidebarWidth());
  }

  function measuredSidebarWidth() {
    return sidebar.getBoundingClientRect().width;
  }

  function currentSidebarWidth() {
    const raw = workspace.style.getPropertyValue("--edit-sidebar-width").trim();
    if (raw.endsWith("px")) {
      return parseInt(raw, 10);
    }
    return measuredSidebarWidth();
  }

  function applySidebarWidth(width, persist) {
    if (!isDesktopLayout()) return;

    const clamped = clampSidebarWidth(width);
    workspace.style.setProperty("--edit-sidebar-width", `${clamped}px`);
    resizer.setAttribute("aria-valuemin", String(MIN_SIDEBAR));
    resizer.setAttribute("aria-valuemax", String(maxSidebarWidth()));
    resizer.setAttribute("aria-valuenow", String(clamped));
    if (persist) {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    }
  }

  function resetSidebarWidth() {
    workspace.style.removeProperty("--edit-sidebar-width");
  }

  function loadSavedWidth() {
    if (!isDesktopLayout()) {
      resetSidebarWidth();
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!Number.isNaN(parsed)) {
        applySidebarWidth(parsed, false);
        return;
      }
    }

    applySidebarWidth(measuredSidebarWidth(), false);
  }

  loadSavedWidth();

  let dragging = false;

  function sidebarWidthFromPointer(clientX) {
    const rect = workspace.getBoundingClientRect();
    return rect.right - clientX;
  }

  function onPointerMove(event) {
    if (!dragging) return;
    applySidebarWidth(sidebarWidthFromPointer(event.clientX), false);
  }

  function stopDrag(event) {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove("is-dragging");
    document.body.classList.remove("sketch-edit-resizing");
    if (event?.pointerId != null && resizer.hasPointerCapture(event.pointerId)) {
      resizer.releasePointerCapture(event.pointerId);
    }
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", stopDrag);
    document.removeEventListener("pointercancel", stopDrag);
    applySidebarWidth(currentSidebarWidth(), true);
  }

  resizer.addEventListener("pointerdown", (event) => {
    if (!isDesktopLayout()) return;
    if (event.button !== 0) return;

    event.preventDefault();
    dragging = true;
    resizer.classList.add("is-dragging");
    document.body.classList.add("sketch-edit-resizing");
    resizer.setPointerCapture(event.pointerId);
    applySidebarWidth(sidebarWidthFromPointer(event.clientX), false);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", stopDrag);
    document.addEventListener("pointercancel", stopDrag);
  });

  resizer.addEventListener("keydown", (event) => {
    if (!isDesktopLayout()) return;

    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applySidebarWidth(currentSidebarWidth() + step, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applySidebarWidth(currentSidebarWidth() - step, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      applySidebarWidth(maxSidebarWidth(), true);
    } else if (event.key === "End") {
      event.preventDefault();
      applySidebarWidth(MIN_SIDEBAR, true);
    }
  });

  desktopQuery.addEventListener("change", loadSavedWidth);

  window.addEventListener("resize", () => {
    if (!isDesktopLayout()) {
      resetSidebarWidth();
      return;
    }
    applySidebarWidth(currentSidebarWidth(), true);
  });
});
