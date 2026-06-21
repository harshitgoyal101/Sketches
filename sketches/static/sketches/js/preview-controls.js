document.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("sketch-preview");
  const restartBtn = document.getElementById("restart-preview");
  const fullscreenBtn = document.getElementById("fullscreen-preview");
  const previewWrap = document.getElementById("preview-frame-wrap");
  const liveEditor = document.querySelector(".code-section-live");
  const createPreview = document.getElementById("create-preview-panel");
  const interactivePreview = liveEditor || createPreview;

  function restartPreview() {
    if (!iframe) return;

    const canUseLiveEditor = typeof window.sketchRunPreview === "function";
    const hasUnsavedChanges = typeof window.sketchHasUnsavedChanges === "function"
      && window.sketchHasUnsavedChanges();
    const canSoftRestart = iframe.contentWindow && !hasUnsavedChanges;

    if (canSoftRestart) {
      iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
      return;
    }

    if (canUseLiveEditor) {
      window.sketchRunPreview();
      return;
    }

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
    } else {
      iframe.src = iframe.src;
    }
  }

  if (restartBtn && iframe) {
    restartBtn.addEventListener("click", restartPreview);
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "sketch-preview-restart") {
      restartPreview();
    }
  });

  if (interactivePreview && iframe && previewWrap) {
    previewWrap.classList.add("is-click-restart");

    previewWrap.addEventListener("click", (event) => {
      if (event.target.closest(".preview-toolbar")) return;
      restartPreview();
    });

    document.addEventListener("mousemove", (event) => {
      const rect = previewWrap.getBoundingClientRect();
      const insidePreview = (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
      if (!insidePreview || !iframe.contentWindow) return;

      iframe.contentWindow.postMessage(
        {
          type: "sketch-mouse",
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        "*"
      );
    });
  }

  if (fullscreenBtn && previewWrap) {
    fullscreenBtn.addEventListener("click", () => {
      if (previewWrap.requestFullscreen) {
        previewWrap.requestFullscreen();
      }
    });
  }
});
