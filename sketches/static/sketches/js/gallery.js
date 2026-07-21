document.addEventListener("DOMContentLoaded", function () {
  initGalleryFilters();
  initGalleryMobileNav();
  initGalleryHomeNavScroll();
  initGalleryAvatarMenu();
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
  var navClose = document.getElementById("gallery-nav-close");
  var desktopNavQuery = window.matchMedia("(min-width: 1280px)");
  var previousFocus = null;
  var focusTrapHandler = null;

  if (!navToggle || !mobileMenu || !navBackdrop) return;

  function getFocusableElements() {
    return mobileMenu.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  function setMobileMenuOpen(open) {
    if (open && document.body.classList.contains("is-workspace-sidebar-mobile-open")) {
      document.getElementById("gallery-workspace-sidebar-hide")?.click();
    }

    document.body.classList.toggle("is-gallery-nav-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu"
    );
    mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
    navBackdrop.setAttribute("aria-hidden", open ? "false" : "true");

    if (open) {
      previousFocus = document.activeElement;
      window.setTimeout(function () {
        (navClose || getFocusableElements()[0] || mobileMenu).focus();
      }, 50);
      focusTrapHandler = function (event) {
        if (event.key !== "Tab") return;
        var els = getFocusableElements();
        if (!els.length) return;
        var first = els[0];
        var last = els[els.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      mobileMenu.addEventListener("keydown", focusTrapHandler);
    } else {
      if (focusTrapHandler) {
        mobileMenu.removeEventListener("keydown", focusTrapHandler);
        focusTrapHandler = null;
      }
      if (previousFocus && typeof previousFocus.focus === "function") {
        window.setTimeout(function () {
          previousFocus.focus();
        }, 0);
      }
      previousFocus = null;
    }
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  navToggle.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    setMobileMenuOpen(!document.body.classList.contains("is-gallery-nav-open"));
  });

  if (navClose) {
    navClose.addEventListener("click", function (event) {
      event.preventDefault();
      closeMobileMenu();
    });
  }

  navBackdrop.addEventListener("click", closeMobileMenu);

  mobileMenu.querySelectorAll("a, button[type='submit']").forEach(function (link) {
    link.addEventListener("click", function () {
      if (link.id === "gallery-nav-close") return;
      closeMobileMenu();
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMobileMenu();
  });

  desktopNavQuery.addEventListener("change", function (event) {
    if (event.matches) closeMobileMenu();
  });
}

function initGalleryHomeNavScroll() {
  var nav = document.getElementById("gallery-site-nav");
  if (!nav || !document.body.classList.contains("gallery-home-page")) return;

  function updateScrollState() {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });
}

function initGalleryAvatarMenu() {
  var menu = document.getElementById("gallery-nav-avatar-menu");
  var toggle = document.getElementById("gallery-nav-avatar-toggle");
  var dropdown = document.getElementById("gallery-nav-avatar-dropdown");
  if (!menu || !toggle || !dropdown) return;

  function setOpen(open) {
    dropdown.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.classList.toggle("is-open", open);
  }

  toggle.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(dropdown.hidden);
  });

  document.addEventListener("click", function (event) {
    if (!menu.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });
}

function initGalleryWorkspaceSidebar() {
  var sidebar = document.getElementById("gallery-workspace-sidebar");
  var hideBtn = document.getElementById("gallery-workspace-sidebar-hide");
  var showBtn = document.getElementById("gallery-workspace-sidebar-show");
  var backdrop = document.getElementById("gallery-workspace-sidebar-backdrop");
  if (!sidebar || !hideBtn || !showBtn) return;

  var STORAGE_KEY = "sketches101-workspace-sidebar-collapsed";
  var desktopQuery = window.matchMedia("(min-width: 1280px)");

  function isDesktopLayout() {
    return desktopQuery.matches;
  }

  function setMobileOpen(open) {
    document.body.classList.toggle("is-workspace-sidebar-mobile-open", open);
    hideBtn.hidden = !open;
    hideBtn.setAttribute("aria-expanded", open ? "true" : "false");
    showBtn.hidden = open;
    showBtn.setAttribute("aria-expanded", open ? "false" : "true");

    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
  }

  function setDesktopCollapsed(collapsed, persist) {
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

  function closeMobileNavMenu() {
    if (!document.body.classList.contains("is-gallery-nav-open")) return;
    var navClose = document.getElementById("gallery-nav-close");
    if (navClose) {
      navClose.click();
      return;
    }
    document.getElementById("gallery-nav-toggle")?.click();
  }

  function syncSidebarLayout() {
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }

    if (!isDesktopLayout()) {
      document.body.classList.remove("is-workspace-sidebar-collapsed");
      setMobileOpen(false);
      showBtn.hidden = false;
      showBtn.setAttribute("aria-expanded", "false");
      return;
    }

    document.body.classList.remove("is-workspace-sidebar-mobile-open");
    var collapsed = localStorage.getItem(STORAGE_KEY) === "true";
    setDesktopCollapsed(collapsed, false);
  }

  hideBtn.addEventListener("click", function () {
    if (isDesktopLayout()) {
      setDesktopCollapsed(true, true);
      return;
    }
    setMobileOpen(false);
  });

  showBtn.addEventListener("click", function () {
    if (isDesktopLayout()) {
      setDesktopCollapsed(false, true);
      return;
    }
    closeMobileNavMenu();
    setMobileOpen(true);
  });

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      if (!isDesktopLayout()) {
        setMobileOpen(false);
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      !isDesktopLayout() &&
      document.body.classList.contains("is-workspace-sidebar-mobile-open")
    ) {
      setMobileOpen(false);
    }
  });

  var navToggle = document.getElementById("gallery-nav-toggle");
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      if (!isDesktopLayout() && document.body.classList.contains("is-workspace-sidebar-mobile-open")) {
        setMobileOpen(false);
      }
    });
  }

  desktopQuery.addEventListener("change", syncSidebarLayout);
  syncSidebarLayout();
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
