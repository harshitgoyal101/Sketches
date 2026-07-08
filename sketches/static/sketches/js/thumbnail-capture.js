window.SketchThumbnailCapture = (function () {
  const DEFAULT_TIMEOUT_MS = 20000;
  const DEFAULT_SETTLE_FRAMES = 45;

  const CANVAS_SELECTORS = [
    "#sketch-canvas-host canvas",
    ".p5Canvas canvas",
    "main canvas",
    "canvas",
  ];

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function findSketchCanvas(doc) {
    for (const selector of CANVAS_SELECTORS) {
      const canvas = doc.querySelector(selector);
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        return canvas;
      }
    }

    const canvases = Array.from(doc.querySelectorAll("canvas")).filter(
      (canvas) => canvas.width > 0 && canvas.height > 0,
    );
    if (!canvases.length) {
      return null;
    }

    return canvases.reduce((best, canvas) => {
      const bestArea = best.width * best.height;
      const area = canvas.width * canvas.height;
      return area > bestArea ? canvas : best;
    });
  }

  function waitForCanvas(doc, timeoutMs = DEFAULT_TIMEOUT_MS, settleFrames = DEFAULT_SETTLE_FRAMES) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      let stableFrames = 0;
      const frame = doc.defaultView
        ? doc.defaultView.requestAnimationFrame.bind(doc.defaultView)
        : requestAnimationFrame;

      function tick() {
        const canvas = findSketchCanvas(doc);
        if (canvas) {
          stableFrames += 1;
          if (stableFrames >= settleFrames) {
            resolve(canvas);
            return;
          }
          frame(tick);
          return;
        }

        stableFrames = 0;
        if (Date.now() - started > timeoutMs) {
          reject(new Error("Preview canvas was not ready in time."));
          return;
        }
        frame(tick);
      }

      frame(tick);
    });
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Could not export the preview canvas."));
        }, "image/png");
      } catch (error) {
        reject(error);
      }
    });
  }

  function exportCanvasPixels(canvas) {
    const exportCanvas = canvas.ownerDocument.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const context = exportCanvas.getContext("2d");
    if (!context) {
      throw new Error("Could not read the preview canvas.");
    }

    context.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    return exportCanvas;
  }

  async function captureFromCanvas(canvas) {
    if (!canvas || canvas.width < 1 || canvas.height < 1) {
      throw new Error("Preview canvas is not ready.");
    }
    return canvasToBlob(exportCanvasPixels(canvas));
  }

  async function captureFromDocument(doc) {
    const canvas = await waitForCanvas(doc);
    return captureFromCanvas(canvas);
  }

  async function captureFromIframe(iframe) {
    if (!iframe) {
      throw new Error("Preview iframe is not available.");
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error("Cannot access the preview iframe.");
    }

    if (!findSketchCanvas(doc)) {
      const restart = document.getElementById("restart-preview");
      if (restart) {
        restart.click();
      }
      await wait(600);
    }

    return captureFromDocument(doc);
  }

  async function captureFromEmbedUrl(embedUrl) {
    const iframe = document.createElement("iframe");
    const captureWidth = 1280;
    const captureHeight = 720;
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.setAttribute("title", "Thumbnail capture");
    iframe.style.cssText = [
      "position:fixed",
      "left:-10000px",
      "top:0",
      `width:${captureWidth}px`,
      `height:${captureHeight}px`,
      "border:0",
      "opacity:0",
      "pointer-events:none",
    ].join(";");

    document.body.appendChild(iframe);

    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Preview embed timed out.")), DEFAULT_TIMEOUT_MS);
        iframe.addEventListener(
          "load",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
        iframe.addEventListener(
          "error",
          () => {
            clearTimeout(timer);
            reject(new Error("Preview embed failed to load."));
          },
          { once: true },
        );
        iframe.src = embedUrl;
      });

      await wait(300);
      return await captureFromIframe(iframe);
    } finally {
      iframe.remove();
    }
  }

  async function uploadThumbnail(blob, uploadUrl, csrfToken) {
    const formData = new FormData();
    formData.append("image", blob, "thumbnail.png");
    formData.append("format", "json");

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
        Accept: "application/json",
      },
      body: formData,
      credentials: "same-origin",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Thumbnail upload failed.");
    }
    return payload;
  }

  return {
    captureFromCanvas,
    captureFromDocument,
    captureFromIframe,
    captureFromEmbedUrl,
    uploadThumbnail,
  };
})();
