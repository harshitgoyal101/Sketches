document.addEventListener("DOMContentLoaded", function () {
  initGalleryFilters();
  initGalleryMobileNav();
  initGalleryWorkspaceSidebar();
});

function initGalleryFilters() {
  var toggle = document.getElementById("gallery-filters-toggle");
  var panel = document.getElementById("gallery-filters-panel");
  if (!toggle || !panel) return;

  function setPanelOpen(open) {
    panel.hidden = !open;
    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  toggle.addEventListener("click", function () {
    setPanelOpen(panel.hidden);
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
