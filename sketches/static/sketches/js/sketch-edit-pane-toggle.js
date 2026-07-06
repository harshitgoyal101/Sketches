document.addEventListener("DOMContentLoaded", () => {
  const workspace = document.querySelector("[data-edit-workspace]");
  const toggle = document.querySelector("[data-edit-pane-toggle]");
  if (!workspace || !toggle) return;

  const compactQuery = window.matchMedia("(max-width: 1024px)");
  const STORAGE_KEY = "sketches101-edit-mobile-pane";
  const buttons = [...toggle.querySelectorAll("[data-edit-pane]")];

  function setPane(pane, persist = true) {
    const isPreview = pane === "preview";
    workspace.classList.toggle("is-edit-pane-preview", isPreview);
    toggle.classList.toggle("is-preview-active", isPreview);

    buttons.forEach((btn) => {
      const active = btn.dataset.editPane === pane;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (persist && compactQuery.matches) {
      sessionStorage.setItem(STORAGE_KEY, pane);
    }

    if (isPreview && compactQuery.matches) {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
      return;
    }

    if (!isPreview && compactQuery.matches) {
      const codeSection = workspace.querySelector(".code-section-edit.code-ide");
      const activePanel = codeSection?.querySelector(
        ".code-ide-panel.is-active, .code-tab-panel.is-active, .code-tab-panel--single"
      );
      requestAnimationFrame(() => {
        if (typeof ensurePanelEditorHeight === "function") {
          ensurePanelEditorHeight(activePanel);
        }
        window.dispatchEvent(new Event("resize"));
      });
    }
  }

  function resetPane() {
    workspace.classList.remove("is-edit-pane-preview");
    toggle.classList.remove("is-preview-active");
    buttons.forEach((btn) => {
      const active = btn.dataset.editPane === "code";
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function initPane() {
    if (!compactQuery.matches) {
      resetPane();
      return;
    }

    const saved = sessionStorage.getItem(STORAGE_KEY);
    setPane(saved === "preview" ? "preview" : "code", false);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!compactQuery.matches) return;
      setPane(btn.dataset.editPane);
    });
  });

  compactQuery.addEventListener("change", initPane);
  initPane();
});
