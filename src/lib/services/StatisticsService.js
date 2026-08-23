/**
 * StatisticsService - cached computation of library statistics.
 */
import { SHOWS } from '../../data/shows.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../../lib/episodes.js';
import { getWatchTime } from '../../lib/storage.js';

const cache = new Map();
const CACHE_TTL = 5000;

function cached(key, fn) {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && now - entry.ts < CACHE_TTL) return entry.data;
  const data = fn();
  cache.set(key, { data, ts: now });
  return data;
}

export function getShowAnalysis(showId, watchedMap, ratings, playbackPositions, watchHistory, favorites) {
  return cached(`analysis:${showId}:${watchedMap[showId]?.length || 0}`, () => {
    const show = SHOWS.find(s => s.id === showId);
    if (!show) return null;

    const watched = watchedMap[showId] || [];
    const total = totalEpisodes(show);
    const pct = total > 0 ? Math.round((watched.length / total) * 100) : 0;

    // Per-season stats
    const seasonStats = show.seasons.map((eps, i) => {
      const sNum = i + 1;
      const watchedInSeason = watched.filter(k => k.startsWith(`S${sNum}:`)).length;
      return { season: sNum, total: eps, watched: watchedInSeason, pct: Math.round((watchedInSeason / eps) * 100) };
    });

    // Most watched episode
    const epWatchCounts = {};
    for (const entry of watchHistory) {
      if (entry.showId !== showId) continue;
      const k = `${entry.season}:${entry.episode}`;
      epWatchCounts[k] = (epWatchCounts[k] || 0) + 1;
    }
    let mostWatched = null;
    let maxCount = 0;
    for (const [k, count] of Object.entries(epWatchCounts)) {
      if (count > maxCount) {
        maxCount = count;
        const [s, e] = k.split(':');
        mostWatched = { season: Number(s), episode: Number(e), count };
      }
    }

    // Favorite season
    let favSeason = 0;
    let maxFavs = 0;
    for (let i = 0; i < seasonStats.length; i++) {
      if (seasonStats[i].watched > maxFavs) {
        maxFavs = seasonStats[i].watched;
        favSeason = i + 1;
      }
    }

    // Ratings average
    let ratingSum = 0;
    let ratingCount = 0;
    for (const key of Object.keys(ratings)) {
      if (key.startsWith(showId)) {
        ratingSum += ratings[key];
        ratingCount++;
      }
    }
    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : 0;

    // Watch time for this show (estimate 22min per watch)
    const showHistoryEntries = watchHistory.filter(e => e.showId === showId);
    const estimatedMinutes = showHistoryEntries.length * 22;

    return {
      showId,
      showName: show.name,
      shortName: show.shortName,
      totalEpisodes: total,
      watchedEpisodes: watched.length,
      completionPct: pct,
      seasonStats,
      mostWatched,
      favoriteSeason: favSeason,
      avgRating,
      ratingCount,
      estimatedWatchHours: (estimatedMinutes / 60).toFixed(1),
      totalRewatches: showHistoryEntries.length - watched.length,
    };
  });
}

export function getLibraryStats(watchedMap) {
  return cached(`library:${Object.values(watchedMap).reduce((s,a)=>s+a.length,0)}`, () => {
    let totalEps = 0, watchedEps = 0, showsCompleted = 0, seasonsCompleted = 0;
    const showStats = [];
    for (const show of SHOWS) {
      const total = totalEpisodes(show);
      const watched = (watchedMap[show.id] || []).length;
      totalEps += total;
      watchedEps += watched;
      let showDone = true;
      for (let si = 0; si < show.seasons.length; si++) {
        let seasonDone = true;
        for (let e = 1; e <= show.seasons[si]; e++) {
          if (!watched.includes(epKey(si + 1, e))) {
            seasonDone = false;
            showDone = false;
          }
        }
        if (seasonDone) seasonsCompleted++;
      }
      if (showDone) showsCompleted++;
      showStats.push({ id: show.id, name: show.shortName, total, watched, pct: total > 0 ? Math.round((watched / total) * 100) : 0 });
    }
    return {
      totalEps, watchedEps, showsCompleted, seasonsCompleted,
      completionPct: totalEps > 0 ? ((watchedEps / totalEps) * 100).toFixed(1) : '0.0',
      showStats,
    };
  });
}

export function getTodayWatchTime() {
  const wt = getWatchTime();
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = wt.sessions.find(s => s.date === today);
  return todayEntry ? todayEntry.ms : 0;
}

export function getWatchStreak() {
  const wt = getWatchTime();
  let streak = 0;
  for (let d = 0; d < 365; d++) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    const dayEntry = wt.sessions.find(s => s.date === date);
    if (dayEntry && dayEntry.ms > 0) streak++;
    else if (d > 0) break;
    else { streak = 0; break; }
  }
  return streak;
}

export function clearStatsCache() {
  cache.clear();
}
