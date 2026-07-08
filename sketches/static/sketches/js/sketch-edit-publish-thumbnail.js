document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".sketch-edit-page[data-can-save='true']");
  if (!form || !window.SketchThumbnailCapture) return;

  const uploadUrl = form.dataset.thumbnailUploadUrl;
  const previewIframe = document.getElementById("sketch-preview");
  const csrfToken = form.querySelector("[name=csrfmiddlewaretoken]")?.value;
  if (!uploadUrl || !previewIframe || !csrfToken) return;

  let resumePublish = false;

  form.addEventListener("submit", async (event) => {
    if (resumePublish) {
      return;
    }

    const submitter = event.submitter;
    const isPublish = submitter?.name === "action" && submitter.value === "publish";
    if (!isPublish) {
      return;
    }

    event.preventDefault();
    try {
      const blob = await window.SketchThumbnailCapture.captureFromIframe(previewIframe);
      await window.SketchThumbnailCapture.uploadThumbnail(blob, uploadUrl, csrfToken);
    } catch (error) {
      console.warn("Thumbnail capture before publish failed:", error);
    }

    resumePublish = true;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit(submitter);
    } else {
      form.submit();
    }
  });
});
