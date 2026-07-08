window.SketchPointerForward = (function () {
  function getPointerFrameRect(previewWrap) {
    const stage = previewWrap.querySelector(".sketch-detail-preview-stage");
    return (stage || previewWrap).getBoundingClientRect();
  }

  function bind({ iframe, previewWrap, clickRestart = false }) {
    if (!iframe || !previewWrap || previewWrap.dataset.pointerForwardBound === "true") {
      return;
    }
    previewWrap.dataset.pointerForwardBound = "true";

    if (clickRestart) {
      previewWrap.classList.add("is-click-restart");
    }

    function sendSketchPointer(clientX, clientY, phase) {
      const rect = getPointerFrameRect(previewWrap);
      const insidePreview = (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
      if (!insidePreview || !iframe.contentWindow) return;

      iframe.contentWindow.postMessage(
        {
          type: "sketch-mouse",
          x: clientX - rect.left,
          y: clientY - rect.top,
          phase,
        },
        "*"
      );
    }

    document.addEventListener("mousemove", (event) => {
      sendSketchPointer(event.clientX, event.clientY, "move");
    });

    previewWrap.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 0) return;
        const touch = event.touches[0];
        sendSketchPointer(touch.clientX, touch.clientY, "start");
      },
      { passive: true }
    );

    previewWrap.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length === 0) return;
        const touch = event.touches[0];
        sendSketchPointer(touch.clientX, touch.clientY, "move");
      },
      { passive: true }
    );

    previewWrap.addEventListener(
      "touchend",
      (event) => {
        if (event.changedTouches.length === 0) return;
        const touch = event.changedTouches[0];
        sendSketchPointer(touch.clientX, touch.clientY, "end");
      },
      { passive: true }
    );
  }

  return { bind };
})();
