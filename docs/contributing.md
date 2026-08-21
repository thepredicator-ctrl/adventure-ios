# Contributing

Contributions are welcome. Keep these in mind:

1. **Don't modify `LineSidebar.jsx` or `Topography.jsx`** unless the change is a bug fix. They are the canonical source of the demoed components.
2. Run `npm run lint` before pushing — CI does not gate on it yet, but please don't introduce warnings.
3. Keep sections lazy-loaded. New sections must be added to both `src/data/sections.js` and `src/components/SectionRenderer.jsx`.
4. Tailwind arbitrary values are heavily used in `LineSidebar.jsx`. Don't replace them with static classes — they're load-bearing for the `--effect` driven visuals.
5. Commit messages: short imperative summary on line one, blank line, then details if needed.
