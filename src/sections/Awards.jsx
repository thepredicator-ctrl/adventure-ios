import { useMemo, useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../data/achievements.js';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Awards() {
  const { unlocked, stats } = usePlayer();
  const [catFilter, setCatFilter] = useState('all');
  const [showHidden, setShowHidden] = useState(false);

  const filtered = useMemo(() => {
    let list = ACHIEVEMENTS;
    if (catFilter !== 'all') list = list.filter(a => a.cat === catFilter);
    if (!showHidden) list = list.filter(a => !a.hidden);
    return list;
  }, [catFilter, showHidden]);

  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked.length / total) * 100);
  const cats = ['all', ...Object.keys(ACHIEVEMENT_CATEGORIES)];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Awards</h2>
        <p className="mt-1 text-white/60">{unlocked.length} / {total} unlocked · {pct}%</p>
      </div>

      {/* Overall progress */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-white">Completion</div>
          <div className="font-mono text-xs text-white/50">{pct}%</div>
        </div>
        <ProgressBar value={pct} />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-mono uppercase transition ${
              catFilter === c ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
            }`}
          >
            {c === 'all' ? 'ALL' : ACHIEVEMENT_CATEGORIES[c]?.label || c}
          </button>
        ))}
        <button
          onClick={() => setShowHidden(!showHidden)}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-mono transition ${
            showHidden ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
          }`}
        >
          {showHidden ? 'HIDE CLASSIFIED' : 'SHOW CLASSIFIED'}
        </button>
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          const progress = a.progress ? a.progress({
            totalWatched: stats.watchedAll || 0,
            seasonsCompleted: 0,
            showsCompleted: 0,
            completionPct: parseFloat(stats.completionPct) || 0,
            watchHours: parseFloat(stats.watchHours) || 0,
            nightOwl: false,
            earlyBird: false,
            streak: stats.streak || 0,
            serversTried: stats.serversTried || 0,
            themesTried: stats.themesTried || 0,
            adventuresGenerated: stats.adventuresCount || 0,
            favoriteCount: stats.favoritesCount || 0,
            collectionCount: stats.collectionsCount || 0,
            speedAbove2x: false,
            hiddenFound: false,
          }) : (isUnlocked ? 1 : 0);
          const maxProgress = a.progress ? (a.id.startsWith('binge_') ? (a.id === 'binge_500' ? 500 : a.id === 'binge_200' ? 200 : a.id === 'binge_100' ? 100 : a.id === 'binge_50' ? 50 : a.id === 'binge_25' ? 25 : 10) : 1) : 1;

          return (
            <div
              key={a.id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                isUnlocked
                  ? 'border-white/40 bg-white/10'
                  : a.hidden
                  ? 'border-white/5 bg-white/[0.01] opacity-40'
                  : 'border-white/10 bg-white/[0.02] opacity-60'
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                  isUnlocked ? 'bg-white/25 text-white' : 'bg-white/5 text-white/40'
                }`}
              >
                {a.hidden && !isUnlocked ? '??' : a.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-white/60'}`}>
                  {a.hidden && !isUnlocked ? 'CLASSIFIED' : a.name}
                </div>
                <div className="mt-0.5 text-xs text-white/50">{a.hidden && !isUnlocked ? '???' : a.desc}</div>
                {!isUnlocked && !a.hidden && maxProgress > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={(progress / maxProgress) * 100} className="flex-1" />
                    <span className="font-mono text-[10px] text-white/40">{progress}/{maxProgress}</span>
                  </div>
                )}
              </div>
              {isUnlocked && <span className="text-xs font-mono text-white">UNLOCKED</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
