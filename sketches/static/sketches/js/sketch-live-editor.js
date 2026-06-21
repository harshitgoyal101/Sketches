document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector(".code-section-live");
  if (!section) return;

  const canSave = section.dataset.canSave === "true";
  const isInteractive = section.dataset.isInteractive === "true";
  const sketchType = section.dataset.sketchType || "p5js";
  const saveUrl = section.dataset.saveUrl;
  const iframe = document.getElementById("sketch-preview");
  const runBtn = document.getElementById("run-sketch");
  const saveBtn = document.getElementById("save-sketch-source");
  const saveStatus = document.getElementById("code-save-status");
  const errorPanel = document.getElementById("sketch-code-errors");
  const errorTitle = document.getElementById("sketch-code-error-title");
  const errorMessage = document.getElementById("sketch-code-error-message");
  const dismissErrorsBtn = document.getElementById("dismiss-sketch-errors");
  let previewRunId = 0;
  let savedSnapshot = "";
  let hasUnsavedChanges = false;
  let errorType = null;

  function captureSnapshot() {
    return JSON.stringify(getEditorState().files);
  }

  function updateSaveStatus() {
    if (!canSave || !saveStatus) return;
    hasUnsavedChanges = captureSnapshot() !== savedSnapshot;
    saveStatus.textContent = hasUnsavedChanges ? "Edited" : "Saved";
    saveStatus.classList.toggle("is-edited", hasUnsavedChanges);
    saveStatus.classList.toggle("is-saved", !hasUnsavedChanges);
  }

  function clearErrors() {
    if (!errorPanel || !errorMessage) return;
    errorType = null;
    errorPanel.hidden = true;
    errorMessage.textContent = "";
    if (errorTitle) {
      errorTitle.textContent = "Sketch error";
    }
  }

  function showPanelError(title, message) {
    if (!errorPanel || !errorMessage) return;
    errorType = "save";
    if (errorTitle) {
      errorTitle.textContent = title;
    }
    errorMessage.textContent = message;
    errorPanel.hidden = false;
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

  function getPanelsInTabOrder() {
    const tabs = section.querySelectorAll(".code-tab");
    if (!tabs.length) {
      return [...section.querySelectorAll(".code-tab-panel")];
    }
    return [...tabs].map((tab) => {
      const index = tab.dataset.tabIndex;
      return document.getElementById(`code-panel-${index}`);
    }).filter(Boolean);
  }

  function getEditorState() {
    const panels = getPanelsInTabOrder();
    const files = panels.map((panel, order) => {
      const editor = panel.querySelector(".code-editor");
      return {
        filename: editor.dataset.filename,
        content: editor.value,
        is_main: editor.dataset.isMain === "true",
        asset_type: editor.dataset.assetType || "js",
        asset_id: editor.dataset.assetId ? Number(editor.dataset.assetId) : null,
        order: editor.dataset.isMain === "true" ? -1 : order - 1,
      };
    });
    const main = files.find((file) => file.is_main);
    const assets = files.filter((file) => !file.is_main);
    return { files, main, assets };
  }

  const embedReady = SketchEmbed.preload();

  async function runPreview() {
    if (!isInteractive || !iframe) return;
    const { main, assets } = getEditorState();
    if (!main) return;
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
          previewUrl: section.dataset.previewUrl,
          getCsrfToken,
        },
      );
    } catch (error) {
      console.error(error);
      showPanelError("Preview error", error.message || "Could not run preview.");
    }
  }

  window.sketchRunPreview = runPreview;
  window.sketchHasUnsavedChanges = () => canSave && hasUnsavedChanges;

  savedSnapshot = captureSnapshot();
  updateSaveStatus();

  if (runBtn) {
    runBtn.addEventListener("click", runPreview);
  }

  if (isInteractive && iframe) {
    runPreview();
  }

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

  let previewTimer = null;
  section.querySelectorAll(".code-editor").forEach((editor) => {
    editor.addEventListener("input", () => {
      updateSaveStatus();
      if (!isInteractive || !iframe) return;
      clearTimeout(previewTimer);
      previewTimer = setTimeout(runPreview, 700);
    });
  });

  function getCsrfToken() {
    const input = document.querySelector("[name=csrfmiddlewaretoken]");
    if (input) return input.value;
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  async function saveSource() {
    if (!canSave || !saveUrl || !saveBtn) return;
    const { files } = getEditorState();
    saveBtn.disabled = true;
    const originalLabel = saveBtn.textContent;
    saveBtn.textContent = "Saving…";

    try {
      const response = await fetch(saveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({ files }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Save failed");
      }
      savedSnapshot = captureSnapshot();
      updateSaveStatus();
      if (errorType === "save") {
        clearErrors();
      }
      saveBtn.textContent = "Saved!";
      saveBtn.classList.add("is-saved");
      setTimeout(() => {
        saveBtn.textContent = originalLabel;
        saveBtn.classList.remove("is-saved");
      }, 2000);
    } catch (error) {
      showPanelError("Save error", error.message || "Could not save changes.");
      saveBtn.textContent = "Save failed";
      saveBtn.classList.add("is-error");
      setTimeout(() => {
        saveBtn.textContent = originalLabel;
        saveBtn.classList.remove("is-error");
      }, 2500);
      console.error(error);
    } finally {
      saveBtn.disabled = false;
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", saveSource);
  }

  document.addEventListener("keydown", (event) => {
    if (!canSave || saveBtn?.disabled) return;
    const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
    if (!isSaveShortcut) return;
    event.preventDefault();
    saveSource();
  }, true);

  window.addEventListener("beforeunload", (event) => {
    if (!canSave || !hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = "";
  });

  const tabs = section.querySelectorAll(".code-tab");
  const panels = section.querySelectorAll(".code-tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const index = tab.dataset.tabIndex;

      tabs.forEach((item) => {
        item.classList.remove("is-active");
        item.setAttribute("aria-selected", "false");
      });
      panels.forEach((panel) => {
        panel.classList.remove("is-active");
        panel.hidden = true;
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

  const tabList = section.querySelector(".code-tabs");
  if (tabList) {
    let draggedTab = null;

    tabList.addEventListener("dragstart", (event) => {
      const tab = event.target.closest(".code-tab");
      if (!tab || tab.dataset.isMain === "true") {
        event.preventDefault();
        return;
      }
      draggedTab = tab;
      tab.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", tab.dataset.tabIndex);
    });

    tabList.addEventListener("dragend", () => {
      if (draggedTab) {
        draggedTab.classList.remove("is-dragging");
      }
      draggedTab = null;
      tabs.forEach((tab) => tab.classList.remove("is-drag-over"));
    });

    tabList.addEventListener("dragover", (event) => {
      if (!draggedTab) return;
      event.preventDefault();
      const target = event.target.closest(".code-tab");
      if (!target || target.dataset.isMain === "true" || target === draggedTab) return;
      target.classList.add("is-drag-over");
    });

    tabList.addEventListener("dragleave", (event) => {
      const target = event.target.closest(".code-tab");
      if (target) target.classList.remove("is-drag-over");
    });

    tabList.addEventListener("drop", (event) => {
      event.preventDefault();
      const target = event.target.closest(".code-tab");
      if (!draggedTab || !target || target.dataset.isMain === "true" || target === draggedTab) {
        return;
      }

      target.classList.remove("is-drag-over");

      const mainTab = tabList.querySelector(".code-tab--main");
      const movableTabs = [...tabList.querySelectorAll(".code-tab:not(.code-tab--main)")];
      const draggedIndex = movableTabs.indexOf(draggedTab);
      const targetIndex = movableTabs.indexOf(target);
      if (draggedIndex === -1 || targetIndex === -1) return;

      if (draggedIndex < targetIndex) {
        target.after(draggedTab);
      } else {
        target.before(draggedTab);
      }

      const orderedTabs = [mainTab, ...tabList.querySelectorAll(".code-tab:not(.code-tab--main)")];
      orderedTabs.forEach((tab, index) => {
        const panel = document.getElementById(`code-panel-${tab.dataset.tabIndex}`);
        tab.dataset.tabIndex = String(index);
        tab.setAttribute("aria-controls", `code-panel-${index}`);
        tab.id = `code-tab-${index}`;
        if (panel) {
          panel.id = `code-panel-${index}`;
          panel.setAttribute("aria-labelledby", `code-tab-${index}`);
        }
      });

      updateSaveStatus();
    });
  }
});
