window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "sketch-mouse") return;

  var x = event.data.x;
  var y = event.data.y;
  window._parentMouseX = x;
  window._parentMouseY = y;

  var canvas = document.querySelector("canvas");
  if (!canvas) return;

  var phase = event.data.phase || "move";
  var mouseType = phase === "start" ? "mousedown" : phase === "end" ? "mouseup" : "mousemove";
  var buttons = phase === "end" ? 0 : 1;

  canvas.dispatchEvent(new MouseEvent(mouseType, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
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
      view: window,
      button: 0,
      buttons: buttons,
    }));
  }
});
