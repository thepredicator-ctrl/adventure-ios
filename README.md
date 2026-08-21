# Adventure — Cartoon Streamer × LineSidebar × Topography

A cartoon streamer web app with all the features of a retro pixel player, rebuilt on a modern **LineSidebar + Topography** UI. Built with **React 18 + Vite + Tailwind CSS 3**.

> The previous content of this repo (a single-file "Arcade Toons" pixel-art demo) is preserved in [`README-arcade-toons.md`](./README-arcade-toons.md). This is a from-scratch rework that keeps every feature but swaps the UI for the LineSidebar navigation and the WebGL Topography background.

## Features

- **7 shows** with exact season/episode counts (Adventure Time, Cupcake & Dino, Gumball, Regular Show, Gravity Falls, Steven Universe, Kiff)
- **4 embed servers** with one-click switching (vidsrc.in, vidsrc.pro, vidlink.pro, vsembed.ru)
- **Video player** with iframe embed, prev/next, mark-watched
- **Episode grid** with season tabs and watched ✓ marks
- **Show grid** with search filter and per-show progress bars
- **Stats panel** — overall completion, watched counts, session, themes tried, achievements
- **8 achievements** with locked/unlocked states (First Episode, Binge Watcher, Power Binger, Season Finisher, Completionist, Server Hopper, Style Chameleon, Explorer)
- **5 themes** that recolor both the sidebar and the topographic background (Amethyst, Arcade, GameBoy, Cyberpunk, Vaporwave)
- **AUTO NEXT** toggle — listens for `window.message` events from the iframe and auto-advances
- **Continue watching rail** — 6 most recently watched positions
- **Per-show localStorage persistence** — each show remembers its own season/episode; global prefs (server, autoplay, theme, CRT) also saved
- **Settings drawer** — default server, CRT toggle, reset current show, reset all progress (with confirm modal)
- **Keyboard shortcuts** — ← / → for prev/next, A for AUTO NEXT, 1–4 for servers, T to cycle theme
- **Toast notifications** for actions and achievement unlocks
- **CRT scanline overlay** toggle

## Live demo

Deployed via GitHub Actions to:

```
https://thepredicator-ctrl.github.io/Adventure/
```

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # produce dist/
npm run preview  # preview the built site
```

## Architecture

```
src/
├── context/PlayerContext.jsx    # single source of truth (state + actions)
├── data/
│   ├── shows.js                 # 7 shows with season/episode counts
│   ├── servers.js               # 4 embed server URL builders
│   ├── achievements.js          # 8 achievement definitions
│   ├── themes.js                # 5 themes (sidebar + topography palettes)
│   └── sections.js              # sidebar section registry
├── lib/
│   ├── storage.js               # namespaced localStorage helpers
│   ├── episodes.js              # episode math (totals, prev/next, keys)
│   └── format.js                # pad2, formatDate, slugify
├── hooks/
│   ├── useLocalStorage.js
│   └── useMediaQuery.js
├── components/
│   ├── LineSidebar.jsx          # as-provided (unchanged)
│   ├── Topography.jsx           # as-provided (unchanged)
│   ├── SidebarLayout.jsx        # wraps LineSidebar, reads theme from context
│   ├── SectionRenderer.jsx      # lazy-loads section components
│   ├── Header.jsx               # shows current show + season/episode
│   ├── Footer.jsx
│   ├── Toast.jsx                # reads toast from context
│   ├── ShowIcon.jsx             # colored show badge
│   └── ProgressBar.jsx
├── sections/
│   ├── Player.jsx               # video + server picker + AUTO NEXT + continue rail
│   ├── Episodes.jsx             # season tabs + episode grid
│   ├── Shows.jsx                # 7 cards with search + progress
│   ├── Stats.jsx                # completion + per-show progress
│   ├── Awards.jsx               # 8 achievement cards
│   ├── Themes.jsx               # 5 theme picker
│   ├── Settings.jsx             # default server, CRT, resets
│   └── Shortcuts.jsx            # keyboard reference
├── App.jsx                      # composition root (provider + layout + bg)
├── main.jsx                     # React root
└── index.css                    # Tailwind entry + tokens
```

## Component props

- [LineSidebar props](./docs/props-linesidebar.md)
- [Topography props](./docs/props-topography.md)

## License

MIT — see `LICENSE`.
