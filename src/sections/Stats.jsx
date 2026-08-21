import { useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { watchedPct, totalEpisodes, displaySeasonNumber } from '../lib/episodes.js';
import { getWatchTime } from '../lib/storage.js';
import ProgressBar from '../components/ProgressBar.jsx';

function MiniBar({ values, maxVal, height = 32, color = 'bg-white/70' }) {
  const mx = Math.max(maxVal, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm transition-all ${color}`}
          style={{ height: `${Math.max(2, (v / mx) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function Stats() {
  const { stats, watchedMap } = usePlayer();
  const wt = getWatchTime();

  // Watch time graph — last 30 days
  const dailyActivity = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const entry = wt.sessions.find(s => s.date === d);
      days.push({ date: d, ms: entry ? entry.ms : 0 });
    }
    return days;
  }, [wt.sessions]);

  const maxDailyMs = Math.max(...dailyActivity.map(d => d.ms), 1);
  const weeklyActivity = useMemo(() => {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      let total = 0;
      for (let d = 6; d >= 0; d--) {
        const date = new Date(Date.now() - (w * 7 + d) * 86400000).toISOString().slice(0, 10);
        const entry = wt.sessions.find(s => s.date === date);
        total += entry ? entry.ms : 0;
      }
      weeks.push(total);
    }
    return weeks;
  }, [wt.sessions]);

  // Most watched show
  const mostWatchedShow = useMemo(() => {
    let best = null, bestCount = 0;
    for (const s of SHOWS) {
      const c = (watchedMap[s.id] ?? []).length;
      if (c > bestCount) { best = s; bestCount = c; }
    }
    return best;
  }, [watchedMap]);

  // Shows completed / in progress / unwatched
  const showStatuses = useMemo(() => {
    let completed = 0, inProgress = 0, unwatched = 0;
    for (const s of SHOWS) {
      const pct = watchedPct(watchedMap[s.id] ?? [], s);
      if (pct === 100) completed++;
      else if (pct > 0) inProgress++;
      else unwatched++;
    }
    return { completed, inProgress, unwatched, total: SHOWS.length };
  }, [watchedMap]);

  // Personal records
  const records = useMemo(() => {
    const sessions = wt.sessions || [];
    const longestDay = sessions.reduce((best, s) => s.ms > (best?.ms || 0) ? s : best, null);
    const totalDays = sessions.filter(s => s.ms > 0).length;
    const avgPerDay = totalDays > 0 ? wt.totalMs / totalDays : 0;
    return {
      longestDay: longestDay ? { date: longestDay.date, mins: Math.round(longestDay.ms / 60000) } : null,
      totalDays,
      avgMinsPerDay: Math.round(avgPerDay / 60000),
      totalHours: (wt.totalMs / 3600000).toFixed(1),
    };
  }, [wt]);

  const gridRows = [
    { label: 'Current show',    value: stats.currentShow },
    { label: 'Position',        value: stats.position },
    { label: 'Episodes watched', value: stats.watchedAll },
    { label: 'Total episodes',  value: stats.totalAll },
    { label: 'Session',         value: stats.sessionWatched },
    { label: 'Completion',      value: `${stats.completionPct}%` },
    { label: 'Watch time',      value: `${records.totalHours}h` },
    { label: 'Active days',     value: records.totalDays },
    { label: 'Avg/day',         value: `${records.avgMinsPerDay}m` },
    { label: 'Streak',          value: `${stats.streak}d` },
    { label: 'Themes tried',    value: stats.themesTried },
    { label: 'Servers tried',   value: stats.serversTried },
    { label: 'Shows visited',   value: stats.showsVisited },
    { label: 'Favorites',       value: stats.favoritesCount },
    { label: 'Collections',     value: stats.collectionsCount },
    { label: 'Adventures',      value: stats.adventuresCount },
    { label: 'Achievements',    value: `${stats.achievements}/${useMemo(() => {
      try { return require('../data/achievements.js').ACHIEVEMENTS.length; } catch { return 0; }
    }, [])}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Stats</h2>
        <p className="mt-1 text-white/60">All progress saved to localStorage.</p>
      </div>

      {/* Overall completion */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Overall completion</div>
        <ProgressBar value={parseFloat(stats.completionPct)} />
        <div className="mt-2 text-xs text-white/50">{stats.watchedAll} / {stats.totalAll} episodes</div>
      </div>

      {/* Watch time — 30 day graph */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-white">Daily activity</div>
          <div className="text-xs text-white/40">Last 30 days · {records.totalHours}h total</div>
        </div>
        <MiniBar values={dailyActivity.map(d => d.ms)} maxVal={maxDailyMs} height={48} />
        <div className="mt-2 flex justify-between text-[10px] font-mono text-white/30">
          <span>{dailyActivity[0]?.date.slice(5)}</span>
          <span>{dailyActivity[14]?.date.slice(5)}</span>
          <span>{dailyActivity[29]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Weekly bars */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Weekly activity</div>
        <MiniBar values={weeklyActivity} maxVal={Math.max(...weeklyActivity, 1)} height={32} color="bg-white/50" />
        <div className="mt-2 flex justify-between text-[10px] font-mono text-white/30">
          {weeklyActivity.map((w, i) => <span key={i}>{Math.round(w / 3600000)}h</span>)}
        </div>
      </div>

      {/* Personal records */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Personal records</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-white/50">Longest session</div>
            <div className="mt-1 font-mono text-lg text-white">{records.longestDay ? `${records.longestDay.mins}m` : '--'}</div>
            {records.longestDay && <div className="text-[10px] text-white/30">{records.longestDay.date}</div>}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-white/50">Current streak</div>
            <div className="mt-1 font-mono text-lg text-white">{stats.streak}d</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-white/50">Most watched</div>
            <div className="mt-1 text-sm font-medium text-white">{mostWatchedShow?.shortName || '--'}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="text-xs text-white/50">Active days</div>
            <div className="mt-1 font-mono text-lg text-white">{records.totalDays}</div>
          </div>
        </div>
      </div>

      {/* Show status summary */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Library status</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="font-mono text-2xl text-white">{showStatuses.completed}</div>
            <div className="text-xs text-white/50">Completed</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl text-white">{showStatuses.inProgress}</div>
            <div className="text-xs text-white/50">In progress</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl text-white">{showStatuses.unwatched}</div>
            <div className="text-xs text-white/50">Unwatched</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {gridRows.map(r => (
          <div key={r.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <span className="text-sm text-white/60">{r.label}</span>
            <span className="font-mono text-sm text-white">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Per-show progress */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Per-show progress</div>
        <div className="space-y-3">
          {SHOWS.map(s => {
            const watched = watchedMap[s.id] ?? [];
            const pct = watchedPct(watched, s);
            return (
              <div key={s.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-white/70">{s.shortName}</span>
                  <span className="font-mono text-white/50">{watched.length}/{totalEpisodes(s)} · {pct}%</span>
                </div>
                <ProgressBar value={pct} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}