document.addEventListener("DOMContentLoaded", () => {
  const codeSection = document.querySelector(".code-section-edit.code-ide");
  const iframe = document.getElementById("sketch-preview");
  if (!codeSection || !iframe || typeof SketchEmbed === "undefined") return;

  const errorPanel = document.getElementById("create-preview-errors");
  const errorTitle = document.getElementById("create-preview-error-title");
  const errorMessage = document.getElementById("create-preview-error-message");
  const dismissErrorsBtn = document.getElementById("dismiss-create-preview-errors");

  let previewRunId = 0;
  let previewTimer = null;
  let errorType = null;
  const embedReady = SketchEmbed.preload();
  const PREVIEW_DEBOUNCE_MS = 700;

  function clearErrors() {
    if (!errorPanel || !errorMessage) return;
    errorType = null;
    errorPanel.hidden = true;
    errorMessage.textContent = "";
    if (errorTitle) {
      errorTitle.textContent = "Sketch error";
    }
  }

  function showRuntimeError(detail) {
    if (!errorPanel || !errorMessage) return;
    errorType = "runtime";

    const lines = [];
    if (detail.message) {
      lines.push(detail.message);
    }
    if (detail.source && detail.line) {
      const location = detail.col
        ? `${detail.source}:${detail.line}:${detail.col}`
        : `${detail.source}:${detail.line}`;
      lines.push(`  at ${location}`);
    }
    if (detail.stack) {
      lines.push("");
      lines.push(detail.stack);
    }
    if (!lines.length) {
      lines.push("An unknown error occurred while running the sketch.");
    }

    if (errorTitle) {
      errorTitle.textContent = "Sketch error";
    }
    errorMessage.textContent = lines.join("\n");
    errorPanel.hidden = false;
  }

  function getEditorState() {
    const mainCodeInput = codeSection.querySelector('[name="code"]');
    const entryFilenameInput = codeSection.querySelector('[name="entry_filename"]');
    const main = {
      content: mainCodeInput?.value || "",
      filename: (entryFilenameInput?.value || "").trim() || "sketch.js",
    };

    const assets = [];
    codeSection.querySelectorAll("[data-asset-panel]").forEach((panel) => {
      const deleteInput = panel.querySelector('input[name$="-DELETE"]');
      if (deleteInput?.checked) return;

      const filenameInput = panel.querySelector('input[name$="-filename"]');
      const typeInput = panel.querySelector('[name$="-asset_type"]');
      const orderInput = panel.querySelector('input[name$="-order"]');
      const contentInput = panel.querySelector("textarea");
      if (!contentInput) return;

      const filename = (filenameInput?.value || "").trim() || "file.js";
      let assetType = typeInput?.value;
      if (!assetType) {
        assetType = filename.endsWith(".css") ? "css" : "js";
      }

      assets.push({
        content: contentInput.value,
        asset_type: assetType,
        order: Number(orderInput?.value || 0),
      });
    });

    assets.sort((left, right) => left.order - right.order);
    return { main, assets };
  }

  function getCsrfToken() {
    const input = document.querySelector("[name=csrfmiddlewaretoken]");
    if (input?.value) return input.value;
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  async function runPreview() {
    const sketchType = codeSection.dataset.sketchType || "p5js";
    const { main, assets } = getEditorState();
    previewRunId += 1;
    const currentRunId = previewRunId;

    if (errorType === "runtime") {
      clearErrors();
    }

    try {
      await SketchPreviewIframe.render(
        iframe,
        {
          mainCode: main.content,
          assets,
          sketchType,
          mode: "live",
          runId: currentRunId,
        },
        {
          embedReady,
          previewUrl: codeSection.dataset.previewUrl,
          getCsrfToken,
        },
      );
    } catch (error) {
      console.error(error);
      showRuntimeError({ message: error.message || "Preview failed" });
    }
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      runPreview().catch((error) => {
        console.error(error);
      });
    }, PREVIEW_DEBOUNCE_MS);
  }

  window.sketchRunPreview = runPreview;
  window.sketchHasUnsavedChanges = () => true;

  codeSection.addEventListener("input", (event) => {
    if (!event.target.matches("textarea, [name='entry_filename']")) return;
    schedulePreview();
  });

  codeSection.addEventListener("change", (event) => {
    if (!event.target.matches('[name$="-asset_type"], [name$="-filename"]')) return;
    schedulePreview();
  });

  codeSection.addEventListener("sketch-type-changed", () => {
    schedulePreview();
  });

  codeSection.addEventListener("sketch-source-changed", () => {
    schedulePreview();
  });

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data) return;
    if (data.type === "sketch-preview-restart") {
      runPreview();
      return;
    }
    if (data.type !== "sketch-preview-error") return;
    if (data.runId !== previewRunId) return;
    showRuntimeError(data);
  });

  if (dismissErrorsBtn) {
    dismissErrorsBtn.addEventListener("click", clearErrors);
  }

  runPreview().catch((error) => {
    console.error(error);
  });
});
