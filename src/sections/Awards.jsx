import { usePlayer } from '../context/PlayerContext.jsx';
import { ACHIEVEMENTS } from '../data/achievements.js';

export default function Awards() {
  const { unlocked } = usePlayer();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Awards</h2>
        <p className="mt-1 text-white/60">{unlocked.length} / {ACHIEVEMENTS.length} unlocked</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          return (
            <div
              key={a.id}
              className={`flex items-center gap-4 rounded-xl border p-5 transition ${
                isUnlocked
                  ? 'border-white/40 bg-white/10'
                  : 'border-white/10 bg-white/[0.02] opacity-50'
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                  isUnlocked ? 'bg-white/25 text-white' : 'bg-white/5 text-white/40'
                }`}
              >
                {a.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-white/60'}`}>
                  {a.name}
                </div>
                <div className="mt-0.5 text-xs text-white/50">{a.desc}</div>
              </div>
              {isUnlocked && (
                <span className="text-xs font-mono text-white">UNLOCKED</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
