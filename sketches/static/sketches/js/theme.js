(function () {
  var STORAGE_KEY = "sketches101-theme";

  function currentTheme() {
    return document.documentElement.classList.contains("theme-light") ? "light" : "dark";
  }

  function applyTheme(theme) {
    var next = theme === "light" ? "light" : "dark";
    document.documentElement.classList.remove("theme-light", "theme-dark", "light", "dark");
    document.documentElement.classList.add(next === "light" ? "theme-light" : "theme-dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.cookie = STORAGE_KEY + "=" + next + ";path=/;max-age=31536000;SameSite=Lax";
    } catch (e) {
      /* ignore */
    }
    syncToggleLabels();
    syncLandingIdeCta();
    try {
      document.dispatchEvent(
        new CustomEvent("sketches101:themechange", { detail: { theme: next } })
      );
    } catch (e) {
      /* ignore */
    }
  }

  function syncLandingIdeCta() {
    var link = document.querySelector("[data-landing-ide-cta]");
    if (!link) return;
    var theme = currentTheme();
    var slug =
      theme === "light"
        ? link.getAttribute("data-sketch-slug-light")
        : link.getAttribute("data-sketch-slug-dark");
    if (!slug) {
      slug =
        link.getAttribute("data-sketch-slug-dark") ||
        link.getAttribute("data-sketch-slug-light");
    }
    if (slug) {
      link.setAttribute("href", "/accounts/sketches/" + slug + "/edit/");
    }
  }

  function syncToggleLabels() {
    var isLight = currentTheme() === "light";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute(
        "aria-label",
        isLight ? "Switch to dark theme" : "Switch to light theme"
      );
      btn.setAttribute("aria-pressed", isLight ? "true" : "false");
    });
  }

  function toggleTheme() {
    applyTheme(currentTheme() === "light" ? "dark" : "light");
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-theme-toggle]");
    if (!btn) return;
    event.preventDefault();
    toggleTheme();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      syncToggleLabels();
      syncLandingIdeCta();
    });
  } else {
    syncToggleLabels();
    syncLandingIdeCta();
  }
})();
