document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.querySelector(".sketch-settings-file-upload input[type='file']");
  const fileName = document.querySelector("[data-thumbnail-file-name]");
  if (!fileInput || !fileName) return;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileName.textContent = file ? file.name : "No file chosen";
  });
});
