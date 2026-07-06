(function () {
  const STORAGE_PREFIX = "sketches-edit-draft:";
  const DEBOUNCE_MS = 400;

  function serializeState(state) {
    return JSON.stringify({
      title: state.title || "",
      entry_filename: state.entry_filename || "",
      sketch_type: state.sketch_type || "p5js",
      code: state.code || "",
      assets: (state.assets || []).map((asset) => ({
        id: asset.id || null,
        filename: asset.filename || "",
        content: asset.content || "",
        asset_type: asset.asset_type || "js",
        panel: asset.panel || "",
        deleted: Boolean(asset.deleted),
      })),
    });
  }

  function setFieldValue(field, value) {
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function captureEditState(page) {
    const titleField = page.querySelector('[name="title"]');
    const entryField = page.querySelector('[name="entry_filename"]');
    const typeField = page.querySelector('[name="sketch_type"]');
    const codeField = page.querySelector('[name="code"]');

    const assets = [];
    page.querySelectorAll("[data-asset-panel]").forEach((panel) => {
      const deleteField = panel.querySelector('[name$="-DELETE"]');
      const idField = panel.querySelector('[name$="-id"]');
      assets.push({
        id: idField?.value || null,
        filename: panel.querySelector('[name$="-filename"]')?.value || "",
        content: panel.querySelector('[name$="-content"]')?.value || "",
        asset_type: panel.querySelector('[name$="-asset_type"]')?.value || "js",
        panel: panel.dataset.panel || "",
        deleted: Boolean(deleteField?.checked),
      });
    });

    return {
      title: titleField?.value || "",
      entry_filename: entryField?.value || "",
      sketch_type: typeField?.value || "p5js",
      code: codeField?.value || "",
      assets,
      savedAt: Date.now(),
    };
  }

  function applyEditState(page, state) {
    setFieldValue(page.querySelector('[name="title"]'), state.title || "");
    setFieldValue(page.querySelector('[name="entry_filename"]'), state.entry_filename || "");
    setFieldValue(page.querySelector('[name="sketch_type"]'), state.sketch_type || "p5js");
    setFieldValue(page.querySelector('[name="code"]'), state.code || "");

    const assetsById = new Map();
    const assetsByPanel = new Map();
    (state.assets || []).forEach((asset) => {
      if (asset.id) assetsById.set(String(asset.id), asset);
      if (asset.panel) assetsByPanel.set(asset.panel, asset);
    });

    page.querySelectorAll("[data-asset-panel]").forEach((panel) => {
      const idField = panel.querySelector('[name$="-id"]');
      const draftAsset =
        (idField?.value && assetsById.get(String(idField.value)))
        || assetsByPanel.get(panel.dataset.panel || "");
      if (!draftAsset) return;

      const deleteField = panel.querySelector('[name$="-DELETE"]');
      if (deleteField) {
        deleteField.checked = Boolean(draftAsset.deleted);
      }
      setFieldValue(panel.querySelector('[name$="-filename"]'), draftAsset.filename || "");
      setFieldValue(panel.querySelector('[name$="-asset_type"]'), draftAsset.asset_type || "js");
      setFieldValue(panel.querySelector('[name$="-content"]'), draftAsset.content || "");
    });

    const codeSection = page.querySelector("#source-code");
    if (codeSection) {
      codeSection.dispatchEvent(new CustomEvent("sketch-source-changed", { bubbles: true }));
    }
  }

  function buildAuthUrl(baseUrl, returnPath) {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set("next", returnPath || window.location.pathname + window.location.search);
    return url.href;
  }

  function createModal() {
    const overlay = document.createElement("div");
    overlay.className = "sketch-edit-leave-dialog";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="sketch-edit-leave-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="sketch-edit-leave-title">
        <h2 class="sketch-edit-leave-dialog-title" id="sketch-edit-leave-title">Unsaved changes</h2>
        <p class="sketch-edit-leave-dialog-text" data-leave-dialog-text>
          You have unsaved edits. Leave this page anyway?
        </p>
        <div class="sketch-edit-leave-dialog-actions">
          <button type="button" class="btn btn-primary btn-sm" data-leave-action="stay">Keep editing</button>
          <button type="button" class="btn btn-secondary btn-sm" data-leave-action="save" hidden>Save changes</button>
          <button type="button" class="btn btn-secondary btn-sm" data-leave-action="login" hidden>Log in to save</button>
          <button type="button" class="btn btn-secondary btn-sm" data-leave-action="signup" hidden>Create account</button>
          <button type="button" class="btn btn-ghost btn-sm" data-leave-action="leave">Leave without saving</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.querySelector(".sketch-edit-page[data-sketch-edit-draft]");
    if (!page) return;

    const draftKey = page.dataset.draftKey || "unknown";
    const storageKey = STORAGE_PREFIX + draftKey;
    const canSave = page.dataset.canSave === "true";
    const loginUrl = page.dataset.loginUrl || "/accounts/login/";
    const signupUrl = page.dataset.signupUrl || "/accounts/signup/";
    const form = page.closest("form.themed-form");
    const codeSection = page.querySelector("#source-code");

    let savedSnapshot = "";
    let hasUnsavedChanges = false;
    let navigationAllowed = false;
    let pendingNavigationUrl = null;
    let draftSaveTimer = null;

    const banner = document.createElement("div");
    banner.className = "sketch-edit-unsaved-banner";
    banner.hidden = true;
    banner.setAttribute("role", "status");
    banner.innerHTML = `
      <p class="sketch-edit-unsaved-banner-text" data-unsaved-banner-text></p>
      <div class="sketch-edit-unsaved-banner-actions">
        <button type="button" class="btn btn-primary btn-sm" data-unsaved-action="save" hidden>Save changes</button>
        <a class="btn btn-secondary btn-sm" data-unsaved-action="login" hidden>Log in</a>
        <a class="btn btn-secondary btn-sm" data-unsaved-action="signup" hidden>Create account</a>
      </div>
    `;
    page.insertBefore(banner, page.firstChild);

    const modal = createModal();
    const modalText = modal.querySelector("[data-leave-dialog-text]");
    const modalStay = modal.querySelector('[data-leave-action="stay"]');
    const modalSave = modal.querySelector('[data-leave-action="save"]');
    const modalLogin = modal.querySelector('[data-leave-action="login"]');
    const modalSignup = modal.querySelector('[data-leave-action="signup"]');
    const modalLeave = modal.querySelector('[data-leave-action="leave"]');
    const bannerText = banner.querySelector("[data-unsaved-banner-text]");
    const bannerSave = banner.querySelector('[data-unsaved-action="save"]');
    const bannerLogin = banner.querySelector('[data-unsaved-action="login"]');
    const bannerSignup = banner.querySelector('[data-unsaved-action="signup"]');

    function loadDraft() {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function saveDraft(state) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // Ignore quota errors.
      }
    }

    function clearDraft() {
      localStorage.removeItem(storageKey);
    }

    function updateDirtyState() {
      const current = serializeState(captureEditState(page));
      hasUnsavedChanges = current !== savedSnapshot;
      page.classList.toggle("has-unsaved-edits", hasUnsavedChanges);
      banner.hidden = !hasUnsavedChanges;

      if (hasUnsavedChanges) {
        if (canSave) {
          bannerText.textContent = "You have unsaved changes.";
          bannerSave.hidden = false;
          bannerLogin.hidden = true;
          bannerSignup.hidden = true;
        } else {
          bannerText.textContent =
            "You have unsaved changes. Log in as the author to save them.";
          bannerSave.hidden = true;
          bannerLogin.hidden = false;
          bannerSignup.hidden = false;
          bannerLogin.href = buildAuthUrl(loginUrl);
          bannerSignup.href = buildAuthUrl(signupUrl);
        }
        scheduleDraftSave();
      } else {
        clearDraft();
      }
    }

    function scheduleDraftSave() {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = setTimeout(() => {
        if (!hasUnsavedChanges) return;
        saveDraft(captureEditState(page));
      }, DEBOUNCE_MS);
    }

    function restoreDraftIfNeeded() {
      const serverState = captureEditState(page);
      savedSnapshot = serializeState(serverState);
      const draft = loadDraft();
      if (!draft) {
        updateDirtyState();
        return;
      }
      if (serializeState(draft) === savedSnapshot) {
        clearDraft();
        updateDirtyState();
        return;
      }
      applyEditState(page, draft);
      updateDirtyState();
    }

    function openLeaveDialog(targetUrl) {
      pendingNavigationUrl = targetUrl;
      if (canSave) {
        modalText.textContent =
          "You have unsaved changes. Save before leaving, or discard your edits.";
        modalSave.hidden = false;
        modalLogin.hidden = true;
        modalSignup.hidden = true;
      } else {
        modalText.textContent =
          "You have unsaved changes. Log in as the author to save them, or leave without saving.";
        modalSave.hidden = true;
        modalLogin.hidden = false;
        modalSignup.hidden = false;
      }
      modal.hidden = false;
      modalStay.focus();
    }

    function closeLeaveDialog() {
      modal.hidden = true;
      pendingNavigationUrl = null;
    }

    function allowNavigation(url, options = {}) {
      const { clearStoredDraft = false } = options;
      navigationAllowed = true;
      if (hasUnsavedChanges && !clearStoredDraft) {
        saveDraft(captureEditState(page));
      } else if (clearStoredDraft) {
        clearDraft();
      }
      closeLeaveDialog();
      if (url) {
        window.location.href = url;
      }
    }

    function isAuthNavigation(url) {
      let target;
      try {
        target = new URL(url, window.location.origin);
      } catch {
        return false;
      }
      const loginPath = new URL(loginUrl, window.location.origin).pathname;
      const signupPath = new URL(signupUrl, window.location.origin).pathname;
      return target.pathname === loginPath || target.pathname === signupPath;
    }

    function shouldGuardLink(link) {
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return false;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;
      if (link.dataset.unsavedAllow === "true") return false;

      let url;
      try {
        url = new URL(link.href, window.location.origin);
      } catch {
        return false;
      }
      if (url.origin !== window.location.origin) return false;

      const current = new URL(window.location.href);
      if (url.pathname === current.pathname && url.search === current.search) return false;
      return true;
    }

    function configureLeaveDialog() {
      modalStay.addEventListener("click", () => {
        closeLeaveDialog();
      });

      modalSave.addEventListener("click", () => {
        if (!form) return;
        navigationAllowed = true;
        saveDraft(captureEditState(page));
        form.requestSubmit();
      });

      modalLogin.addEventListener("click", () => {
        allowNavigation(buildAuthUrl(loginUrl));
      });

      modalSignup.addEventListener("click", () => {
        allowNavigation(buildAuthUrl(signupUrl));
      });

      modalLeave.addEventListener("click", () => {
        if (!pendingNavigationUrl) {
          closeLeaveDialog();
          return;
        }
        allowNavigation(pendingNavigationUrl, { clearStoredDraft: true });
      });

      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeLeaveDialog();
      });

      document.addEventListener("keydown", (event) => {
        if (modal.hidden) return;
        if (event.key === "Escape") {
          event.preventDefault();
          closeLeaveDialog();
        }
      });
    }

    function configureBanner() {
      bannerSave?.addEventListener("click", () => {
        if (!form) return;
        navigationAllowed = true;
        saveDraft(captureEditState(page));
        form.requestSubmit();
      });

      bannerLogin?.addEventListener("click", (event) => {
        if (!hasUnsavedChanges) return;
        event.preventDefault();
        saveDraft(captureEditState(page));
        navigationAllowed = true;
        window.location.href = buildAuthUrl(loginUrl);
      });

      bannerSignup?.addEventListener("click", (event) => {
        if (!hasUnsavedChanges) return;
        event.preventDefault();
        saveDraft(captureEditState(page));
        navigationAllowed = true;
        window.location.href = buildAuthUrl(signupUrl);
      });
    }

    document.addEventListener(
      "click",
      (event) => {
        if (navigationAllowed || !hasUnsavedChanges) return;
        const link = event.target.closest("a[href]");
        if (!shouldGuardLink(link)) return;
        event.preventDefault();
        event.stopPropagation();
        if (isAuthNavigation(link.href)) {
          allowNavigation(buildAuthUrl(link.href));
          return;
        }
        openLeaveDialog(link.href);
      },
      true
    );

    form?.addEventListener("submit", () => {
      navigationAllowed = true;
      saveDraft(captureEditState(page));
    });

    page.addEventListener("input", () => updateDirtyState());
    page.addEventListener("change", () => updateDirtyState());
    codeSection?.addEventListener("sketch-source-changed", () => updateDirtyState());

    window.addEventListener("beforeunload", (event) => {
      if (!hasUnsavedChanges || navigationAllowed) return;
      saveDraft(captureEditState(page));
      event.preventDefault();
      event.returnValue = "";
    });

    if (window.history && window.history.pushState) {
      history.pushState({ sketchEditDraftGuard: true }, "");
      window.addEventListener("popstate", () => {
        if (!hasUnsavedChanges || navigationAllowed) return;
        history.pushState({ sketchEditDraftGuard: true }, "");
        const backUrl = page.dataset.backUrl || document.referrer || "/";
        openLeaveDialog(backUrl);
      });
    }

    window.sketchEditHasUnsavedChanges = () => hasUnsavedChanges;

    configureLeaveDialog();
    configureBanner();
    restoreDraftIfNeeded();
  });
})();
