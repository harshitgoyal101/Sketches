document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("edit-thumbnail-preview");
  const fileInput = document.querySelector(
    ".sketch-settings-thumbnail input[type='file'], .edit-thumbnail-field input[type='file']",
  );
  if (!preview || !fileInput) return;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const isSettingsPreview = preview.classList.contains("sketch-settings-thumbnail-preview")
        || preview.closest(".sketch-settings-thumbnail");
      if (isSettingsPreview) {
        preview.className = "sketch-settings-thumbnail-preview sketch-settings-thumbnail-preview--has-image";
        preview.innerHTML = `<img src="${reader.result}" alt="Selected thumbnail preview">`;
        return;
      }

      preview.className = "edit-thumbnail-preview edit-thumbnail-preview--has-image";
      preview.innerHTML = `
        <div class="sketch-thumbnail sketch-thumbnail--settings">
          <img src="${reader.result}" alt="Selected thumbnail preview">
        </div>
      `;
    });
    reader.readAsDataURL(file);
  });
});
