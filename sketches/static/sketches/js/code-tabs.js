document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".code-tab");
  const panels = document.querySelectorAll(".code-tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const index = tab.dataset.tabIndex;

      tabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      panels.forEach((p) => {
        p.classList.remove("is-active");
        p.hidden = true;
      });

      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      const panel = document.getElementById(`code-panel-${index}`);
      if (panel) {
        panel.classList.add("is-active");
        panel.hidden = false;
      }
    });
  });
});
