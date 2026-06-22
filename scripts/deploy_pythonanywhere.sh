#!/usr/bin/env bash
# Run on PythonAnywhere after SSH (also invoked by GitHub Actions).
set -euo pipefail

PROJECT_DIR="${PA_PROJECT_DIR:-${HOME}/Sketches}"
VENV_DIR="${PA_VENV_DIR:-${HOME}/.virtualenvs/sketches}"
BRANCH="${PA_DEPLOY_BRANCH:-main}"

echo "==> Deploying from ${PROJECT_DIR} (branch: ${BRANCH})"

cd "${PROJECT_DIR}"

if [[ ! -d .git ]]; then
  echo "ERROR: ${PROJECT_DIR} is not a git repository." >&2
  exit 1
fi

echo "==> Pulling latest code"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "ERROR: Virtualenv not found at ${VENV_DIR}" >&2
  echo "Create it with: mkvirtualenv --python=python3.12 sketches" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

echo "==> Installing dependencies"
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Running migrations"
python manage.py migrate --noinput

echo "==> Collecting static files"
python manage.py collectstatic --noinput --clear

echo "==> Deploy finished. Reload the web app to pick up code changes."
