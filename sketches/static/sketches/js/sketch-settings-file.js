document.addEventListener("DOMContentLoaded", () => {
  function bindFileName(inputSelector, nameSelector) {
    const fileInput = document.querySelector(inputSelector);
    const fileName = document.querySelector(nameSelector);
    if (!fileInput || !fileName) return;
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      fileName.textContent = file ? file.name : "No file chosen";
    });
  }

  bindFileName(
    ".sketch-settings-card--thumbnail input[type='file']",
    "[data-thumbnail-file-name]"
  );
  bindFileName(
    ".sketch-settings-card--app-icon input[type='file']",
    "[data-app-icon-file-name]"
  );
});
