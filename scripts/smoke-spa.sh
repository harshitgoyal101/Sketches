#!/usr/bin/env bash
# Smoke-check the committed SPA build before / after PythonAnywhere deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPA="$ROOT/sketches/static/spa"
BASE_URL="${1:-}"

fail() { echo "✗ $*" >&2; exit 1; }
ok() { echo "✓ $*"; }

[[ -f "$SPA/index.html" ]] || fail "Missing $SPA/index.html — run: npm run deploy:spa"
ok "index.html present"

ASSET_COUNT=0
while IFS= read -r ref; do
  [[ -z "$ref" ]] && continue
  ASSET_COUNT=$((ASSET_COUNT + 1))
  clean="${ref%%\?*}"
  clean="${clean%%#*}"
  if [[ "$clean" == /* ]]; then
    file="$SPA${clean}"
  else
    file="$SPA/$clean"
  fi
  [[ -f "$file" ]] || fail "Missing asset file: $file (from $ref)"
  ok "asset $(basename "$file")"
done < <(
  python3 - <<PY
import re
from pathlib import Path
html = Path("$SPA/index.html").read_text(encoding="utf-8")
for ref in re.findall(r'(?:src|href)="(/assets/[^"\\s>]+)', html):
    print(ref)
PY
)

[[ "$ASSET_COUNT" -gt 0 ]] || fail "No /assets/ references found in index.html"

if [[ -n "$BASE_URL" ]]; then
  BASE_URL="${BASE_URL%/}"
  curl -fsS "$BASE_URL/" | grep -q 'id="root"' \
    || fail "GET $BASE_URL/ did not look like the SPA shell"
  ok "GET / returns SPA shell"

  curl -fsS "$BASE_URL/api/formats/" | grep -q '"ok"' \
    || fail "GET $BASE_URL/api/formats/ failed"
  ok "GET /api/formats/"

  code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/gallery")"
  [[ "$code" == "200" ]] || fail "GET /gallery returned $code (expected 200 SPA fallback)"
  ok "GET /gallery → 200"
fi

echo
echo "Smoke OK."
if [[ -z "$BASE_URL" ]]; then
  echo "  Tip: pass a host to also hit live routes, e.g."
  echo "    bash scripts/smoke-spa.sh https://yourname.pythonanywhere.com"
fi
