(function () {
  function requestRestart() {
    parent.postMessage({ type: "sketch-preview-restart" }, "*");
  }

  document.addEventListener("click", function (event) {
    var canvas = document.querySelector("canvas");
    if (!canvas) {
      requestRestart();
      return;
    }
    var rect = canvas.getBoundingClientRect();
    var insideCanvas = (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
    if (!insideCanvas) {
      requestRestart();
    }
  }, true);

  document.addEventListener("dblclick", function (event) {
    var canvas = document.querySelector("canvas");
    if (!canvas) {
      return;
    }
    var rect = canvas.getBoundingClientRect();
    var insideCanvas = (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
    if (insideCanvas) {
      requestRestart();
    }
  }, true);
})();
