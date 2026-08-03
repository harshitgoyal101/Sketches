/**
 * Particle-network home background (Django fallback).
 * Same motion everywhere: random wander, mutual + mouse repulsion.
 * Density scales with canvas size. Light theme uses deeper purple.
 */
(function () {
  var SPEED_MIN = 0.12;
  var SPEED_MAX = 0.38;
  var REPEL_DIST = 56;
  var REPEL_STRENGTH = 0.045;
  var MAX_SPEED = 0.55;
  var DAMPING = 0.992;
  var WANDER = 0.018;
  var MOUSE_REPEL_DIST = 140;
  var MOUSE_REPEL_STRENGTH = 0.085;
  var MAX_DIST = 140;
  var PX_PER_PARTICLE = 12000;
  var MIN_PARTICLES = 24;
  var MAX_PARTICLES = 140;

  function randomSlowVelocity() {
    var angle = Math.random() * Math.PI * 2;
    var speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  }

  function clampSpeed(n) {
    var s = Math.hypot(n.vx, n.vy);
    if (s > MAX_SPEED && s > 0) {
      var k = MAX_SPEED / s;
      n.vx *= k;
      n.vy *= k;
    }
  }

  function particleCount(width, height) {
    var area = Math.max(0, width) * Math.max(0, height);
    return Math.min(
      MAX_PARTICLES,
      Math.max(MIN_PARTICLES, Math.round(area / PX_PER_PARTICLE))
    );
  }

  function initParticles() {
    var canvas = document.querySelector(".landing-particle-canvas");
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var repelDist2 = REPEL_DIST * REPEL_DIST;
    var mouseRepelDist2 = MOUSE_REPEL_DIST * MOUSE_REPEL_DIST;
    var nodes = [];
    var W = 0;
    var H = 0;
    var dpr = 1;
    var raf = 0;
    var mouseX = 0;
    var mouseY = 0;
    var mouseActive = false;

    function isLight() {
      return document.documentElement.classList.contains("theme-light");
    }

    function palette() {
      if (isLight()) {
        return {
          bg: [248, 250, 252],
          col: [72, 42, 210],
          dotA: 0.62,
          lineA: 0.16,
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
      var n = particleCount(W, H);
      nodes = [];
      for (var i = 0; i < n; i++) {
        var v = randomSlowVelocity();
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: v.vx,
          vy: v.vy,
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

    function applyRepulsion() {
      var i, j, a, b, dx, dy, d2, dist, force, nx, ny;
      for (i = 0; i < nodes.length; i++) {
        for (j = i + 1; j < nodes.length; j++) {
          a = nodes[i];
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          d2 = dx * dx + dy * dy;
          if (d2 === 0 || d2 > repelDist2) continue;
          dist = Math.sqrt(d2);
          force = ((REPEL_DIST - dist) / REPEL_DIST) * REPEL_STRENGTH;
          nx = dx / dist;
          ny = dy / dist;
          a.vx += nx * force;
          a.vy += ny * force;
          b.vx -= nx * force;
          b.vy -= ny * force;
        }
      }
    }

    function applyMouseRepulsion() {
      if (!mouseActive) return;
      var i, n, dx, dy, d2, dist, force;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        dx = n.x - mouseX;
        dy = n.y - mouseY;
        d2 = dx * dx + dy * dy;
        if (d2 === 0 || d2 > mouseRepelDist2) continue;
        dist = Math.sqrt(d2);
        force =
          ((MOUSE_REPEL_DIST - dist) / MOUSE_REPEL_DIST) *
          MOUSE_REPEL_STRENGTH;
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      }
    }

    function syncMouse(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        mouseActive = false;
        return;
      }
      mouseX = ((clientX - rect.left) / rect.width) * W;
      mouseY = ((clientY - rect.top) / rect.height) * H;
      mouseActive =
        mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H;
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
      applyRepulsion();
      applyMouseRepulsion();
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.vx += (Math.random() - 0.5) * WANDER;
        n.vy += (Math.random() - 0.5) * WANDER;
        var speed = Math.hypot(n.vx, n.vy);
        if (speed < SPEED_MIN * 0.85) {
          var kick = randomSlowVelocity();
          n.vx += kick.vx * 0.35;
          n.vy += kick.vy * 0.35;
        }
        clampSpeed(n);
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

    document.addEventListener("mousemove", function (e) {
      syncMouse(e.clientX, e.clientY);
    });
    document.addEventListener("mouseleave", function () {
      mouseActive = false;
    });
    document.addEventListener(
      "touchmove",
      function (e) {
        if (!e.touches.length) return;
        syncMouse(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    document.addEventListener("touchend", function () {
      mouseActive = false;
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
