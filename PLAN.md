# Sketch Gallery — Project Plan

A Django website for publishing, showcasing, and interacting with **p5.js** and **Processing** sketches. Each sketch gets a live preview, syntax-highlighted source code, and a markdown description.

---

## 1. Goals


| Goal                  | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| **Publish sketches**  | Upload or paste p5.js / Processing source code                         |
| **Live interaction**  | Visitors run sketches in the browser without leaving the page          |
| **Code showcase**     | Display full source with syntax highlighting and optional line numbers |
| **Rich descriptions** | Author notes, techniques, and links written in Markdown                |
| **Browse & discover** | List, filter, and search sketches by tag, type, or date                |


---

## 2. Tech Stack


| Layer          | Choice                                         | Rationale                                     |
| -------------- | ---------------------------------------------- | --------------------------------------------- |
| Backend        | **Django 5.x**                                 | Mature ORM, admin, auth, static files         |
| Database       | **SQLite** (dev) → **PostgreSQL** (prod)       | Simple start, easy migration                  |
| Frontend       | **Django templates** + minimal JS              | No heavy SPA needed for v1                    |
| Markdown       | **python-markdown** or **markdown-it-py**      | Render description fields safely              |
| Code highlight | **Pygments** (server) or **Prism.js** (client) | Both work; Prism pairs well with live iframe  |
| Sketch runtime | **p5.js CDN** in sandboxed `<iframe>`          | Isolates sketch JS from main page             |
| CSS            | **Tailwind** or plain CSS                      | Match your preference; Tailwind speeds layout |
| Media          | Django `FileField` / `ImageField`              | Thumbnails, optional sketch assets            |
| Deployment     | **Docker** + **Gunicorn** + **Nginx**          | Standard, portable                            |


---

## 3. Sketch Types & Runtime Strategy

Processing and p5.js look similar but run differently in the browser.

### 3.1 p5.js sketches

- Store as `.js` or inline in a `Sketch` model text field.
- Render inside a **sandboxed iframe** (`sandbox="allow-scripts allow-same-origin"`) with:
  - p5.js from CDN
  - A small HTML shell that loads the sketch
  - Optional separate `index.html` for multi-file sketches

```html
<!-- iframe src = /sketches/<slug>/embed/ -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.11.0/lib/p5.min.js"></script>
</head>
<body>
  <script>/* sketch code injected here */</script>
</body>
</html>
```

### 3.2 Processing (.pde) sketches

Processing (Java mode) does **not** run natively in modern browsers. Pick one approach for v1:


| Option                               | Pros                       | Cons                                      |
| ------------------------------------ | -------------------------- | ----------------------------------------- |
| **A. p5.js port (recommended)**      | Same live preview UX as p5 | Author must port or you auto-suggest port |
| **B. Display code + static preview** | Simple; no runtime issues  | Not interactive                           |
| **C. OpenProcessing embed**          | Real Processing in iframe  | External dependency, API/ToS limits       |
| **D. Processing for Web (future)**   | Official path              | Heavier toolchain                         |


**Recommendation:** Treat `.pde` as a first-class **code type** with syntax highlighting and a markdown description. For interactive preview, either:

1. Store an optional **p5.js equivalent** alongside the `.pde`, or
2. Store a **preview type** field: `interactive` | `static_image` | `video`

This keeps v1 shippable while leaving room for deeper Processing support later.

---

## 4. Data Model

```
Sketch
├── title              CharField
├── slug               SlugField (unique)
├── sketch_type        Choice: p5js | processing
├── description        TextField (Markdown source)
├── code               TextField (main sketch source)
├── code_language      p5js | processing | javascript
├── status             draft | published
├── created_at         DateTimeField
├── updated_at         DateTimeField
├── published_at       DateTimeField (nullable)
├── author             ForeignKey → User
├── thumbnail          ImageField (optional)
├── preview_mode       interactive | static | external
├── preview_code       TextField (optional p5 port for Processing sketches)
├── external_url       URLField (optional OpenProcessing link)
└── tags               ManyToMany → Tag

SketchAsset (optional, for multi-file sketches)
├── sketch             ForeignKey → Sketch
├── filename           CharField  e.g. "particle.js"
├── content            TextField
└── asset_type         js | css | json | other

Tag
├── name               CharField
└── slug               SlugField
```

### Derived / computed

- `description_html` — rendered Markdown (cached or property)
- `highlighted_code` — Pygments output for detail page
- Public URL: `/sketches/<slug>/`
- Embed URL: `/sketches/<slug>/embed/`

---

## 5. URL Structure


| Path                      | View         | Purpose                                  |
| ------------------------- | ------------ | ---------------------------------------- |
| `/`                       | Home         | Featured + recent sketches               |
| `/sketches/`              | List         | Paginated gallery with filters           |
| `/sketches/<slug>/`       | Detail       | Description + live preview + code tabs   |
| `/sketches/<slug>/embed/` | Embed        | Minimal HTML for iframe (no site chrome) |
| `/sketches/<slug>/raw/`   | Raw code     | Plain-text download                      |
| `/tags/<slug>/`           | Tag list     | Sketches by tag                          |
| `/admin/`                 | Django admin | Content management                       |


Optional later: `/api/sketches/` (DRF JSON API).

---

## 6. Page Layout — Sketch Detail

```
┌─────────────────────────────────────────────────────────┐
│  Navbar: Home · Sketches · Tags · About                 │
├─────────────────────────────────────────────────────────┤
│  Title                                    [p5.js badge] │
│  Author · Date · Tags                                   │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│   LIVE PREVIEW           │   Description (Markdown)     │
│   (iframe, resizable)    │   - concept                  │
│                          │   - techniques               │
│   [↻ Restart] [⛶ Full]   │   - references               │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  [ Preview ] [ Code ] [ Assets ]          ← tabs          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  syntax-highlighted source · copy button           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Interaction details**

- **Restart** — reload iframe (`src` reset or `postMessage`)
- **Fullscreen** — fullscreen API on preview container
- **Copy code** — clipboard API on code tab
- **Responsive** — stack preview above description on mobile

---

## 7. Markdown Descriptions

### Storage & rendering

- Store raw Markdown in `Sketch.description`.
- Render with **python-markdown** extensions:
  - `fenced_code` — code blocks in prose
  - `tables`
  - `toc` (optional)
  - `nl2br` (optional)
- Sanitize output with **bleach** or Django’s `strip_tags` whitelist to prevent XSS.

### Admin UX

- Use **django-markdownx** or **django-ckeditor** with Markdown mode for WYSIWYG-ish editing, **or**
- Simple textarea + “Preview” button that hits a small AJAX preview endpoint.

### Example front matter (optional v2)

```markdown
---
canvas: 800x600
interactive: true
---

## About this sketch

Inspired by [Ten Print](https://en.wikipedia.org/wiki/10_PRINT)...
```

---

## 8. Security Considerations

Sketches execute arbitrary JavaScript — treat them as **trusted author content** (your own sketches), not user-generated from the public.


| Risk               | Mitigation                                           |
| ------------------ | ---------------------------------------------------- |
| XSS from sketch JS | Run in sandboxed iframe; no `allow-top-navigation`   |
| XSS from Markdown  | Sanitize rendered HTML                               |
| CSRF / auth        | Standard Django middleware                           |
| Resource abuse     | Rate-limit embed endpoint; cap iframe size           |
| File uploads       | Validate extensions; serve assets from separate path |


**Iframe sandbox attribute (recommended):**

```html
<iframe
  sandbox="allow-scripts allow-same-origin"
  src="{% url 'sketch_embed' sketch.slug %}"
  loading="lazy"
  title="{{ sketch.title }} preview"
></iframe>
```

Do **not** add `allow-popups` or `allow-modals` unless a sketch requires it.

---

## 9. Django App Structure

```
sketch_gallery/                 # project root
├── manage.py
├── sketch_gallery/             # project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── sketches/                   # main app
│   ├── models.py
│   ├── admin.py
│   ├── views.py
│   ├── urls.py
│   ├── forms.py
│   ├── templatetags/
│   │   └── markdown_extras.py
│   ├── services/
│   │   ├── markdown.py
│   │   ├── highlighter.py
│   │   └── embed_builder.py
│   ├── templates/sketches/
│   │   ├── base.html
│   │   ├── home.html
│   │   ├── sketch_list.html
│   │   ├── sketch_detail.html
│   │   └── embed.html
│   └── static/sketches/
│       ├── css/
│       └── js/
│           ├── preview-controls.js
│           └── copy-code.js
├── media/                      # uploads (thumbnails)
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 10. Key Dependencies (`requirements.txt`)

```
Django>=5.0,<6.0
python-markdown>=3.5
Pygments>=2.17
bleach>=6.0
Pillow>=10.0          # image thumbnails
gunicorn>=21.0        # production
psycopg[binary]>=3.1  # PostgreSQL (prod)
whitenoise>=6.6       # static files (optional)
```

Optional:

```
django-markdownx      # admin markdown widget
djangorestframework   # API later
```

---

## 11. Admin Workflow

1. Log into `/admin/`
2. Create a **Sketch**: title, type, code, markdown description, tags, thumbnail
3. Set status to **published**
4. Sketch appears on home and list pages
5. Detail page serves live embed + rendered markdown + highlighted code

**Nice-to-have admin features (v2)**

- Live preview panel in admin while editing code
- Bulk import from folder (scan `sketches/` directory)
- Duplicate sketch as template

---

## 12. Implementation Phases

### Phase 1 — Foundation (MVP)

- [ ] Django project + `sketches` app
- [ ] `Sketch` and `Tag` models + migrations
- [ ] Django admin for content entry
- [ ] Home page + sketch list (paginated)
- [ ] Sketch detail: markdown description + code display (Pygments)
- [ ] p5.js embed view + iframe on detail page
- [ ] Basic styling (responsive layout)

**Deliverable:** You can publish p5.js sketches with descriptions and live previews.

### Phase 2 — Polish

- [ ] Tag filtering and search
- [ ] Thumbnails (auto-capture manual upload)
- [ ] Copy-code button, restart/fullscreen controls
- [ ] `SketchAsset` for multi-file sketches
- [ ] Draft / published workflow
- [ ] SEO: meta tags, Open Graph, sitemap

### Phase 3 — Processing support

- [ ] Processing syntax highlighting (Pygments `processing` lexer or custom)
- [ ] Optional `preview_code` (p5 port) for interactive Processing entries
- [ ] Static preview fallback (image/video upload)
- [ ] Side-by-side `.pde` vs p5.js tabs when both exist

### Phase 4 — Growth (optional)

- [ ] REST API (DRF)
- [ ] RSS feed of new sketches
- [ ] Dark mode
- [ ] Collections / series (group related sketches)
- [ ] CLI import: `python manage.py import_sketch ./my-sketch/`
- [ ] Docker Compose for local dev + prod

---

## 13. Content Conventions

Establish early so sketches stay consistent:


| Convention        | Example                                         |
| ----------------- | ----------------------------------------------- |
| Slug              | `ten-print-variation`                           |
| Canvas size       | Document in markdown or sketch header comment   |
| File naming       | `sketch.js`, `sketch.pde`                       |
| Assets folder     | `assets/` relative paths in multi-file sketches |
| Required metadata | title, type, at least one tag, description      |


**Suggested sketch header comment:**

```javascript
// @title: Flow Field Study
// @canvas: 800x600
// @tags: generative, particles
```

Parser can extract these in v2 for auto-fill in admin.

---

## 14. Local Development Setup (quick reference)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Visit `http://127.0.0.1:8000/admin/` to add your first sketch.

---

## 15. Open Questions (decide before Phase 1)

1. **Auth:** Public read-only site, or login required for some sketches?
2. **Processing preview:** Interactive p5 port, static image only, or external embed?
3. **Multi-file sketches:** How many sketches need separate `.js` modules vs single file?
4. **Design:** Minimal gallery aesthetic vs portfolio-style with large hero previews?
5. **Hosting:** Static + server (Fly.io, Railway, VPS) — affects media storage (S3 vs local).

---

## 16. Success Criteria

- [ ] Add a p5.js sketch via admin in under 2 minutes
- [ ] Detail page loads interactive sketch without console errors
- [ ] Markdown description renders headings, links, code blocks correctly
- [ ] Source code is readable with syntax highlighting
- [ ] Site is usable on mobile (preview + description stack cleanly)
- [ ] Processing sketches at minimum show code + description (interactive optional)

---

## Next Step

When you are ready to build, start with **Phase 1**: scaffold the Django project, models, admin, and a single working p5.js embed. Everything else builds on that foundation.