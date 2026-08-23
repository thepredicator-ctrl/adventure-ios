import { useMemo, useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { watchedPct, totalEpisodes } from '../lib/episodes.js';
import { getWatchTime, lsGet } from '../lib/storage.js';
import ProgressBar from '../components/ProgressBar.jsx';

const TABS = ['Overview', 'Watch Time', 'Favorites', 'Records'];

function MiniBar({ values, maxVal, height = 40, color = 'bg-white/70' }) {
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

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-xs text-white/40">{label}</div>
      <div className="mt-1 font-mono text-sm text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-white/30">{sub}</div>}
    </div>
  );
}

function SectionCard({ title, children, right }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-white">{title}</div>
        {right && <div className="text-xs text-white/40">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export default function Stats() {
  const { stats, watchedMap } = usePlayer();
  const wt = getWatchTime();
  const sessionLog = lsGet('sessionLog', []);
  const [tab, setTab] = useState('Overview');

  // ── Computed: time period totals ──
  const msThisWeek = useMemo(() => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const entry = wt.sessions.find(s => s.date === d);
      if (entry) total += entry.ms;
    }
    return total;
  }, [wt.sessions]);

  const msLastWeek = useMemo(() => {
    let total = 0;
    for (let i = 7; i < 14; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const entry = wt.sessions.find(s => s.date === d);
      if (entry) total += entry.ms;
    }
    return total;
  }, [wt.sessions]);

  const msThisMonth = useMemo(() => {
    let total = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const entry = wt.sessions.find(s => s.date === d);
      if (entry) total += entry.ms;
    }
    return total;
  }, [wt.sessions]);

  const msLastMonth = useMemo(() => {
    let total = 0;
    for (let i = 30; i < 60; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const entry = wt.sessions.find(s => s.date === d);
      if (entry) total += entry.ms;
    }
    return total;
  }, [wt.sessions]);

  const msThisYear = useMemo(() => {
    let total = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const entry = wt.sessions.find(s => s.date === d);
      if (entry) total += entry.ms;
    }
    return total;
  }, [wt.sessions]);

  const totalHours = (wt.totalMs / 3600000).toFixed(1);

  const weekPctChange = useMemo(() => {
    if (msLastWeek === 0) return msThisWeek > 0 ? 100 : 0;
    return Math.round(((msThisWeek - msLastWeek) / msLastWeek) * 100);
  }, [msThisWeek, msLastWeek]);

  const monthPctChange = useMemo(() => {
    if (msLastMonth === 0) return msThisMonth > 0 ? 100 : 0;
    return Math.round(((msThisMonth - msLastMonth) / msLastMonth) * 100);
  }, [msThisMonth, msLastMonth]);

  // ── Computed: daily activity (30 days) ──
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

  // ── Computed: hour-of-day distribution (0-23) ──
  const hourDistribution = useMemo(() => {
    const hours = new Array(24).fill(0);
    for (const entry of sessionLog) {
      if (entry.ts) {
        const h = new Date(entry.ts).getHours();
        hours[h]++;
      }
    }
    return hours;
  }, [sessionLog]);

  const maxHour = Math.max(...hourDistribution, 1);

  // ── Computed: day-of-week distribution (Mon-Sun) ──
  const dayDistribution = useMemo(() => {
    const days = new Array(7).fill(0);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const session of wt.sessions) {
      if (session.ms > 0 && session.date) {
        const dow = new Date(session.date + 'T12:00:00').getDay();
        days[dow]++;
      }
    }
    return { values: days, names: dayNames };
  }, [wt.sessions]);

  const maxDay = Math.max(...dayDistribution.values, 1);

  // ── Computed: show statuses ──
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

  // ── Computed: most watched show ──
  const mostWatchedShow = useMemo(() => {
    let best = null, bestCount = 0;
    for (const s of SHOWS) {
      const c = (watchedMap[s.id] ?? []).length;
      if (c > bestCount) { best = s; bestCount = c; }
    }
    return best;
  }, [watchedMap]);

  // ── Computed: most watched season ──
  const mostWatchedSeason = useMemo(() => {
    let bestShow = null, bestSeasonIdx = 0, bestCount = 0;
    for (const s of SHOWS) {
      const watched = watchedMap[s.id] ?? [];
      for (let si = 0; si < s.seasons.length; si++) {
        let count = 0;
        for (let e = 1; e <= s.seasons[si]; e++) {
          if (watched.includes(`S${si + 1}E${e}`)) count++;
        }
        if (count > bestCount) { bestShow = s; bestSeasonIdx = si + 1; bestCount = count; }
      }
    }
    return bestShow ? { show: bestShow.shortName, season: bestSeasonIdx, count: bestCount } : null;
  }, [watchedMap]);

  // ── Computed: most watched episode (most recent favorite or most rewatched) ──
  const favoriteEpisode = useMemo(() => {
    const favs = lsGet('favorites', []);
    if (favs.length > 0) {
      const last = favs[favs.length - 1];
      const parts = last.split(':S');
      const showId = parts[0];
      const epParts = parts[1].split(':E');
      const s = SHOWS.find(x => x.id === showId);
      return s ? { show: s.shortName, season: Number(epParts[0]), episode: Number(epParts[1]) } : null;
    }
    return null;
  }, []);

  // ── Computed: longest session (from sessionLog) ──
  const longestSession = useMemo(() => {
    const watchEntries = sessionLog.filter(e => e.action === 'watch');
    if (watchEntries.length < 2) return null;
    let maxMs = 0;
    let maxEntry = null;
    for (let i = 1; i < watchEntries.length; i++) {
      const diff = watchEntries[i].ts - watchEntries[i - 1].ts;
      if (diff > maxMs && diff < 14400000) {
        maxMs = diff;
        maxEntry = watchEntries[i];
      }
    }
    return maxEntry ? { ...maxEntry, durationMs: maxMs } : null;
  }, [sessionLog]);

  // ── Computed: most episodes in one session (from sessionLog) ──
  const mostEpInSession = useMemo(() => {
    if (sessionLog.length === 0) return 0;
    const watchEntries = sessionLog.filter(e => e.action === 'watch');
    if (watchEntries.length === 0) return 0;
    let maxStreak = 1, current = 1;
    for (let i = 1; i < watchEntries.length; i++) {
      const gap = watchEntries[i].ts - watchEntries[i - 1].ts;
      if (gap < 3600000) {
        current++;
        if (current > maxStreak) maxStreak = current;
      } else {
        current = 1;
      }
    }
    return maxStreak;
  }, [sessionLog]);

  // ── Computed: average episode length (estimated 22min from context) ──
  const avgEpLength = useMemo(() => {
    const totalEps = SHOWS.reduce((sum, s) => sum + totalEpisodes(s), 0);
    const totalMs = wt.totalMs || 0;
    const totalWatched = Object.values(watchedMap).reduce((s, a) => s + a.length, 0);
    if (totalWatched === 0) return 0;
    return Math.round(totalMs / totalWatched / 60000);
  }, [wt.totalMs, watchedMap]);

  // ── Computed: avg completion across shows ──
  const avgCompletion = useMemo(() => {
    if (SHOWS.length === 0) return 0;
    const total = SHOWS.reduce((sum, s) => sum + watchedPct(watchedMap[s.id] ?? [], s), 0);
    return Math.round(total / SHOWS.length);
  }, [watchedMap]);

  // ── Computed: active days, avg/day ──
  const activeDays = useMemo(() => wt.sessions.filter(s => s.ms > 0).length, [wt.sessions]);
  const avgPerDay = useMemo(() => {
    return activeDays > 0 ? Math.round(wt.totalMs / activeDays / 60000) : 0;
  }, [wt.totalMs, activeDays]);

  // ── Computed: streaks ──
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let d = 0; d < 365; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const entry = wt.sessions.find(s => s.date === date);
      if (entry && entry.ms > 0) streak++;
      else if (d > 0) break;
      else { streak = 0; break; }
    }
    return streak;
  }, [wt.sessions]);

  const longestStreak = useMemo(() => {
    const sorted = [...wt.sessions].filter(s => s.ms > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return 0;
    let max = 1, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date + 'T12:00:00');
      const curr = new Date(sorted[i].date + 'T12:00:00');
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) { current++; if (current > max) max = current; }
      else if (diffDays > 1) current = 1;
    }
    return max;
  }, [wt.sessions]);

  // ── Computed: monthly records ──
  const monthlyRecords = useMemo(() => {
    const monthMap = {};
    for (const session of wt.sessions) {
      if (!session.date || session.ms <= 0) continue;
      const key = session.date.slice(0, 7); // YYYY-MM
      if (!monthMap[key]) monthMap[key] = { ms: 0, days: 0, date: session.date };
      monthMap[key].ms += session.ms;
      monthMap[key].days++;
    }
    let bestMonth = null, bestMs = 0;
    for (const [key, val] of Object.entries(monthMap)) {
      if (val.ms > bestMs) { bestMs = val.ms; bestMonth = { month: key, ...val }; }
    }
    return bestMonth
      ? { ...bestMonth, hours: (bestMonth.ms / 3600000).toFixed(1), episodes: Math.round(bestMonth.ms / (22 * 60000)) }
      : null;
  }, [wt.sessions]);

  // ── Computed: yearly records ──
  const yearlyRecords = useMemo(() => {
    const yearMap = {};
    for (const session of wt.sessions) {
      if (!session.date || session.ms <= 0) continue;
      const key = session.date.slice(0, 4);
      if (!yearMap[key]) yearMap[key] = { ms: 0, days: 0 };
      yearMap[key].ms += session.ms;
      yearMap[key].days++;
    }
    let bestYear = null, bestMs = 0;
    for (const [key, val] of Object.entries(yearMap)) {
      if (val.ms > bestMs) { bestMs = val.ms; bestYear = { year: key, ...val }; }
    }
    return bestYear
      ? { ...bestYear, hours: (bestYear.ms / 3600000).toFixed(1), episodes: Math.round(bestYear.ms / (22 * 60000)) }
      : null;
  }, [wt.sessions]);

  // ── Computed: viewing profile (6 axes) ──
  const viewingProfile = useMemo(() => {
    const totalWatched = stats.watchedAll || 0;
    // Binge tendency: ratio of max day watch time to average
    const maxDayMs = Math.max(...wt.sessions.map(s => s.ms), 0);
    const avgDayMs = activeDays > 0 ? wt.totalMs / activeDays : 0;
    const bingeTendency = avgDayMs > 0 ? Math.min(100, Math.round((maxDayMs / avgDayMs / 3) * 100)) : 0;
    // Genre diversity: how many shows watched at least 1 ep
    const showsStarted = SHOWS.filter(s => (watchedMap[s.id] ?? []).length > 0).length;
    const genreDiversity = SHOWS.length > 0 ? Math.round((showsStarted / SHOWS.length) * 100) : 0;
    // Consistency: streak vs total days
    const consistency = activeDays > 0 ? Math.min(100, Math.round((currentStreak / Math.min(activeDays, 30)) * 100)) : 0;
    // Completion rate
    const completionRate = parseFloat(stats.completionPct) || 0;
    // Exploration: shows visited / total shows
    const exploration = SHOWS.length > 0 ? Math.round((stats.showsVisited / SHOWS.length) * 100) : 0;
    // Social: favorites + collections + adventures normalized
    const social = Math.min(100, Math.round(((stats.favoritesCount || 0) + (stats.collectionsCount || 0) + (stats.adventuresCount || 0)) / 3));
    return [
      { label: 'Binge Tendency', value: bingeTendency },
      { label: 'Genre Diversity', value: genreDiversity },
      { label: 'Consistency', value: consistency },
      { label: 'Completion Rate', value: completionRate },
      { label: 'Exploration', value: exploration },
      { label: 'Social', value: social },
    ];
  }, [stats, wt.sessions, wt.totalMs, activeDays, currentStreak, watchedMap]);

  // ── Overview tab stat cards ──
  const overviewCards = useMemo(() => [
    { label: 'Current show', value: stats.currentShow },
    { label: 'Position', value: stats.position },
    { label: 'Episodes watched', value: stats.watchedAll },
    { label: 'Total episodes', value: stats.totalAll },
    { label: 'Session watched', value: stats.sessionWatched },
    { label: 'Completion %', value: `${stats.completionPct}%` },
    { label: 'Watch time', value: `${totalHours}h` },
    { label: 'Active days', value: activeDays },
    { label: 'Avg/day', value: `${avgPerDay}m` },
    { label: 'Streak', value: `${currentStreak}d` },
    { label: 'Longest streak', value: `${longestStreak}d` },
    { label: 'Themes tried', value: stats.themesTried },
    { label: 'Servers tried', value: stats.serversTried },
    { label: 'Shows visited', value: stats.showsVisited },
    { label: 'Favorites', value: stats.favoritesCount },
    { label: 'Collections', value: stats.collectionsCount },
    { label: 'Adventures', value: stats.adventuresCount },
    { label: 'Achievements', value: `${stats.achievements}` },
  ], [stats, totalHours, activeDays, avgPerDay, currentStreak, longestStreak]);

  // ── Most watched character (simulated from show) ──
  const mostWatchedCharacter = useMemo(() => {
    if (!mostWatchedShow) return '--';
    const charMap = {
      'Adventure Time': 'Finn the Human',
      'Regular Show': 'Mordecai',
      'Gumball': 'Gumball Watterson',
      'Steven Universe': 'Steven Universe',
      'Dexter': 'Dexter',
      'Courage': 'Courage',
      ' Samurai Jack': 'Samurai Jack',
      'Ed Edd n Eddy': 'Ed',
      'Powerpuff Girls': 'Blossom',
      'Foster\'s': 'Bloo',
      'Billy and Mandy': 'Grim',
      'Johnny Bravo': 'Johnny Bravo',
      'Dexter 2': 'Mandark',
      'Flapjack': 'Flapjack',
      'Chowder': 'Chowder',
      'Kids Next Door': 'Numbuh 1',
      'Ben 10': 'Ben Tennyson',
      'Teen Titans': 'Robin',
      'Avatar': 'Aang',
      'Code Lyoko': 'Ulrich',
      'Totally Spies': 'Sam',
      'Kim Possible': 'Kim Possible',
      'MLP': 'Twilight Sparkle',
      'SpongeBob': 'SpongeBob',
      'Fairly OddParents': 'Timmy Turner',
      'Danny Phantom': 'Danny Phantom',
      'Jimmy Neutron': 'Jimmy Neutron',
      'Rugrats': 'Tommy Pickles',
      'Hey Arnold': 'Arnold',
      'Rocko': 'Rocko',
      'Doug': 'Doug Funnie',
      'CatDog': 'CatDog',
      'Angry Beavers': 'Daggett',
      'Ren and Stimpy': 'Ren',
      'Invader Zim': 'Zim',
      'Teen Titans 2': 'Raven',
    };
    return charMap[mostWatchedShow.shortName] || mostWatchedShow.shortName;
  }, [mostWatchedShow]);

  const PctArrow = ({ pct }) => {
    if (pct === 0) return null;
    const up = pct > 0;
    return (
      <span className={`text-xs font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '▲' : '▼'} {Math.abs(pct)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Stats</h2>
        <p className="mt-1 text-white/60">All progress saved to localStorage.</p>
      </div>

      {/* Header card: total watch time + comparisons */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs text-white/40 uppercase tracking-wider">Total Watch Time</div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-mono text-4xl font-bold text-white">{totalHours}</span>
          <span className="text-lg text-white/40">hours</span>
        </div>
        <div className="mt-3 flex gap-6">
          <div>
            <div className="text-[10px] text-white/30 uppercase">vs last week</div>
            <PctArrow pct={weekPctChange} />
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase">vs last month</div>
            <PctArrow pct={monthPctChange} />
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase">active days</div>
            <span className="text-sm font-mono text-white">{activeDays}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors ${
              tab === t
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:bg-white/5 hover:text-white/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB: Overview ═══════════════ */}
      {tab === 'Overview' && (
        <div className="space-y-5">
          {/* Stat cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {overviewCards.map(r => (
              <StatCard key={r.label} label={r.label} value={r.value} />
            ))}
          </div>

          {/* Overall completion */}
          <SectionCard title="Overall completion">
            <ProgressBar value={parseFloat(stats.completionPct)} />
            <div className="mt-2 text-xs text-white/50">
              {stats.watchedAll} / {stats.totalAll} episodes
            </div>
          </SectionCard>

          {/* Library status */}
          <SectionCard title="Library status">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="font-mono text-2xl text-white">{showStatuses.completed}</div>
                <div className="text-xs text-white/50">Completed</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl text-white">{showStatuses.inProgress}</div>
                <div className="text-xs text-white/50">In Progress</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl text-white">{showStatuses.unwatched}</div>
                <div className="text-xs text-white/50">Unwatched</div>
              </div>
            </div>
          </SectionCard>

          {/* Per-show progress */}
          <SectionCard title="Per-show progress">
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
          </SectionCard>
        </div>
      )}

      {/* ═══════════════ TAB: Watch Time ═══════════════ */}
      {tab === 'Watch Time' && (
        <div className="space-y-5">
          {/* Time period cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total" value={`${totalHours}h`} />
            <StatCard label="This week" value={`${(msThisWeek / 3600000).toFixed(1)}h`} />
            <StatCard label="This month" value={`${(msThisMonth / 3600000).toFixed(1)}h`} />
            <StatCard label="This year" value={`${(msThisYear / 3600000).toFixed(1)}h`} />
          </div>

          {/* Daily graph: last 30 days */}
          <SectionCard title="Daily activity" right="Last 30 days">
            <MiniBar values={dailyActivity.map(d => d.ms)} maxVal={maxDailyMs} height={56} />
            <div className="mt-2 flex justify-between text-[10px] font-mono text-white/30">
              <span>{dailyActivity[0]?.date.slice(5)}</span>
              <span>{dailyActivity[14]?.date.slice(5)}</span>
              <span>{dailyActivity[29]?.date.slice(5)}</span>
            </div>
          </SectionCard>

          {/* Hour-of-day graph */}
          <SectionCard title="Watch time by hour" right="0-23h">
            <MiniBar values={hourDistribution} maxVal={maxHour} height={64} color="bg-white/50" />
            <div className="mt-2 flex justify-between text-[10px] font-mono text-white/30">
              <span>0</span>
              <span>6</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
            <div className="mt-2 text-xs text-white/40">
              Peak hour: <span className="font-mono text-white">{hourDistribution.reduce((bestIdx, v, i, arr) => v > arr[bestIdx] ? i : bestIdx, 0)}:00</span>
            </div>
          </SectionCard>

          {/* Day-of-week graph */}
          <SectionCard title="Watch time by day" right="Mon-Sun">
            <div className="flex items-end gap-2" style={{ height: 64 }}>
              {[1, 2, 3, 4, 5, 6, 0].map(dow => (
                <div key={dow} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm bg-white/50 transition-all"
                    style={{ height: `${Math.max(2, (dayDistribution.values[dow] / maxDay) * 100)}%` }}
                  />
                  <span className="text-[9px] font-mono text-white/30">
                    {dayDistribution.names[dow]}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════ TAB: Favorites ═══════════════ */}
      {tab === 'Favorites' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Favorite show"
              value={mostWatchedShow?.shortName || '--'}
              sub={`${(watchedMap[mostWatchedShow?.id] ?? []).length} episodes`}
            />
            <StatCard
              label="Favorite season"
              value={mostWatchedSeason ? `${mostWatchedSeason.show} S${mostWatchedSeason.season}` : '--'}
              sub={mostWatchedSeason ? `${mostWatchedSeason.count} episodes` : null}
            />
            <StatCard
              label="Favorite episode"
              value={favoriteEpisode
                ? `${favoriteEpisode.show} S${favoriteEpisode.season}E${favoriteEpisode.episode}`
                : '--'}
              sub="Most recently favorited"
            />
            <StatCard
              label="Most watched character"
              value={mostWatchedCharacter}
              sub="Based on your top show"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Avg episode length"
              value={avgEpLength > 0 ? `${avgEpLength}m` : '--'}
              sub="Estimated from watch data"
            />
            <StatCard
              label="Avg completion"
              value={`${avgCompletion}%`}
              sub="Across all shows"
            />
            <StatCard
              label="Longest session"
              value={longestSession ? `${Math.round(longestSession.durationMs / 60000)}m` : '--'}
              sub={longestSession ? new Date(longestSession.ts).toLocaleString() : null}
            />
            <StatCard
              label="Most eps in one session"
              value={mostEpInSession > 0 ? mostEpInSession : '--'}
              sub="Consecutive episodes"
            />
          </div>

          <SectionCard title="Most rewatched episode">
            <div className="text-center py-4">
              <div className="text-xs text-white/40">Calculated from rewatch data</div>
              <div className="mt-2 font-mono text-lg text-white">
                {(() => {
                  const heat = lsGet('rewatchHeatmap', {});
                  const epCounts = {};
                  for (const entries of Object.values(heat)) {
                    for (const e of entries) {
                      const k = `${e.showId}:S${e.season}:E${e.episode}`;
                      epCounts[k] = (epCounts[k] || 0) + 1;
                    }
                  }
                  const sorted = Object.entries(epCounts).sort((a, b) => b[1] - a[1]);
                  if (sorted.length === 0) return 'No rewatches yet';
                  const [key, count] = sorted[0];
                  const parts = key.split(':S');
                  const showId = parts[0];
                  const epParts = parts[1].split(':E');
                  const s = SHOWS.find(x => x.id === showId);
                  return `${s?.shortName || showId} S${epParts[0]}E${epParts[1]} (${count}x)`;
                })()}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════ TAB: Records ═══════════════ */}
      {tab === 'Records' && (
        <div className="space-y-5">
          {/* Streaks */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Current streak" value={`${currentStreak}d`} sub="Consecutive days" />
            <StatCard label="Longest streak" value={`${longestStreak}d`} sub="All time" />
          </div>

          {/* Monthly records */}
          <SectionCard title="Best month">
            {monthlyRecords ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="font-mono text-lg text-white">{monthlyRecords.month}</div>
                  <div className="text-xs text-white/50">Month</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg text-white">~{monthlyRecords.episodes}</div>
                  <div className="text-xs text-white/50">Episodes</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg text-white">{monthlyRecords.hours}h</div>
                  <div className="text-xs text-white/50">Hours</div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-white/30">No data yet</div>
            )}
          </SectionCard>

          {/* Yearly records */}
          <SectionCard title="Best year">
            {yearlyRecords ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="font-mono text-lg text-white">{yearlyRecords.year}</div>
                  <div className="text-xs text-white/50">Year</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg text-white">~{yearlyRecords.episodes}</div>
                  <div className="text-xs text-white/50">Episodes</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg text-white">{yearlyRecords.hours}h</div>
                  <div className="text-xs text-white/50">Hours</div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-white/30">No data yet</div>
            )}
          </SectionCard>

          {/* Viewing profile */}
          <SectionCard title="Personal viewing profile">
            <div className="space-y-4">
              {viewingProfile.map(axis => (
                <div key={axis.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-white/60">{axis.label}</span>
                    <span className="font-mono text-white/50">{axis.value}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-white/40 to-white/80 transition-all duration-500"
                      style={{ width: `${axis.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Additional record cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total sessions logged"
              value={sessionLog.length}
              sub="All time entries"
            />
            <StatCard
              label="Longest day"
              value={(() => {
                const longest = wt.sessions.reduce((best, s) => s.ms > (best?.ms || 0) ? s : best, null);
                return longest ? `${Math.round(longest.ms / 60000)}m` : '--';
              })()}
              sub={(() => {
                const longest = wt.sessions.reduce((best, s) => s.ms > (best?.ms || 0) ? s : best, null);
                return longest?.date || null;
              })()}
            />
          </div>
        </div>
      )}
    </div>
  );
}