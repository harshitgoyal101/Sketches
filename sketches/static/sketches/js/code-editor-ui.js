const EDITOR_THEME_KEY = "sketches-code-editor-theme";
const EDITOR_TREE_COLLAPSED_KEY = "sketches-editor-tree-collapsed";
const EDITOR_MIN_HEIGHT = 320;
const COMPACT_EDITOR_MQ = "(max-width: 1024px)";
const FULLSCREEN_CHROME_SELECTORS = [
  "#gallery-site-nav",
  ".gallery-nav-toggle",
  ".gallery-mobile-menu",
  ".gallery-mobile-menu-backdrop",
  ".sketch-edit-topbar",
  ".sketch-edit-pane-toggle",
  ".sketch-edit-readonly-notice",
];

function isCompactEditorLayout() {
  return window.matchMedia(COMPACT_EDITOR_MQ).matches;
}

function setFullscreenChromeHidden(hidden) {
  document.documentElement.classList.toggle("code-editor-fullscreen", hidden);
  document.body.classList.toggle("code-editor-fullscreen", hidden);

  FULLSCREEN_CHROME_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (hidden) {
        if (element.dataset.fullscreenPrevDisplay === undefined) {
          element.dataset.fullscreenPrevDisplay = element.style.display || "";
        }
        element.style.setProperty("display", "none", "important");
        return;
      }

      if (element.dataset.fullscreenPrevDisplay !== undefined) {
        element.style.display = element.dataset.fullscreenPrevDisplay;
        delete element.dataset.fullscreenPrevDisplay;
      }
    });
  });
}

function resolveEditorLanguage(textarea) {
  const panel = textarea.closest("[data-asset-panel]");
  if (panel) {
    const assetType = panel.querySelector('[name$="-asset_type"]')?.value;
    if (assetType === "css" || assetType === "json" || assetType === "other") {
      return "plain";
    }
    const filename = (panel.querySelector('[name$="-filename"]')?.value || "").toLowerCase();
    if (filename.endsWith(".css") || filename.endsWith(".json")) {
      return "plain";
    }
  }

  const stored = textarea.dataset.editorLang;
  if (stored === "java" || stored === "javascript" || stored === "plain") {
    if (stored === "plain") return stored;
    if (!panel) return stored;
  }

  const container = textarea.closest(".code-ide, .code-section-live, .code-section-edit");
  const sketchType = container?.dataset.sketchType;

  let filename = textarea.dataset.filename || "";
  if (!filename && panel) {
    filename = panel.querySelector('[name$="-filename"]')?.value || "";
  }
  if (!filename && !panel && container) {
    filename = container.querySelector('[name="entry_filename"]')?.value || "";
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
    initMobileFileTreeToggle(container);
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
    initAssetEditorLanguageSync(container);
  });
});

function initAssetEditorLanguageSync(container) {
  container.addEventListener("change", (event) => {
    const target = event.target;
    if (!target.matches('[name$="-asset_type"], [name$="-filename"]')) return;
    const panel = target.closest("[data-asset-panel]");
    const textarea = panel?.querySelector("textarea");
    if (!textarea) return;
    textarea.dataset.editorLang = resolveEditorLanguage(textarea);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function initEditorChrome(container) {
  const themeBtn = container.querySelector("[data-editor-theme-toggle]");
  const fullscreenBtn = container.querySelector("[data-editor-fullscreen]");
  let fullscreenPlaceholder = null;
  let fullscreenParent = null;

  function restoreEditorPlacement() {
    if (fullscreenPlaceholder && fullscreenParent) {
      fullscreenParent.insertBefore(container, fullscreenPlaceholder);
      fullscreenPlaceholder.remove();
    }

    fullscreenPlaceholder = null;
    fullscreenParent = null;
  }

  function refreshFullscreenEditorHeight() {
    const activePanel = container.querySelector(
      ".code-ide-panel.is-active, .code-tab-panel.is-active, .code-tab-panel--single"
    );
    requestAnimationFrame(() => ensurePanelEditorHeight(activePanel));
  }

  function updateFullscreenButton(isFullscreen) {
    if (!fullscreenBtn) return;

    fullscreenBtn.classList.toggle("is-active", isFullscreen);
    fullscreenBtn.textContent = isFullscreen ? "⤢" : "⛶";
    fullscreenBtn.title = isFullscreen ? "Exit fullscreen" : "Fullscreen editor";
    fullscreenBtn.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Fullscreen editor");
  }

  function closeGalleryNavForFullscreen() {
    document.body.classList.remove("is-gallery-nav-open");

    const nav = document.getElementById("gallery-site-nav");
    const navToggle = document.getElementById("gallery-nav-toggle");
    const mobileMenu = document.getElementById("gallery-mobile-menu");
    const navBackdrop = document.getElementById("gallery-nav-backdrop");

    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    }
    if (mobileMenu) mobileMenu.setAttribute("aria-hidden", "true");
    if (navBackdrop) navBackdrop.setAttribute("aria-hidden", "true");
    if (nav) nav.setAttribute("aria-hidden", "true");
  }

  function exitEditorFullscreen() {
    if (!container.classList.contains("is-fullscreen")) return;

    container.classList.remove("is-fullscreen");
    setFullscreenChromeHidden(false);
    restoreEditorPlacement();
    updateFullscreenButton(false);
  }

  function enterEditorFullscreen() {
    if (container.classList.contains("is-fullscreen")) return;

    container._closeFileTree?.();
    closeGalleryNavForFullscreen();

    fullscreenParent = container.parentElement;
    fullscreenPlaceholder = document.createComment("code-editor-fullscreen-placeholder");
    fullscreenParent.insertBefore(fullscreenPlaceholder, container);
    document.body.appendChild(container);

    container.classList.add("is-fullscreen");
    setFullscreenChromeHidden(true);
    updateFullscreenButton(true);
    refreshFullscreenEditorHeight();
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const nextTheme = container.dataset.theme === "light" ? "dark" : "light";
      document.querySelectorAll(".code-ide").forEach((editor) => {
        editor.dataset.theme = nextTheme;
      });
      localStorage.setItem(EDITOR_THEME_KEY, nextTheme);
      themeBtn.classList.toggle("is-active", nextTheme === "light");
      document.querySelectorAll(".code-ide").forEach((editor) => {
        editor._syncTreePortalTheme?.();
      });
    });
    themeBtn.classList.toggle("is-active", container.dataset.theme === "light");
  }

  if (fullscreenBtn) {
    const toggleFullscreen = (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (container.classList.contains("is-fullscreen")) {
        exitEditorFullscreen();
        return;
      }

      enterEditorFullscreen();
    };

    fullscreenBtn.addEventListener("click", toggleFullscreen);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && container.classList.contains("is-fullscreen")) {
        exitEditorFullscreen();
      }
    });
  }
}

function initMobileFileTreeToggle(container) {
  const toggleBtn = container.querySelector("[data-editor-tree-toggle]");
  const backdrop = container.querySelector("[data-editor-tree-backdrop]");
  const fileTree = container.querySelector(".code-ide-file-tree");
  const collapseBtn = fileTree?.querySelector("[data-editor-tree-collapse]");
  if (!toggleBtn || !fileTree) return;

  const compactQuery = window.matchMedia(COMPACT_EDITOR_MQ);
  let treeAnchor = null;
  let portalHost = null;

  function isDesktopCollapsed() {
    return container.classList.contains("is-tree-collapsed");
  }

  function updateCollapseButton() {
    if (!collapseBtn) return;
    if (compactQuery.matches) {
      const isOpen = container.classList.contains("is-tree-open");
      collapseBtn.title = isOpen ? "Close explorer" : "Open explorer";
      collapseBtn.setAttribute("aria-label", collapseBtn.title);
      collapseBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      return;
    }
    const collapsed = isDesktopCollapsed();
    collapseBtn.title = collapsed ? "Expand explorer" : "Collapse explorer";
    collapseBtn.setAttribute("aria-label", collapseBtn.title);
    collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function setDesktopCollapsed(collapsed) {
    if (compactQuery.matches) return;
    container.classList.toggle("is-tree-collapsed", collapsed);
    localStorage.setItem(EDITOR_TREE_COLLAPSED_KEY, collapsed ? "1" : "0");
    toggleBtn.classList.remove("is-active");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.title = collapsed ? "Show files" : "Hide files";
    toggleBtn.setAttribute("aria-label", toggleBtn.title);
    updateCollapseButton();
    refreshEditorLayoutAfterTreeChange();
  }

  function applyStoredDesktopCollapse() {
    if (compactQuery.matches) return;
    if (localStorage.getItem(EDITOR_TREE_COLLAPSED_KEY) === "1") {
      container.classList.add("is-tree-collapsed");
    }
    updateCollapseButton();
  }

  function ensurePortalHost() {
    if (portalHost) return portalHost;

    portalHost = document.createElement("div");
    portalHost.className = "code-ide code-ide-tree-portal";
    portalHost.setAttribute("role", "presentation");
    portalHost.hidden = true;
    document.body.appendChild(portalHost);
    return portalHost;
  }

  function refreshEditorLayoutAfterTreeChange() {
    container.querySelectorAll(".code-editor-shell").forEach((shell) => {
      shell.style.minHeight = "";
    });
    const activePanel = container.querySelector(
      ".code-ide-panel.is-active, .code-tab-panel.is-active, .code-tab-panel--single"
    );
    requestAnimationFrame(() => {
      ensurePanelEditorHeight(activePanel);
      requestAnimationFrame(() => ensurePanelEditorHeight(activePanel));
    });
  }

  function syncPortalTheme() {
    if (!portalHost) return;
    portalHost.dataset.theme = container.dataset.theme || "dark";
  }

  function mountDrawerToPortal() {
    ensurePortalHost();
    syncPortalTheme();

    if (!treeAnchor) {
      treeAnchor = document.createComment("code-ide-tree-anchor");
      fileTree.before(treeAnchor);
    }

    if (backdrop && backdrop.parentElement !== portalHost) {
      portalHost.appendChild(backdrop);
    }

    if (fileTree.parentElement !== portalHost) {
      portalHost.appendChild(fileTree);
    }
  }

  function restoreDrawerToEditor() {
    fileTree.classList.remove("is-tree-drawer-open");

    if (fileTree.parentElement === portalHost) {
      if (treeAnchor?.parentElement) {
        treeAnchor.parentElement.insertBefore(fileTree, treeAnchor);
        treeAnchor.remove();
        treeAnchor = null;
      } else {
        const body = container.querySelector(".code-ide-body");
        const workspace = container.querySelector(".code-ide-workspace");
        if (body && workspace) {
          body.insertBefore(fileTree, workspace);
        }
      }
    }

    if (portalHost) {
      portalHost.hidden = true;
      portalHost.classList.remove("is-tree-drawer-open");
    }
  }

  function setTreeOpen(open) {
    if (!compactQuery.matches) {
      if (backdrop) {
        backdrop.classList.remove("is-tree-drawer-open");
        backdrop.setAttribute("aria-hidden", "true");
      }
      restoreDrawerToEditor();
      container.classList.remove("is-tree-open");
      toggleBtn.classList.remove("is-active");
      toggleBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("code-ide-tree-open");
      document.documentElement.classList.remove("code-ide-tree-open");
      updateCollapseButton();
      refreshEditorLayoutAfterTreeChange();
      return;
    }

    const isOpen = Boolean(open);

    if (isOpen) {
      mountDrawerToPortal();
      portalHost.hidden = false;
      portalHost.classList.add("is-tree-drawer-open");
      fileTree.classList.add("is-tree-drawer-open");
      if (backdrop) {
        backdrop.classList.add("is-tree-drawer-open");
        backdrop.removeAttribute("hidden");
        backdrop.setAttribute("aria-hidden", "false");
      }
    } else {
      if (backdrop) {
        backdrop.classList.remove("is-tree-drawer-open");
        backdrop.setAttribute("aria-hidden", "true");
      }
      restoreDrawerToEditor();
    }

    container.classList.toggle("is-tree-open", isOpen);
    toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggleBtn.classList.toggle("is-active", isOpen);
    toggleBtn.title = isOpen ? "Hide files" : "Show files";
    toggleBtn.setAttribute("aria-label", isOpen ? "Hide files" : "Show files");

    document.body.classList.toggle("code-ide-tree-open", isOpen);
    document.documentElement.classList.toggle("code-ide-tree-open", isOpen);
    updateCollapseButton();
    refreshEditorLayoutAfterTreeChange();
  }

  function closeTree() {
    setTreeOpen(false);
  }

  container._closeFileTree = closeTree;
  container._syncTreePortalTheme = syncPortalTheme;

  const toggleTree = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (compactQuery.matches) {
      setTreeOpen(!container.classList.contains("is-tree-open"));
      return;
    }
    setDesktopCollapsed(!isDesktopCollapsed());
  };

  toggleBtn.addEventListener("click", toggleTree);

  collapseBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (compactQuery.matches) {
      closeTree();
      return;
    }
    setDesktopCollapsed(!isDesktopCollapsed());
  });

  backdrop?.addEventListener("click", closeTree);

  compactQuery.addEventListener("change", () => {
    if (!compactQuery.matches) {
      closeTree();
      applyStoredDesktopCollapse();
    } else {
      container.classList.remove("is-tree-collapsed");
    }
    updateCollapseButton();
    refreshEditorLayoutAfterTreeChange();
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape"
      && container.classList.contains("is-tree-open")
      && !container.classList.contains("is-fullscreen")
    ) {
      closeTree();
    }
  });

  applyStoredDesktopCollapse();
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
    editorArea.style.overflow = "hidden";
  }
  if (editorBody && !shell) {
    editorBody.style.minHeight = `${targetHeight}px`;
  }
  if (shell) {
    const isEditLayout = container?.classList.contains("code-section-edit");
    shell.style.flex = "1";
    shell.style.height = isEditLayout ? "" : "100%";
    shell.style.maxHeight = isEditLayout ? "100%" : "";
    shell.style.minHeight = "0";
    if (!isEditLayout && targetHeight > EDITOR_MIN_HEIGHT) {
      shell.style.minHeight = `${targetHeight}px`;
    }
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
    const mainCode = container.querySelector('[name="code"]');
    mainFilename.addEventListener("input", () => {
      syncMain();
      mainCode?.dispatchEvent(new Event("input", { bubbles: true }));
    });
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
  textarea.style.borderRadius = "0";
  textarea.style.border = "none";
  textarea.style.boxShadow = "none";

  const lineHeight = 1.6;
  const fontSize = parseFloat(getComputedStyle(textarea).fontSize) || 13;
  const editorArea = textarea.closest(".code-ide-editor-area");
  if (editorArea) {
    editorArea.style.display = "flex";
    editorArea.style.flexDirection = "column";
    editorArea.style.flex = "1";
    editorArea.style.minHeight = "0";
  }
  shell.style.flex = "1";
  shell.style.minHeight = "0";
  shell.style.width = "100%";
  shell.style.maxHeight = "100%";
  shell.style.overflow = "hidden";

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
      return `<span class="${classes.join(" ")}">${lineNumber}</span>`;
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
      errorBar.innerHTML = "";
      shell.classList.remove("has-syntax-error");
      return;
    }
    const first = syntaxErrors[0];
    const location = first.column
      ? `Line ${first.line}, column ${first.column}`
      : `Line ${first.line}`;
    const message = (first.message || "").replace(/^SyntaxError:\s*/i, "");
    errorBar.innerHTML = "";
    const summary = document.createElement("span");
    summary.className = "code-editor-syntax-error-summary";
    summary.textContent = `${location}: ${message}`;
    const hint = document.createElement("span");
    hint.className = "code-editor-syntax-error-hint";
    hint.textContent = "Editor check only — you can still save. Open Preview if the sketch fails to run.";
    errorBar.appendChild(summary);
    errorBar.appendChild(hint);
    errorBar.hidden = false;
    shell.classList.add("has-syntax-error");
  }

  function refreshEditor() {
    const language = getLanguage();
    const code = textarea.value;
    const container = textarea.closest(".code-ide, .code-section-live, .code-section-edit");
    const sketchType = container?.dataset.sketchType || "p5js";
    const isMainCode = textarea.matches('[name="code"]');
    if (window.CodeEditorSyntax) {
      const highlighted = window.CodeEditorSyntax.highlight(code, language);
      highlightCode.innerHTML = code.endsWith("\n") ? `${highlighted}\n` : highlighted;
      if (
        isMainCode &&
        sketchType === "p5js" &&
        window.CodeEditorSyntax.looksLikeProcessingSyntax(code)
      ) {
        syntaxErrors = [{
          line: 1,
          column: null,
          message: "Processing syntax (void setup, size) — use function setup() and createCanvas() for p5.js, or create a Processing sketch",
        }];
      } else {
        syntaxErrors = window.CodeEditorSyntax.validate(code, language);
      }
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

function addAssetAtPath(container, newPath) {
  const assetTabs = container.querySelector("#code-ide-asset-tabs");
  const formsetList = container.querySelector("#asset-formset-list");
  const template = container.querySelector("#asset-empty-template");
  const totalFormsInput = container.querySelector('[name$="-TOTAL_FORMS"]');
  if (!assetTabs || !formsetList || !template || !totalFormsInput) return;

  const sketchType = container.dataset.sketchType || "p5js";
  const index = parseInt(totalFormsInput.value, 10);
  const panelId = `asset-${index}`;
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
  tab.dataset.panel = panelId;
  tab.id = `code-ide-tab-${panelId}`;
  tab.draggable = true;
  tab.dataset.defaultName = newPath;
  tab.innerHTML = `<span class="code-tab-drag" aria-hidden="true">⠿</span><span class="code-ide-tab-label">${newPath}</span><span class="code-ide-tab-close" title="Remove file" aria-label="Remove file">×</span>`;
  assetTabs.appendChild(tab);

  const filenameInput = panel.querySelector('[name$="-filename"]');
  const orderInput = panel.querySelector('[name$="-order"]');
  if (filenameInput) filenameInput.value = newPath;
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
      if (labelEl) labelEl.textContent = filenameInput.value.trim() || newPath;
      window.SketchFileTree?.rebuildFileTree?.(container);
    });
  }

  syncAssetOrder(container);
  notifySourceChanged(container);
  window.SketchFileTree?.rebuildFileTree?.(container);

  if (window.SketchFileTree?.activateEditPanel) {
    window.SketchFileTree.activateEditPanel(container, panelId);
  } else {
    container.activateIdeTab?.(tab);
  }

  requestAnimationFrame(() => {
    ensurePanelEditorHeight(panel);
    textarea?.focus();
  });
}

function initAssetFormset(container) {
  const assetTabs = container.querySelector("#code-ide-asset-tabs");
  const formsetList = container.querySelector("#asset-formset-list");
  const template = container.querySelector("#asset-empty-template");
  const totalFormsInput = container.querySelector('[name$="-TOTAL_FORMS"]');
  if (!assetTabs || !formsetList || !template || !totalFormsInput) return;

  container.addEventListener("sketch-add-asset", (event) => {
    if (event.detail?.path) {
      addAssetAtPath(container, event.detail.path);
    }
  });

  container.addEventListener("sketch-remove-asset", (event) => {
    if (event.detail?.panelId) {
      removeAssetByPanelId(container, event.detail.panelId);
    }
  });
}

function removeAssetByPanelId(container, panelId) {
  if (!panelId || panelId === "main") return;

  const tab = container.querySelector(`.code-ide-tab--asset[data-panel="${panelId}"]`);
  const panel = container.querySelector(`[data-panel="${panelId}"][data-asset-panel]`);
  if (!panel) return;

  const idInput = panel.querySelector('[name$="-id"]');
  const deleteInput = panel.querySelector('[name$="-DELETE"]');
  const isExisting = Boolean(idInput?.value);
  const wasActive = panel.classList.contains("is-active")
    || tab?.classList.contains("is-active")
    || container.querySelector(`.code-ide-tree-file-btn.is-active[data-panel="${panelId}"]`);

  if (isExisting && deleteInput) {
    deleteInput.checked = true;
    if (tab) tab.hidden = true;
    panel.hidden = true;
    panel.classList.remove("is-active");
  } else {
    tab?.remove();
    panel.remove();
    const totalFormsInput = container.querySelector('[name$="-TOTAL_FORMS"]');
    if (totalFormsInput) {
      const remaining = container.querySelectorAll("#asset-formset-list .formset-item").length;
      totalFormsInput.value = String(remaining);
    }
  }

  if (wasActive) {
    if (window.SketchFileTree?.activateEditPanel) {
      window.SketchFileTree.activateEditPanel(container, "main");
    } else {
      const mainTab = container.querySelector(".code-ide-tab--main");
      container.activateIdeTab?.(mainTab);
    }
  }

  syncAssetOrder(container);
  notifySourceChanged(container);
  window.SketchFileTree?.rebuildFileTree?.(container);
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
    if (tab?.dataset.panel) {
      removeAssetByPanelId(container, tab.dataset.panel);
    }
  });
}

function removeAssetTab(container, tab) {
  if (tab?.dataset.panel) {
    removeAssetByPanelId(container, tab.dataset.panel);
  }
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
