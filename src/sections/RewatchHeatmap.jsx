import { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { lsGet } from '../lib/storage.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CELL = 12;
const GAP = 3;
const LEVEL_COLORS = ['bg-white/[0.03]', 'bg-green-900/60', 'bg-green-700/70', 'bg-green-500/80', 'bg-green-400'];
const LEVEL_LABELS = ['None', '1–2 eps', '3–5 eps', '6+ eps'];

export default function RewatchHeatmap() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);

  const activityMap = useMemo(() => {
    const map = {};
    const heat = lsGet('rewatchHeatmap', {});
    for (const [date, entries] of Object.entries(heat)) {
      if (!date.startsWith(String(year))) continue;
      map[date] = (map[date] || 0) + entries.length;
    }
    const wt = lsGet('watchTime', { sessions: [] });
    for (const s of wt.sessions) {
      if (!s.date.startsWith(String(year))) continue;
      map[s.date] = Math.max(map[s.date] || 0, Math.round((s.ms || 0) / (22 * 60 * 1000)));
    }
    return map;
  }, [year]);

  const grid = useMemo(() => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const dayOfWeek = start.getDay();
    const cells = [];
    let d = new Date(start);
    d.setDate(d.getDate() - dayOfWeek);
    while (d <= end || d.getDay() !== 0) {
      const ds = d.toISOString().slice(0, 10);
      const inYear = d.getFullYear() === year;
      cells.push({ date: ds, count: activityMap[ds] || 0, inYear });
      d.setDate(d.getDate() + 1);
      if (d.getFullYear() > year + 1) break;
    }
    return cells;
  }, [year, activityMap]);

  const getLevel = (c) => { if (c === 0) return 0; if (c <= 2) return 1; if (c <= 5) return 2; return 3; };

  const monthPositions = useMemo(() => {
    const pos = [];
    let last = -1;
    grid.forEach((cell, i) => {
      if (!cell.inYear) return;
      const m = parseInt(cell.date.slice(5, 7)) - 1;
      if (m !== last) { pos.push({ month: m, col: Math.floor(i / 7) }); last = m; }
    });
    return pos;
  }, [grid]);

  const stats = useMemo(() => {
    const days = Object.entries(activityMap).filter(([, c]) => c > 0);
    const totalDays = days.length;
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if ((activityMap[key] || 0) > 0) currentStreak++;
      else if (i > 0) break;
    }
    let longestStreak = 0, streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if ((activityMap[key] || 0) > 0) { streak++; longestStreak = Math.max(longestStreak, streak); } else streak = 0;
    }
    const dowCounts = [0,0,0,0,0,0,0];
    const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    days.forEach(([date]) => { dowCounts[new Date(date + 'T12:00:00').getDay()] += activityMap[date]; });
    const bestDow = dowNames[dowCounts.indexOf(Math.max(...dowCounts))];
    const monthCounts = new Array(12).fill(0);
    days.forEach(([date, count]) => { monthCounts[parseInt(date.slice(5, 7)) - 1] += count; });
    const bestMonth = MONTHS[monthCounts.indexOf(Math.max(...monthCounts))];
    return { totalDays, currentStreak, longestStreak, bestDow, bestMonth, totalEps: days.reduce((a, [, c]) => a + c, 0) };
  }, [activityMap]);

  const monthDetail = useMemo(() => {
    if (selectedMonth === null) return null;
    const dim = new Date(year, selectedMonth + 1, 0).getDate();
    const data = []; let max = 0;
    for (let d = 1; d <= dim; d++) {
      const key = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const c = activityMap[key] || 0; max = Math.max(max, c); data.push({ day: d, count: c });
    }
    return { name: MONTHS[selectedMonth], data, maxCount: max };
  }, [selectedMonth, year, activityMap]);

  const years = [2024, 2025, 2026].filter(y => y <= new Date().getFullYear() + 1);

  const monthTotal = monthDetail ? monthDetail.data.reduce((a, d) => a + d.count, 0) : 0;
  const monthHours = ((monthTotal * 22) / 60).toFixed(1);
  const activeDays = monthDetail ? monthDetail.data.filter(d => d.count > 0).length : 0;

  // Day-of-week breakdown
  const dowBreakdown = useMemo(() => {
    const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const totals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);
    for (const [date, count] of Object.entries(activityMap)) {
      if (count <= 0) continue;
      const dow = new Date(date + 'T12:00:00').getDay();
      totals[dow] += count;
      dayCounts[dow]++;
    }
    return dowNames.map((name, i) => ({ name, eps: totals[i], days: dayCounts[i], avg: dayCounts[i] > 0 ? (totals[i] / dayCounts[i]).toFixed(1) : '0' }));
  }, [activityMap]);

  // Per-month overview bars
  const monthlyOverview = useMemo(() => {
    return MONTHS.map((name, m) => {
      let total = 0;
      const dim = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        total += activityMap[key] || 0;
      }
      return { name, total };
    });
  }, [year, activityMap]);
  const maxMonthTotal = Math.max(...monthlyOverview.map(m => m.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Rewatch Heatmap</h2>
        <p className="mt-1 text-white/60">Your viewing activity over the year, day by day.</p>
      </div>

      {/* Year selector */}
      <div className="flex gap-2">
        {years.map(y => (
          <button key={y} onClick={() => { setYear(y); setSelectedMonth(null); }}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${year === y ? 'bg-white text-black font-medium' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {y}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Days Watched', value: stats.totalDays },
          { label: 'Total Episodes', value: stats.totalEps },
          { label: 'Current Streak', value: `${stats.currentStreak}d` },
          { label: 'Longest Streak', value: `${stats.longestStreak}d` },
          { label: 'Peak Day', value: stats.bestDow },
          { label: 'Peak Month', value: stats.bestMonth },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
            <div className="font-mono text-lg text-white">{s.value}</div>
            <div className="text-[10px] text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/40">Less</span>
        <div className="flex gap-1">
          {LEVEL_COLORS.map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} title={LEVEL_LABELS[i]} />
          ))}
        </div>
        <span className="text-xs text-white/40">More</span>
      </div>

      {/* Heatmap grid */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 overflow-x-auto">
        <div className="relative" style={{ height: 16, paddingLeft: 28 }}>
          {monthPositions.map((mp, i) => (
            <span key={i} className="absolute text-[10px] text-white/30 top-0" style={{ left: 28 + mp.col * (CELL + GAP) }}>{MONTHS[mp.month]}</span>
          ))}
        </div>
        <div className="flex">
          <div className="flex flex-col shrink-0" style={{ width: 24, gap: GAP }}>
            {DAYS.map((d, i) => (
              <div key={i} className="flex items-center" style={{ height: CELL }}>
                <span className="text-[10px] text-white/30 leading-none">{d}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col" style={{ gap: GAP }}>
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="flex" style={{ gap: GAP }}>
                {grid.filter((_, i) => i % 7 === row).map((cell, ci) => {
                  const level = getLevel(cell.count);
                  const ds = cell.date ? new Date(cell.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                  return (
                    <div key={ci}
                      className={`rounded-sm transition-colors cursor-pointer ${cell.inYear ? LEVEL_COLORS[level] : 'bg-transparent'}`}
                      style={{ width: CELL, height: CELL, opacity: cell.inYear ? 1 : 0 }}
                      title={cell.inYear ? `${ds}: ${cell.count} episode${cell.count !== 1 ? 's' : ''}` : ''}
                      onClick={() => { if (cell.inYear) setSelectedMonth(parseInt(cell.date.slice(5, 7)) - 1); }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly detail */}
      {monthDetail && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium text-white">{monthDetail.name} {year}</div>
            <button onClick={() => setSelectedMonth(null)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">✕ Close</button>
          </div>
          <div className="flex gap-4 mb-4 text-xs text-white/40">
            <span>{monthTotal} episodes</span>
            <span>{monthHours}h estimated</span>
            <span>{activeDays} active days</span>
          </div>
          <div className="flex items-end gap-[2px]" style={{ height: 80 }}>
            {monthDetail.data.map(d => {
              const h = monthDetail.maxCount > 0 ? Math.max(2, (d.count / monthDetail.maxCount) * 100) : 2;
              return (
                <div key={d.day} className="flex-1 rounded-t-sm bg-green-500/70 transition-all min-w-0" style={{ height: `${h}%` }}
                  title={`${monthDetail.name} ${d.day}: ${d.count} episode${d.count !== 1 ? 's' : ''}`} />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-mono text-white/30">
            <span>1</span>
            <span>{Math.ceil(monthDetail.data.length / 2)}</span>
            <span>{monthDetail.data.length}</span>
          </div>
        </div>
      )}

      {/* Day-of-week breakdown */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-medium text-white mb-3">Day-of-Week Breakdown</div>
        <div className="space-y-2">
          {dowBreakdown.map(d => {
            const maxEps = Math.max(...dowBreakdown.map(x => x.eps), 1);
            return (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-8 text-right shrink-0">{d.name}</span>
                <div className="flex-1 h-4 rounded-full bg-white/[0.03] overflow-hidden">
                  <div className="h-full rounded-full bg-green-500/60 transition-all" style={{ width: `${(d.eps / maxEps) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-white/60 w-16 text-right shrink-0">{d.eps} eps</span>
                <span className="text-[10px] text-white/30 w-16 text-right shrink-0">{d.days}d · {d.avg}/d</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly overview */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-medium text-white mb-3">Monthly Overview</div>
        <div className="flex items-end gap-2" style={{ height: 64 }}>
          {monthlyOverview.map(m => (
            <button key={m.name} onClick={() => setSelectedMonth(MONTHS.indexOf(m.name))}
              className="flex-1 flex flex-col items-center gap-1" title={`${m.name}: ${m.total} episodes`}>
              <div className="w-full rounded-t-sm transition-colors"
                style={{ height: `${Math.max(2, (m.total / maxMonthTotal) * 100)}%`, background: selectedMonth === MONTHS.indexOf(m.name) ? 'rgba(74,222,128,0.8)' : 'rgba(74,222,128,0.4)' }} />
              <span className="text-[10px] text-white/30">{m.name.slice(0, 1)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
