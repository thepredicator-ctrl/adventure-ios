# Architecture

```
adventure-clone/
├── .github/workflows/deploy.yml   # GH Pages auto-deploy
├── index.html                     # Vite entry
├── package.json
├── vite.config.js                 # base: '/Adventure/'
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.svg
├── docs/                          # markdown docs
├── examples/                      # usage snippets
└── src/
    ├── main.jsx                   # React root
    ├── App.jsx                    # composition root
    ├── index.css                  # Tailwind entry + tokens
    ├── components/
    │   ├── LineSidebar.jsx        # as-provided
    │   ├── Topography.jsx         # as-provided
    │   ├── Header.jsx
    │   ├── Footer.jsx
    │   ├── SidebarLayout.jsx
    │   ├── SectionRenderer.jsx    # lazy-loaded sections
    │   ├── Card.jsx
    │   ├── Badge.jsx
    │   └── CodeBlock.jsx
    ├── sections/                  # 12 lazy-loaded panels
    │   ├── Overview.jsx
    │   ├── Components.jsx
    │   ├── ...
    │   └── Support.jsx
    ├── data/                      # static data
    │   ├── sections.js
    │   ├── themes.js
    │   ├── components.js
    │   ├── changelog.js
    │   └── animations.js
    ├── hooks/                     # small custom hooks
    │   ├── useActiveSection.js
    │   ├── useMediaQuery.js
    │   └── useLocalStorage.js
    ├── lib/                       # pure utils
    │   ├── falloff.js
    │   ├── colors.js
    │   └── format.js
    └── styles/                    # global CSS layers
        ├── tokens.css
        ├── animations.css
        └── prose.css
```

## Composition

`App.jsx` mounts a fixed full-viewport `Topography` behind a vignette overlay, with the `Header`, `SidebarLayout`, and `Footer` layered on top. `SidebarLayout` hosts the `LineSidebar`; clicks dispatch to `App` state, which feeds `SectionRenderer` to lazily import and render the matching section component.

## Why lazy sections

Each section is small, but code-splitting keeps the initial bundle minimal — the LineSidebar and Topography are the only heavy bits, and they belong in the main chunk so the first paint is interactive immediately.

## Why no CSS transitions on the sidebar

CSS transitions on `color`, `transform`, and `opacity` would each start and end at slightly different times when an item enters and leaves the proximity zone, producing a subtle "staggered" feel. The single rAF loop writes one `--effect` value per item per frame, and every visual treatment reads from that same value, so they all move in lockstep.
