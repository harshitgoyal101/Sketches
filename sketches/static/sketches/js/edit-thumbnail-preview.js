document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("edit-thumbnail-preview");
  const fileInput = document.querySelector(".edit-thumbnail-field input[type='file']");
  if (!preview || !fileInput) return;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
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
