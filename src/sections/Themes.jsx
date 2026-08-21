import { usePlayer } from '../context/PlayerContext.jsx';
import { THEMES } from '../data/themes.js';

const ACCENT_PRESETS = ['#ffffff','#5ac8fa','#a0a0a0','#ff3e88','#b877ff','#00ff88','#ffaa00','#ff6666','#00d9ff'];

export default function Themes() {
  const { global, setTheme, setSettings, showToast } = usePlayer();
  const s = global.settings;

  const updateSetting = (key, val) => {
    setSettings({ [key]: val });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Themes</h2>
        <p className="mt-1 text-white/60">Recolors the sidebar and the topographic background.</p>
      </div>

      {/* Theme cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {THEMES.map(t => {
          const isActive = global.theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                isActive
                  ? 'border-white/60 bg-white/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-white">{t.name}</div>
                {isActive && <span className="text-xs font-mono text-white">ACTIVE</span>}
              </div>
              <div className="mt-3 flex gap-2">
                {t.swatch.map((c, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-md border border-white/10"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="mt-3 font-mono text-xs text-white/40">
                accent {t.sidebar.accent} · bg {t.topography.lowColor}
              </div>
            </button>
          );
        })}
      </div>

      {/* Intensity controls */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 text-sm font-medium text-white">Visual controls</div>
        <div className="space-y-4">
          {/* Scanline intensity */}
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-white/50">Scanlines</span>
            <input type="range" min="0" max="0.3" step="0.01" value={s.scanlineIntensity ?? 0.08}
              onChange={e => updateSetting('scanlineIntensity', parseFloat(e.target.value))}
              className="h-1 flex-1 appearance-none rounded-full bg-white/10 accent-white" />
            <span className="w-10 text-right font-mono text-xs text-white/50">{(s.scanlineIntensity ?? 0.08).toFixed(2)}</span>
          </div>

          {/* Contour intensity */}
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-white/50">Contours</span>
            <input type="range" min="0" max="1" step="0.05" value={s.contourIntensity ?? 0.6}
              onChange={e => updateSetting('contourIntensity', parseFloat(e.target.value))}
              className="h-1 flex-1 appearance-none rounded-full bg-white/10 accent-white" />
            <span className="w-10 text-right font-mono text-xs text-white/50">{(s.contourIntensity ?? 0.6).toFixed(2)}</span>
          </div>

          {/* Glass opacity */}
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-white/50">Glass</span>
            <input type="range" min="0" max="1" step="0.05" value={s.glassOpacity ?? 0.35}
              onChange={e => updateSetting('glassOpacity', parseFloat(e.target.value))}
              className="h-1 flex-1 appearance-none rounded-full bg-white/10 accent-white" />
            <span className="w-10 text-right font-mono text-xs text-white/50">{(s.glassOpacity ?? 0.35).toFixed(2)}</span>
          </div>

          {/* Animation intensity */}
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-white/50">Animation</span>
            <input type="range" min="0" max="2" step="0.1" value={s.animationIntensity ?? 1.0}
              onChange={e => updateSetting('animationIntensity', parseFloat(e.target.value))}
              className="h-1 flex-1 appearance-none rounded-full bg-white/10 accent-white" />
            <span className="w-10 text-right font-mono text-xs text-white/50">{(s.animationIntensity ?? 1.0).toFixed(1)}</span>
          </div>

          {/* Reduced motion */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <div>
              <div className="text-sm text-white">Reduced motion</div>
              <div className="text-xs text-white/50">Disable animations for accessibility.</div>
            </div>
            <button
              onClick={() => { updateSetting('reducedMotion', !s.reducedMotion); showToast(`Reduced motion ${!s.reducedMotion ? 'ON' : 'OFF'}`); }}
              role="switch" aria-checked={s.reducedMotion}
              className={`relative h-7 w-12 rounded-full transition ${s.reducedMotion ? 'bg-white' : 'bg-white/15'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${s.reducedMotion ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* High contrast */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <div>
              <div className="text-sm text-white">High contrast</div>
              <div className="text-xs text-white/50">Increase text and border contrast.</div>
            </div>
            <button
              onClick={() => { updateSetting('highContrast', !s.highContrast); showToast(`High contrast ${!s.highContrast ? 'ON' : 'OFF'}`); }}
              role="switch" aria-checked={s.highContrast}
              className={`relative h-7 w-12 rounded-full transition ${s.highContrast ? 'bg-white' : 'bg-white/15'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${s.highContrast ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
