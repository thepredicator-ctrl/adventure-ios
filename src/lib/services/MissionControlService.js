/**
 * MissionControlService - aggregates live application state for Mission Control.
 */
import { SHOWS } from '../../data/shows.js';
import { totalEpisodes, displaySeasonNumber } from '../../lib/episodes.js';
import { getWatchTime } from '../../lib/storage.js';
import { getProviderHealth } from './ProviderHealthService.js';
import { getAIDiagnostics } from './AIService.js';
import { getStorageStatus } from './ProviderHealthService.js';

export function getMissionControlData(appState) {
  const {
    show, global, watchedMap, stats, unlocked, aiConfig,
    favorites, collections, savedAdventures, adventureHistory,
    continueList, watchHistory, activeProfile, activeProfileId
  } = appState;

  const wt = getWatchTime();
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = wt.sessions.find(s => s.date === today);
  const todayMs = todayEntry ? todayEntry.ms : 0;

  // Streak
  let streak = 0;
  for (let d = 0; d < 365; d++) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    const day = wt.sessions.find(s => s.date === date);
    if (day && day.ms > 0) streak++;
    else if (d > 0) break;
    else { streak = 0; break; }
  }

  // Current mission - find closest incomplete show
  let currentMission = null;
  let missionPct = 0;
  let missionNext = null;
  let bestPct = 0;
  for (const s of SHOWS) {
    const watched = (watchedMap[s.id] || []).length;
    const total = totalEpisodes(s);
    const pct = total > 0 ? (watched / total) * 100 : 0;
    if (pct > bestPct && pct < 100 && watched > 0) {
      bestPct = pct;
      currentMission = s.shortName;
      missionPct = Math.round(pct);
      // Find next unwatched
      for (let si = 0; si < s.seasons.length; si++) {
        for (let e = 1; e <= s.seasons[si]; e++) {
          const key = `S${si + 1}:E${e}`;
          if (!watched.includes(key)) {
            missionNext = { season: displaySeasonNumber(s, si + 1), episode: e };
            break;
          }
        }
        if (missionNext) break;
      }
    }
  }

  // Current adventure
  const currentAdventure = savedAdventures.length > 0 && !savedAdventures[savedAdventures.length - 1]?.completed
    ? savedAdventures[savedAdventures.length - 1] : null;

  const providerHealth = getProviderHealth();
  const aiDiag = getAIDiagnostics();
  const storage = getStorageStatus();

  const totalWatched = Object.values(watchedMap).reduce((s, a) => s + a.length, 0);
  const totalAll = SHOWS.reduce((s, sh) => s + totalEpisodes(sh), 0);

  const h = Math.floor(todayMs / 3600000);
  const m = Math.floor((todayMs % 3600000) / 60000);

  return {
    systemStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
    libraryItems: totalAll,
    todayWatchTime: todayMs > 0 ? `${h}H ${String(m).padStart(2, '0')}M` : '0H 00M',
    todayMs,
    streak,
    currentShow: show.shortName,
    currentSeason: displaySeasonNumber(show, global.season),
    currentEpisode: global.episode,
    currentServer: global.server,
    currentMission: currentMission || 'NONE',
    missionPct,
    missionNext,
    currentAdventure: currentAdventure ? {
      number: currentAdventure.number,
      progress: `${currentAdventure.currentIdx + 1} / ${currentAdventure.episodes.length}`,
      showName: currentAdventure.episodes[0]?.showName,
    } : null,
    totalWatched,
    episodesWatched: totalWatched,
    showsCompleted: stats.showsCompleted || 0,
    achievementsUnlocked: unlocked.length,
    favoritesCount: favorites.length,
    libraryCount: totalAll,
    aiStatus: aiConfig.provider ? (aiConfig.apiKey ? 'ONLINE' : 'NO KEY') : 'UNCONFIGURED',
    aiProvider: aiConfig.provider ? aiConfig.provider.toUpperCase() : 'NONE',
    aiModel: aiConfig.model ? aiConfig.model.split('/').pop()?.split(':')[0] : 'NONE',
    aiRequests: aiDiag.requestCount,
    aiErrors: aiDiag.errorCount,
    networkStatus: providerHealth.networkStatus || (navigator.onLine ? 'ONLINE' : 'OFFLINE'),
    providerErrors: providerHealth.totalErrors || 0,
    storageUsed: storage.usedKB,
    storageStatus: storage.status,
    profileName: activeProfile?.name || 'Default',
    adventureCount: adventureHistory.length,
  };
}
