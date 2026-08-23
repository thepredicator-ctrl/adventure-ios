import { useRef, useEffect, useState, useCallback, useMemo }
from 'react';

// Compact 5x5 bitmap font — 10 glyphs from empty to full.
// Each glyph is 5 rows of 5 bits packed into a 25-bit integer.
const GLYPHS = [
  0b0000000000000000000000000, // 0: space
  0b0000100001000001000010000, // 1: dot
  0b0010001000000000100010000, // 2: colon
  0b0000100001010001000010000, // 3: colon-dot
  0b0010101010101010100010000, // 4: bracket [
  0b0010001010001010001010000, // 5: bracket ]
  0b1000100001010001000010001, // 6: hash #
  0b1110111111111101110111110, // 7: block
  0b1111111111111111111111111, // 8: full
  0b1111111111111111111111111, // 9: full (alternate)
];

const ASCII_CHARS = ' .:-=#@%*+';
const CHAR_COUNT = ASCII_CHARS.length;

// Convert a hex color to [r, g, b] 0–255
function hexToRgb(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export default function AsciiSweepTerminal({ color = '#4ade80', children }) {
  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const sweepRef = useRef(0);   // 0→1 sweep progress
  const sweepDirRef = useRef(1); // +1 or -1
  const sweepingRef = useRef(false);
  const [sweepCount, setSweepCount] = useState(0);

  const rgb = useMemo(() => hexToRgb(color), [color]);

  const triggerSweep = useCallback((dir = 1) => {
    sweepDirRef.current = dir;
    sweepRef.current = 0;
    sweepingRef.current = true;
  }, []);

  // Capture content to canvas on mount and when children change
  const captureContent = useCallback(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = content.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CELL = 8; // pixels per cell
    let lastTime = 0;

    // Ambient flicker state (always running)
    const flickerState = useRef([]);

    function drawFrame(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      timeRef.current += dt;
      const t = timeRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cellW = CELL * dpr;
      const cellH = CELL * dpr;
      const cols = Math.ceil(w / cellW);
      const rows = Math.ceil(h / cellH);

      // Initialize flicker state
      if (flickerState.current.length !== cols * rows) {
        flickerState.current = Array.from({ length: cols * rows }, () => Math.random());
      }
      // Update flicker
      for (let i = 0; i < flickerState.current.length; i++) {
        if (Math.random() < 0.03) flickerState.current[i] = Math.random();
      }

      ctx.clearRect(0, 0, w, h);
      ctx.font = `${Math.max(1, Math.floor(cellH * 0.7))}px monospace`;
      ctx.textBaseline = 'top';

      const sweep = sweepRef.current;
      const isSweeping = sweepingRef.current;

      // Sweep animation
      if (isSweeping) {
        sweepRef.current += dt * 0.6;
        if (sweepRef.current >= 1) {
          sweepRef.current = 1;
          sweepingRef.current = false;
          setSweepCount(c => c + 1);
        }
      }

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const x = col * cellW;
          const y = row * cellH;
          const nx = col / cols; // 0..1

          // Sweep band: a glowing column of ASCII
          let bandIntensity = 0;
          if (isSweeping) {
            const head = sweep;
            const bandWidth = 0.12;
            const trailWidth = 0.18;
            const dist = nx - head;
            if (dist > 0 && dist < trailWidth) {
              bandIntensity = 1 - (dist / trailWidth);
              bandIntensity = bandIntensity * bandIntensity;
            } else if (dist >= -bandWidth && dist <= 0) {
              bandIntensity = 1;
            } else if (dist < -bandWidth && dist > -(bandWidth + 0.05)) {
                bandIntensity = 1 - ((-bandWidth - dist) / 0.05);
              }
            bandIntensity *= 0.6 + 0.4 * Math.sin(t * 12 + row * 0.7 + col * 0.3);
          }

          // Ambient idle glow along edges
          const edgeDist = Math.min(nx, 1 - nx);
          const ambientGlow = Math.max(0, 1 - edgeDist * 6) * 0.08 * (0.7 + 0.3 * Math.sin(t * 2 + row * 0.5));

          // Occasional random sparkles
          const sparkle = flickerState.current[idx] > 0.97 ? 0.5 : 0;
          const totalIntensity = Math.max(ambientGlow, bandIntensity, sparkle);

          if (totalIntensity > 0.01) {
            const charIdx = Math.floor(Math.abs(Math.sin(row * 3.7 + col * 7.3 + t * 0.5)) * CHAR_COUNT);
            const ch = ASCII_CHARS[charIdx] || '.';

            const alpha = Math.min(1, totalIntensity);
            const [r, g, b] = rgb;

            // Glow effect
            if (bandIntensity > 0.1) {
              ctx.shadowColor = `rgba(${r},${g},${b},${bandIntensity * 0.6})`;
              ctx.shadowBlur = 8 * bandIntensity;
            } else {
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }

            ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.7})`;
            ctx.fillText(ch, x, y);
          }
        }
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw scan lines over everything
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, y, w, 1);
      }

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [rgb]);

  // Auto-sweep on mount
  useEffect(() => {
    const timer = setTimeout(() => triggerSweep(1), 600);
    return () => clearTimeout(timer);
  }, [triggerSweep]);

  return (
    <div className="relative">
      {/* Hidden content for layout measurement */}
      <div ref={contentRef} className="invisible absolute inset-0 pointer-events-none" aria-hidden="true">
        {children}
      </div>
      {/* ASCII sweep canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />
      {/* Actual visible content */}
      <div className="relative z-0">{children}</div>
    </div>
  );
}
