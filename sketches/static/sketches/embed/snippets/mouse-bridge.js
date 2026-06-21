window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "sketch-mouse") return;
  window._parentMouseX = event.data.x;
  window._parentMouseY = event.data.y;
  var canvas = document.querySelector("canvas");
  if (!canvas) return;
  canvas.dispatchEvent(new MouseEvent("mousemove", {
    bubbles: true,
    cancelable: true,
    clientX: event.data.x,
    clientY: event.data.y,
    view: window
  }));
});
