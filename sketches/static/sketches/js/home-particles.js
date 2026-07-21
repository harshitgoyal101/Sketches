/**
 * Particle-network fallback when no home background sketch is set.
 * Colors match Figma Make: dark = white on #0D0D0D; light = muted #7B61FF on #F8FAFC.
 */
(function () {
  function initParticles() {
    var canvas = document.getElementById("home-particle-canvas");
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var N = 90;
    var MAX_DIST = 150;
    var nodes = [];
    var W = 0;
    var H = 0;
    var dpr = 1;
    var raf = 0;

    function isLight() {
      return document.documentElement.classList.contains("theme-light");
    }

    function palette() {
      if (isLight()) {
        return {
          bg: [248, 250, 252],
          col: [123, 97, 255],
          dotA: 0.35,
          lineA: 0.08,
        };
      }
      return {
        bg: [13, 13, 13],
        col: [255, 255, 255],
        dotA: 0.5,
        lineA: 0.13,
      };
    }

    function targetDpr(width, height) {
      var native = Math.min(window.devicePixelRatio || 1, 2);
      var area = width * height;
      if (area >= 2073600) return Math.min(native, 1);
      if (area >= 921600) return Math.min(native, 1.25);
      if (area >= 480000) return Math.min(native, 1.5);
      return native;
    }

    function initNodes() {
      nodes = [];
      for (var i = 0; i < N; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: 1.5 + Math.random() * 1.5,
        });
      }
    }

    function resize() {
      var parent = canvas.parentElement;
      var nextW = parent ? parent.offsetWidth : canvas.offsetWidth;
      var nextH = parent ? parent.offsetHeight : canvas.offsetHeight;
      if (nextW === W && nextH === H && nodes.length) return;

      W = nextW;
      H = nextH;
      dpr = targetDpr(W, H);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes();
    }

    function draw() {
      var p = palette();
      ctx.fillStyle = "rgb(" + p.bg[0] + "," + p.bg[1] + "," + p.bg[2] + ")";
      ctx.fillRect(0, 0, W, H);
      var i, j, dx, dy, d2, a, n;
      var cr = p.col[0];
      var cg = p.col[1];
      var cb = p.col[2];

      for (i = 0; i < nodes.length; i++) {
        for (j = i + 1; j < nodes.length; j++) {
          dx = nodes[i].x - nodes[j].x;
          dy = nodes[i].y - nodes[j].y;
          d2 = dx * dx + dy * dy;
          if (d2 > MAX_DIST * MAX_DIST) continue;
          a = (1 - Math.sqrt(d2) / MAX_DIST) * p.lineA;
          ctx.beginPath();
          ctx.strokeStyle = "rgba(" + cr + "," + cg + "," + cb + "," + a + ")";
          ctx.lineWidth = 0.8;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "rgba(" + cr + "," + cg + "," + cb + "," + p.dotA + ")";
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -10) n.x = W + 10;
        else if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10;
        else if (n.y > H + 10) n.y = -10;
      }
      draw();
    }

    resize();
    var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);

    document.addEventListener("sketches101:themechange", function () {
      draw();
    });

    if (reduced) {
      draw();
      return;
    }

    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(tick);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initParticles);
  } else {
    initParticles();
  }
})();
