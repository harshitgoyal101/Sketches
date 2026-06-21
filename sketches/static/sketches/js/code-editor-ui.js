const EDITOR_THEME_KEY = "sketches-code-editor-theme";
const EDITOR_MIN_HEIGHT = 320;

function resolveEditorLanguage(textarea) {
  const stored = textarea.dataset.editorLang;
  if (stored === "java" || stored === "javascript") {
    return stored;
  }

  const container = textarea.closest(".code-ide, .code-section-live, .code-section-edit");
  const sketchType = container?.dataset.sketchType;

  let filename = textarea.dataset.filename || "";
  if (!filename) {
    const panel = textarea.closest("[data-asset-panel]");
    const filenameInput = panel?.querySelector('[name$="-filename"]');
    filename = filenameInput?.value || "";
  }

  if (sketchType === "processing" || filename.toLowerCase().endsWith(".pde")) {
    return "java";
  }
  return "javascript";
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem(EDITOR_THEME_KEY) || "dark";

  document.querySelectorAll(".code-ide").forEach((container) => {
    container.dataset.theme = savedTheme;
    initEditorChrome(container);
  });

  document.querySelectorAll(".code-editor, .sketch-code-input, .form-textarea-code").forEach((textarea) => {
    if (textarea.closest(".code-editor-shell")) return;
    if (!textarea.closest(".code-ide, .code-section-live, .code-section-edit")) return;
    enhanceEditor(textarea);
  });

  document.querySelectorAll(".code-ide[data-editor-tabs]").forEach((container) => {
    initIdeTabs(container);
    initFilenameTabSync(container);
    initAssetFormset(container);
    initAssetTabDrag(container);
    initAssetTabRemove(container);
  });
});

function initEditorChrome(container) {
  const themeBtn = container.querySelector("[data-editor-theme-toggle]");
  const fullscreenBtn = container.querySelector("[data-editor-fullscreen]");

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const nextTheme = container.dataset.theme === "light" ? "dark" : "light";
      document.querySelectorAll(".code-ide").forEach((editor) => {
        editor.dataset.theme = nextTheme;
      });
      localStorage.setItem(EDITOR_THEME_KEY, nextTheme);
      themeBtn.classList.toggle("is-active", nextTheme === "light");
    });
    themeBtn.classList.toggle("is-active", container.dataset.theme === "light");
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      const isFullscreen = container.classList.toggle("is-fullscreen");
      fullscreenBtn.classList.toggle("is-active", isFullscreen);
      fullscreenBtn.textContent = isFullscreen ? "⤢" : "⛶";
      fullscreenBtn.title = isFullscreen ? "Exit fullscreen" : "Fullscreen editor";
      fullscreenBtn.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Fullscreen editor");
      document.body.classList.toggle("code-editor-fullscreen", isFullscreen);

      const activePanel = container.querySelector(
        ".code-ide-panel.is-active, .code-tab-panel.is-active, .code-tab-panel--single"
      );
      ensurePanelEditorHeight(activePanel);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && container.classList.contains("is-fullscreen")) {
        container.classList.remove("is-fullscreen");
        fullscreenBtn.classList.remove("is-active");
        fullscreenBtn.title = "Fullscreen editor";
        fullscreenBtn.setAttribute("aria-label", "Fullscreen editor");
        document.body.classList.remove("code-editor-fullscreen");
      }
    });
  }
}

function ensurePanelEditorHeight(panel) {
  if (!panel) return;
  const container = panel.closest(".code-ide");
  const mainPanel = container?.querySelector('.code-ide-panel[data-panel="main"]');
  const mainShell = mainPanel?.querySelector(".code-editor-shell");
  const mainEditorArea = mainPanel?.querySelector(".code-ide-editor-area");

  const shell = panel.querySelector(".code-editor-shell");
  const textarea = panel.querySelector("textarea");
  const editorArea = panel.querySelector(".code-ide-editor-area");
  const editorBody = panel.querySelector(".code-editor-body");

  let targetHeight = EDITOR_MIN_HEIGHT;
  if (mainShell && mainPanel?.classList.contains("is-active")) {
    const measured = mainShell.getBoundingClientRect().height;
    if (measured > targetHeight) targetHeight = Math.round(measured);
  } else if (mainEditorArea && container) {
    const panelsWrap = container.querySelector(".code-ide-panels");
    if (panelsWrap) {
      const available = panelsWrap.getBoundingClientRect().height;
      const toolbar = panel.querySelector(".code-ide-panel-toolbar");
      const toolbarHeight = toolbar?.getBoundingClientRect().height || 0;
      const nextHeight = available - toolbarHeight;
      if (nextHeight > targetHeight) targetHeight = Math.round(nextHeight);
    }
  }

  if (editorArea) {
    editorArea.style.flex = "1";
    editorArea.style.minHeight = "0";
  }
  if (editorBody && !shell) {
    editorBody.style.minHeight = `${targetHeight}px`;
  }
  if (shell) {
    shell.style.flex = "1";
    shell.style.minHeight = `${targetHeight}px`;
  }
  if (textarea && !shell) {
    textarea.style.minHeight = `${targetHeight}px`;
  }
}

function initFilenameTabSync(container) {
  const mainFilename = container.querySelector('[name="entry_filename"]');
  const mainTab = container.querySelector('.code-ide-tab--main[data-panel="main"]');
  if (mainFilename && mainTab) {
    const syncMain = () => {
      const label = mainFilename.value.trim() || "sketch.js";
      const labelEl = mainTab.querySelector(".code-ide-tab-label");
      if (labelEl) {
        labelEl.textContent = label;
      } else {
        mainTab.textContent = label;
      }
    };
    mainFilename.addEventListener("input", syncMain);
    syncMain();
  }

  container.querySelectorAll("[data-asset-panel]").forEach((panel) => {
    const panelId = panel.dataset.panel;
    const tab = container.querySelector(`.code-ide-tab--asset[data-panel="${panelId}"]`);
    const filenameInput = panel.querySelector('[name$="-filename"]');
    if (!tab || !filenameInput) return;
    const syncTab = () => {
      const label = filenameInput.value.trim() || tab.dataset.defaultName || "file.js";
      const labelEl = tab.querySelector(".code-ide-tab-label");
      if (labelEl) labelEl.textContent = label;
    };
    filenameInput.addEventListener("input", syncTab);
    syncTab();
  });
}

function enhanceEditor(textarea) {
  const shell = document.createElement("div");
  shell.className = "code-editor-shell";
  const gutter = document.createElement("div");
  gutter.className = "code-editor-gutter";
  gutter.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "code-editor-body";

  const highlight = document.createElement("pre");
  highlight.className = "code-editor-highlight";
  highlight.setAttribute("aria-hidden", "true");
  const highlightCode = document.createElement("code");
  highlight.appendChild(highlightCode);

  const errorBar = document.createElement("div");
  errorBar.className = "code-editor-syntax-error";
  errorBar.hidden = true;

  textarea.parentNode.insertBefore(shell, textarea);
  shell.appendChild(gutter);
  shell.appendChild(body);
  body.appendChild(highlight);
  body.appendChild(textarea);
  shell.appendChild(errorBar);

  textarea.classList.add("code-editor-input");
  textarea.spellcheck = false;
  textarea.wrap = "off";
  textarea.dataset.editorLang = resolveEditorLanguage(textarea);

  const lineHeight = 1.6;
  const fontSize = parseFloat(getComputedStyle(textarea).fontSize) || 13;
  shell.style.minHeight = `${EDITOR_MIN_HEIGHT}px`;

  let syntaxErrors = [];
  let syncScrollFrame = 0;

  function getLanguage() {
    return resolveEditorLanguage(textarea);
  }

  function updateGutter() {
    const lines = textarea.value.split("\n").length;
    const lineCount = Math.max(lines, textarea.rows || 12);
    const errorLines = new Set(syntaxErrors.map((error) => error.line));
    gutter.innerHTML = Array.from({ length: lineCount }, (_, index) => {
      const lineNumber = index + 1;
      const classes = ["code-editor-line-num"];
      if (errorLines.has(lineNumber)) {
        classes.push("has-error");
      }
      return `<span class="${classes.join(" ")}" title="${errorLines.has(lineNumber) ? "Syntax issue on this line" : ""}">${lineNumber}</span>`;
    }).join("");
    gutter.style.lineHeight = String(lineHeight);
    textarea.style.lineHeight = String(lineHeight);
    textarea.style.fontSize = `${fontSize}px`;
    highlight.style.lineHeight = String(lineHeight);
    highlight.style.fontSize = `${fontSize}px`;
  }

  function updateErrorBar() {
    if (!syntaxErrors.length) {
      errorBar.hidden = true;
      errorBar.textContent = "";
      shell.classList.remove("has-syntax-error");
      return;
    }
    const first = syntaxErrors[0];
    const location = first.column
      ? `Line ${first.line}, column ${first.column}`
      : `Line ${first.line}`;
    errorBar.textContent = `${location}: ${first.message}`;
    errorBar.hidden = false;
    shell.classList.add("has-syntax-error");
  }

  function refreshEditor() {
    const language = getLanguage();
    const code = textarea.value;
    if (window.CodeEditorSyntax) {
      const highlighted = window.CodeEditorSyntax.highlight(code, language);
      highlightCode.innerHTML = code.endsWith("\n") ? `${highlighted}\n` : highlighted;
      syntaxErrors = window.CodeEditorSyntax.validate(code, language);
    } else {
      highlightCode.textContent = code;
      syntaxErrors = [];
    }
    updateGutter();
    updateErrorBar();
    syncScroll();
  }

  function syncScroll() {
    const { scrollTop, scrollLeft } = textarea;
    gutter.scrollTop = scrollTop;
    highlight.style.transform = `translate3d(${-scrollLeft}px, ${-scrollTop}px, 0)`;
  }

  function scheduleSyncScroll() {
    if (syncScrollFrame) return;
    syncScrollFrame = requestAnimationFrame(() => {
      syncScrollFrame = 0;
      syncScroll();
    });
  }

  function insertText(text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.setRangeText(text, start, end, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function getLineStart(value, position) {
    const index = value.lastIndexOf("\n", position - 1);
    return index === -1 ? 0 : index + 1;
  }

  function getLineEnd(value, position) {
    const index = value.indexOf("\n", position);
    return index === -1 ? value.length : index;
  }

  function getCurrentLineIndent(value, position) {
    const lineStart = getLineStart(value, position);
    const line = value.slice(lineStart, getLineEnd(value, position));
    const match = line.match(/^\s*/);
    return match ? match[0] : "";
  }

  function handleTabKey(event) {
    event.preventDefault();
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const lineStart = getLineStart(value, start);
      const lineEnd = getLineEnd(value, end);
      const selected = value.slice(lineStart, lineEnd);
      const lines = selected.split("\n");
      if (event.shiftKey) {
        const unindented = lines.map((line) => line.replace(/^ {1,2}/, "")).join("\n");
        textarea.setRangeText(unindented, lineStart, lineEnd, "end");
      } else {
        const indented = lines.map((line) => `  ${line}`).join("\n");
        textarea.setRangeText(indented, lineStart, lineEnd, "end");
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (event.shiftKey) {
      const lineStart = getLineStart(value, start);
      const line = value.slice(lineStart, start);
      if (line.endsWith("  ")) {
        textarea.setRangeText("", start - 2, start, "end");
      } else if (line.endsWith(" ")) {
        textarea.setRangeText("", start - 1, start, "end");
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    insertText("  ");
  }

  function toggleLineComment() {
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = getLineStart(value, start);
    const lineEnd = getLineEnd(value, end);
    const selected = value.slice(lineStart, lineEnd);
    const lines = selected.split("\n");
    const commentToken = getLanguage() === "java" ? "//" : "//";
    const shouldComment = lines.some((line) => line.trim() && !line.trim().startsWith(commentToken));
    const updated = lines.map((line) => {
      if (!line.trim()) return line;
      if (shouldComment) {
        const indent = line.match(/^\s*/)[0];
        return `${indent}${commentToken} ${line.slice(indent.length)}`;
      }
      return line.replace(/^(\s*)${commentToken}\s?/, "$1");
    }).join("\n");
    textarea.setRangeText(updated, lineStart, lineEnd, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  textarea.addEventListener("input", refreshEditor);
  textarea.addEventListener("scroll", scheduleSyncScroll, { passive: true });
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      handleTabKey(event);
      return;
    }

    if (event.key === "Enter") {
      const value = textarea.value;
      const position = textarea.selectionStart;
      const lineStart = getLineStart(value, position);
      const currentLine = value.slice(lineStart, position);
      const indent = getCurrentLineIndent(value, position);
      if (currentLine.trimEnd().endsWith("{")) {
        event.preventDefault();
        insertText(`\n${indent}  \n${indent}`);
        textarea.selectionStart = textarea.selectionEnd = position + indent.length + 3;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (/^\s+$/.test(currentLine) || currentLine.length === 0) {
        event.preventDefault();
        insertText(`\n${indent}`);
      }
      return;
    }

    const commentShortcut = (event.metaKey || event.ctrlKey) && event.key === "/";
    if (commentShortcut) {
      event.preventDefault();
      toggleLineComment();
    }
  });

  gutter.addEventListener("wheel", (event) => {
    textarea.scrollTop += event.deltaY;
    scheduleSyncScroll();
    event.preventDefault();
  }, { passive: false });

  refreshEditor();
  requestAnimationFrame(() => ensurePanelEditorHeight(textarea.closest(".code-ide-panel, .code-tab-panel")));
}

function initIdeTabs(container) {
  const tabList = container.querySelector(".code-ide-tabs");
  if (!tabList) return;

  function getPanels() {
    return container.querySelectorAll(".code-ide-panel");
  }

  function activateTab(tab) {
    if (!tab || tab.classList.contains("code-ide-tab-add")) return;
    const target = tab.dataset.panel;
    tabList.querySelectorAll(".code-ide-tab:not(.code-ide-tab-add)").forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    getPanels().forEach((panel) => {
      const isActive = panel.dataset.panel === target;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
      if (isActive) {
        requestAnimationFrame(() => {
          ensurePanelEditorHeight(panel);
          requestAnimationFrame(() => ensurePanelEditorHeight(panel));
        });
      }
    });
  }

  tabList.addEventListener("click", (event) => {
    if (event.target.closest(".code-ide-tab-close")) return;
    const tab = event.target.closest(".code-ide-tab:not(.code-ide-tab-add)");
    if (tab) activateTab(tab);
  });

  getPanels().forEach((panel) => {
    const isMain = panel.dataset.panel === "main";
    panel.classList.toggle("is-active", isMain);
    panel.hidden = !isMain;
    if (isMain) ensurePanelEditorHeight(panel);
  });

  container.activateIdeTab = activateTab;
}

function notifySourceChanged(container) {
  container.dispatchEvent(new CustomEvent("sketch-source-changed", { bubbles: true }));
}

function initAssetFormset(container) {
  const addBtn = container.querySelector("#code-ide-add-file");
  const assetTabs = container.querySelector("#code-ide-asset-tabs");
  const formsetList = container.querySelector("#asset-formset-list");
  const template = container.querySelector("#asset-empty-template");
  const totalFormsInput = container.querySelector('[name$="-TOTAL_FORMS"]');
  if (!addBtn || !assetTabs || !formsetList || !template || !totalFormsInput) return;

  addBtn.addEventListener("click", () => {
    const index = parseInt(totalFormsInput.value, 10);
    const sketchType = container.dataset.sketchType || "p5js";
    const extension = sketchType === "processing" ? ".pde" : ".js";
    const defaultName = `file${index + 1}${extension}`;
    const html = template.innerHTML.replace(/__prefix__/g, String(index));
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html.trim();
    const panel = wrapper.firstElementChild;
    panel.removeAttribute("hidden");
    formsetList.appendChild(panel);

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "code-ide-tab code-ide-tab--asset is-active";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "true");
    tab.dataset.panel = `asset-${index}`;
    tab.id = `code-ide-tab-asset-${index}`;
    tab.draggable = true;
    tab.dataset.defaultName = defaultName;
    tab.innerHTML = `<span class="code-tab-drag" aria-hidden="true">⠿</span><span class="code-ide-tab-label">${defaultName}</span><span class="code-ide-tab-close" title="Remove file" aria-label="Remove file">×</span>`;
    assetTabs.appendChild(tab);

    const filenameInput = panel.querySelector('[name$="-filename"]');
    const orderInput = panel.querySelector('[name$="-order"]');
    if (filenameInput) filenameInput.value = defaultName;
    if (orderInput) orderInput.value = String(index);

    totalFormsInput.value = String(index + 1);

    const textarea = panel.querySelector("textarea");
    if (textarea) {
      textarea.rows = 12;
      if (sketchType === "processing") {
        textarea.dataset.editorLang = "java";
      }
      enhanceEditor(textarea);
    }
    if (filenameInput) {
      filenameInput.addEventListener("input", () => {
        const labelEl = tab.querySelector(".code-ide-tab-label");
        if (labelEl) labelEl.textContent = filenameInput.value.trim() || defaultName;
      });
    }

    syncAssetOrder(container);
    container.activateIdeTab?.(tab);
    requestAnimationFrame(() => {
      ensurePanelEditorHeight(panel);
      requestAnimationFrame(() => ensurePanelEditorHeight(panel));
    });
    filenameInput?.focus();
    notifySourceChanged(container);
  });
}

function initAssetTabRemove(container) {
  const tabList = container.querySelector(".code-ide-tabs");
  if (!tabList) return;

  tabList.addEventListener("click", (event) => {
    const closeBtn = event.target.closest(".code-ide-tab-close");
    if (!closeBtn) return;
    event.preventDefault();
    event.stopPropagation();
    const tab = closeBtn.closest(".code-ide-tab--asset");
    if (tab) removeAssetTab(container, tab);
  });
}

function removeAssetTab(container, tab) {
  const panelId = tab.dataset.panel;
  const panel = container.querySelector(`[data-panel="${panelId}"][data-asset-panel]`);
  if (!panel) return;

  const idInput = panel.querySelector('[name$="-id"]');
  const deleteInput = panel.querySelector('[name$="-DELETE"]');
  const isExisting = Boolean(idInput?.value);
  const wasActive = tab.classList.contains("is-active");

  if (isExisting && deleteInput) {
    deleteInput.checked = true;
    tab.hidden = true;
    panel.hidden = true;
    panel.classList.remove("is-active");
  } else {
    tab.remove();
    panel.remove();
    const totalFormsInput = container.querySelector('[name$="-TOTAL_FORMS"]');
    if (totalFormsInput) {
      const remaining = container.querySelectorAll("#asset-formset-list .formset-item").length;
      totalFormsInput.value = String(remaining);
    }
  }

  if (wasActive) {
    const mainTab = container.querySelector(".code-ide-tab--main");
    if (mainTab) {
      container.activateIdeTab?.(mainTab);
    } else {
      const nextTab = container.querySelector(".code-ide-tab--asset:not([hidden])");
      if (nextTab) container.activateIdeTab?.(nextTab);
    }
  }

  syncAssetOrder(container);
  notifySourceChanged(container);
}

function syncAssetOrder(container) {
  const assetTabs = [...container.querySelectorAll(".code-ide-tab--asset:not([hidden])")];
  assetTabs.forEach((tab, order) => {
    const panel = container.querySelector(`[data-panel="${tab.dataset.panel}"][data-asset-panel]`);
    const orderInput = panel?.querySelector('[name$="-order"]');
    if (orderInput) orderInput.value = String(order);
  });
}

function initAssetTabDrag(container) {
  const assetTabsContainer = container.querySelector("#code-ide-asset-tabs");
  if (!assetTabsContainer) return;

  let draggedTab = null;

  assetTabsContainer.addEventListener("dragstart", (event) => {
    if (event.target.closest(".code-ide-tab-close")) {
      event.preventDefault();
      return;
    }
    const tab = event.target.closest(".code-ide-tab--asset");
    if (!tab) return;
    draggedTab = tab;
    tab.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tab.dataset.panel);
  });

  assetTabsContainer.addEventListener("dragend", () => {
    if (draggedTab) draggedTab.classList.remove("is-dragging");
    draggedTab = null;
    assetTabsContainer.querySelectorAll(".code-ide-tab--asset").forEach((tab) => {
      tab.classList.remove("is-drag-over");
    });
  });

  assetTabsContainer.addEventListener("dragover", (event) => {
    if (!draggedTab) return;
    event.preventDefault();
    const target = event.target.closest(".code-ide-tab--asset");
    if (!target || target === draggedTab) return;
    target.classList.add("is-drag-over");
  });

  assetTabsContainer.addEventListener("dragleave", (event) => {
    const target = event.target.closest(".code-ide-tab--asset");
    if (target) target.classList.remove("is-drag-over");
  });

  assetTabsContainer.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest(".code-ide-tab--asset");
    if (!draggedTab || !target || target === draggedTab) return;

    target.classList.remove("is-drag-over");

    if ([...assetTabsContainer.children].indexOf(draggedTab) < [...assetTabsContainer.children].indexOf(target)) {
      target.after(draggedTab);
    } else {
      target.before(draggedTab);
    }

    reorderAssetPanels(container);
    syncAssetOrder(container);
  });
}

function reorderAssetPanels(container) {
  const assetTabs = [...container.querySelectorAll(".code-ide-tab--asset:not([hidden])")];
  const formsetList = container.querySelector("#asset-formset-list");
  if (!formsetList) return;

  assetTabs.forEach((tab) => {
    const panel = container.querySelector(`[data-panel="${tab.dataset.panel}"][data-asset-panel]`);
    if (panel) formsetList.appendChild(panel);
  });
}
