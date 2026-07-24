document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;

      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.setAttribute("aria-pressed", String(!showing));
      button.setAttribute(
        "aria-label",
        showing ? "Show password" : "Hide password"
      );

      const icon = button.querySelector(".material-symbols-outlined");
      if (icon) {
        icon.textContent = showing ? "visibility" : "visibility_off";
      } else {
        button.textContent = showing ? "Show" : "Hide";
      }
    });
  });
});
