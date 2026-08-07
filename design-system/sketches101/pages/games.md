# Page: Games

> Overrides `MASTER.md` for `/games` hub and `/games/:slug` play.

## Intent
Play-only lane alongside Sketches. Visitors play fullscreen; they do not see source, fork, or IDE (owners/staff still edit via Account / Settings).

## Hub (`/games`)
- Same browse chrome family as Gallery: Sketches / Games / Account tabs
- Primary actions: **Play** (first game) + **Surprise me**
- Cards show a clear **Play** affordance; tap opens `/games/:slug` (not a detail page)
- Sort: Featured / Newest
- Empty state: point authors to Settings → List as game

## Play (`/games/:slug`)
- No marketing detail layout — land in CSS fullscreen stage immediately
- Chrome: title, author, personal best, **Scores** (leaderboard drawer), Fullscreen (best-effort), Exit
- Safe-area insets and min 44px touch targets for mobile / iOS
- Score toast on `sketches101-score` (personal best / sign-in hint)
- Browser Fullscreen API is optional; never block play if it fails

## Motion
ALLOW: light leaderboard / toast appear  
BLOCK: card→detail morph, hero overlays, extra marketing sections on play

## Anti-patterns
- Do not revive a game “detail” page between hub and play
- Do not put cards in the play chrome
- Do not rely on gesture-blocked `requestFullscreen` as the only play mode
