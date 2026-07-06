/**
 * Sidebar file tree for sketch editors — supports nested paths like lib/helper.js.
 */

const TREE_ICONS = {
  chevron: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M6 4l4 4-4 4V4z"/></svg>',
  folderOpen: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M1.5 3.5A1 1 0 0 1 2.5 2.5h3.2l1 1.5H13.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1v-8.5z"/></svg>',
  folderClosed: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M1.5 4.5A1 1 0 0 1 2.5 3.5h4.3l1 1.5H13.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1v-7z"/></svg>',
  file: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M3 2.5h7l3 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9.5a1 1 0 0 1 1-1.5zm6.5 0V6H13"/></svg>',
  js: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M3 2.5h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2.2 8.4c.4.7 1 1.1 1.8 1.1.8 0 1.4-.3 1.7-.8l1.4 1.2c-.7.9-1.8 1.4-3.2 1.4-2 0-3.4-1.2-3.4-3.3 0-2.1 1.3-3.3 3.2-3.3 1.5 0 2.5.6 3 1.5l-1.5 1.1zm4.5-2.1c0 1.3.6 2 1.7 2 .6 0 1.1-.2 1.5-.6l1.2 1.3c-.7.7-1.6 1.1-2.8 1.1-2 0-3.2-1.2-3.2-3.1 0-1.9 1.2-3.1 3.1-3.1 1.2 0 2.1.4 2.7 1.1l-1.2 1.3z"/></svg>',
  pde: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M3 2.5h7l3 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9.5a1 1 0 0 1 1-1.5zm6.5 0V6H13"/></svg>',
  css: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M3 2.5h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm1.5 3h9v1.5h-9V5.5zm0 2.5h9V9.5h-9V8zm0 2.5h6v1.5h-6V10.5z"/></svg>',
  json: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M3 2.5h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm1.5 2.5h1.2c.8 0 1.3.4 1.3 1.1 0 .5-.3.9-.8 1l1 1.6H5.8L5 7.6h-.5v2.4H4.5V5zm4.2 0h2.8v1.1H9.2v.8h1.8v1H9.2v1.1h2.3v1.1H7.7V5z"/></svg>',
};

function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/").trim().replace(/^\/+/, "");
}

function splitPath(path) {
  return normalizePath(path).split("/").filter(Boolean);
}

function fileIconType(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".pde")) return "pde";
  if (lower.endsWith(".js")) return "js";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".json")) return "json";
  return "file";
}

function buildTreeFromEntries(entries) {
  const root = { type: "folder", name: "", children: [] };
  const folderIndex = { "": root };

  entries.forEach((entry) => {
    const parts = splitPath(entry.path);
    if (!parts.length) return;

    let parentPath = "";
    parts.forEach((part, depth) => {
      const isFile = depth === parts.length - 1;
      const currentPath = parts.slice(0, depth + 1).join("/");

      if (isFile) {
        folderIndex[parentPath].children.push({
          type: "file",
          name: part,
          path: entry.path,
          panel: entry.panel,
          tabIndex: entry.tabIndex,
          isMain: entry.isMain,
        });
        return;
      }

      if (!folderIndex[currentPath]) {
        const folderNode = {
          type: "folder",
          name: part,
          path: currentPath,
          depth,
          children: [],
        };
        folderIndex[parentPath].children.push(folderNode);
        folderIndex[currentPath] = folderNode;
      }
      parentPath = currentPath;
    });
  });

  sortTree(root);
  return root;
}

function sortTree(node) {
  if (node.type !== "folder") return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  node.children.forEach((child) => {
    if (child.type === "folder") sortTree(child);
  });
}

function renderFolderNode(node, depth, activeKey, showAddActions) {
  const addBtn = showAddActions
    ? `<button type="button" class="code-ide-tree-folder-add" data-folder-path="${escapeHtml(node.path)}" title="New file in ${escapeHtml(node.name)}" aria-label="New file in ${escapeHtml(node.name)}"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M8 3v5H3v1.5h5V14h1.5V9.5H14V8H9.5V3H8z"/></svg></button>`
    : "";
  return `<li class="code-ide-tree-folder" role="treeitem" aria-expanded="true" style="--tree-depth: ${depth}">
    <div class="code-ide-tree-folder-row">
      <button type="button" class="code-ide-tree-row code-ide-tree-folder-btn" aria-label="Toggle ${escapeHtml(node.name)}">
        <span class="code-ide-tree-chevron" aria-hidden="true">${TREE_ICONS.chevron}</span>
        <span class="code-ide-tree-icon code-ide-tree-icon--folder-open" aria-hidden="true">${TREE_ICONS.folderOpen}</span>
        <span class="code-ide-tree-icon code-ide-tree-icon--folder-closed" aria-hidden="true">${TREE_ICONS.folderClosed}</span>
        <span class="code-ide-tree-label">${escapeHtml(node.name)}</span>
      </button>
      ${addBtn}
    </div>
    <ul class="code-ide-tree-children" role="group">${renderTreeHtml(node.children, depth + 1, activeKey, showAddActions)}</ul>
  </li>`;
}

function renderFileNode(node, depth, activeKey, showAddActions) {
  const key = node.panel ?? String(node.tabIndex);
  const isActive = key === activeKey;
  const iconType = fileIconType(node.name);
  const canDelete = showAddActions && !node.isMain && node.panel;
  const deleteBtn = canDelete
    ? `<button type="button" class="code-ide-tree-file-delete" data-panel="${node.panel}" title="Delete ${escapeHtml(node.name)}" aria-label="Delete ${escapeHtml(node.name)}"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M5 2.5h6l.5 1h3.5v1H2V3.5h3L5 2.5zm1 3.5v7h1.5v-7H6zm3 0v7H10.5v-7H9zM4 6v7.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6H4z"/></svg></button>`
    : "";
  return `<li class="code-ide-tree-file" role="none" style="--tree-depth: ${depth}">
    <div class="code-ide-tree-file-row">
      <button
        type="button"
        class="code-ide-tree-row code-ide-tree-file-btn${isActive ? " is-active" : ""}"
        role="treeitem"
        data-panel="${node.panel ?? ""}"
        data-tab-index="${node.tabIndex ?? ""}"
        data-path="${escapeHtml(node.path)}"
        title="${escapeHtml(node.path)}"
        aria-selected="${isActive ? "true" : "false"}"
      >
        <span class="code-ide-tree-chevron code-ide-tree-chevron--spacer" aria-hidden="true"></span>
        <span class="code-ide-tree-icon code-ide-tree-icon--${iconType}" aria-hidden="true">${TREE_ICONS[iconType]}</span>
        <span class="code-ide-tree-label">${escapeHtml(node.name)}</span>
        ${node.isMain ? '<span class="code-ide-tree-badge" title="Entry point">entry</span>' : ""}
      </button>
      ${deleteBtn}
    </div>
  </li>`;
}

function renderTreeHtml(nodes, depth, activeKey, showAddActions = false) {
  if (!nodes.length) {
    return depth === 0 ? '<li class="code-ide-tree-empty" aria-hidden="true">No files yet</li>' : "";
  }
  return nodes
    .map((node) => (
      node.type === "folder"
        ? renderFolderNode(node, depth, activeKey, showAddActions)
        : renderFileNode(node, depth, activeKey, showAddActions)
    ))
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectEditEntries(container) {
  const entries = [];
  const mainFilename = container.querySelector('[name="entry_filename"]');
  const mainPath = normalizePath(mainFilename?.value || "sketch.js") || "sketch.js";
  entries.push({ path: mainPath, panel: "main", isMain: true });

  container.querySelectorAll("[data-asset-panel]").forEach((panel) => {
    if (panel.hidden && panel.querySelector('[name$="-DELETE"]')?.checked) return;
    const deleteInput = panel.querySelector('[name$="-DELETE"]');
    if (deleteInput?.checked) return;

    const filenameInput = panel.querySelector('[name$="-filename"]');
    const panelId = panel.dataset.panel;
    const path = normalizePath(filenameInput?.value || panelId);
    if (!path) return;
    entries.push({ path, panel: panelId, isMain: false });
  });

  return entries;
}

function collectLiveEntries(container) {
  return [...container.querySelectorAll(".code-tab-panel")].map((panel, index) => {
    const editor = panel.querySelector(".code-editor");
    return {
      path: normalizePath(editor?.dataset.filename || `file-${index}`),
      tabIndex: index,
      isMain: editor?.dataset.isMain === "true",
    };
  });
}

function getActiveKey(container) {
  if (container.dataset.editorTabs !== undefined) {
    const activeTab = container.querySelector(".code-ide-tab.is-active:not(.code-ide-tab-add)");
    return activeTab?.dataset.panel || "main";
  }
  const activeTab = container.querySelector(".code-tab.is-active");
  return activeTab?.dataset.tabIndex || "0";
}

function setActiveKey(container, key) {
  container.querySelectorAll(".code-ide-tree-file-btn").forEach((btn) => {
    const btnKey = btn.dataset.panel || btn.dataset.tabIndex;
    const isActive = btnKey === String(key);
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function scrollActiveIntoView(container) {
  const active = container.querySelector(".code-ide-tree-file-btn.is-active");
  active?.scrollIntoView({ block: "nearest" });
}

function activateLivePanel(container, tabIndex) {
  const tabs = container.querySelectorAll(".code-tab");
  const panels = container.querySelectorAll(".code-tab-panel");

  tabs.forEach((tab) => {
    const isActive = tab.dataset.tabIndex === String(tabIndex);
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  panels.forEach((panel, index) => {
    const isActive = String(index) === String(tabIndex);
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
    if (isActive) {
      requestAnimationFrame(() => {
        if (typeof ensurePanelEditorHeight === "function") {
          ensurePanelEditorHeight(panel);
        }
      });
    }
  });

  setActiveKey(container, String(tabIndex));
  scrollActiveIntoView(container);
  container._closeFileTree?.();
}

function activateEditPanel(container, panelId) {
  const panel = container.querySelector(`.code-ide-panel[data-panel="${panelId}"]`);
  const tab = container.querySelector(`.code-ide-tab[data-panel="${panelId}"]:not([hidden])`);

  if (tab && container.activateIdeTab) {
    container.activateIdeTab(tab);
  } else if (panel) {
    container.querySelectorAll(".code-ide-panel").forEach((item) => {
      const isActive = item.dataset.panel === panelId;
      item.classList.toggle("is-active", isActive);
      item.hidden = !isActive;
    });
    container.querySelectorAll(".code-ide-tab:not(.code-ide-tab-add)").forEach((item) => {
      const isActive = item.dataset.panel === panelId;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    requestAnimationFrame(() => {
      ensurePanelEditorHeight(panel);
    });
  }

  setActiveKey(container, panelId);
  scrollActiveIntoView(container);
  container._closeFileTree?.();

  container.querySelectorAll(".code-ide-tree-file-btn").forEach((btn) => {
    if (btn.dataset.panel === panelId) {
      let ancestor = btn.closest(".code-ide-tree-folder");
      while (ancestor) {
        ancestor.classList.remove("is-collapsed");
        ancestor.setAttribute("aria-expanded", "true");
        ancestor = ancestor.parentElement?.closest(".code-ide-tree-folder");
      }
    }
  });
}

function rebuildFileTree(container) {
  const treeRoot = container.querySelector(".code-ide-file-tree-root");
  if (!treeRoot) return;

  const isEdit = container.dataset.editorTabs !== undefined;
  const entries = isEdit ? collectEditEntries(container) : collectLiveEntries(container);
  const tree = buildTreeFromEntries(entries);
  const activeKey = getActiveKey(container);
  treeRoot.innerHTML = renderTreeHtml(tree.children, 0, activeKey, isEdit);
}

function getDefaultExtension(container) {
  return (container.dataset.sketchType || "p5js") === "processing" ? ".pde" : ".js";
}

function defaultNewFileName(container) {
  const count = container.querySelectorAll("[data-asset-panel]").length;
  return `file${count + 1}${getDefaultExtension(container)}`;
}

function defaultPathPlaceholder(container, parentFolder = "") {
  const parent = normalizePath(parentFolder);
  const fileName = defaultNewFileName(container);
  return parent ? `${parent}/${fileName}` : fileName;
}

function resolveAssetPath(input, container) {
  const path = normalizePath(input);
  if (!path) return { error: "Enter a file path." };

  const parts = splitPath(path);
  if (!parts.length) return { error: "Enter a valid path." };
  if (parts.some((part) => part === ".." || part.startsWith("."))) {
    return { error: "Invalid path." };
  }

  const last = parts[parts.length - 1];
  if (/[\\/]/.test(last)) {
    return { error: "Path must end with a file name." };
  }

  if (!last.includes(".")) {
    parts[parts.length - 1] = `${last}${getDefaultExtension(container)}`;
  }

  return { path: parts.join("/") };
}

function pathExists(container, path) {
  return collectEditEntries(container).some((entry) => entry.path === path);
}

function ensureCreateDialog(container) {
  if (container._createDialog) {
    return container._createDialog;
  }

  const overlay = document.createElement("div");
  overlay.className = "code-ide-create-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="code-ide-create-dialog" role="dialog" aria-modal="true" aria-labelledby="code-ide-create-title">
      <form class="code-ide-create-form" novalidate>
        <header class="code-ide-create-header">
          <h3 class="code-ide-create-title" id="code-ide-create-title">New file</h3>
          <p class="code-ide-create-subtitle">Use <code>/</code> for folders — e.g. <code>lib/helper.js</code></p>
        </header>
        <div class="code-ide-create-fields">
          <div class="code-ide-create-field">
            <label class="code-ide-create-label" for="code-ide-create-path">Path</label>
            <input class="code-ide-create-input" id="code-ide-create-path" name="path" type="text" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <p class="code-ide-create-error" id="code-ide-create-error" role="alert" hidden></p>
        <footer class="code-ide-create-actions">
          <button type="button" class="code-ide-create-btn code-ide-create-btn--ghost" data-action="cancel">Cancel</button>
          <button type="submit" class="code-ide-create-btn code-ide-create-btn--primary">Add file</button>
        </footer>
      </form>
    </div>
  `;
  container.appendChild(overlay);

  const dialog = {
    overlay,
    pathInput: overlay.querySelector("#code-ide-create-path"),
    error: overlay.querySelector("#code-ide-create-error"),
    resolve: null,
  };

  const setError = (message) => {
    if (!message) {
      dialog.error.hidden = true;
      dialog.error.textContent = "";
      return;
    }
    dialog.error.hidden = false;
    dialog.error.textContent = message;
  };

  const closeDialog = (result) => {
    overlay.hidden = true;
    overlay.classList.remove("is-open");
    if (dialog.resolve) {
      dialog.resolve(result);
      dialog.resolve = null;
    }
  };

  overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => closeDialog(null));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeDialog(null);
    }
  });

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog(null);
    }
  });

  overlay.querySelector(".code-ide-create-form").addEventListener("submit", (event) => {
    event.preventDefault();
    setError(null);

    const resolved = resolveAssetPath(dialog.pathInput.value, container);
    if (resolved.error) {
      setError(resolved.error);
      dialog.pathInput.focus();
      return;
    }

    if (pathExists(container, resolved.path)) {
      setError(`“${resolved.path}” already exists.`);
      dialog.pathInput.focus();
      return;
    }

    closeDialog(resolved.path);
  });

  dialog.open = (options = {}) => {
    setError(null);
    const parentFolder = normalizePath(options.parentFolder || "");
    const initial = options.initialPath || defaultPathPlaceholder(container, parentFolder);
    dialog.pathInput.value = initial;
    dialog.pathInput.placeholder = defaultPathPlaceholder(container, parentFolder);

    overlay.hidden = false;
    overlay.classList.add("is-open");
    requestAnimationFrame(() => {
      dialog.pathInput.focus();
      dialog.pathInput.select();
    });

    return new Promise((resolve) => {
      dialog.resolve = resolve;
    });
  };

  container._createDialog = dialog;
  return dialog;
}

function openCreateDialog(container, options) {
  return ensureCreateDialog(container).open(options);
}

function requestAddAsset(container, options = {}) {
  return openCreateDialog(container, options).then((path) => {
    if (!path) return;
    container.dispatchEvent(new CustomEvent("sketch-add-asset", {
      detail: { path },
      bubbles: true,
    }));
  });
}

function initCreateButton(container) {
  const addBtn = container.querySelector("#code-ide-add-file");
  if (!addBtn || addBtn.dataset.createBound === "true") return;
  addBtn.dataset.createBound = "true";

  addBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestAddAsset(container);
  });
}

function bindTreeInteractions(container) {
  const tree = container.querySelector(".code-ide-file-tree");
  if (!tree || tree.dataset.bound === "true") return;
  tree.dataset.bound = "true";

  tree.addEventListener("click", (event) => {
    const folderAddBtn = event.target.closest(".code-ide-tree-folder-add");
    if (folderAddBtn) {
      event.preventDefault();
      event.stopPropagation();
      requestAddAsset(container, {
        parentFolder: folderAddBtn.dataset.folderPath,
      });
      return;
    }

    const deleteBtn = event.target.closest(".code-ide-tree-file-delete");
    if (deleteBtn) {
      event.preventDefault();
      event.stopPropagation();
      const panelId = deleteBtn.dataset.panel;
      if (panelId && panelId !== "main") {
        container.dispatchEvent(new CustomEvent("sketch-remove-asset", {
          detail: { panelId },
          bubbles: true,
        }));
      }
      return;
    }

    const folderBtn = event.target.closest(".code-ide-tree-folder-btn");
    if (folderBtn) {
      const folder = folderBtn.closest(".code-ide-tree-folder");
      const expanded = folder.getAttribute("aria-expanded") !== "false";
      folder.setAttribute("aria-expanded", expanded ? "false" : "true");
      folder.classList.toggle("is-collapsed", expanded);
      return;
    }

    const fileBtn = event.target.closest(".code-ide-tree-file-btn");
    if (!fileBtn) return;

    if (container.dataset.editorTabs !== undefined && fileBtn.dataset.panel) {
      activateEditPanel(container, fileBtn.dataset.panel);
      return;
    }

    if (fileBtn.dataset.tabIndex !== "") {
      activateLivePanel(container, fileBtn.dataset.tabIndex);
    }
  });
}

function initFileTree(container) {
  bindTreeInteractions(container);

  if (container.dataset.editorTabs !== undefined) {
    initCreateButton(container);

    const mainFilename = container.querySelector('[name="entry_filename"]');
    mainFilename?.addEventListener("input", () => rebuildFileTree(container));

    container.querySelectorAll("[data-asset-panel]").forEach((panel) => {
      const filenameInput = panel.querySelector('[name$="-filename"]');
      filenameInput?.addEventListener("input", () => rebuildFileTree(container));
    });

    container.addEventListener("sketch-source-changed", () => rebuildFileTree(container));
  }
}

window.SketchFileTree = {
  initFileTree,
  rebuildFileTree,
  normalizePath,
  openCreateDialog,
  requestAddAsset,
  activateEditPanel,
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".code-ide").forEach((container) => {
    if (container.querySelector(".code-ide-file-tree")) {
      initFileTree(container);
    }
  });
});
