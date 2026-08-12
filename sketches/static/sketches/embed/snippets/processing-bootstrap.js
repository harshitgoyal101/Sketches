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

  function bindScoreBridge(instance) {
    if (!instance || typeof instance.setScoreBridge !== "function") {
      return;
    }
    instance.setScoreBridge({
      submit: function (game, score) {
        if (typeof parent === "undefined" || parent === window) return;
        parent.postMessage(
          {
            type: "sketches101-score",
            game: String(game || ""),
            score: Math.floor(Number(score) || 0),
          },
          "*"
        );
      },
    });
  }

  function resizeInstance(instance) {
    if (!instance || typeof instance.size !== "function") return;
    try {
      instance.size(window.innerWidth, window.innerHeight);
    } catch (error) {
      // ignore resize failures on older sketches
    }
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
      canvas.style.webkitUserSelect = "none";
      canvas.style.userSelect = "none";
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
    host.style.touchAction = "none";
    var canvas = document.createElement("canvas");
    host.appendChild(canvas);

    try {
      var source = getCombinedSource();
      var sketchOpts = null;
      if (typeof Processing.compile === "function") {
        sketchOpts = Processing.compile(source);
        sketchOpts.onLoad = function (p) {
          if (typeof window.loadAudio === "function") {
            p.loadAudio = window.loadAudio;
          } else {
            p.loadAudio = function (path) {
              return new Audio(path);
            };
          }
        };
      }
      window.__processingInstance = new Processing(
        canvas,
        sketchOpts || source
      );
      patchProcessingPointer(window.__processingInstance, canvas);
      bindScoreBridge(window.__processingInstance);
      resizeInstance(window.__processingInstance);
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

  window.addEventListener("resize", function () {
    resizeInstance(window.__processingInstance);
  });

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start);
  }
})();
