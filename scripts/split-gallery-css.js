/**
 * Split gallery.css into page bundles + minify.
 *
 * Source of truth: sketches/static/sketches/css/gallery.css
 * Outputs: sketches/static/sketches/css/built/*.min.css
 */
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const CleanCSS = require("clean-css");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "sketches/static/sketches/css/gallery.css");
const STYLE_SRC = path.join(ROOT, "sketches/static/sketches/css/style.css");
const OUT_DIR = path.join(ROOT, "sketches/static/sketches/css/built");

const BUNDLES = ["core", "home", "auth", "edit", "detail", "settings"];

const PAGE_PATTERNS = {
  home: [
    // Use gallery-home-page, not gallery-home — gallery-home-nav is site-wide chrome.
    /gallery-home-page/,
    /landing-/,
    /\.landing\b/,
    /landing-ide/,
  ],
  auth: [
    /gallery-auth/,
    /\.auth-/,
    /password-reset/,
    /auth-split/,
    /auth-form/,
    /auth-brand/,
    /auth-help/,
    /auth-main/,
  ],
  edit: [
    /gallery-edit-page/,
    /sketch-edit/,
    /code-ide/,
    /code-section/,
    /code-editor/,
    /edit-thumbnail/,
    /has-unsaved-edits/,
  ],
  detail: [
    /gallery-detail/,
    /sketch-detail/,
    /preview-toolbar/,
    /preview-controls/,
  ],
  settings: [
    /gallery-settings-page/,
    /sketch-settings/,
  ],
};

/**
 * Shared across page types — must stay in core even if a page pattern also matches
 * (e.g. landing-btn on browse Load more, landing-hero-bg on auth brand panel).
 */
const FORCE_CORE = [
  /landing-btn/,
  /landing-hero-bg/,
  /landing-particle/,
  /home-bg-sketch/,
  /gallery-load-more/,
];

/** Ignore negated selectors so `:not(.gallery-home-page)` stays in core. */
function stripNegations(selector) {
  let prev;
  let out = selector;
  do {
    prev = out;
    out = out.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, "");
  } while (out !== prev);
  return out;
}

function classifySelector(selector) {
  const haystack = stripNegations(selector);
  if (FORCE_CORE.some((re) => re.test(haystack))) return "core";
  const hits = [];
  for (const [page, patterns] of Object.entries(PAGE_PATTERNS)) {
    if (patterns.some((re) => re.test(haystack))) hits.push(page);
  }
  if (hits.length === 1) return hits[0];
  return "core";
}

function classifyNode(node) {
  if (node.type === "rule") {
    return classifySelector(node.selector || "");
  }
  if (node.type === "atrule" && node.name === "media" && node.nodes) {
    const childBundles = new Set();
    node.nodes.forEach((child) => {
      if (child.type === "comment") return;
      childBundles.add(classifyNode(child));
    });
    if (childBundles.size === 1) return [...childBundles][0];
    return "mixed";
  }
  if (node.type === "atrule" && node.name === "keyframes") {
    return classifySelector(node.params || "");
  }
  return "core";
}

function splitRoot(root) {
  const roots = Object.fromEntries(BUNDLES.map((b) => [b, postcss.root()]));

  function appendMediaSplit(mediaNode) {
    const perBundle = Object.fromEntries(BUNDLES.map((b) => [b, []]));
    mediaNode.nodes.forEach((child) => {
      if (child.type === "comment") return;
      const bundle = classifyNode(child);
      if (bundle === "mixed" && child.type === "atrule") {
        perBundle.core.push(child.clone());
        return;
      }
      perBundle[bundle].push(child.clone());
    });
    for (const bundle of BUNDLES) {
      if (!perBundle[bundle].length) continue;
      const mediaClone = mediaNode.clone({ nodes: [] });
      perBundle[bundle].forEach((n) => mediaClone.append(n));
      roots[bundle].append(mediaClone);
    }
  }

  root.nodes.forEach((node) => {
    if (node.type === "comment") return;
    if (node.type === "atrule" && node.name === "media") {
      if (classifyNode(node) === "mixed") {
        appendMediaSplit(node);
        return;
      }
      roots[classifyNode(node)].append(node.clone());
      return;
    }
    const bundle = classifyNode(node);
    roots[bundle === "mixed" ? "core" : bundle].append(node.clone());
  });

  return roots;
}

function minify(css) {
  return new CleanCSS({ level: 2 }).minify(css).styles;
}

function writeBundle(name, root) {
  const css = root.toString();
  const outPath = path.join(OUT_DIR, `gallery-${name}.min.css`);
  if (!css.trim()) {
    fs.writeFileSync(outPath, "/* empty */\n");
    return { label: path.basename(outPath), bytes: 0, rules: 0 };
  }
  const min = minify(css);
  fs.writeFileSync(outPath, min);
  return { label: path.basename(outPath), bytes: Buffer.byteLength(min), rules: root.nodes.length };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const src = fs.readFileSync(SRC, "utf8");
  const roots = splitRoot(postcss.parse(src));
  const stats = BUNDLES.map((b) => writeBundle(b, roots[b]));

  if (fs.existsSync(STYLE_SRC)) {
    const styleMin = minify(fs.readFileSync(STYLE_SRC, "utf8"));
    const stylePath = path.join(OUT_DIR, "style.min.css");
    fs.writeFileSync(stylePath, styleMin);
    stats.push({
      label: "style.min.css",
      bytes: Buffer.byteLength(styleMin),
      rules: "-",
    });
  }

  const fullMin = minify(src);
  fs.writeFileSync(path.join(OUT_DIR, "gallery.min.css"), fullMin);

  console.log("Built CSS bundles:");
  for (const s of stats) {
    console.log(
      `  ${s.label.padEnd(28)} ${String(s.bytes).padStart(7)} bytes  (${s.rules} top nodes)`
    );
  }
  console.log(
    `  ${"gallery.min.css".padEnd(28)} ${String(Buffer.byteLength(fullMin)).padStart(7)} bytes  (full)`
  );
  console.log(
    `  ${"gallery.css (source)".padEnd(28)} ${String(Buffer.byteLength(src)).padStart(7)} bytes`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
