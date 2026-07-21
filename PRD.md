# PRD: sketches101 Hamburger Menu & Navigation Redesign

**Status:** Draft  
**Date:** 2026-07-20  
**Design source:** [Figma Make — Implement Hamburger Menu](https://www.figma.com/make/7VM0EyDLXX1YGM4L9kdCRh/Implement-Hamburger-Menu)  
**Stack constraint:** Django templates + CSS + vanilla JS only. **No React / no SPA rewrite.**

---

## 1. Summary

Bring the mobile navigation experience (and supporting top-bar patterns) on the live Django site in line with the Figma Make prototype: a right-side drawer hamburger menu with proper a11y, theme-aware chrome, brand-aligned logo/actions, and clear guest vs authenticated states.

The Make file also prototypes a broader dark marketing landing and gallery shell. This PRD treats the **hamburger / mobile drawer** as the primary delivery, and maps the rest of the design into phased follow-on work so we do not ship a React port of the Make app.

---

## 2. Product context

| | Current site | Figma Make prototype |
|---|---|---|
| Product | sketches101 — p5.js / Processing gallery & editor | Same brand, marketing-forward sandbox story |
| Frontend | Django views + Jinja-style templates, Tailwind CDN, `gallery.css` / `style.css`, vanilla JS | React + Vite + Motion (reference only) |
| Accent | Blue `#3B82F6` | Purple `#7B61FF` |
| Home | Full-bleed live sketch iframe + minimal hero (“Explore”) | Long landing (hero, stats, featured, how-it-works, IDE preview, CTA, footer) |
| Mobile nav | Right drawer under fixed header; Material icons; Home / Discovery / My Sketches / New Sketch | Full-height drawer with logo + ✕, Explore / Docs / Makers / Challenges, auth footer |
| Theme | Light-first (`html.light`) | Dark / light toggle |

---

## 3. Goals

1. **Ship a production hamburger drawer** that matches the Make interaction model, using existing Django partials.
2. Keep **server-rendered HTML** as the source of truth; enhance with progressive JS only.
3. Improve **mobile discoverability** of gallery, auth, and account destinations without breaking desktop sidebar / workspace flows.
4. Document **gap vs full Make visual system** so brand/landing work can follow without blocking nav.

### Non-goals (this PRD)

- Porting the Make app to React, or introducing a frontend framework.
- Building Docs / Makers / Challenges as real product areas in phase 1 (links may be placeholders or scoped to existing routes).
- Shipping the full long-form landing page, Pro banner, notifications, or “app icon” gallery grid in phase 1.
- Rewriting the sketch IDE / embed pipeline.

---

## 4. Personas & jobs

| Persona | Job to be done |
|---|---|
| Guest on mobile | Open menu → reach Gallery / Log in / Sign up without hunting |
| Logged-in maker | Open menu → My Sketches / New Sketch / Log out |
| Returning desktop user | Unchanged: sidebar + top nav continue to work; drawer stays mobile-only |

---

## 5. Current implementation (baseline)

### Templates

- `sketches/templates/sketches/base.html` — includes `gallery_nav.html` + `gallery_mobile_menu.html`
- `sketches/templates/sketches/partials/gallery_nav.html` — logo, desktop Log in / Gallery, hamburger toggle
- `sketches/templates/sketches/partials/gallery_mobile_menu.html` — drawer + backdrop
- `sketches/templates/sketches/partials/gallery_sidebar.html` — xl+ workspace nav
- Legacy `navbar.html` + `nav.js` still exist for older page chrome (`style.css`)

### Behavior (`gallery.js` → `initGalleryMobileNav`)

- Toggle `body.is-gallery-nav-open`
- Backdrop click + Escape close
- Close when viewport ≥ 1280px
- **Missing vs Make:** focus trap, focus restore, dedicated close (✕) control, `role="dialog"`, body scroll lock as explicit overflow policy, theme-aware surfaces, drawer header with logo

### Visual / IA gaps

| Area | Today | Make target |
|---|---|---|
| Drawer height | Starts below nav (`top: var(--gallery-nav-height)`) | Full viewport height; header inside drawer |
| Toggle | Filled primary button with bars → X morph | Ghost / minimal 3-bar; close via ✕ in drawer |
| Nav items | Home, Discovery, My Sketches, New Sketch / Get Started | Explore, Docs, Makers, Challenges (+ auth footer actions) |
| Auth block | Username + Log out / Log in + Sign up | Avatar initials + name/email; My Sketches + Log out; or Log in + Get started |
| Brand mark | SVG play-style logo, blue | `[}]` accent square + `sketches` + accent `101` |
| Accent | `#3B82F6` | `#7B61FF` (phase decision — see §8) |

---

## 6. Functional requirements

### P0 — Mobile hamburger drawer (must ship)

| ID | Requirement |
|---|---|
| NAV-01 | On viewports below the desktop sidebar breakpoint (today `xl` / 1280px), show a hamburger control in the top nav. |
| NAV-02 | Opening the menu reveals a **right-edge drawer** (`width: min(320px, 88vw)`), with dimmed backdrop (`~50%` black + optional light blur). |
| NAV-03 | Drawer is a modal dialog: `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation menu"`. |
| NAV-04 | Drawer contains: brand row, explicit **Close** button (≥44×44), primary nav list, footer actions (auth-dependent). |
| NAV-05 | Guest footer: **Log in** (secondary) + **Get started** (primary → signup). |
| NAV-06 | Authenticated footer: user summary (initials avatar, username, email if available) + **My Sketches** + **Log out** (POST form with CSRF). |
| NAV-07 | Close on: ✕, backdrop, Escape, navigating a link, or resizing to desktop breakpoint. |
| NAV-08 | While open: lock page scroll; trap Tab focus inside drawer; restore focus to the hamburger on close. |
| NAV-09 | Hamburger `aria-expanded` / `aria-controls` stay in sync; closed drawer is not focusable (`aria-hidden` / inert pattern). |
| NAV-10 | Implementation remains Django partials + `gallery.js` (or a small dedicated `mobile-nav.js`); **no React**. |

### P1 — Nav IA alignment

| ID | Requirement |
|---|---|
| NAV-11 | Primary drawer destinations map to real Django routes where they exist. Recommended mapping for phase 1: **Explore → `sketch_list`**, **Home/brand → `home`**, **My Sketches → `account`**, **Get started → `signup`**, **Log in → `login`**, **New Sketch → `sketch_create`** (authenticated, optional row). |
| NAV-12 | **Docs / Makers / Challenges**: either omit until pages exist, or render as disabled/coming-soon with `aria-disabled` — do not invent fake React routes. Document product decision before build. |
| NAV-13 | Active route highlighting continues to use `request.resolver_match.url_name` in templates. |

### P2 — Top bar polish (same epic, optional)

| ID | Requirement |
|---|---|
| NAV-14 | Hamburger icon: three bars, theme-aware color (dark: white bars; light: dark ink), not a solid filled CTA pill (unless product keeps current primary CTA look by choice). |
| NAV-15 | Optional theme toggle in top bar + drawer header — **only if** we commit to dual-theme CSS variables; otherwise defer. |
| NAV-16 | On home, keep transparent/frosted header behavior compatible with live sketch background (do not force solid white when menu closed). |

---

## 7. UX / visual requirements (drawer)

Translate Make `MobileMenu` into CSS classes on existing markup:

1. **Surfaces:** light drawer `#FFFFFF` / border `#E8E8EC`; dark drawer `#0D0D0D` / border `#1F2026` (if theme ships).
2. **Header:** min-height ~64px, logo left, ✕ right, bottom hairline.
3. **Nav rows:** min-height 44px, 16px type, rounded-xl hover wash.
4. **Footer CTAs:** full width, min-height 48px; primary accent fill; secondary outline.
5. **Motion:** ~250ms opacity on backdrop; drawer `translateX` ease-out; respect `prefers-reduced-motion`.
6. **Touch:** all interactive targets ≥ 44px.

---

## 8. Brand & design-token decision

The Make file centers on accent **`#7B61FF`**. The live site uses **`#3B82F6`** across CSS variables, logo SVG, Tailwind config, and buttons.

**Recommendation for this project:**

| Option | When | Impact |
|---|---|---|
| **A. Keep blue for P0** | Ship hamburger UX first | Drawer structure/behavior matches Make; color stays brand-current |
| **B. Switch accent to purple** | Intentional rebrand | Update `--gallery-primary*`, Tailwind theme tokens, `site_logo.html`, button/hover shadows site-wide |
| **C. Hybrid** | Drawer only | New drawer uses purple while rest of app stays blue — **avoid** (inconsistent) |

PRD default: **Option A for P0**, schedule **Option B** as a separate “Brand alignment” phase so nav work is reviewable without a full retheme.

---

## 9. Technical approach (Django-only)

### Architecture

```
Django view → template (base.html)
  ├─ gallery_nav.html          (toggle button)
  ├─ gallery_mobile_menu.html  (dialog markup)
  ├─ gallery.css               (drawer layout / theme)
  └─ gallery.js                (open/close, focus trap, a11y)
```

Figma’s React `MobileMenu` is a **spec**, not code to paste. Recreate behavior with:

- Semantic HTML in the partial
- CSS transitions (existing `is-gallery-nav-open` pattern)
- Vanilla JS focus management

### Suggested file changes

| File | Change |
|---|---|
| `partials/gallery_mobile_menu.html` | Restructure to full-height dialog: header (logo + close), nav, auth footer; add `role="dialog"`; optional user email from `user.email` |
| `partials/gallery_nav.html` | Restyle toggle; wire `aria-controls`; ensure close button id for focus |
| `static/sketches/css/gallery.css` | Full-bleed drawer (`inset-y: 0`), header styles, footer CTAs, backdrop blur; remove “starts under nav” offset if adopting Make layout |
| `static/sketches/js/gallery.js` | Focus trap, focus restore, body overflow lock, close-button handler; optionally extract `mobile-nav.js` |
| `partials/site_logo.html` | Optional: align to `[}]` wordmark when brand phase starts |
| `base.html` | Cache-bust query params on CSS/JS when shipping |
| Tests | Add template/a11y smoke tests if the project already uses Django `TestCase` for views |

### Explicitly do **not** add

- `npm` React app, Vite, Motion, Sonner, Lucide as runtime deps
- Client-side page router mimicking Make’s `setPage(...)`
- Duplicating auth screens in JS — keep existing Django auth templates

### Data available in templates today

- `user.is_authenticated`, `user.username`, `user.email`
- `request.resolver_match.url_name` for active states
- CSRF token for logout POST

No new models required for P0.

---

## 10. Route / content mapping

| Make label | Phase 1 Django target | Notes |
|---|---|---|
| Explore | `{% url 'sketch_list' %}` | Primary discovery |
| Docs | TBD / hide | No docs app yet |
| Makers | Optional: filter by authors later | Not a route today |
| Challenges | TBD / hide | Not built |
| Gallery / My Sketches | `{% url 'account' %}` | Authenticated |
| Log in / Sign up / Log out | Existing auth URLs | Keep server forms |
| Home logo | `{% url 'home' %}` | |

---

## 11. Phased delivery

### Phase 1 — Hamburger drawer (this PRD’s MVP)

- Rebuild mobile menu partial + CSS + JS a11y to match Make drawer.
- Keep current blue tokens and existing IA (Home / Discovery / My Sketches / New Sketch) **or** swap labels to Explore while preserving destinations (product call).
- Verify on home, gallery list, sketch detail, account, auth pages.

### Phase 2 — Brand & top bar

- Accent `#7B61FF`, logo `[}] sketches101`, font stack (Outfit / Geist) if product adopts Make typography.
- Desktop nav link row on marketing surfaces; frosted scroll header on home.

### Phase 3 — Marketing landing (optional)

- Expand `home.html` beyond single sketch hero toward Make sections (stats, featured, how-it-works, CTA, footer) — still Django templates + partials; particle canvas via existing sketch embed or a small canvas script (vanilla), not React.

### Phase 4 — Gallery shell enhancements (optional)

- Sidebar tech filters with counts, search field in top bar, segmented “Staff Picks” tabs, mobile “app icon” grid — only where backed by real query params / models.

---

## 12. Acceptance criteria (Phase 1)

- [ ] On a phone-width viewport, hamburger opens a right drawer matching Make structure (header + nav + footer).
- [ ] Backdrop + Escape + ✕ + link navigation all close the menu.
- [ ] Focus is trapped while open and restored to the toggle on close.
- [ ] Guest and authenticated footers both work end-to-end (login/signup/logout/account).
- [ ] Desktop (≥1280px) still uses sidebar; drawer does not appear as primary nav.
- [ ] No React / no new SPA; pages continue to be Django-rendered.
- [ ] Sketch preview / fullscreen modes still hide or deactivate the toggle (existing `preview-fullscreen` / `code-editor-fullscreen` rules remain valid).
- [ ] Keyboard and VoiceOver/TalkBack: dialog announced; close control labeled.

---

## 13. Test plan

1. **Manual — iPhone SE / Pixel narrow:** open/close, scroll lock, rotate to landscape, resize to desktop.
2. **Auth matrix:** logged out, logged in, open menu on home / gallery / account / create.
3. **Keyboard:** Tab cycle stays in drawer; Escape closes.
4. **Regression:** workspace sidebar collapse, gallery filters, sketch embed fullscreen, code editor fullscreen.
5. **Optional automated:** Django client test that `gallery_mobile_menu` contains dialog semantics and auth links for anonymous vs authenticated requests.

---

## 14. Risks & open questions

| Risk / question | Owner decision needed |
|---|---|
| Docs / Makers / Challenges not implemented | Hide vs coming-soon vs keep current Home/Discovery IA |
| Purple rebrand scope | Phase 1 vs Phase 2 |
| Theme toggle | Ship with drawer or defer until dark tokens exist site-wide |
| Two nav systems (`navbar.html` vs `gallery_nav.html`) | Consolidate under gallery nav only? |
| Home remains minimal sketch stage | Confirm Phase 3 landing is desired before building long page |

---

## 15. Success metrics

- Mobile users can reach Log in / Sign up / Gallery in ≤ 2 taps from any gallery-layout page.
- Zero increase in mobile nav-related support issues (menu stuck open, focus loss).
- No new frontend framework debt; PR stays reviewable as template/CSS/JS diff.

---

## 16. Appendix — Make → Django translation notes

The Make `App.tsx` `MobileMenu` component specifies:

- Full-screen overlay + right drawer
- Logo + ✕ header
- Nav buttons (Explore, Docs, Makers, Challenges)
- Auth footer with avatar initials from display name
- Focus trap + body overflow lock + Escape (handled at app root in Make)

Equivalent Django delivery:

```html
<!-- gallery_mobile_menu.html (conceptual) -->
<div id="gallery-mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu" aria-hidden="true">
  <header>…logo… <button type="button" id="gallery-nav-close" aria-label="Close navigation menu">…</button></header>
  <nav>…links…</nav>
  <footer>…auth actions…</footer>
</div>
<button type="button" id="gallery-nav-backdrop" …></button>
```

```js
// gallery.js — extend initGalleryMobileNav
// open → overflow hidden, focus close button, trap Tab
// close → restore focus to #gallery-nav-toggle
```

Treat Make screenshots / source as the visual QA checklist; treat this repo’s templates as the implementation surface.
