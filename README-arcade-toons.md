# ARCADE TOONS // Retro Pixel Cartoon Streamer

A single-file static web app — drop it on GitHub Pages and it just works.

## Quick Deploy to GitHub Pages

1. Create a new repository on GitHub (or use an existing one).
2. Upload `index.html` to the repository.
3. Go to **Settings → Pages**.
4. Under **Source**, select **Deploy from a branch**.
5. Select **main** branch and **/ (root)** folder.
6. Click **Save**.
7. Wait ~1 minute. Your site will be live at `https://<username>.github.io/<repo>/`.

That's it. No build step, no dependencies, no npm install. Just one file.

## Features

- **8-bit / NES aesthetic** — Press Start 2P + VT323 fonts, layered pixel borders, CRT scanlines, animated star background, glitch boot screen
- **7 shows preloaded** with exact season/episode counts:
  - Adventure Time (10 seasons, 279 eps)
  - Cupcake & Dino: General Services (2 seasons, 26 eps)
  - The Amazing World of Gumball (6 seasons, 240 eps)
  - Regular Show (8 seasons, 261 eps)
  - Gravity Falls (2 seasons, 40 eps)
  - Steven Universe (5 seasons, 160 eps)
  - Kiff (2 seasons, 45 eps)
- **4 embed servers** with one-click switching:
  1. `vidsrc.in`
  2. `vidsrc.pro`
  3. `vidlink.pro`
  4. `vsembed.ru` (autoplay=1)
- **5 themes** — Arcade, GameBoy, Cyberpunk, Vaporwave, Amber CRT (cycle with `T` or pick from settings)
- **Tab-based UI** — left-side vertical tab bar:
  - **PLAYER** — continue watching rail + video player + controls
  - **EPISODES** — season tabs + episode grid with watched ✓ marks
  - **SHOWS** — 7 show cards with progress bars + filter
  - **STATS** — 11 stat rows
  - **AWARDS** — 8 achievement cards with locked/unlocked states
- **Pixel progress bar** — total completion percentage across all seasons/episodes with season-boundary markers
- **Per-show localStorage persistence** — each show remembers its own season/episode; global prefs (server, autoplay, theme, CRT) also saved
- **AUTO NEXT toggle** — listens to `window.message` events for `ended` signals from the iframe player and automatically advances to the next episode (handles 6+ message shapes: bare string, JSON string, plain object, nested object)
- **Prev/Next buttons** with correct disabled states (disabled on S1E1 and on the final episode of the final season)
- **Continue watching rail** — 6 most recently watched positions across all shows
- **8 achievements** — First Episode, Binge Watcher, Power Binger, Season Finisher, Completionist, Server Hopper, Style Chameleon, Explorer
- **Settings drawer** — theme picker with color swatches, default server, CRT effect toggle, reset-all-progress and reset-current-show buttons (with confirm modal)
- **Keyboard shortcuts dialog** — press `?` to see all shortcuts
- **Boot screen** — fake BIOS POST sequence with progress bar that fades into the app
- **Responsive** — tab bar collapses to icons on mobile

## Keyboard Shortcuts

| Key            | Action                     |
|----------------|----------------------------|
| `←` / `P`      | Previous episode           |
| `→` / `N`      | Next episode               |
| `A`            | Toggle AUTO NEXT           |
| `1` / `2` / `3` / `4` | Switch to server 1–4 |
| `T`            | Cycle theme                |
| `S`            | Focus search input         |
| `?`            | Show keyboard help dialog   |
| `Esc`          | Close any open dialog       |

## How It Works

The entire app is in `index.html` — all CSS in a `<style>` tag, all JS in a `<script>` tag. The only external resource is Google Fonts (Press Start 2P + VT323). Everything else is self-contained:

- **State**: vanilla JS object + `localStorage`
- **Animations**: pure CSS (`@keyframes`, `transition: steps()`)
- **UI updates**: direct DOM manipulation
- **No frameworks, no build tools, no dependencies**

## Notes on Autoplay Next

Different embed providers send different `postMessage` payloads when a video ends. The listener handles the most common shapes:

- Bare string `"ended"`
- JSON string `'{"event":"ended"}'`
- Object `{ event: 'ended' }`
- Object `{ action: 'ended' }`, `{ type: 'ended' }`, `{ state: 'ended' }`, etc.
- Nested `{ event: { type: 'ended' } }`

A 2-second debounce prevents double-advancement when a provider emits multiple `ended` events. If a particular provider doesn't emit anything (some don't), you can always click `NEXT` manually.

## Notes on the iframe

The iframe deliberately has **no `sandbox` attribute**. Many embed providers refuse to load inside a sandboxed frame (the "content can't be embedded in a sandboxed frame" error). A popup blocker on the user side handles the unwanted stuff.

## Customization

- **Add a show**: add an object to the `SHOWS` array in the `<script>` section with `id` (IMDb ID), `name`, `shortName`, `icon` (emoji), `color` (hex), and `seasons` (array of episode counts).
- **Add a server**: add an entry to the `SERVERS` object, then add a matching `<button>` in the `#server-grid` div.
- **Change colors**: edit the CSS custom properties under each `[data-theme="..."]` selector in the `<style>` section.
