(function () {
  var searchInput = document.getElementById("gallery-search");
  if (searchInput) {
    searchInput.addEventListener("focus", function () {
      searchInput.classList.add("w-80");
      searchInput.classList.remove("w-64");
    });
    searchInput.addEventListener("blur", function () {
      searchInput.classList.remove("w-80");
      searchInput.classList.add("w-64");
    });
  }

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
    showBtn.title = collapsed ? "Show workspace sidebar" : "Show workspace sidebar";

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
})();
