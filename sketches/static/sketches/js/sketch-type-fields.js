document.addEventListener("DOMContentLoaded", () => {
  const typeField = document.querySelector("#id_sketch_type");
  const codeSection = document.querySelector(".code-section-edit.code-ide");
  if (!typeField || !codeSection) return;

  const filenameInput = document.querySelector('[name="entry_filename"]');
  const mainTabLabel = document.querySelector("#code-ide-tab-main .code-ide-tab-label");
  const statusLabel = document.getElementById("code-ide-status-label");
  const mainCodeInput = document.querySelector('[name="code"]');
  const typePicker = document.querySelector(".sketch-type-picker");
  const isCreatePage = Boolean(typePicker);

  const startersEl = document.getElementById("sketch-starter-templates");
  const starters = startersEl ? JSON.parse(startersEl.textContent) : null;

  let lastAppliedType = typeField.value || "p5js";

  function starterFor(type) {
    return starters?.[type] || null;
  }

  function defaultFilename(type) {
    return starterFor(type)?.filename || (type === "processing" ? "sketch.pde" : "sketch.js");
  }

  function defaultLabel(type) {
    return starterFor(type)?.label || (type === "processing" ? "Processing" : "p5.js");
  }

  function shouldReplaceFilename(nextType) {
    if (!filenameInput) return false;
    const current = filenameInput.value.trim();
    if (!current) return true;
    const previousDefault = defaultFilename(lastAppliedType);
    const nextDefault = defaultFilename(nextType);
    return current === previousDefault || current === nextDefault;
  }

  function shouldReplaceCode(nextType) {
    if (!mainCodeInput || !starters) return false;
    const current = mainCodeInput.value;
    if (!current.trim()) return true;
    const previousStarter = starterFor(lastAppliedType)?.code || "";
    const nextStarter = starterFor(nextType)?.code || "";
    const otherStarter = starterFor(nextType === "processing" ? "p5js" : "processing")?.code || "";
    return current === previousStarter || current === nextStarter || current === otherStarter;
  }

  function refreshMainEditor() {
    if (!mainCodeInput) return;
    mainCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function syncTypePicker(type) {
    if (!typePicker) return;
    typePicker.querySelectorAll("[data-sketch-type]").forEach((button) => {
      const active = button.dataset.sketchType === type;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function applySketchType(type) {
    const isProcessing = type === "processing";
    codeSection.dataset.sketchType = type;
    typeField.value = type;

    if (filenameInput) {
      filenameInput.placeholder = defaultFilename(type);
      if (shouldReplaceFilename(type)) {
        filenameInput.value = defaultFilename(type);
      }
    }

    if (mainTabLabel) {
      const label = filenameInput?.value.trim() || defaultFilename(type);
      mainTabLabel.textContent = label;
    }

    if (statusLabel) {
      statusLabel.textContent = `${defaultLabel(type)} · UTF-8 · Spaces: 2 · Tab indent · ⌘/ Ctrl+/ comment`;
    }

    if (mainCodeInput) {
      mainCodeInput.dataset.editorLang = isProcessing ? "java" : "javascript";
      if (isCreatePage && shouldReplaceCode(type)) {
        const starter = starterFor(type);
        if (starter?.code) {
          mainCodeInput.value = starter.code;
        }
      }
      refreshMainEditor();
    }

    syncTypePicker(type);
    lastAppliedType = type;
    codeSection.dispatchEvent(new CustomEvent("sketch-type-changed", {
      bubbles: true,
      detail: { type },
    }));
  }

  applySketchType(lastAppliedType);

  typeField.addEventListener("change", () => applySketchType(typeField.value || "p5js"));

  if (typePicker) {
    typePicker.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sketch-type]");
      if (!button) return;
      const nextType = button.dataset.sketchType;
      if (!nextType || nextType === typeField.value) return;
      typeField.value = nextType;
      applySketchType(nextType);
    });
  }
});
