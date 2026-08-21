import { usePlayer } from '../context/PlayerContext.jsx';
import { THEMES } from '../data/themes.js';

export default function Themes() {
  const { global, setTheme } = usePlayer();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Themes</h2>
        <p className="mt-1 text-white/60">Recolors the sidebar and the topographic background.</p>
      </div>

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
    </div>
  );
}
