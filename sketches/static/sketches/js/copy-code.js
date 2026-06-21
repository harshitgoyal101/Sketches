document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".copy-code-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const panelId = button.dataset.copyTarget;
      const panel = panelId ? document.getElementById(panelId) : button.closest(".code-tab-panel");
      const source = panel?.querySelector(".copy-source");
      if (!source) return;

      const text = source.value;
      try {
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = "Copied!";
        button.classList.add("is-copied");
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove("is-copied");
        }, 2000);
      } catch {
        source.hidden = false;
        source.select();
        document.execCommand("copy");
        source.hidden = true;
        button.textContent = "Copied!";
      }
    });
  });
});
