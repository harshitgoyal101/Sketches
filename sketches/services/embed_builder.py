import json
from pathlib import Path

EMBED_ROOT = Path(__file__).resolve().parent.parent / "static" / "sketches" / "embed"
SNIPPETS_DIR = EMBED_ROOT / "snippets"


def _load_config():
    with (EMBED_ROOT / "config.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def _load_shell(name):
    return (EMBED_ROOT / name).read_text(encoding="utf-8")


def _load_snippet(name):
    return (SNIPPETS_DIR / name).read_text(encoding="utf-8")


def _escape_script(code):
    return code.replace("</script>", "<\\/script>")


def _script_tag(code):
    return f"<script>\n{_escape_script(code)}\n</script>"


def _style_tag(code):
    return f"<style>\n{code}\n</style>"


def _normalize_assets(assets):
    normalized = []
    for asset in assets or []:
        asset_type = getattr(asset, "asset_type", None) or asset.get("asset_type")
        content = getattr(asset, "content", None) or asset.get("content", "")
        normalized.append({"asset_type": asset_type, "content": content})
    return normalized


def _base_tag(media_base_url):
    if not media_base_url:
        return ""
    href = media_base_url if media_base_url.endswith("/") else f"{media_base_url}/"
    # Escape quotes in URL for attribute safety.
    safe = href.replace('"', "%22")
    return f'<base href="{safe}">'


def _build_head_extra(assets, media_base_url=None):
    includes = []
    base = _base_tag(media_base_url)
    if base:
        includes.append(base)
    for asset in assets:
        if asset["asset_type"] == "css":
            includes.append(_style_tag(asset["content"]))
    return "\n  ".join(includes)


def _build_body_extra(main_code, assets):
    scripts = []
    for asset in assets:
        if asset["asset_type"] == "js":
            scripts.append(_script_tag(asset["content"]))
    scripts.append(_script_tag(main_code))
    return "\n".join(scripts)


def _build_head_scripts(config, mode, run_id=None):
    snippet_names = config["head_snippets"].get(mode, [])
    tags = []
    for name in snippet_names:
        content = _load_snippet(name)
        if run_id is not None:
            content = content.replace("__RUN_ID__", str(run_id))
        tags.append(f"<script>\n{content}</script>")
    return "\n  ".join(tags)


def _p5sound_script(config):
    url = (config.get("p5sound_cdn") or "").strip()
    if not url:
        return ""
    return f'<script src="{url}"></script>'


def _resolve_mode(fullscreen=False, mode=None):
    if mode:
        return mode
    return "fullscreen" if fullscreen else "preview"


def build_p5_embed_html(
    main_code,
    assets=None,
    fullscreen=False,
    mode=None,
    run_id=None,
    media_base_url=None,
):
    """Build minimal HTML page for sandboxed p5.js sketch iframe."""
    config = _load_config()
    shell = _load_shell("p5-shell.html")
    resolved_mode = _resolve_mode(fullscreen=fullscreen, mode=mode)
    normalized_assets = _normalize_assets(assets)

    if resolved_mode == "live" and run_id is None:
        run_id = 0

    replacements = {
        "__PAGE_STYLE__": config["page_styles"][resolved_mode],
        "__HEAD_EXTRA__": _build_head_extra(
            normalized_assets, media_base_url=media_base_url
        ),
        "__HEAD_SCRIPTS__": _build_head_scripts(config, resolved_mode, run_id=run_id),
        "__P5JS_CDN__": config["p5js_cdn"],
        "__P5SOUND_SCRIPT__": _p5sound_script(config),
        "__BODY_EXTRA__": _build_body_extra(main_code, normalized_assets),
    }

    html = shell
    for key, value in replacements.items():
        html = html.replace(key, value)
    return html


def _build_processing_bootstrap(sources, run_id=None):
    snippet = _load_snippet("processing-bootstrap.js")
    snippet = snippet.replace("__PROCESSING_SOURCES__", json.dumps(sources))
    snippet = snippet.replace("__RUN_ID__", "null" if run_id is None else str(run_id))
    return f"<script>\n{snippet}\n</script>"


def _resolve_processingjs_cdn(config):
    url = config["processingjs_cdn"]
    if url.startswith(("http://", "https://", "/")):
        return url
    return f"/static/sketches/embed/{url}"


def _processing_media_helper_script():
    return f"<script>\n{_load_snippet('processing-media-helpers.js')}\n</script>"


def build_processing_embed_html(
    main_code,
    assets=None,
    fullscreen=False,
    mode=None,
    run_id=None,
    media_base_url=None,
):
    """Build minimal HTML page for Processing.js (.pde) sketch iframe."""
    config = _load_config()
    shell = _load_shell("processing-shell.html")
    resolved_mode = _resolve_mode(fullscreen=fullscreen, mode=mode)
    normalized_assets = _normalize_assets(assets)
    css_assets = [asset for asset in normalized_assets if asset["asset_type"] == "css"]
    # Only JS/PDE text tabs become Processing sources — never media/other binaries.
    tab_assets = [asset for asset in normalized_assets if asset["asset_type"] == "js"]

    if resolved_mode == "live" and run_id is None:
        run_id = 0

    sources = [asset["content"] for asset in tab_assets] + [main_code]

    head_extra_parts = [_build_head_extra(css_assets, media_base_url=media_base_url)]

    replacements = {
        "__PAGE_STYLE__": config["page_styles"][resolved_mode],
        "__HEAD_EXTRA__": "\n  ".join(part for part in head_extra_parts if part),
        "__HEAD_SCRIPTS__": _build_head_scripts(config, resolved_mode, run_id=run_id),
        "__PROCESSINGJS_CDN__": _resolve_processingjs_cdn(config),
        "__PROCESSING_MEDIA_HELPERS__": _processing_media_helper_script(),
        "__PROCESSING_BOOTSTRAP__": _build_processing_bootstrap(
            sources,
            run_id=run_id if resolved_mode == "live" else None,
        ),
    }

    html = shell
    for key, value in replacements.items():
        html = html.replace(key, value)
    return html


def build_embed_html(
    sketch,
    fullscreen=False,
    mode=None,
    run_id=None,
    main_code=None,
    assets=None,
    media_base_url=None,
):
    """Build embed HTML for a sketch based on its type."""
    code = main_code if main_code is not None else sketch.code
    sketch_assets = assets if assets is not None else list(sketch.assets.all())
    if sketch.sketch_type == "processing":
        return build_processing_embed_html(
            code,
            assets=sketch_assets,
            fullscreen=fullscreen,
            mode=mode,
            run_id=run_id,
            media_base_url=media_base_url,
        )
    return build_p5_embed_html(
        code,
        assets=sketch_assets,
        fullscreen=fullscreen,
        mode=mode,
        run_id=run_id,
        media_base_url=media_base_url,
    )
