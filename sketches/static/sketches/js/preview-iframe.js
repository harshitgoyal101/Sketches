window.SketchPreviewIframe = (function () {
  async function renderProcessingPreview(iframe, options, getCsrfToken, previewUrl) {
    const response = await fetch(previewUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({
        sketch_type: options.sketchType,
        main_code: options.mainCode,
        assets: options.assets,
        mode: options.mode,
        run_id: options.runId,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Preview failed");
    }

    const payload = await response.json();
    iframe.removeAttribute("srcdoc");
    iframe.src = payload.url;
  }

  async function render(iframe, options, { getCsrfToken, previewUrl, embedReady }) {
    if (!iframe) return;

    if (options.sketchType === "processing") {
      await renderProcessingPreview(iframe, options, getCsrfToken, previewUrl);
      return;
    }

    await embedReady;
    iframe.removeAttribute("src");
    iframe.srcdoc = SketchEmbed.build(options);
  }

  return { render };
})();
