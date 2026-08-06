(function () {
  function clearParentMouse() {
    delete window._parentMouseX;
    delete window._parentMouseY;
  }

  function applyParentMouse(x, y, phase) {
    window._parentMouseX = x;
    window._parentMouseY = y;

    var instance = window.__processingInstance;
    if (instance) {
      instance.mouseX = x;
      instance.mouseY = y;
    }

    var canvas = document.querySelector("canvas");
    if (!canvas) return;

    var pageX = x + window.pageXOffset;
    var pageY = y + window.pageYOffset;
    var mouseType = phase === "start" ? "mousedown" : phase === "end" ? "mouseup" : "mousemove";
    var buttons = phase === "end" ? 0 : 1;

    canvas.dispatchEvent(new MouseEvent(mouseType, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pageX: pageX,
      pageY: pageY,
      screenX: x,
      screenY: y,
      view: window,
      button: 0,
      buttons: buttons,
    }));

    if (phase !== "end") {
      canvas.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pageX: pageX,
        pageY: pageY,
        screenX: x,
        screenY: y,
        view: window,
        button: 0,
        buttons: buttons,
      }));
    }
  }

  window.addEventListener("message", function (event) {
    if (!event.data) return;

    if (event.data.type === "sketch-mouse-clear") {
      clearParentMouse();
      return;
    }

    if (event.data.type !== "sketch-mouse") return;

    var x = event.data.x;
    var y = event.data.y;
    if (typeof x !== "number" || typeof y !== "number") return;

    applyParentMouse(x, y, event.data.phase || "move");
  });

  // Native iframe interaction (e.g. detail fullscreen) must win over stale
  // parent-forwarded coords used by pointerX()/pointerY() helpers.
  ["mousemove", "mousedown", "touchstart", "touchmove"].forEach(function (type) {
    window.addEventListener(
      type,
      function (event) {
        if (event.isTrusted) clearParentMouse();
      },
      { capture: true, passive: true }
    );
  });
})();
