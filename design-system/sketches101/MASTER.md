# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/sketches101/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Sketches101  
**Generated:** 2026-07-29 (UI UX Pro Max + brand lock)  
**Category:** Creative coding gallery / developer community  
**Design Dials:** Variance 4/10 | Motion 5/10 | Density 5/10  

**Brand lock:** Existing product identity wins over generator defaults.  
Do **not** switch to Archivo/Space Grotesk/Fredoka or green `#22C55E` CTAs.

---

## Global Rules

### Color Palette (brand)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary / CTA | `#7B61FF` | `--color-primary` |
| Primary hover | `#6A50EE` | `--color-primary-hover` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Background (dark) | `#0D0D0D` | `--color-background` |
| Surface | `#161616` | `--color-surface` |
| Foreground | `#F8FAFC` | `--color-foreground` |
| Muted | `#A1A1AA` | `--color-muted` |
| Border / outline | `#2A2A2E` | `--color-border` |
| Destructive | `#EF4444` | `--color-destructive` |
| Light background | `#F8FAFC` | `--color-background-light` |
| Light foreground | `#131B2E` | `--color-foreground-light` |

**Mode:** Dark primary; light theme supported (gallery already has `theme-light`).  
**Accent strategy:** Purple CTAs; let sketch thumbnails carry color — keep chrome neutral.

### Typography (brand)

- **Heading / display:** Outfit (500–700)
- **Body:** Inter (400–600)
- **Code:** JetBrains Mono (400–500)
- **Icons:** Material Symbols Outlined (subset) or Lucide in React

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Spacing

| Token | Value |
|-------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `32px` |
| `--space-2xl` | `48px` |
| `--space-3xl` | `64px` |

### Style direction (from UI UX Pro Max)

- **Pattern family:** Portfolio Grid + Hero-centric landing  
- **Visual style:** Modern Dark / OLED-friendly (not pure `#000` smear — use `#0D0D0D`)  
- **Keywords:** cinematic chrome, content-first grid, subtle glass on nav, minimal glow  
- **Performance:** Prefer CSS / Motion Primitives stagger over heavy blur stacks on mobile  

### Motion (Motion Primitives + dial 5/10)

- Stagger cards / sections: 300–450ms, ease out cubic  
- Max **2–3** intentional motions per viewport  
- Always respect `prefers-reduced-motion`  
- Skip heavy FX under 768px  

| Surface | Allow | Block |
|---------|-------|-------|
| Home | Text Effect, In View, Animated Group, Scroll Progress | Morphing Dialog v1, Magnetic spam |
| Gallery | Animated Group, subtle In View | Text Scramble, Infinite Slider |
| Detail | Calm chrome only | Text FX on chrome |
| Edit | Almost none | All marketing primitives |
| Auth | Soft In View on brand panel | Particles + heavy motion on mobile |

### Avoid (anti-patterns)

- Replacing brand purple with “AI green” or unrelated generator palettes  
- Emoji as icons  
- Light-mode-only layouts  
- Over-glow / neon cyberpunk chrome competing with sketch previews  
- Dense motion in the code IDE  

### Pre-delivery checklist

- [ ] No emojis as icons (SVG / Material / Lucide)  
- [ ] `cursor-pointer` on clickable elements  
- [ ] Hover 150–300ms  
- [ ] Contrast ≥ 4.5:1 (light + dark)  
- [ ] Visible focus rings  
- [ ] `prefers-reduced-motion`  
- [ ] Breakpoints: 375 / 768 / 1024 / 1440  

### Stack notes (React migration)

- Theme via React context (not Context for hot form state)  
- Tailwind built CSS + Motion + Motion Primitives copy-in components  
- Django remains API / auth / embeds  

---

## Component specs (summary)

### Buttons
- **Primary:** bg `#7B61FF`, text white, radius 8–10px, hover `#6A50EE`  
- **Ghost:** transparent + border outline, hover border primary  
- **Accent (landing):** same as primary — do not invent a second brand color  

### Cards (gallery)
- Media 16:10 (desktop), square-ish mobile list  
- Type chip on media; title + meta below  
- Featured: purple border + badge, same card size as peers  

### Nav
- Fixed `gallery-home-nav`; brand left; links center (desktop); auth/avatar right  
- Mobile: hamburger → drawer  

---

## Figma file

[Sketches101 — Design Workflow](https://www.figma.com/design/fY1di3zV6oEBKBDepscGMJ)  
Screens live on page **03 — Screens**. Captures are reference only.
