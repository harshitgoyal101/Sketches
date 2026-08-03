# sketches101

Creative coding gallery and live IDE for **p5.js** and **Processing**. Browse published sketches, fork and remix in the browser, play as a guest, then sign in to keep drafts and scores on your account.

**Brand:** dark-first UI, purple CTA `#7B61FF`, Outfit + Inter. See [`design-system/sketches101/MASTER.md`](design-system/sketches101/MASTER.md).

---

## Stack

| Layer | Tech |
|-------|------|
| API / auth / embeds | Django 5 + session/CSRF JSON APIs |
| UI | React 19 SPA (Vite 8, TypeScript, TanStack Query, Tailwind) |
| Guest data | IndexedDB (+ localStorage mirrors), 30-day TTL |
| Auth | Email/password + verification; optional Google Identity Services |
| Deploy | Built SPA under `sketches/static/spa/`; WhiteNoise / collectstatic |

The React app is the primary UI at `/`. Django still serves embeds, media, and `/api/`.

---

## What’s built so far

### Product surfaces

| Route | Purpose |
|-------|---------|
| `/` | Marketing home; **authed** soft-swaps to Continue editing + recently viewed |
| `/gallery` | Discovery grid (search, tags, formats, sort) + **Surprise me** play mode |
| `/explore/today` | Sketch of the day (shared date-seeded pick) |
| `/sketches/:slug` | Sketch detail (embed, fork, related, remixes, Save) |
| `/makers/:username` | Public maker profile (published work only) |
| `/saved` | Local bookmarks (this device) |
| `/sandbox` | Guest/authed sandbox IDE (local drafts → save to account) |
| `/sketches/new`, `/edit`, `/settings` | Create / IDE / publish settings |
| `/account` | Own sketches + game scores |
| Auth pages | Login, signup, password reset, resend verification |

### Guest → auth lifecycle (Sprints 1–3)

1. First visit → **name gate** → guest profile in IndexedDB  
2. Explore / sandbox freely; **Save / Fork / Create** open AuthGate  
3. Google or email → session → **`POST /api/auth/migrate-guest/`** (drafts, scores, pending forks)  
4. Resume interrupted action (edit / fork / create)  
5. Soft **Keep this score** prompt on personal bests  

Also: rate limits on migrate / scores / Google; authed sandbox **Save to account**.

### Games / scores

- Models: `Game`, `GameScore`  
- Seeded: `orbit-run`, `sandbox-score`  
- Embeds can post scores:

```js
parent.postMessage({ type: 'sketches101-score', game: 'orbit-run', score: 1200 }, '*')
```

### Design system

Page-level rules under [`design-system/sketches101/`](design-system/sketches101/) (Master + per-page overrides). Figma reference linked from Master.

---

## Quick start

Requirements: **Python 3** (venv), **Node 20+** (see `.nvmrc`).

```bash
# Backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # adjust SECRET_KEY / SITE_URL as needed
python manage.py migrate
python manage.py runserver

# Frontend (separate terminal)
nvm use                            # → 20
npm install                        # repo root (Tailwind scripts) if needed
npm install --prefix frontend
npm run dev:frontend               # Vite :5173 with API proxy
```

Open the Vite URL for hot reload, or build and use Django alone:

```bash
npm run build:frontend             # writes sketches/static/spa/
python manage.py runserver         # SPA at /
```

### Optional Google sign-in

Same Web client ID on both sides:

```bash
# Django (.env or env)
GOOGLE_OAUTH_CLIENT_ID=....apps.googleusercontent.com

# frontend/.env.local
VITE_GOOGLE_OAUTH_CLIENT_ID=....apps.googleusercontent.com
```

Without these, AuthGate still offers email login/signup.

### Tests

```bash
source .venv/bin/activate
python manage.py test sketches.tests
```

---

## Key API map

| Endpoint | Notes |
|----------|--------|
| `GET /api/home/` | Featured + stats + hero backgrounds |
| `GET /api/sketches/` | Gallery list (`q`, `tag`, `type`, `author`, `sort` incl. `random`, `exclude`) |
| `GET /api/sketches/<slug>/` | Detail + embed URL |
| `GET /api/makers/<username>/` | Public maker profile |
| `GET /api/explore/today/` | Sketch of the day + previous trail |
| `GET /api/challenges/current/` | Active weekly challenge strip |
| `POST /api/auth/login\|signup\|google/` | Session auth |
| `POST /api/auth/migrate-guest/` | Idempotent guest → account import |
| `GET\|POST /api/games/<slug>/scores/` | Leaderboard / submit (auth on POST) |
| `/api/account/sketches/…` | CRUD, settings, source, publish, fork |

Full guest/retention roadmap: [`next_steps.md`](next_steps.md).  
SPA run/deploy detail: [`frontend/README.md`](frontend/README.md).

---

## Repo layout

```
frontend/                 React SPA source
sketches/                 Django app (models, API, embeds, static spa build)
sketch_gallery/           Django project settings
design-system/sketches101 Brand + page design rules
scripts/                  SPA deploy / smoke helpers
next_steps.md             Sprint status + backlog
```

---

## What’s next

See deferred items in [`next_steps.md`](next_steps.md): magic link, analytics, chunked migrate, server-synced bookmarks.

Deferred for now: Pro tier, notifications inbox, comments.
