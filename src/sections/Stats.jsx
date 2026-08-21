import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { watchedPct } from '../lib/episodes.js';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Stats() {
  const { stats, watchedMap } = usePlayer();

  const rows = [
    { label: 'Current show',    value: stats.currentShow },
    { label: 'Position',        value: stats.position },
    { label: 'Watched',         value: stats.watchedAll },
    { label: 'Total episodes',  value: stats.totalAll },
    { label: 'Session',         value: stats.sessionWatched },
    { label: 'Completion',      value: `${stats.completionPct}%` },
    { label: 'Themes tried',    value: stats.themesTried },
    { label: 'Servers tried',   value: stats.serversTried },
    { label: 'Shows visited',   value: stats.showsVisited },
    { label: 'Achievements',    value: `${stats.achievements}/8` }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Stats</h2>
        <p className="mt-1 text-white/60">All progress saved to localStorage.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Overall completion</div>
        <ProgressBar value={parseFloat(stats.completionPct)} />
        <div className="mt-2 text-xs text-white/50">{stats.watchedAll} / {stats.totalAll} episodes</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <span className="text-sm text-white/60">{r.label}</span>
            <span className="font-mono text-sm text-white">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Per-show progress</div>
        <div className="space-y-3">
          {SHOWS.map(s => {
            const watched = watchedMap[s.id] ?? [];
            const pct = watchedPct(watched, s);
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-xs text-white/70">{s.shortName}</div>
                <ProgressBar value={pct} className="flex-1" />
                <div className="w-16 shrink-0 text-right font-mono text-xs text-white/50">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
