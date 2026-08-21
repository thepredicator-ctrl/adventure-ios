import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import ParticleText from './ParticleText.jsx';
import TextLoop from './TextLoop.jsx';
import { Terminal, TypingAnimation, AnimatedSpan } from './magicui/Terminal.jsx';

// Lazy-load the heavy WebGL shaders so they only load when the loading
// screen actually mounts.
const LightTunnel = lazy(() => import('./LightTunnel.jsx'));
const Strands = lazy(() => import('./Strands.jsx'));

// Total boot sequence runs ~10s. User can skip at any time.
const BOOT_DURATION_MS = 10500;

export default function LoadingScreen({ onComplete }) {
  const [hiding, setHiding] = useState(false);
  const [done, setDone] = useState(false);

  const finish = useCallback(() => {
    if (done || hiding) return;
    setHiding(true);
    setTimeout(() => {
      setDone(true);
      onComplete?.();
    }, 600);
  }, [done, hiding, onComplete]);

  // Auto-finish after the full boot sequence.
  useEffect(() => {
    const t = setTimeout(finish, BOOT_DURATION_MS);
    return () => clearTimeout(t);
  }, [finish]);

  if (done) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between gap-4 px-6 py-8 transition-opacity duration-500 ${
        hiding ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#000000' }}
    >
      {/* LightTunnel background — opaque canvas, sits behind everything */}
      <div className="pointer-events-none absolute inset-0">
        <Suspense fallback={null}>
          <LightTunnel
            cableColor="#ffffff"
            pulseColor="#ffffff"
            tunnelColor="#cccccc"
            tunnelOpacity={0.18}
            speed={0.15}
            flowDirection="outward"
            pulseSpeed={2.2}
            pulseLength={0.3}
            pulseBlend={0.8}
            pulseWidth={1.1}
            cableCount={24}
            thickness={0.4}
            rimWidth={0.18}
            waviness={0.35}
            sway={0.6}
            size={1.1}
            glow={1.2}
            fadeNear={0.4}
            fadeFar={2.2}
            brightness={1.0}
            colorVariance={false}
            grain
            grainIntensity={0.05}
            opacity={0.85}
            mouseInteraction
            mouseStrength={0.12}
          />
        </Suspense>
      </div>

      {/* Strands layer — flowing white light beams with a glass lens orb
          centered behind the terminal. Adds depth and a focal point.
          All monochrome for the black-and-white theme. */}
      <div className="pointer-events-none absolute inset-0">
        <Suspense fallback={null}>
          <Strands
            colors={['#ffffff', '#cccccc', '#888888', '#dddddd']}
            count={4}
            speed={0.4}
            amplitude={1.2}
            waviness={1.1}
            thickness={0.65}
            glow={2.4}
            taper={2.6}
            spread={1}
            hueShift={0}
            intensity={0.5}
            saturation={0}
            opacity={0.8}
            scale={1.7}
            glass
            refraction={1.1}
            dispersion={1.2}
            glassSize={1.05}
          />
        </Suspense>
      </div>

      {/* Solid dark overlay so the tunnel never shows through to the page */}
      <div className="pointer-events-none absolute inset-0 bg-black/40" />

      {/* Top vignette for readability of the title */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)'
        }}
      />

      {/* Bottom vignette for readability of the text loop */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)'
        }}
      />

      {/* TOP: ParticleText title */}
      <div className="relative z-10 w-full max-w-4xl">
        <ParticleText
          text="adventure"
          particleSize={2.2}
          density={4}
          color="#ffffff"
          highlightColor="#888888"
          scatter={220}
          gatherDuration={1800}
          stagger={500}
          pointerRepel={50}
          repelRadius={140}
          idleDrift={0.9}
          trigger="mount"
          fontSize="clamp(3rem, 13vw, 9rem)"
          fontWeight={800}
          fontFamily="inherit"
          glow
          className="h-[28vh] min-h-[200px]"
        />
        <div className="mt-1 text-center text-[11px] uppercase tracking-[0.4em] text-white/40">
          Cartoon Streamer · v1.0
        </div>
      </div>

      {/* MIDDLE: Terminal */}
      <div className="relative z-10 w-full max-w-2xl">
        <Terminal title="adventure — bash">
          <TypingAnimation delay={0} className="text-white">
            &gt; adventure init
          </TypingAnimation>

          <AnimatedSpan delay={1100} className="text-white">
            &#10004; Loading show database.
          </AnimatedSpan>

          <AnimatedSpan delay={1700} className="text-white">
            &#10004; Verifying 7 shows.
          </AnimatedSpan>

          <AnimatedSpan delay={2300} className="text-white">
            &#10004; Connecting to embed servers.
          </AnimatedSpan>

          <AnimatedSpan delay={2900} className="text-white">
            &#10004; Found 4 servers online.
          </AnimatedSpan>

          <AnimatedSpan delay={3500} className="text-white">
            &#10004; Loading achievements.
          </AnimatedSpan>

          <AnimatedSpan delay={4100} className="text-white">
            &#10004; 8 achievements ready.
          </AnimatedSpan>

          <AnimatedSpan delay={4700} className="text-white">
            &#10004; Restoring watch progress.
          </AnimatedSpan>

          <AnimatedSpan delay={5300} className="text-white">
            &#10004; Syncing localStorage.
          </AnimatedSpan>

          <AnimatedSpan delay={5900} className="text-white/70">
            <span>&#8505; Updated 1 file:</span>
            <span className="pl-2">- src/context/PlayerContext.jsx</span>
          </AnimatedSpan>

          <TypingAnimation delay={6700} duration={40} className="text-white/60">
            Success! adventure ready.
          </TypingAnimation>

          <TypingAnimation delay={8200} duration={40} className="text-white/60">
            You may now pick a show.
          </TypingAnimation>
        </Terminal>

        <div className="mt-4 flex items-center justify-between">
          <div className="font-mono text-xs text-white/30">
            7 shows · 4 servers · 5 themes · 8 achievements
          </div>
          <button
            onClick={finish}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm transition hover:border-white/40 hover:text-white"
          >
            Skip &rarr;
          </button>
        </div>
      </div>

      {/* BOTTOM: TextLoop ribbon */}
      <div className="relative z-10 w-full max-w-5xl">
        <TextLoop
          text="adventure"
          shape="wave"
          speed={120}
          direction="forward"
          separator="&#10022;"
          curviness={90}
          fontSize={36}
          fontWeight={800}
          letterSpacing={3}
          uppercase={false}
          color="#ffffff"
          ribbon
          ribbonColor="#2a2a2a"
          ribbonWidth={70}
          pauseOnHover
          className="opacity-90"
        />
      </div>
    </div>
  );
}
