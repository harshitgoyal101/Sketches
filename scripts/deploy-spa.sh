#!/usr/bin/env bash
# Build React SPA (+ optional gallery CSS) for Django/PythonAnywhere deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
  nvm use 20 >/dev/null
fi

echo "→ Building React SPA into sketches/static/spa/"
npm run build:frontend

if [[ "${1:-}" == "--with-css" ]]; then
  echo "→ Building Django gallery CSS"
  npm run build:css
fi

echo "→ Done."
echo "  Local smoke:  bash scripts/smoke-spa.sh"
echo "  Live smoke:   bash scripts/smoke-spa.sh https://your-host"
echo "  On the server:"
echo "    python3 manage.py collectstatic --noinput"
echo "    # reload web app"
echo "  Confirm SPA_AT_ROOT=true (default) and open https://your-host/"
