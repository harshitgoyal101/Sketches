(function () {
  var sources = __PROCESSING_SOURCES__;
  var runId = __RUN_ID__;

  function report(payload) {
    if (typeof parent !== "undefined" && parent !== window) {
      parent.postMessage(Object.assign({ type: "sketch-preview-error", runId: runId }, payload), "*");
    }
  }

  function getCombinedSource() {
    return sources.filter(function (source) {
      return typeof source === "string" && source.trim();
    }).join("\n\n");
  }

  function destroyInstance() {
    if (window.__processingInstance && typeof window.__processingInstance.exit === "function") {
      try {
        window.__processingInstance.exit();
      } catch (error) {
        // ignore cleanup failures
      }
    }
    window.__processingInstance = null;
  }

  function applyParentPointer(instance) {
    if (!instance || typeof window._parentMouseX !== "number") {
      return;
    }

    instance.mouseX = window._parentMouseX;
    instance.mouseY = window._parentMouseY;
  }

  function patchProcessingPointer(instance, canvas) {
    if (!instance || instance.__sketchPointerFallback) {
      return;
    }

    var draw = instance.draw;
    if (typeof draw !== "function") {
      return;
    }

    instance.draw = function () {
      applyParentPointer(instance);
      draw.apply(instance, arguments);
    };
    instance.__sketchPointerFallback = true;

    if (canvas) {
      canvas.style.touchAction = "none";
    }

    function syncParentPointer() {
      if (window.__processingInstance === instance) {
        applyParentPointer(instance);
        window.requestAnimationFrame(syncParentPointer);
      }
    }
    window.requestAnimationFrame(syncParentPointer);
  }

  function start() {
    if (typeof Processing === "undefined") {
      report({ message: "Processing.js failed to load." });
      return;
    }

    var host = document.getElementById("sketch-canvas-host");
    if (!host) {
      report({ message: "Processing preview host element is missing." });
      return;
    }

    destroyInstance();
    host.textContent = "";
    var canvas = document.createElement("canvas");
    host.appendChild(canvas);

    try {
      window.__processingInstance = new Processing(canvas, getCombinedSource());
      patchProcessingPointer(window.__processingInstance, canvas);
    } catch (error) {
      report({
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
      });
    }
  }

  window.onSketchRestart = function () {
    start();
  };

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start);
  }
})();
