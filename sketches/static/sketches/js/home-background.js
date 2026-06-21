document.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("home-bg-sketch");
  if (!iframe) return;

  function restartBackgroundSketch() {
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
  }

  function isInteractiveTarget(target) {
    return target.closest(
      "a, button, input, textarea, select, label, summary, [role='button'], [role='link']"
    );
  }

  document.addEventListener("mousemove", (event) => {
    const rect = iframe.getBoundingClientRect();
    iframe.contentWindow.postMessage(
      {
        type: "sketch-mouse",
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
      "*"
    );
  });

  document.addEventListener("click", (event) => {
    if (isInteractiveTarget(event.target)) return;
    restartBackgroundSketch();
  });
});
