/**
 * Landing IDE preview — full p5.js WEBGL star sphere sketch.
 * Canvas fills .landing-ide-preview edge-to-edge.
 */
(function () {
  var P5_CDN = "https://cdn.jsdelivr.net/npm/p5@1.11.0/lib/p5.min.js";

  function isLight() {
    return document.documentElement.classList.contains("theme-light");
  }

  function palette() {
    if (isLight()) {
      return {
        bg: [248, 250, 252],
        star: [123, 97, 255],
      };
    }
    return {
      bg: [8, 8, 16],
      star: [210, 230, 255],
    };
  }

  function targetPixelDensity(p, w, h) {
    var dpr = window.devicePixelRatio || 1;
    var area = w * h;
    if (area >= 2073600) return Math.min(dpr, 1);
    if (area >= 921600) return Math.min(dpr, 1.25);
    if (area >= 480000) return Math.min(dpr, 1.5);
    return Math.min(dpr, 2);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function buildSketch(host) {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var sketch = null;
    var ro = null;
    var preview = host.closest(".landing-ide-preview") || host;

    var resizePreview = function () {};

    function previewSize() {
      return {
        w: Math.max(1, preview.clientWidth),
        h: Math.max(1, preview.clientHeight),
      };
    }

    function styleCanvas(canvas) {
      if (!canvas || !canvas.elt) return;
      canvas.elt.style.display = "block";
      canvas.elt.style.margin = "0";
      canvas.elt.style.padding = "0";
      canvas.elt.style.width = "100%";
      canvas.elt.style.height = "100%";
      canvas.elt.style.border = "none";
      canvas.elt.style.borderRadius = "0";
    }

    sketch = new window.p5(function (p) {
      var stars = [];
      var noOfStars = 2000;
      var rotX = 0;
      var rotY = 0;
      var autoAngle = 0;

      function initStars() {
        stars = [];
        for (var i = 0; i < noOfStars; i++) {
          var r = 200 * p.pow(p.random(1), 2.2);
          stars.push({
            r: r,
            theta: p.random(p.TWO_PI),
            phi: p.acos(p.random(-1, 1)),
            speed: p.map(r, 0, 200, 0.012, 0.002),
            size: p.map(r, 0, 200, 3.2, 1.0),
            opacity: p.map(r, 0, 200, 255, 50),
          });
        }
      }

      function applyCanvasSize() {
        var size = previewSize();
        p.resizeCanvas(size.w, size.h);
        p.pixelDensity(targetPixelDensity(p, size.w, size.h));
        styleCanvas(p._renderer);
      }

      resizePreview = function () {
        applyCanvasSize();
        initStars();
      };

      p.setup = function () {
        var size = previewSize();
        var c = p.createCanvas(size.w, size.h, p.WEBGL);
        c.parent(host);
        c.elt.style.touchAction = "none";
        styleCanvas(c);
        p.pixelDensity(targetPixelDensity(p, size.w, size.h));
        initStars();
      };

      p.windowResized = function () {
        resizePreview();
      };

      p.draw = function () {
        var colors = palette();
        p.background(colors.bg[0], colors.bg[1], colors.bg[2]);

        if (!reduced) {
          autoAngle += 0.002;
        }

        rotY = p.lerp(rotY, p.map(p.mouseX, 0, p.width, -p.PI, p.PI), 0.03);
        rotX = p.lerp(rotX, p.map(p.mouseY, 0, p.height, p.PI / 2, -p.PI / 2), 0.03);

        p.rotateX(rotX);
        p.rotateY(rotY + autoAngle);

        p.noStroke();
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          if (!reduced) {
            s.theta += s.speed;
          }

          var x = s.r * p.sin(s.phi) * p.cos(s.theta);
          var y = s.r * p.sin(s.phi) * p.sin(s.theta);
          var z = s.r * p.cos(s.phi);

          p.push();
          p.translate(x, y, z);
          p.fill(colors.star[0], colors.star[1], colors.star[2], s.opacity);
          p.sphere(s.size, 4, 4);
          p.pop();
        }
      };
    });

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(function () {
        resizePreview();
      });
      ro.observe(preview);
    }

    window.addEventListener("resize", resizePreview);
    requestAnimationFrame(resizePreview);
    setTimeout(resizePreview, 150);

    return {
      remove: function () {
        window.removeEventListener("resize", resizePreview);
        if (ro) ro.disconnect();
        if (sketch) sketch.remove();
      },
    };
  }

  function init() {
    var host = document.getElementById("landing-ide-sketch-host");
    if (!host || host.dataset.sketchReady === "1") return;

    loadScript(P5_CDN)
      .then(function () {
        if (!window.p5 || host.dataset.sketchReady === "1") return;
        host.dataset.sketchReady = "1";
        buildSketch(host);
      })
      .catch(function () {
        /* ignore load failures */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
