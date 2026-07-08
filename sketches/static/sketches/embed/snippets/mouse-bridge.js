window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "sketch-mouse") return;

  var x = event.data.x;
  var y = event.data.y;
  if (typeof x !== "number" || typeof y !== "number") return;

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
  var phase = event.data.phase || "move";
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
});
