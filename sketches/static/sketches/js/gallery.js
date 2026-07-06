document.addEventListener("DOMContentLoaded", function () {
  initGalleryFilters();
  initGalleryMobileNav();
  initGalleryWorkspaceSidebar();
  initGalleryMessages();
});

function initGalleryFilters() {
  var toggle = document.getElementById("gallery-filters-toggle");
  var panel = document.getElementById("gallery-filters-panel");
  if (!toggle || !panel) return;

  var STORAGE_KEY = "gallery-filters-panel-open";

  function setPanelOpen(open, persist) {
    panel.hidden = !open;
    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (persist !== false) {
      if (open) {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  if (sessionStorage.getItem(STORAGE_KEY) === "true") {
    setPanelOpen(true, false);
  }

  toggle.addEventListener("click", function () {
    setPanelOpen(panel.hidden);
  });

  panel.querySelectorAll(".gallery-filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      sessionStorage.setItem(STORAGE_KEY, "true");
    });
  });
}

function initGalleryMobileNav() {
  var navToggle = document.getElementById("gallery-nav-toggle");
  var mobileMenu = document.getElementById("gallery-mobile-menu");
  var navBackdrop = document.getElementById("gallery-nav-backdrop");
  var desktopNavQuery = window.matchMedia("(min-width: 1280px)");

  if (!navToggle || !mobileMenu || !navBackdrop) return;

  function setMobileMenuOpen(open) {
    document.body.classList.toggle("is-gallery-nav-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
    navBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  navToggle.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    setMobileMenuOpen(!document.body.classList.contains("is-gallery-nav-open"));
  });

  navBackdrop.addEventListener("click", closeMobileMenu);

  mobileMenu.querySelectorAll("a, button").forEach(function (link) {
    link.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMobileMenu();
  });

  desktopNavQuery.addEventListener("change", function (event) {
    if (event.matches) closeMobileMenu();
  });
}

function initGalleryWorkspaceSidebar() {
  var sidebar = document.getElementById("gallery-workspace-sidebar");
  var hideBtn = document.getElementById("gallery-workspace-sidebar-hide");
  var showBtn = document.getElementById("gallery-workspace-sidebar-show");
  if (!sidebar || !hideBtn || !showBtn) return;

  var STORAGE_KEY = "sketches101-workspace-sidebar-collapsed";
  var desktopQuery = window.matchMedia("(min-width: 1280px)");

  function isDesktopLayout() {
    return desktopQuery.matches;
  }

  function setCollapsed(collapsed, persist) {
    if (!isDesktopLayout()) {
      document.body.classList.remove("is-workspace-sidebar-collapsed");
      hideBtn.hidden = false;
      hideBtn.setAttribute("aria-expanded", "true");
      showBtn.hidden = true;
      showBtn.setAttribute("aria-expanded", "false");
      return;
    }

    document.body.classList.toggle("is-workspace-sidebar-collapsed", collapsed);
    hideBtn.hidden = collapsed;
    hideBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    showBtn.hidden = !collapsed;
    showBtn.setAttribute("aria-expanded", collapsed ? "true" : "false");

    if (persist) {
      if (collapsed) {
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  function loadSavedState() {
    var collapsed = localStorage.getItem(STORAGE_KEY) === "true";
    setCollapsed(collapsed && isDesktopLayout(), false);
  }

  hideBtn.addEventListener("click", function () {
    setCollapsed(true, true);
  });

  showBtn.addEventListener("click", function () {
    setCollapsed(false, true);
  });

  desktopQuery.addEventListener("change", loadSavedState);
  loadSavedState();
}

function initGalleryMessages() {
  var container = document.querySelector(".gallery-messages");
  if (!container) return;

  container.querySelectorAll(".gallery-message").forEach(function (message) {
    var isError = message.classList.contains("gallery-message-error");
    var dismissMs = isError ? 8000 : 4500;
    var dismissTimer = null;

    function dismiss() {
      if (message.classList.contains("is-dismissing")) return;
      if (dismissTimer) {
        window.clearTimeout(dismissTimer);
        dismissTimer = null;
      }
      message.classList.add("is-dismissing");
      window.setTimeout(function () {
        message.remove();
        if (!container.querySelector(".gallery-message")) {
          container.remove();
        }
      }, 280);
    }

    message.style.cursor = "pointer";
    message.title = "Dismiss";
    message.addEventListener("click", dismiss);
    dismissTimer = window.setTimeout(dismiss, dismissMs);
  });
}
