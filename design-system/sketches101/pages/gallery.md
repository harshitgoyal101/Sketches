# Page: Gallery

> Overrides `MASTER.md` for browse (`/sketches/`, tags, account grid).

## Pattern (UI UX Pro Max)
**Portfolio Grid** — visuals first, fast filters, neutral chrome so thumbnails shine.

## Layout
- Desktop: sidebar filters + 3–4 col equal cards  
- Mobile: horizontal list cards (thumb left, type, title, meta, stats)  
- Sort tabs: All / Staff Picks / Recent  
- Load more: ghost `landing-btn` style, not a full page reload look

## Motion
ALLOW: Animated Group stagger on card mount / load-more append  
BLOCK: Text Scramble, Infinite Slider, Morphing card→detail (v1)

## Performance
- WebP + srcset thumbs  
- No live sketch iframes in grid  
- Core CSS only (no home landing bundle required for chrome)
