## Current status

React is the primary UI at **`/`**.

- Gallery: search, formats, **tags** (URL-synced `?tag=` / `?type=` / `?q=` / `?sort=`), load more
- Auth, create/settings, IDE, fork, password reset
- **Guest → auth:** name gate, `/sandbox`, AuthGate on save/fork/create, draft migrate, Google GIS

## Local development

Node **20+** required (Vite 8). This repo has `.nvmrc`:

```bash
nvm use                    # → 20
python3 manage.py runserver
npm run dev:frontend       # :5173 hot reload
```

### Google sign-in (optional)

Set the same OAuth Web client ID on both sides:

```bash
# Django
export GOOGLE_OAUTH_CLIENT_ID="....apps.googleusercontent.com"

# Vite (frontend/.env.local)
VITE_GOOGLE_OAUTH_CLIENT_ID=....apps.googleusercontent.com
```

Without these, AuthGate still offers email login/signup.
## Deploy (PythonAnywhere / production)

From a machine with Node 20+:

```bash
npm run deploy:spa            # or: npm run deploy:spa -- --with-css
bash scripts/smoke-spa.sh     # verify built assets on disk
# commit sketches/static/spa/ (and CSS if rebuilt)
# on server:
python3 manage.py collectstatic --noinput
# reload web app
bash scripts/smoke-spa.sh https://yourname.pythonanywhere.com
```

Env: `SPA_AT_ROOT=true` (default). Set `false` only if you need classic Django HTML at `/`.

### PythonAnywhere checklist

1. Pull / upload the commit that includes `sketches/static/spa/`
2. `python3 manage.py collectstatic --noinput`
3. Reload the web app
4. Confirm `/` shows the React shell (`#root`), `/gallery` returns 200, `/api/formats/` JSON works
5. Sign in → open a sketch → **Edit** → Run / Restart / error panel
