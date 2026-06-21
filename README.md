# Sketches101

A Django gallery for publishing **p5.js** and **Processing** creative-coding sketches. Each sketch gets a live in-browser preview, a syntax-highlighted source editor, markdown description, tags, and search.

Public visitors browse and run sketches. Signed-in authors create, edit, and publish their own work from the site (no admin required for day-to-day authoring).

---

## Features

- **Live previews** — p5.js and Processing sketches run in sandboxed embed pages
- **In-browser editor** — syntax highlighting, bracket checks, tab indent, comment shortcuts, dark/light theme
- **Multi-file sketches** — attach extra `.js` / `.pde` / `.css` asset tabs; helper files load before the main entry
- **Create flow** — pick sketch type, starter template, live preview before first save
- **Sketch detail page** — preview, markdown description, copy code, restart/fullscreen controls
- **Live source editing** — authors can edit and save source on the detail page (⌘S / Ctrl+S)
- **Gallery** — paginated list with search and tag filters
- **Accounts** — signup, email verification, login, password reset
- **Admin** — Django admin for staff management, thumbnails, home-page background sketch
- **SEO** — sitemap at `/sitemap.xml`

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Backend | Django 5.x / 6.x |
| Database | SQLite (default) |
| Templates | Django templates + vanilla JS |
| Markdown | Python-Markdown + Bleach sanitization |
| Code highlight | Pygments (server) + client overlay highlighter |
| Sketch runtime | p5.js CDN; Processing.js (self-hosted) for `.pde` |
| Media | Pillow for thumbnails |

---

## Requirements

- Python 3.11+ (3.12 recommended)
- pip

---

## Quick start

```bash
# Clone and enter the project
cd Sketches

# Virtual environment
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Dependencies
pip install -r requirements.txt

# Environment (optional for local dev — email goes to console without SMTP)
cp .env.example .env        # create from example below if no .env yet

# Database
python manage.py migrate

# Admin user (optional — for /admin/)
python manage.py createsuperuser

# Run
python manage.py runserver
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

### Demo content

Load a sample p5.js sketch (includes a multi-file asset):

```bash
python manage.py load_demo_sketch
```

### Email verification (development)

New accounts must verify email before login. Without SMTP configured, verification links print to the terminal.

To activate a user manually:

```bash
python manage.py verify_user --list
python manage.py verify_user username
```

---

## Environment variables

Create a `.env` file in the project root (already gitignored):

```env
# Site metadata (used in verification & password-reset emails)
SITE_URL=http://127.0.0.1:8000
SITE_NAME=sketches101

# SMTP (optional — omit to use console email backend)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=you@example.com
```

---

## Usage

### As a visitor

| URL | Description |
| --- | --- |
| `/` | Home — featured sketches |
| `/sketches/` | Gallery with search and tag filter |
| `/sketches/<slug>/` | Sketch detail — preview, description, source |
| `/sketches/<slug>/embed/` | Minimal embed page (iframe target) |
| `/tags/<slug>/` | Sketches by tag |

### As an author

1. Sign up at `/accounts/signup/` and verify your email
2. Open **Account** → **New sketch** (or `/accounts/sketches/new/?type=p5js` / `?type=processing`)
3. Write code, preview live, add optional asset files, write a markdown description
4. Save as draft or publish from the edit page

Authors can edit their own sketches; staff can edit any sketch.

### As staff (Django admin)

Visit `/admin/` to manage sketches, tags, thumbnails, and the optional **home background** sketch (p5.js only — animated hero on the home page).

---

## Sketch types

### p5.js

- Main file defaults to `sketch.js`
- Runs via p5.js CDN inside a sandboxed iframe
- Extra `.js` files are injected as scripts before the main file; `.css` goes in `<head>`

### Processing (`.pde`)

- Main file defaults to `sketch.pde`
- Runs via **Processing.js** (bundled at `/static/sketches/embed/processing.min.js`)
- Extra `.pde` tabs are combined as helper sources before the main sketch
- Editor validation uses bracket/string checks only (not full Java parsing)

---

## Project structure

```
Sketches/
├── manage.py
├── requirements.txt
├── sketch_gallery/          # Django project settings & root URLs
├── sketches/                # Main application
│   ├── models.py            # Sketch, SketchAsset, Tag
│   ├── views.py             # Public pages & embed
│   ├── views_auth.py        # Signup, login, verification
│   ├── views_manage.py      # Create, edit, publish, live save
│   ├── forms.py
│   ├── services/
│   │   ├── embed_builder.py # p5 & Processing iframe HTML
│   │   ├── markdown.py
│   │   └── highlighter.py
│   ├── static/sketches/     # CSS, JS, embed shells
│   ├── templates/
│   └── management/commands/
├── media/                   # Uploads (thumbnails)
└── db.sqlite3               # Created after migrate (gitignored)
```

---

## Running tests

```bash
python manage.py test sketches
```

Tests cover embed HTML generation, Processing preview wiring, sketch starters, and form behavior.

---

## Security notes

Sketches execute author-supplied JavaScript in the browser.

- Embeds use iframe isolation; treat published code as **trusted author content**
- Markdown output is sanitized with Bleach
- Set `DEBUG = False`, configure `ALLOWED_HOSTS`, and use a strong `SECRET_KEY` before production
- Use HTTPS and real SMTP in production

---

## Production checklist

1. Set environment variables (`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `SITE_URL`, email)
2. Run `python manage.py collectstatic`
3. Use PostgreSQL or another production database if needed
4. Serve with Gunicorn/uWSGI behind Nginx (or similar)
5. Configure persistent media storage for thumbnails

---

## License

No license file is included yet. Add one if you plan to open-source or share the project.
