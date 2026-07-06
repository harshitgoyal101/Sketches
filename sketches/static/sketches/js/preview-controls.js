document.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("sketch-preview");
  const previewWrap = document.getElementById("preview-frame-wrap");
  const restartBtn = document.getElementById("restart-preview");
  const fullscreenBtn = document.getElementById("fullscreen-preview");
  const mobileFullscreenExit = document.getElementById("mobile-fullscreen-exit");
  const liveEditor = document.querySelector(".code-section-live");
  const createPreview = document.getElementById("create-preview-panel");
  const interactivePreview = liveEditor || createPreview;

  function isMobileViewport() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  if (!previewWrap || previewWrap.dataset.previewControlsBound === "true") {
    return;
  }
  previewWrap.dataset.previewControlsBound = "true";

  let fullscreenPlaceholder = null;
  let fullscreenParent = null;
  let fullscreenHistoryActive = false;
  let mobileFullscreenSession = false;
  let fullscreenToggleLock = false;

  function restartPreview() {
    if (!iframe) return;

    const canUseLiveEditor = typeof window.sketchRunPreview === "function";
    const hasUnsavedChanges = typeof window.sketchHasUnsavedChanges === "function"
      && window.sketchHasUnsavedChanges();
    const canSoftRestart = iframe.contentWindow && !hasUnsavedChanges;

    if (canSoftRestart) {
      iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
      return;
    }

    if (canUseLiveEditor) {
      window.sketchRunPreview();
      return;
    }

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "sketch-restart" }, "*");
    } else {
      iframe.src = iframe.src;
    }
  }

  if (restartBtn && iframe) {
    restartBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      restartPreview();
    });
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "sketch-preview-restart") {
      restartPreview();
    }
  });

  if (interactivePreview && iframe) {
    previewWrap.classList.add("is-click-restart");

    previewWrap.addEventListener("click", (event) => {
      if (event.target.closest(
        ".preview-toolbar, .sketch-detail-preview-chrome, .preview-toolbar-btn, .sketch-mobile-fullscreen-exit"
      )) {
        return;
      }
      restartPreview();
    });

    document.addEventListener("mousemove", (event) => {
      const rect = previewWrap.getBoundingClientRect();
      const insidePreview = (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
      if (!insidePreview || !iframe.contentWindow) return;

      iframe.contentWindow.postMessage(
        {
          type: "sketch-mouse",
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        "*"
      );
    });
  }

  function isPreviewFullscreen() {
    return previewWrap.classList.contains("is-preview-fullscreen");
  }

  function updateFullscreenButton(active) {
    if (!fullscreenBtn) return;

    fullscreenBtn.classList.toggle("is-active", active);
    const icon = fullscreenBtn.querySelector(".material-symbols-outlined");
    if (icon) {
      icon.textContent = active ? "fullscreen_exit" : "fullscreen";
    }
    fullscreenBtn.title = active ? "Exit fullscreen" : "Fullscreen preview";
    fullscreenBtn.setAttribute(
      "aria-label",
      active ? "Exit fullscreen" : "Fullscreen preview"
    );
  }

  function setChromeFullscreenHidden(hidden) {
    const chrome = previewWrap.querySelector(".sketch-detail-preview-chrome");
    if (!chrome) return;

    chrome.classList.toggle("is-chrome-fullscreen-hidden", hidden);
    chrome.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  function restorePreviewPlacement() {
    if (fullscreenPlaceholder && fullscreenParent) {
      fullscreenParent.insertBefore(previewWrap, fullscreenPlaceholder);
      fullscreenPlaceholder.remove();
    }

    fullscreenPlaceholder = null;
    fullscreenParent = null;
  }

  function pushFullscreenHistory() {
    if (fullscreenHistoryActive) return;

    history.pushState({ sketchPreviewFullscreen: true }, "", window.location.href);
    fullscreenHistoryActive = true;
  }

  function clearFullscreenHistory(fromPopState) {
    if (!fromPopState && fullscreenHistoryActive) {
      fullscreenHistoryActive = false;
      history.back();
      return;
    }

    fullscreenHistoryActive = false;
  }

  function openMobilePreviewFullscreen() {
    document.body.classList.remove("is-gallery-nav-open");
    mobileFullscreenSession = true;
    setChromeFullscreenHidden(true);

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

    fullscreenParent = previewWrap.parentElement;
    fullscreenPlaceholder = document.createComment("preview-fullscreen-placeholder");
    fullscreenParent.insertBefore(fullscreenPlaceholder, previewWrap);
    document.body.appendChild(previewWrap);

    previewWrap.classList.add("is-preview-fullscreen");
    document.body.classList.add("preview-fullscreen-open", "sketch-mobile-fullscreen-active");
    updateFullscreenButton(true);
    pushFullscreenHistory();
  }

  function openDesktopPreviewFullscreen() {
    document.body.classList.remove("is-gallery-nav-open");
    mobileFullscreenSession = false;

    fullscreenParent = previewWrap.parentElement;
    fullscreenPlaceholder = document.createComment("preview-fullscreen-placeholder");
    fullscreenParent.insertBefore(fullscreenPlaceholder, previewWrap);
    document.body.appendChild(previewWrap);

    previewWrap.classList.add("is-preview-fullscreen");
    document.body.classList.add("preview-fullscreen-open");
    updateFullscreenButton(true);
  }

  function openPreviewFullscreen() {
    if (isPreviewFullscreen()) return;

    if (isMobileViewport()) {
      openMobilePreviewFullscreen();
      return;
    }

    openDesktopPreviewFullscreen();
  }

  function closeMobilePreviewFullscreen(fromPopState = false) {
    if (!isPreviewFullscreen()) return;

    previewWrap.classList.remove("is-preview-fullscreen");
    document.body.classList.remove("preview-fullscreen-open", "sketch-mobile-fullscreen-active");
    setChromeFullscreenHidden(false);
    restorePreviewPlacement();
    updateFullscreenButton(false);
    mobileFullscreenSession = false;

    const nav = document.getElementById("gallery-site-nav");
    const navToggle = document.getElementById("gallery-nav-toggle");
    if (nav) nav.removeAttribute("aria-hidden");

    clearFullscreenHistory(fromPopState);
  }

  function closeDesktopPreviewFullscreen(fromPopState = false) {
    if (!isPreviewFullscreen()) return;

    previewWrap.classList.remove("is-preview-fullscreen");
    document.body.classList.remove("preview-fullscreen-open");
    restorePreviewPlacement();
    updateFullscreenButton(false);
    mobileFullscreenSession = false;
    clearFullscreenHistory(fromPopState);
  }

  function closePreviewFullscreen(fromPopState = false) {
    if (!isPreviewFullscreen()) return;

    if (mobileFullscreenSession) {
      closeMobilePreviewFullscreen(fromPopState);
      return;
    }

    closeDesktopPreviewFullscreen(fromPopState);
  }

  function togglePreviewFullscreen() {
    if (fullscreenToggleLock) return;

    fullscreenToggleLock = true;
    window.setTimeout(() => {
      fullscreenToggleLock = false;
    }, 350);

    if (isPreviewFullscreen()) {
      closePreviewFullscreen();
    } else {
      openPreviewFullscreen();
    }
  }

  function bindFullscreenToggle(button) {
    if (!button) return;

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePreviewFullscreen();
    });
  }

  bindFullscreenToggle(fullscreenBtn);

  if (mobileFullscreenExit) {
    mobileFullscreenExit.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePreviewFullscreen();
    });
  }

  window.addEventListener("popstate", () => {
    if (isPreviewFullscreen()) {
      closePreviewFullscreen(true);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isPreviewFullscreen()) {
      closePreviewFullscreen();
    }
  });
});
