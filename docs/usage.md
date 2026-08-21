# Usage

This project is a Vite + React 18 + Tailwind CSS app. The two key components live in `src/components/`:

- `LineSidebar.jsx` — proximity-aware vertical navigation.
- `Topography.jsx` — WebGL topographic line field via `ogl`.

## Install & run locally

```bash
npm install
npm run dev      # start Vite dev server at http://localhost:5173
npm run build    # produce dist/
npm run preview  # preview the built site
```

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds and deploys on every push to `main`. The Pages source must be set to **GitHub Actions** (Settings → Pages → Source).

The deployed site lives at:

```
https://<username>.github.io/Adventure/
```

`vite.config.js` sets `base: '/Adventure/'` so all asset URLs resolve correctly under the repo subpath.
