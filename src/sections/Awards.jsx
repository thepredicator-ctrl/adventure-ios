import { useMemo, useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_LEVELS, UNLOCKABLE_THEMES, UNLOCKABLE_TERMINAL_EFFECTS } from '../data/achievements.js';
import { lsGet } from '../lib/storage.js';
import ProgressBar from '../components/ProgressBar.jsx';

const TABS = ['Achievements', 'Progress', 'Unlockables', 'Leaderboard'];

const RARITIES = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const RARITY_COLORS = {
  common:   { bg: 'bg-white/10', text: 'text-white/60', border: 'border-white/20' },
  uncommon: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  rare:     { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  epic:     { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  legendary:{ bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  mythic:   { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

function getProgressMax(ach) {
  if (!ach.progress) return 1;
  if (ach.id.startsWith('binge_')) {
    const map = { binge_500: 500, binge_200: 200, binge_100: 100, binge_50: 50, binge_25: 25 };
    return map[ach.id] || 10;
  }
  if (ach.id.startsWith('ep_')) {
    const num = parseInt(ach.id.replace('ep_', ''), 10);
    if (!isNaN(num)) return num;
  }
  if (ach.id.startsWith('hour_')) {
    const num = parseInt(ach.id.replace('hour_', ''), 10);
    if (!isNaN(num)) return num;
  }
  if (ach.id.startsWith('streak_')) {
    const num = parseInt(ach.id.replace('streak_', ''), 10);
    if (!isNaN(num)) return num;
  }
  return 1;
}

function buildAchStats(stats) {
  return {
    totalWatched: stats.watchedAll || 0,
    seasonsCompleted: stats.seasonsCompleted || 0,
    showsCompleted: stats.showsCompleted || 0,
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
    sessionEpisodes: stats.sessionWatched || 0,
    speedAbove2x: false,
    hiddenFound: false,
  };
}

const SIMULATED_PLAYERS = [
  { name: 'xWatchr99',    xp: 12400, episodes: 680, streak: 45, achievements: 62, hours: 320 },
  { name: 'NostalgicKing', xp: 9800,  episodes: 540, streak: 30, achievements: 55, hours: 250 },
  { name: 'CartoonFan42', xp: 8200,  episodes: 420, streak: 22, achievements: 48, hours: 200 },
  { name: 'RetroVibes',   xp: 6500,  episodes: 350, streak: 18, achievements: 40, hours: 165 },
  { name: 'ToonMaster',   xp: 4900,  episodes: 280, streak: 14, achievements: 33, hours: 120 },
  { name: 'BingeBot',     xp: 3500,  episodes: 190, streak: 10, achievements: 26, hours: 85 },
  { name: 'PixelDust',    xp: 2200,  episodes: 120, streak: 7,  achievements: 19, hours: 55 },
  { name: 'ChannelSurfr', xp: 1200,  episodes: 65,  streak: 4,  achievements: 12, hours: 30 },
  { name: 'NewViewer',    xp: 400,   episodes: 20,  streak: 2,  achievements: 5,  hours: 10 },
  { name: 'JustJoined',   xp: 50,    episodes: 3,   streak: 1,  achievements: 1,  hours: 1 },
];

const LEADERBOARD_CATS = [
  { key: 'xp',         label: 'Total XP' },
  { key: 'episodes',   label: 'Episodes Watched' },
  { key: 'streak',     label: 'Longest Streak' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'hours',      label: 'Watch Time' },
];

export default function Awards() {
  const { unlocked, stats } = usePlayer();
  const [tab, setTab] = useState('Achievements');
  const [catFilter, setCatFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lbCat, setLbCat] = useState('xp');

  const achievementsMap = lsGet('achievements', {});

  // ── XP & Level ──
  const { totalXP, level, nextLevel, xpForNext, xpProgress } = useMemo(() => {
    let xp = 0;
    for (const ach of ACHIEVEMENTS) {
      if (unlocked.includes(ach.id)) xp += ach.xp || 0;
    }
    let currentLevel = ACHIEVEMENT_LEVELS[0];
    let nextLvl = ACHIEVEMENT_LEVELS[1] || null;
    for (let i = ACHIEVEMENT_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= ACHIEVEMENT_LEVELS[i].xpRequired) {
        currentLevel = ACHIEVEMENT_LEVELS[i];
        nextLvl = ACHIEVEMENT_LEVELS[i + 1] || null;
        break;
      }
    }
    const needed = nextLvl ? nextLvl.xpRequired - currentLevel.xpRequired : 1;
    const earned = nextLvl ? xp - currentLevel.xpRequired : 1;
    return {
      totalXP: xp,
      level: currentLevel,
      nextLevel: nextLvl,
      xpForNext: nextLvl ? nextLvl.xpRequired : currentLevel.xpRequired,
      xpProgress: nextLvl ? Math.min(100, (earned / needed) * 100) : 100,
    };
  }, [unlocked]);

  const totalAch = ACHIEVEMENTS.length;
  const unlockedCount = unlocked.length;

  // ── Achievement stats for progress calc ──
  const achStats = useMemo(() => buildAchStats(stats), [stats]);

  // ── Filtered achievements ──
  const filtered = useMemo(() => {
    let list = ACHIEVEMENTS;
    if (catFilter !== 'all') list = list.filter(a => a.cat === catFilter);
    if (rarityFilter !== 'all') list = list.filter(a => a.rarity === rarityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catFilter, rarityFilter, search]);

  // ── Category progress ──
  const categoryProgress = useMemo(() => {
    const cats = Object.entries(ACHIEVEMENT_CATEGORIES);
    return cats.map(([key, cat]) => {
      const inCat = ACHIEVEMENTS.filter(a => a.cat === key);
      const unlockedInCat = inCat.filter(a => unlocked.includes(a.id));
      const xpInCat = unlockedInCat.reduce((s, a) => s + (a.xp || 0), 0);
      return {
        key,
        label: cat.label,
        color: cat.color,
        total: inCat.length,
        unlocked: unlockedInCat.length,
        pct: inCat.length > 0 ? Math.round((unlockedInCat.length / inCat.length) * 100) : 0,
        xp: xpInCat,
      };
    });
  }, [unlocked]);

  // ── Recent unlocks ──
  const recentUnlocks = useMemo(() => {
    const recent = [];
    for (const id of unlocked) {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        const ts = achievementsMap[id]?.ts || achievementsMap[id]?.unlockedAt || 0;
        recent.push({ ...ach, ts });
      }
    }
    return recent.sort((a, b) => b.ts - a.ts).slice(0, 10);
  }, [unlocked, achievementsMap]);

  // ── Leaderboard ──
  const leaderboard = useMemo(() => {
    const playerStats = {
      name: 'YOU',
      xp: totalXP,
      episodes: stats.watchedAll || 0,
      streak: stats.streak || 0,
      achievements: unlockedCount,
      hours: Math.round(parseFloat(stats.watchHours) || 0),
    };
    const all = [...SIMULATED_PLAYERS, playerStats];
    return all.sort((a, b) => b[lbCat] - a[lbCat]);
  }, [totalXP, stats, unlockedCount, lbCat]);

  const playerRank = useMemo(() => {
    return leaderboard.findIndex(p => p.name === 'YOU') + 1;
  }, [leaderboard]);

  const catKeys = ['all', ...Object.keys(ACHIEVEMENT_CATEGORIES)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Awards</h2>
        <p className="mt-1 text-white/60">Unlock achievements to earn XP and level up.</p>
      </div>

      {/* XP & Level card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wider">Level</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-white">{level.level}</span>
              <span className="text-sm text-white/40">{level.name}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40 uppercase tracking-wider">Total XP</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white">{totalXP.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-white/50">XP to {nextLevel ? `Level ${nextLevel.level}` : 'MAX'}</span>
            <span className="font-mono text-white/50">
              {totalXP} / {xpForNext}
            </span>
          </div>
          <ProgressBar value={xpProgress} />
        </div>
        <div className="mt-3 flex gap-4 text-xs text-white/40">
          <span><span className="font-mono text-white">{unlockedCount}</span> / {totalAch} unlocked</span>
          <span><span className="font-mono text-white">{Math.round((unlockedCount / totalAch) * 100)}%</span> complete</span>
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

      {/* ═══════════════ TAB: Achievements ═══════════════ */}
      {tab === 'Achievements' && (
        <div className="space-y-4">
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2">
            {catKeys.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono uppercase transition-colors ${
                  catFilter === c
                    ? 'border-white/40 bg-white/15 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {c === 'all' ? 'ALL' : ACHIEVEMENT_CATEGORIES[c]?.label || c}
              </button>
            ))}
          </div>

          {/* Rarity filter chips */}
          <div className="flex flex-wrap gap-2">
            {RARITIES.map(r => (
              <button
                key={r}
                onClick={() => setRarityFilter(r)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono uppercase transition-colors ${
                  rarityFilter === r
                    ? 'border-white/40 bg-white/15 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {r === 'all' ? 'ALL RARITY' : r}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search achievements..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />

          {/* Results count */}
          <div className="text-xs text-white/30">
            Showing {filtered.length} of {ACHIEVEMENTS.length}
          </div>

          {/* Achievement grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map(ach => {
              const isUnlocked = unlocked.includes(ach.id);
              const isHidden = ach.hidden;
              const progress = ach.progress ? ach.progress(achStats) : (isUnlocked ? 1 : 0);
              const maxProgress = getProgressMax(ach);
              const rarityStyle = RARITY_COLORS[ach.rarity] || RARITY_COLORS.common;

              return (
                <div
                  key={ach.id}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                    isUnlocked
                      ? 'border-white/30 bg-white/[0.06] shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                      : isHidden
                      ? 'border-white/5 bg-white/[0.01] opacity-40'
                      : 'border-white/10 bg-white/[0.02] opacity-40'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                      isUnlocked ? 'bg-white/20 text-white' : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {isHidden && !isUnlocked ? '??' : ach.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-white/60'}`}>{
                        isHidden && !isUnlocked ? 'CLASSIFIED' : ach.name
                      }</span>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase ${rarityStyle.bg} ${rarityStyle.text} ${rarityStyle.border}`}>
                        {ach.rarity}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-white/50">
                      {isHidden && !isUnlocked ? '???' : ach.desc}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-white/50 to-white/80 transition-all duration-500"
                          style={{ width: `${maxProgress > 1 ? (progress / maxProgress) * 100 : (isUnlocked ? 100 : 0)}%` }}
                        />
                      </div>
                      {maxProgress > 1 && !isUnlocked && (
                        <span className="shrink-0 font-mono text-[10px] text-white/30">
                          {progress}/{maxProgress}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/30">+{ach.xp} XP</span>
                      {isUnlocked && (
                        <span className="text-[10px] font-mono text-green-400/80">UNLOCKED</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-white/30">No achievements match your filters.</div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: Progress ═══════════════ */}
      {tab === 'Progress' && (
        <div className="space-y-5">
          {/* Overall completion */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
            <div className="text-xs text-white/40 uppercase tracking-wider">Overall Completion</div>
            <div className="mt-2 font-mono text-5xl font-bold text-white">
              {Math.round((unlockedCount / totalAch) * 100)}%
            </div>
            <div className="mt-2 text-sm text-white/50">
              {unlockedCount} / {totalAch} achievements unlocked
            </div>
            <div className="mx-auto mt-4 max-w-xs">
              <ProgressBar value={(unlockedCount / totalAch) * 100} />
            </div>
          </div>

          {/* Per-category progress */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-sm font-medium text-white">Category Progress</div>
            <div className="space-y-4">
              {categoryProgress.map(cat => (
                <div key={cat.key}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-white/60">{cat.label}</span>
                    <span className="font-mono text-white/50">{cat.unlocked}/{cat.total} · {cat.xp} XP</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.pct}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* XP breakdown by category */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-sm font-medium text-white">XP Breakdown</div>
            <div className="space-y-2">
              {categoryProgress
                .filter(c => c.xp > 0)
                .sort((a, b) => b.xp - a.xp)
                .map(cat => (
                  <div key={cat.key} className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{cat.label}</span>
                    <span className="font-mono text-sm text-white">{cat.xp} XP</span>
                  </div>
                ))}
              {categoryProgress.filter(c => c.xp > 0).length === 0 && (
                <div className="text-center text-xs text-white/30">No XP earned yet</div>
              )}
            </div>
          </div>

          {/* Recent unlocks */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-sm font-medium text-white">Recent Unlocks</div>
            <div className="space-y-2">
              {recentUnlocks.length > 0 ? recentUnlocks.map(ach => (
                <div key={ach.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 font-mono text-xs text-white">
                    {ach.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-white">{ach.name}</div>
                    <div className="text-[10px] text-white/40">+{ach.xp} XP</div>
                  </div>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase ${
                    (RARITY_COLORS[ach.rarity] || RARITY_COLORS.common).bg
                  } ${
                    (RARITY_COLORS[ach.rarity] || RARITY_COLORS.common).text
                  } ${
                    (RARITY_COLORS[ach.rarity] || RARITY_COLORS.common).border
                  }`}>
                    {ach.rarity}
                  </span>
                </div>
              )) : (
                <div className="py-4 text-center text-xs text-white/30">No achievements unlocked yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Unlockables ═══════════════ */}
      {tab === 'Unlockables' && (
        <div className="space-y-5">
          {/* Themes */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-sm font-medium text-white">Unlockable Themes</div>
            <div className="space-y-3">
              {UNLOCKABLE_THEMES.map(theme => {
                const isUnlocked = unlocked.includes(theme.requiredAchievement);
                const reqAch = ACHIEVEMENTS.find(a => a.id === theme.requiredAchievement);
                return (
                  <div
                    key={theme.id}
                    className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                      isUnlocked
                        ? 'border-white/30 bg-white/[0.06]'
                        : 'border-white/10 bg-white/[0.02] opacity-60'
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-wrap gap-1 rounded-lg border border-white/10 p-1.5">
                      {Object.values(theme.colors).slice(0, 4).map((c, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white">{theme.name}</div>
                      <div className="mt-0.5 text-xs text-white/40">
                        Unlock by: {reqAch ? reqAch.name : theme.requiredAchievement}
                      </div>
                      <div className="mt-1 text-[10px] text-white/30">
                        {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                      </div>
                    </div>
                    {isUnlocked && (
                      <span className="text-xs font-mono text-green-400/80">ACTIVE</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal effects */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-sm font-medium text-white">Unlockable Terminal Effects</div>
            <div className="space-y-3">
              {UNLOCKABLE_TERMINAL_EFFECTS.map(effect => {
                const isUnlocked = unlocked.includes(effect.requiredAchievement);
                const reqAch = ACHIEVEMENTS.find(a => a.id === effect.requiredAchievement);
                return (
                  <div
                    key={effect.id}
                    className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                      isUnlocked
                        ? 'border-white/30 bg-white/[0.06]'
                        : 'border-white/10 bg-white/[0.02] opacity-60'
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 font-mono text-sm text-white">
                      FX
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white">{effect.name}</div>
                      <div className="mt-0.5 text-xs text-white/40">
                        Unlock by: {reqAch ? reqAch.name : effect.requiredAchievement}
                      </div>
                      <div className="mt-1 text-[10px] text-white/30">
                        {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                      </div>
                    </div>
                    {isUnlocked && (
                      <span className="text-xs font-mono text-green-400/80">READY</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Leaderboard ═══════════════ */}
      {tab === 'Leaderboard' && (
        <div className="space-y-5">
          {/* Player rank highlight */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Your Rank</div>
                <div className="mt-1 font-mono text-3xl font-bold text-white">#{playerRank}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/40 uppercase tracking-wider">{
                  LEADERBOARD_CATS.find(c => c.key === lbCat)?.label || 'XP'
                }</div>
                <div className="mt-1 font-mono text-lg text-white">{
                  lbCat === 'xp' ? totalXP.toLocaleString()
                  : lbCat === 'episodes' ? (stats.watchedAll || 0)
                  : lbCat === 'streak' ? (stats.streak || 0)
                  : lbCat === 'achievements' ? unlockedCount
                  : Math.round(parseFloat(stats.watchHours) || 0)
                }</div>
              </div>
            </div>
          </div>

          {/* Category selector */}
          <div className="flex flex-wrap gap-2">
            {LEADERBOARD_CATS.map(c => (
              <button
                key={c.key}
                onClick={() => setLbCat(c.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${
                  lbCat === c.key
                    ? 'border-white/40 bg-white/15 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Leaderboard list */}
          <div className="space-y-2">
            {leaderboard.map((player, idx) => {
              const isPlayer = player.name === 'YOU';
              return (
                <div
                  key={player.name}
                  className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
                    isPlayer
                      ? 'border-white/30 bg-white/[0.08]'
                      : idx === 0
                      ? 'border-amber-500/20 bg-amber-500/[0.04]'
                      : idx === 1
                      ? 'border-white/20 bg-white/[0.04]'
                      : idx === 2
                      ? 'border-orange-500/20 bg-orange-500/[0.03]'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className={`w-8 text-center font-mono text-sm ${
                    idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-white/70' : idx === 2 ? 'text-orange-400' : 'text-white/30'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${isPlayer ? 'text-white' : 'text-white/70'}`}>{player.name}</div>
                  </div>
                  <div className={`font-mono text-sm ${isPlayer ? 'text-white' : 'text-white/50'}`}>
                    {lbCat === 'xp' ? player.xp.toLocaleString()
                    : lbCat === 'hours' ? `${player.hours}h`
                    : player[lbCat]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}