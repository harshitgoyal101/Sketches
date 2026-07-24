document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("generate-thumbnail-btn");
  if (!button || !window.SketchThumbnailCapture) return;

  const page = document.querySelector(".sketch-settings");
  const preview = document.getElementById("edit-thumbnail-preview");
  const uploadUrl = button.dataset.uploadUrl;
  const embedUrl = button.dataset.embedUrl;
  const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value;

  if (!uploadUrl || !embedUrl || !csrfToken) return;

  if (page?.dataset.setupStep === "2") {
    try {
      localStorage.removeItem("sketches-edit-draft:create");
    } catch (_error) {
      // Ignore storage errors in private browsing.
    }
  }

  const defaultLabel = button.innerHTML;

  function setBusy(isBusy) {
    button.disabled = isBusy;
    button.setAttribute("aria-busy", isBusy ? "true" : "false");
    if (isBusy) {
      button.textContent = "Generating…";
    } else {
      button.innerHTML = defaultLabel;
    }
  }

  function reloadSettingsPage() {
    const url = new URL(window.location.href);
    url.hash = "";
    window.location.replace(url.href);
  }

  async function generateThumbnail() {
    setBusy(true);
    try {
      const blob = await window.SketchThumbnailCapture.captureFromEmbedUrl(embedUrl);
      const payload = await window.SketchThumbnailCapture.uploadThumbnail(
        blob,
        uploadUrl,
        csrfToken,
      );
      if (payload.url) {
        reloadSettingsPage();
        return;
      }
      throw new Error("Thumbnail upload did not return an image URL.");
    } catch (error) {
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
      button.innerHTML = defaultLabel;
      window.alert(error.message || "Could not generate a thumbnail from the preview.");
    }
  }

  button.addEventListener("click", () => {
    generateThumbnail();
  });

  const shouldAutoGenerate =
    page?.dataset.autoGenerateThumbnail === "true"
    && preview?.classList.contains("sketch-settings-thumbnail-preview--empty");

  if (shouldAutoGenerate) {
    window.setTimeout(() => {
      generateThumbnail();
    }, 800);
  }
});
