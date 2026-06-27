document.addEventListener("DOMContentLoaded", () => {
  const restartBtn = document.getElementById("restart-preview");
  const restartOverlay = document.getElementById("restart-preview-overlay");
  const fullscreenBtn = document.getElementById("fullscreen-preview");
  const fullscreenOverlay = document.getElementById("fullscreen-preview-overlay");
  const shareBtn = document.getElementById("share-sketch");
  const viewSourceBtn = document.getElementById("view-source-btn");

  function triggerRestart() {
    if (restartBtn) {
      restartBtn.click();
      return;
    }
    const iframe = document.getElementById("sketch-preview");
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
    } else if (iframe) {
      iframe.src = iframe.src;
    }
  }

  if (restartOverlay) {
    restartOverlay.addEventListener("click", (event) => {
      event.stopPropagation();
      triggerRestart();
    });
  }

  function triggerFullscreen() {
    const previewWrap = document.getElementById("preview-frame-wrap");
    if (fullscreenBtn) {
      fullscreenBtn.click();
      return;
    }
    if (previewWrap?.requestFullscreen) {
      previewWrap.requestFullscreen();
    }
  }

  if (fullscreenOverlay) {
    fullscreenOverlay.addEventListener("click", (event) => {
      event.stopPropagation();
      triggerFullscreen();
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = window.location.href;
      const title = document.title;
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        shareBtn.querySelector(".share-label").textContent = "Copied!";
        window.setTimeout(() => {
          shareBtn.querySelector(".share-label").textContent = "Share";
        }, 2000);
      } catch (_error) {
        /* user cancelled share or clipboard blocked */
      }
    });
  }

  if (viewSourceBtn) {
    viewSourceBtn.addEventListener("click", (event) => {
      const target = document.getElementById("source-code");
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
});
