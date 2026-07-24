Suggestions aimed at **coming back** and **staying longer**, using what you already have (gallery, IDE, drafts, forks, tags) rather than a full social network.

---

## Highest leverage (UI/UX on existing pages)

### 1. Personalized home for logged-in users

Replace (or soft-swap) the marketing hero after login with:

- **Continue editing** (last draft, big CTA)
- **Recently viewed** published sketches
- **Forks of your work** (if any)

*Return rate:* unfinished drafts are the strongest hook.  
*Time spent:* one click back into the IDE.

### 2. “Resume session” on Account + Gallery header

Persistent chip: **Continue · Sketch name · Edited 2h ago**.  
Same pattern on mobile drawer. Low build cost, high habit loop.

### 3. Gallery “play mode”

From Explore: **Surprise me** / **Next sketch** fullscreen carousel (embed + title + Fork / Open IDE).  
Keyboard: `→` next, `F` fork, `Esc` exit.

*Time spent:* turns browsing into continuous play instead of list → open → back.

### 4. Stronger related / chain on sketch detail

Below the embed:

- **More like this** (same tags / format)
- **Fork tree** (“based on X · remixed N times”)
- **Open in IDE** as a primary action for guests (with signup gate on save)

*Time spent:* discovery without returning to the grid.  
*Return rate:* “I want to remix this later.”

### 5. Draft friction reduction

On create/settings: auto-title, skip-heavy settings until first publish, toast **Saved · Publish when ready**.  
Empty Account state: one big **Start a sketch** + 3 starter templates with previews.

---



## New pages worth adding (for retention)


| Page                                                                                 | Why it helps                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `/explore/today` — Sketch of the day + short trail of past days                      | Daily reason to return                                              |
| `/makers/` — lightweight makers directory (avatar, sketch count, latest)             | Follow-worthy destinations without a full social product            |
| `/makers/<username>/` — public profile of published work                             | Identity + bookmarkable URLs                                        |
| `/challenges/` (simple first version) — weekly prompt + gallery filter `?challenge=` | Shared deadline → return visits                                     |
| `/learn/` or Docs-lite — 5–10 short “build this” paths that end in **Open in IDE**   | Learning sessions stretch time; unfinished lessons pull people back |
| `/collections/<slug>/` — curated or user playlists of sketches                       | Replayable browsing (like YouTube playlists)                        |


Start with **Today + Maker profile + Play mode**; Challenges/Docs after those stick.

---



## Features that increase repeat rate

1. **Weekly challenge strip** on Home/Explore (“This week: generative landscapes · 12 entries”) — even without a full Challenges product.
2. **Email / digest of featured + “your draft is waiting”** — one transactional email beats in-app notifications for return rate.
3. **Soft streaks** on Account (“3 days sketched”) — optional, not gamified spam.
4. **Watch / follow a maker** — home feed of *new publishes only* (no likes/comments required).
5. **Save / bookmark** (PRD skipped this; worth revisiting) — “Saved” in the drawer drives returns without creating content.

---



## Features that increase time on site

1. **Inline expand preview** on gallery cards (hover/tap plays embed without full navigation).
2. **Filter memory** — remember last tags/format/sort per user/session.
3. **IDE “examples drawer”** — open community snippets while editing (stay in workspace longer).
4. **Side-by-side: your fork vs original** after forking.
5. **Tag journeys** — “Start here → next → next” guided paths for Topics/Techniques you already seed.

---



## What I’d ship first (ordered)

1. Continue editing + recently viewed (home + header)
2. Sketch play mode / Surprise me
3. Maker profile page
4. Sketch of the day
5. Bookmark / Saved
6. Lightweight weekly challenge strip

Avoid building Pro, notifications inbox, or comments first — they add complexity without the same retention per hour of work.

If you want, I can turn the top 3 into a concrete UI plan against your current partials (`gallery_header`, home, account, sketch detail).

---

To transform **sketches101** into a sticky, high-retention platform like OpenProcessing, Shadertoy, or CodePen, the focus needs to shift from a static repository to an **interactive ecosystem**.

Creative coders return when they have a reason to build daily, learn from others, and show off their work. Below are targeted pages, features, and UI/UX changes tailored to increase both time spent and repeat visits.

---

## 1. New Pages to Boost Retention (Repeat Visits)

### 🗓️ Daily / Weekly Challenge Page (`/challenges`)

* **Why it works:** Gives users a recurring reason to return every day or week instead of visiting only when inspiration strikes.
* **Key Features:**
* **Daily Prompts:** Small coding prompts (e.g., *"Day 42: Sine Wave Oscillations"*, *"Perlin Noise Landscapes"*).
* **Submission Grid:** A live gallery of user submissions for the current prompt.
* **Streak Tracker:** Displays "Current Streak" on user profiles (like Duolingo or GitHub heatmaps).



### 🎨 Community Collections / Playlists Page (`/collections`)

* **Why it works:** Encourages curation and exploration.
* **Key Features:**
* Allow users to group sketches into public lists (e.g., *"Best Shader Animations"*, *"3D Particle Systems"*, *"Beginner p5.js Starters"*).
* Feature top community collections on the Explore page to keep users browsing longer.



### 👤 Gamified Profile & Analytics Page (`/profile/@username`)

* **Why it works:** Artists love tracking their reach and building a portfolio identity.
* **Key Features:**
* **Activity Heatmap:** GitHub-style contribution graph for sketch commits and publishes.
* **Badges:** Unlockable achievements (*"First Fork"*, *"Featured Artist"*, *"100 Lines of WebGL"*).
* **Analytics:** Total views, likes, forks, and code runs.



---

## 2. Features to Increase Time Spent (In-Session Engagement)

### 🎛️ Auto-Generated Parameter Controls (GUI Sliders)

* **Why it works:** Lets non-coders and coders instantly play with variables without touching raw code.
* **How to implement:**
* Parse sketch variables (e.g., `let speed = 5;`, `let particleCount = 100;`) and generate a floating control panel (like `lil-gui` or `dat.gui`) next to the canvas preview.
* Visitors spend significantly more time tweaking parameters to see real-time visual output.



### 🔀 One-Click "Fork & Remix" Button

* **Why it works:** Lowers the barrier to start coding. Starting from a blank canvas is intimidating; tweaking an existing sketch is fun.
* **How to implement:**
* Add a prominent **"Fork & Remix"** button on every sketch detail page.
* Clicking it clones the code directly into the IDE with attribution (*"Forked from @artist_name"*).



### 📚 In-Editor Code Snippet Library

* **Why it works:** Keeps developers inside your editor instead of switching tabs to search p5.js docs or StackOverflow.
* **How to implement:**
* A sidebar inside the live sandbox with copy-pasteable math & graphics snippets:
* *Vector Math*, *Perlin/Simplex Noise*, *Color Palette Generators*, *Audio Input Listeners*, *Shader Boilerplate*.





### 🎥 High-Res & Animated Export Tools

* **Why it works:** Generative artists want to post their art to social media (Instagram, Twitter/X, TikTok).
* **How to implement:**
* Add export options directly on the sketch runner:
* **Export PNG / SVG** (for vector/print art).
* **Record GIF / WebM** (5-10 second loop recorder).





---

## 3. Core UI/UX Enhancements

### 1. Hover-to-Play Gallery Previews

* **Current Friction:** Users have to click into a sketch page to see the animation running.
* **Fix:** In the `/sketches/` grid, render interactive or lightweight animated canvas previews on hover (or auto-play visible viewports). This turns browsing into an addictive visual feed.

### 2. "Theater Mode" & Minimalist Workspace

* **Current Friction:** UI elements (navbars, headers) distract from the visual art.
* **Fix:** Add a **Fullscreen / Theater Mode** button in the runner that dims surrounding UI and centers the canvas with smooth glassmorphism controls overlaying the corner.

### 3. Split-Screen IDE Layout Controls

* **Fix:** Allow users to toggle editor layouts:
* **Side-by-Side** (Default for desktop).
* **Top / Bottom** (Ideal for wide canvases).
* **Canvas Only** (Presentation mode).



---

## 🚀 Quick Wins to Start Today

1. **Add a "Random Sketch" Button:** Put a 🎲 icon in the header navigation that jumps users to a random community sketch.
2. **Keyboard Shortcuts in IDE:** Add `Cmd/Ctrl + Enter` to run code, `Cmd/Ctrl + S` to save, and display a quick shortcut modal.
3. **Weekly Digest Email:** Send a automated weekly email featuring the top 3 most-liked sketches of the week to pull registered users back.

---

# Website plan: retention & time-on-site

**Goal:** Shift sketches101 from a static sketch repo into a sticky creative-coding loop — return daily, stay longer in browse + IDE, remix often.

**North star behaviors**
1. Open unfinished draft within 1 click (return)
2. Browse → play → fork without dead ends (time spent)
3. Have a recurring reason to come back (challenge / today / digest)

**Already strong (reuse, don’t rebuild)**
- Fork & remix + attribution (`sketch_fork`, detail + IDE)
- Explore filters (search, tags, format, author, sort)
- IDE: live preview, resize split, fullscreen preview/editor, Cmd/Ctrl+S
- Account drafts + create/edit/settings flow
- Author filter via `?author=` (proto-profile)
- Related sketches queryset exists but is **not shown** on detail

**Explicitly defer (low retention per hour)**
- Comments inbox, Pro paywall, full social notifications, heavy badge systems

---

## Phased roadmap

### Phase 0 — Quick wins (1–3 days)
Ship habit hooks on existing surfaces. No new product areas.

| Item | Touchpoints |
|------|-------------|
| Random / Surprise sketch in nav | `gallery_nav`, `gallery_mobile_menu`, `gallery_header` + redirect view |
| Cmd/Ctrl+Enter run + shortcuts modal | IDE JS + footer controls |
| Surface related sketches on detail | `sketch_detail.html` (queryset already in view) |
| Fork count / “remixed N times” + fork attribution prominence | detail + fork attribution partial |

### Phase 1 — Return loops on existing pages (1–2 weeks)
Highest leverage from the brief; mostly UI/UX on home, header, account, explore.

| Item | Touchpoints |
|------|-------------|
| Personalized home after login (Continue / Recently viewed / Forks of you) | `home/hero`, home partials, session or DB for recently viewed |
| Resume chip on Account + gallery header + mobile drawer | `account.html`, `gallery_header`, mobile menu |
| Draft friction: auto-title, lighter create, empty-state starters | create/settings, `account.html` |
| Sketch play mode (fullscreen next/prev + Fork / Open IDE) | Explore entry + keyboard `→` `F` `Esc` |
| Stronger detail CTAs: Open in IDE primary for guests | `sketch_detail.html` |

### Phase 2 — Identity & daily reason (2–4 weeks)
Thin new pages that wrap what you already have.

| Item | Route / notes |
|------|----------------|
| Maker profile | `/makers/<username>/` — published grid, fork count; start as nicer `?author=` |
| Makers directory (optional after profile) | `/makers/` |
| Sketch of the day | `/explore/today` + past trail |
| Weekly challenge **strip** on Home/Explore | banner + `?challenge=` filter before full Challenges product |
| Bookmarks / Saved | drawer section + save on cards/detail |
| Soft streak on Account | “3 days sketched” — no spam |

### Phase 3 — Stay-in-session (IDE + gallery depth)
| Item | Notes |
|------|--------|
| Hover / tap gallery preview play | cards → lightweight embed; throttle for perf |
| Filter memory | last tags/format/sort per session/user |
| IDE layout presets | Side-by-side / Top-bottom / Canvas only |
| Theater mode on runner | dim chrome, glass controls |
| Snippet / examples drawer in IDE | Vector, noise, palettes, shaders |
| Side-by-side fork vs original | post-fork compare |
| Export PNG (+ GIF/WebM later) | runner toolbar |
| Auto GUI sliders from params | lil-gui style; after export/snippets |

### Phase 4 — Ecosystem pages (after Phase 1–2 stick)
| Item | Route |
|------|--------|
| Challenges (prompts, submission grid, streaks) | `/challenges/` |
| Collections / playlists | `/collections/`, feature on Explore |
| Learn / docs-lite paths → Open in IDE | `/learn/` |
| Weekly digest email | top sketches + “draft waiting” |
| Follow maker feed | publishes only |
| Profile analytics / heatmap / light badges | extend maker profile |

---

## Feature & UI checklist

Legend: `[ ]` todo · `[~]` partial / stubbed · `[x]` done enough to reuse

### A. Existing-page UI/UX

- [ ] Personalized logged-in home (Continue editing, recently viewed, forks of your work)
- [ ] Resume session chip on Account
- [ ] Resume session chip on gallery header
- [ ] Resume session chip on mobile drawer
- [ ] Gallery play mode / Surprise me carousel
- [ ] Play mode keyboard: next, fork, Esc
- [ ] Show related / “More like this” on sketch detail (`related_sketches` already computed)
- [ ] Fork tree or “based on X · remixed N times” on detail
- [ ] Open in IDE as primary CTA for guests (signup gate on save)
- [ ] Draft auto-title + lighter settings until publish
- [ ] Account empty state: Start a sketch + 3 starter templates
- [ ] Hover-to-play (or viewport auto-play) on gallery cards
- [ ] Remember last Explore filters (tags / format / sort)
- [ ] Weekly challenge strip on Home / Explore
- [ ] Tag journeys (“Start here → next → next”)

### B. Navigation & quick wins

- [ ] Random sketch control in header nav
- [ ] Random sketch in mobile menu
- [x] Fork & Remix on sketch detail (exists — polish prominence if needed)
- [x] Cmd/Ctrl+S save in IDE
- [ ] Cmd/Ctrl+Enter to run
- [ ] IDE keyboard shortcuts help modal
- [~] Preview / editor fullscreen (exists — evolve into Theater Mode)

### C. New pages

- [ ] `/explore/today` — Sketch of the day + past days
- [ ] `/makers/<username>/` — public maker profile
- [ ] `/makers/` — makers directory
- [ ] `/challenges/` — weekly/daily prompts + submission grid
- [ ] `/collections/` (+ `/collections/<slug>/`) — playlists
- [ ] `/learn/` — short build-this paths ending in Open in IDE
- [~] `/accounts/` — exists; add resume, streak, bookmarks sections
- [~] Author via `?author=` — exists; graduate to maker profile

### D. Retention features

- [ ] Recently viewed sketches (per user/session)
- [ ] Bookmarks / Saved sketches
- [ ] Soft activity streak on Account
- [ ] Watch / follow maker (new publishes feed)
- [ ] Weekly digest email (top liked + draft nudge)
- [ ] Challenge streaks on profile (with Challenges page)
- [ ] Activity heatmap on profile
- [ ] Light badges (First Fork, Featured, etc.) — only after profile exists
- [ ] Profile analytics (views, likes, forks, runs)

### E. Time-on-site / IDE features

- [ ] Auto-generated parameter GUI (sliders)
- [ ] In-editor snippet library sidebar
- [ ] Side-by-side: your fork vs original
- [ ] IDE layout: Side-by-Side (default)
- [ ] IDE layout: Top / Bottom
- [ ] IDE layout: Canvas Only
- [ ] Theater / minimalist runner mode
- [ ] Export PNG / SVG from runner
- [ ] Record GIF / WebM (5–10s) from runner

---

## Suggested ship order (checklist priority)

**Now (Phase 0)**
1. Random sketch in nav  
2. Related sketches + remix count on detail  
3. Cmd/Ctrl+Enter + shortcuts modal  

**Next (Phase 1)**
4. Continue editing + resume chip (home, header, account)  
5. Recently viewed  
6. Play mode / Surprise me  
7. Account empty-state starters  

**Then (Phase 2)**
8. Maker profile page  
9. Sketch of the day  
10. Bookmarks / Saved  
11. Weekly challenge strip  

**Later (Phase 3–4)**
12. Hover-to-play gallery  
13. Theater mode + IDE layout presets  
14. Snippets drawer + PNG export  
15. Challenges / Collections / Learn / digest email  
16. Follow, heatmap, badges, param GUI, GIF export  

---

## Success checks (lightweight)

| Metric | Signal |
|--------|--------|
| Return | % users who open a draft or Account within 7 days |
| Session depth | sketches viewed per Explore visit; play-mode exits vs bounce |
| Creation | forks started / forks saved; drafts → publish |
| Habit | visits on “today” or challenge weeks vs baseline |
