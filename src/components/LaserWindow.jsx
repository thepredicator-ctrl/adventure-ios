import { lazy, Suspense } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { THEMES } from '../data/themes.js';

// Lazy-load LaserFlow so it doesn't bloat the initial bundle.
const LaserFlow = lazy(() => import('./LaserFlow.jsx'));

/**
 * LaserWindow — a content panel that has the LaserFlow WebGL shader
 * running as its background. Used to wrap each section's content.
 *
 * The LaserFlow is heavily darkened / blended so foreground text remains
 * readable. The shader color follows the active theme's accent.
 */
export default function LaserWindow({ children, className = '' }) {
  const { global } = usePlayer();
  const theme = THEMES.find(t => t.id === global.theme) ?? THEMES[0];
  const accent = theme.sidebar.accent;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl ${className}`}
    >
      {/* LaserFlow background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Suspense fallback={null}>
          <LaserFlow
            color={accent}
            wispDensity={0.8}
            flowSpeed={0.25}
            verticalSizing={2.4}
            horizontalSizing={0.6}
            fogIntensity={0.35}
            wispSpeed={10}
            wispIntensity={3.2}
            flowStrength={0.2}
            decay={1.2}
            falloffStart={1.4}
            horizontalBeamOffset={0.0}
            verticalBeamOffset={0.0}
            mouseTiltStrength={0.0}
            dpr={1}
          />
        </Suspense>
      </div>

      {/* Dark gradient overlay for readability */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,8,12,0.55) 0%, rgba(8,8,12,0.72) 60%, rgba(8,8,12,0.85) 100%)'
        }}
      />

      {/* Subtle inner border highlight */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-3xl"
        style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)' }}
      />

      {/* Content on top */}
      <div className="relative z-10 p-6 sm:p-8">{children}</div>
    </div>
  );
}
