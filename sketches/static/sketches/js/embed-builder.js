window.SketchEmbed = (function () {
  const EMBED_BASE = (window.SketchEmbedBase || "/static/sketches/embed/").replace(/\/?$/, "/");
  let config = null;
  let p5Shell = null;
  let processingShell = null;
  const snippets = {};
  let processingBootstrap = null;
  let processingMediaHelpers = null;
  let preloadPromise = null;

  function escapeScript(code) {
    return code.replace(/<\/script>/gi, "<\\/script>");
  }

  function scriptTag(code) {
    return `<script>\n${escapeScript(code)}\n</script>`;
  }

  function styleTag(code) {
    return `<style>\n${code}\n</style>`;
  }

  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load embed asset: ${url}`);
    }
    return response.text();
  }

  async function preload() {
    if (preloadPromise) {
      return preloadPromise;
    }

    preloadPromise = (async () => {
      const [configText, p5ShellText, processingShellText] = await Promise.all([
        fetchText(`${EMBED_BASE}config.json`),
        fetchText(`${EMBED_BASE}p5-shell.html`),
        fetchText(`${EMBED_BASE}processing-shell.html`),
      ]);
      config = JSON.parse(configText);
      p5Shell = p5ShellText;
      processingShell = processingShellText;

      const snippetNames = new Set();
      Object.values(config.head_snippets).forEach((names) => {
        names.forEach((name) => snippetNames.add(name));
      });
      (config.processing_snippets || []).forEach((name) => snippetNames.add(name));
      snippetNames.add("processing-media-helpers.js");

      await Promise.all(
        [...snippetNames].map(async (name) => {
          snippets[name] = await fetchText(`${EMBED_BASE}snippets/${name}`);
        })
      );
      processingBootstrap = snippets["processing-bootstrap.js"] || null;
      processingMediaHelpers = snippets["processing-media-helpers.js"] || "";
    })();

    return preloadPromise;
  }

  function normalizeAssets(assets) {
    return (assets || []).map((asset) => ({
      asset_type: asset.asset_type,
      content: asset.content,
    }));
  }

  function baseTag(mediaBaseUrl) {
    if (!mediaBaseUrl) return "";
    const href = mediaBaseUrl.endsWith("/") ? mediaBaseUrl : `${mediaBaseUrl}/`;
    return `<base href="${href.replace(/"/g, "%22")}">`;
  }

  function buildHeadExtra(assets, mediaBaseUrl) {
    const parts = [];
    const base = baseTag(mediaBaseUrl);
    if (base) parts.push(base);
    assets
      .filter((asset) => asset.asset_type === "css")
      .forEach((asset) => parts.push(styleTag(asset.content)));
    return parts.join("\n  ");
  }

  function buildBodyExtra(mainCode, assets) {
    const bodyScripts = assets
      .filter((asset) => asset.asset_type === "js")
      .map((asset) => scriptTag(asset.content));
    bodyScripts.push(scriptTag(mainCode));
    return bodyScripts.join("\n");
  }

  function resolveCdnUrl(url) {
    if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
      return url;
    }
    return `${EMBED_BASE}${url}`;
  }

  function buildHeadScripts(mode, runId) {
    const snippetNames = config.head_snippets[mode] || [];
    return snippetNames
      .map((name) => {
        let content = snippets[name];
        if (runId !== undefined && runId !== null) {
          content = content.replace(/__RUN_ID__/g, String(runId));
        }
        return `<script>\n${content}</script>`;
      })
      .join("\n  ");
  }

  function p5SoundScript() {
    const url = (config.p5sound_cdn || "").trim();
    if (!url) return "";
    return `<script src="${url}"></script>`;
  }

  function buildProcessingBootstrap(sources, runId) {
    if (!processingBootstrap) {
      throw new Error("Processing bootstrap snippet not loaded.");
    }
    let snippet = processingBootstrap;
    snippet = snippet.replace("__PROCESSING_SOURCES__", JSON.stringify(sources));
    snippet = snippet.replace("__RUN_ID__", runId === null || runId === undefined ? "null" : String(runId));
    return `<script>\n${snippet}\n</script>`;
  }

  function resolveMode({ fullscreen = false, mode = null }) {
    if (mode) return mode;
    return fullscreen ? "fullscreen" : "preview";
  }

  function buildP5({ mainCode, assets, resolvedMode, effectiveRunId, mediaBaseUrl }) {
    const replacements = {
      __PAGE_STYLE__: config.page_styles[resolvedMode],
      __HEAD_EXTRA__: buildHeadExtra(assets, mediaBaseUrl),
      __HEAD_SCRIPTS__: buildHeadScripts(resolvedMode, effectiveRunId),
      __P5JS_CDN__: config.p5js_cdn,
      __P5SOUND_SCRIPT__: p5SoundScript(),
      __BODY_EXTRA__: buildBodyExtra(mainCode, assets),
    };

    let html = p5Shell;
    Object.entries(replacements).forEach(([key, value]) => {
      html = html.split(key).join(value);
    });
    return html;
  }

  function buildProcessing({ mainCode, assets, resolvedMode, effectiveRunId, mediaBaseUrl }) {
    const cssAssets = assets.filter((asset) => asset.asset_type === "css");
    const tabAssets = assets.filter((asset) => asset.asset_type === "js");
    const sources = tabAssets.map((asset) => asset.content).concat([mainCode]);
    const replacements = {
      __PAGE_STYLE__: config.page_styles[resolvedMode],
      __HEAD_EXTRA__: buildHeadExtra(cssAssets, mediaBaseUrl),
      __HEAD_SCRIPTS__: buildHeadScripts(resolvedMode, effectiveRunId),
      __PROCESSINGJS_CDN__: resolveCdnUrl(config.processingjs_cdn),
      __PROCESSING_MEDIA_HELPERS__: `<script>\n${processingMediaHelpers || ""}\n</script>`,
      __PROCESSING_BOOTSTRAP__: buildProcessingBootstrap(
        sources,
        resolvedMode === "live" ? effectiveRunId : null,
      ),
    };

    let html = processingShell;
    Object.entries(replacements).forEach(([key, value]) => {
      html = html.split(key).join(value);
    });
    return html;
  }

  function build({
    mainCode,
    assets = [],
    sketchType = "p5js",
    fullscreen = false,
    mode = null,
    runId = null,
    mediaBaseUrl = null,
  }) {
    if (!config || !p5Shell || !processingShell) {
      throw new Error("SketchEmbed assets not loaded. Call SketchEmbed.preload() first.");
    }

    const resolvedMode = resolveMode({ fullscreen, mode });
    const normalizedAssets = normalizeAssets(assets);
    const effectiveRunId = resolvedMode === "live" && runId === null ? 0 : runId;
    const isProcessing = sketchType === "processing";

    if (isProcessing) {
      return buildProcessing({
        mainCode,
        assets: normalizedAssets,
        resolvedMode,
        effectiveRunId,
        mediaBaseUrl,
      });
    }

    return buildP5({
      mainCode,
      assets: normalizedAssets,
      resolvedMode,
      effectiveRunId,
      mediaBaseUrl,
    });
  }

  return {
    preload,
    build,
    escapeScript,
  };
})();
