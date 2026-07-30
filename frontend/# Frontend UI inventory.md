# Frontend UI inventory

Shared React components live under `frontend/src/components/`. Pages also define local UI pieces, and some “components” are only CSS class systems (`lib/form.ts`, `index.css`).

---

## 1. Shared React components

| Component | Path | Role |
|-----------|------|------|
| **AppShell** | `components/layout/AppShell.tsx` | Page chrome: header + `<Outlet />` |
| **AppHeader** | `components/layout/AppHeader.tsx` | Top nav (transparent on home / glass when scrolled) |
| **SketchCardView** | `components/SketchCardView.tsx` | Gallery/account sketch card |
| **LandingHeroBackground** | `components/home/LandingHeroBackground.tsx` | Home sketch iframes + theme swap |
| **HomeParticles** | `components/home/HomeParticles.tsx` | Particle fallback (mobile / no sketch) |
| **SketchCodeEditor** | `components/ide/SketchCodeEditor.tsx` | CodeMirror IDE editor |
| **TextEffect** | `components/motion-primitives/text-effect.tsx` | Animated text reveal |
| **AnimatedGroup** | `components/motion-primitives/animated-group.tsx` | Staggered children animation |

### Nested inside AppHeader (not separate files)

| Component | Role |
|-----------|------|
| **MobileLink** | Nav links in the mobile drawer |
| **ThemeSegment** | Desktop Light / Dark segmented control |

---

## 2. Page-local UI pieces

| Piece | Page | Role |
|-------|------|------|
| **FeaturedGrid** | `HomePage` | Featured sketch grid (+ motion variant) |
| **Stat** | `HomePage` | Single stats cell |
| **Chip** | `GalleryPage` | Format / tag filter chip |
| **ActivePill** | `GalleryPage` | Removable “active filter” pill |
| **IdeFallback** | `App.tsx` | Lazy-load placeholder for IDE route |

---

## 3. Providers (not visual, but wrap UI)

| Component | Path |
|-----------|------|
| **ThemeProvider** | `theme/ThemeProvider.tsx` |
| **AuthProvider** | `auth/AuthProvider.tsx` |
| **QueryClientProvider** | in `App.tsx` (TanStack Query) |

---

## 4. Same pattern, different types (list separately)

### Buttons — **3 systems**

| Type | How it’s defined | Used on |
|------|------------------|---------|
| **A. Form primary** | `primaryBtnClass` in `lib/form.ts` | Account, Create, Settings, Detail, IDE, password reset, resend |
| **B. Form secondary / ghost** | `secondaryBtnClass` in `lib/form.ts` | Same app/tool pages |
| **C. Landing / marketing** | `.home-btn` + `.home-btn-primary` / `.home-btn-ghost` / `.home-btn-quiet` in `index.css` | Home, Gallery CTA / Load more |

Also inline one-offs (not using A–C):
- Auth submit buttons on **Login** / **Signup** (duplicated Tailwind, not `primaryBtnClass`)
- Header **Get started** / **Log in** links (compact nav buttons)
- Header **icon buttons** (theme + hamburger)
- IDE file-tree row buttons

### Theme toggles — **2 types**

| Type | Where | Look |
|------|-------|------|
| **Segmented Light/Dark** | `ThemeSegment` in AppHeader (desktop ≥1280px) | Two-segment control |
| **Icon Sun/Moon** | AppHeader mobile tools | Single icon button |

### Search fields — **3 types**

| Type | Where |
|------|-------|
| **Nav desktop search** | AppHeader (≥1280px) |
| **Nav mobile drawer search** | AppHeader drawer |
| **Gallery page search** | GalleryPage (larger, clear-X) |

### Nav links — **3 types**

| Type | Where |
|------|-------|
| **Desktop center NavLink** | AppHeader (`desktopLinkClass`) |
| **Mobile drawer MobileLink** | AppHeader |
| **Gallery workspace tabs** | GalleryPage Explore / My sketches |

### Filter chips — **2 types**

| Type | Where | Notes |
|------|-------|-------|
| **Gallery Chip** | GalleryPage | Format + tags (`quiet` variant for tags) |
| **Settings tag toggle** | SketchSettingsPage | Same pill idea, different markup (not shared `Chip`) |

### Sort / segment controls — **2 types**

| Type | Where |
|------|-------|
| **Gallery sort tabs** | `.gallery-sort-tabs` / `.gallery-sort-tab` |
| **Header / gallery workspace segment** | Border + active pill (Explore / My sketches; featured/recent historically similar) |

### Sketch cards / media — **2 layouts in one component**

| Type | Breakpoint | In `SketchCardView` |
|------|------------|---------------------|
| **Mobile app-row** | `< sm` | Square **app icon** + text row |
| **Desktop media card** | `≥ sm` | 16:10 thumbnail + type chip overlay |

### Backgrounds — **2 types**

| Type | Component |
|------|-----------|
| **Live sketch iframes** | `LandingHeroBackground` (desktop) |
| **Particle canvas** | `HomeParticles` (mobile / fallback) |

### Text inputs — **2 styles**

| Type | Definition |
|------|------------|
| **Shared form input** | `inputClass` (`lib/form.ts`) — Create, Settings, password flows |
| **Inline auth input** | Login/Signup duplicate classes (not using `inputClass`) |

### CTA / eyebrow pills — **2 types**

| Type | Class / piece |
|------|----------------|
| **Home eyebrow chip** | `.home-eyebrow` |
| **Gallery count pill** | `.gallery-count-pill` |

### Motion wrappers — **2 types**

| Type | Component |
|------|-----------|
| **TextEffect** | Word/char/line text animation |
| **AnimatedGroup** | Grid/list stagger (`preset`: fade, blur, …) |

### Preview surfaces — **2 types**

| Type | Where |
|------|-------|
| **Home hero preview** | Background iframes (non-interactive chrome) |
| **IDE live preview** | EditSketchPage iframe + runtime error panel |

---

## 5. Pages (route-level UI, not reusable components)

| Page | File |
|------|------|
| HomePage | `pages/HomePage.tsx` |
| GalleryPage | `pages/GalleryPage.tsx` |
| SketchDetailPage | `pages/SketchDetailPage.tsx` |
| AccountPage | `pages/AccountPage.tsx` |
| CreateSketchPage | `pages/CreateSketchPage.tsx` |
| EditSketchPage | `pages/EditSketchPage.tsx` |
| SketchSettingsPage | `pages/SketchSettingsPage.tsx` |
| LoginPage | `pages/LoginPage.tsx` |
| SignupPage | `pages/SignupPage.tsx` |
| PasswordResetRequestPage | `pages/PasswordResetRequestPage.tsx` |
| PasswordResetConfirmPage | `pages/PasswordResetConfirmPage.tsx` |
| ResendVerificationPage | `pages/ResendVerificationPage.tsx` |

---

## 6. Third-party UI used as components

| Library | Used as |
|---------|---------|
| **CodeMirror** (`@uiw/react-codemirror`) | Inside `SketchCodeEditor` |
| **Lucide icons** | Search, Menu, X, Sun, Moon, etc. |
| **Motion** (`motion/react`) | Powering TextEffect + AnimatedGroup |

---

**Summary:** 8 shared visual components (+ 2 nested in the header), a handful of page-local pieces, and several **parallel button / chip / search / theme** systems that look similar but are implemented separately (landing CSS vs form classes vs one-off auth styles).