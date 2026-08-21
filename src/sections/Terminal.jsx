import { useMemo, useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../lib/episodes.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { getWatchTime } from '../lib/storage.js';
import { pad2 } from '../lib/format.js';

export default function Terminal() {
  const {
    global, show, watchedMap, unlocked, favorites, watchlist,
    adventureHistory, savedAdventures, continueList, watchHistory,
    collections, stats, jumpTo, generateAdventure, showToast, setSettings,
  } = usePlayer();

  const [aiInsight, setAiInsight] = useState('');
  const [missionProgress, setMissionProgress] = useState(null);
  const termRef = useRef(null);

  // Compute terminal data from real application state
  const data = useMemo(() => {
    const wt = getWatchTime();
    const totalAllEps = SHOWS.reduce((s, sh) => s + totalEpisodes(sh), 0);
    const totalWatched = SHOWS.reduce((s, sh) => s + (watchedMap[sh.id] ?? []).length, 0);

    // Library size: unique episodes available
    const librarySize = totalAllEps;

    // Watch time
    const totalMs = wt.totalMs || 0;
    const totalHours = Math.floor(totalMs / 3600000);
    const totalMinutes = Math.floor((totalMs % 3600000) / 60000);

    // Current streak
    let streak = 0;
    for (let d = 0; d < 365; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const dayEntry = wt.sessions?.find(s => s.date === date);
      if (dayEntry && dayEntry.ms > 0) streak++;
      else if (d > 0) break;
      else { streak = 0; break; }
    }

    // Longest streak
    let longestStreak = 0;
    let currentRun = 0;
    for (let d = 0; d < 365; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const dayEntry = wt.sessions?.find(s => s.date === date);
      if (dayEntry && dayEntry.ms > 0) { currentRun++; longestStreak = Math.max(longestStreak, currentRun); }
      else { currentRun = 0; }
    }

    // Shows completed
    let showsCompleted = 0;
    for (const s of SHOWS) {
      const watched = watchedMap[s.id] ?? [];
      let showDone = true;
      for (let si = 0; si < s.seasons.length; si++) {
        for (let e = 1; e <= s.seasons[si]; e++) {
          if (!watched.includes(epKey(si + 1, e))) { showDone = false; break; }
        }
        if (!showDone) break;
      }
      if (showDone) showsCompleted++;
    }

    // Today's watch time
    const today = new Date().toISOString().slice(0, 10);
    const todayMs = wt.sessions?.find(s => s.date === today)?.ms || 0;
    const todayMins = Math.floor(todayMs / 60000);

    // This week's watch time
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const weekMs = wt.sessions?.filter(s => s.date >= weekAgo).reduce((sum, s) => sum + s.ms, 0);
    const weekHours = Math.floor(weekMs / 3600000);
    const weekMins = Math.floor((weekMs % 3600000) / 60000);

    // Current viewing progress for current show
    const currentShowWatched = (watchedMap[show.id] ?? []).length;
    const currentShowTotal = totalEpisodes(show);
    const currentShowPct = currentShowTotal > 0 ? Math.round((currentShowWatched / currentShowTotal) * 100) : 0;

    // Recently unlocked achievement
    const unlockedAch = unlocked.filter(id => ACHIEVEMENTS.find(a => a.id === id));
    const recentAch = unlockedAch.length > 0
      ? ACHIEVEMENTS.find(a => a.id === unlockedAch[unlockedAch.length - 1])
      : null;

    // Current adventure / mission
    const currentAdv = savedAdventures.length > 0
      ? savedAdventures[savedAdventures.length - 1]
      : adventureHistory.length > 0
        ? adventureHistory[adventureHistory.length - 1]
        : null;

    // Personalized recommendation
    const unwatchedShows = SHOWS.filter(s => (watchedMap[s.id] ?? []).length === 0);
    const recommendation = unwatchedShows.length > 0
      ? unwatchedShows[0].name
      : continueList.length > 0
        ? continueList[0].showId
          ? SHOWS.find(s => s.id === continueList[0].showId)?.name || 'None'
          : 'None'
        : 'None';

    // Achievement completion
    const totalAchievements = ACHIEVEMENTS.length;
    const unlockedCount = unlocked.length;
    const achPct = totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

    return {
      systemStatus: 'ONLINE',
      librarySize,
      totalWatchTime: `${String(totalHours).padStart(2, '0')}H ${String(totalMinutes).padStart(2, '0')}M`,
      currentStreak: streak,
      longestStreak,
      adventuresGenerated: adventureHistory.length,
      adventuresCompleted: savedAdventures.filter(a => a.completed).length,
      achievementPct: achPct,
      episodesWatched: totalWatched,
      showsCompleted,
      currentShowName: show.name,
      currentEpisode: `S${pad2(displaySeasonNumber(show, global.season))}E${pad2(global.episode)}`,
      currentViewProgress: `${currentShowWatched} / ${currentShowTotal} (${currentShowPct}%)`,
      todayWatchTime: `${todayMins}M`,
      weekWatchTime: `${String(weekHours).padStart(2, '0')}H ${String(weekMins).padStart(2, '0')}M`,
      recentAchievement: recentAch ? recentAch.name : 'NONE',
      currentAdventure: currentAdv,
      missionProgress: currentAdv ? `${Math.min((currentAdv.currentIdx || 0) + 1, currentAdv.episodes.length)} / ${currentAdv.episodes.length}` : null,
      recommendation,
      achievements: `${unlockedCount} / ${totalAchievements}`,
    };
  }, [watchedMap, unlocked, adventureHistory, savedAdventures, continueList, show, global.season, global.episode, favorites, watchlist, collections, watchHistory]);

  // Terminal animation state
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    setVisibleLines(0);
    let line = 0;
    const interval = setInterval(() => {
      line++;
      setVisibleLines(line);
      if (line >= 22) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const line = (label, value, idx, extra = '') => {
    const visible = idx < visibleLines;
    return (
      <div
        key={idx}
        className={`flex items-baseline gap-3 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        style={{ transitionDelay: `${idx * 30}ms` }}
      >
        <span className="w-48 shrink-0 text-xs text-white/50 uppercase tracking-widest font-mono">{label}</span>
        <span className={`text-sm font-mono ${extra || 'text-white'}`}>{visible ? value : ''}</span>
      </div>
    );
  };

  const handleContinueMission = () => {
    if (data.currentAdventure && data.currentAdventure.episodes.length > 0) {
      const ep = data.currentAdventure.episodes[data.currentAdventure.currentIdx || 0];
      if (ep) {
        jumpTo(ep.showId, ep.season, ep.episode);
        showToast('MISSION CONTINUE');
      }
    }
  };

  // Generate an AI insight if there's a current adventure
  useEffect(() => {
    if (data.currentAdventure) {
      const adv = data.currentAdventure;
      const remaining = adv.episodes.length - (adv.currentIdx || 0) - 1;
      const pct = adv.episodes.length > 0 ? Math.round(((adv.currentIdx || 0) + 1) / adv.episodes.length * 100) : 0;
      const nextEp = remaining > 0 ? adv.episodes[(adv.currentIdx || 0) + 1] : null;
      let insight = `You are ${pct}% through ADVENTURE // ${adv.number}.`;
      if (remaining > 0) {
        insight += ` ${remaining} episode${remaining > 1 ? 's' : ''} remain.`;
      }
      if (nextEp) {
        insight += `\nNEXT: ${nextEp.showName} S${pad2(nextEp.season)}E${pad2(nextEp.episode)}`;
      }
      setAiInsight(insight);
    } else {
      setAiInsight('');
    }
  }, [data.currentAdventure]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">ADVENTURE TERMINAL</h2>
        <p className="mt-1 text-white/60">System interface — real-time data from your library.</p>
      </div>

      {/* Main terminal display */}
      <div className="rounded-2xl border border-white/10 bg-black/80 p-6 font-mono space-y-2">
        <div className="text-lg font-bold tracking-widest text-white mb-4">ADVENTURE TERMINAL</div>

        {line('SYSTEM STATUS', data.systemStatus, 0, 'text-green-400')}
        {line('LIBRARY', `${data.librarySize} ITEMS`, 1)}
        {line('WATCH TIME', data.totalWatchTime, 2)}
        {line('CURRENT STREAK', `${data.currentStreak} DAYS`, 3, data.currentStreak > 0 ? 'text-white' : 'text-white/40')}
        {line('LONGEST STREAK', `${data.longestStreak} DAYS`, 4)}
        {line('ADVENTURES', data.adventuresGenerated.toString(), 5)}
        {line('ADVENTURES COMPLETED', data.adventuresCompleted.toString(), 6)}
        {line('ACHIEVEMENTS', `${data.achievementPct}%`, 7, data.achievementPct >= 50 ? 'text-white' : 'text-white/60')}
        {line('EPISODES WATCHED', data.episodesWatched.toString(), 8)}
        {line('SHOWS COMPLETED', data.showsCompleted.toString(), 9)}

        <div className="border-t border-white/10 my-3" />

        {line('CURRENT SHOW', data.currentShowName, 10, 'text-white')}
        {line('CURRENT EPISODE', data.currentEpisode, 11)}
        {line('VIEWING PROGRESS', data.currentViewProgress, 12)}
        {line("TODAY'S WATCH TIME", data.todayWatchTime, 13)}
        {line("THIS WEEK'S WATCH TIME", data.weekWatchTime, 14)}

        <div className="border-t border-white/10 my-3" />

        {line('RECENT ACHIEVEMENT', data.recentAchievement, 15, 'text-white/70')}
        {line('RECOMMENDATION', data.recommendation, 16, 'text-white/60')}

        {/* Current mission section */}
        {data.currentAdventure && (
          <>
            <div className="border-t border-white/10 my-3" />
            {line('CURRENT MISSION', `ADVENTURE // ${data.currentAdventure.number}`, 17, 'text-white')}
            {line('MISSION PROGRESS', data.missionProgress, 18)}
          </>
        )}

        {/* AI Insight section */}
        {aiInsight && visibleLines >= 19 && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="text-xs text-white/50 uppercase tracking-widest mb-1">AI INSIGHT</div>
            <div className="text-sm text-white/70 whitespace-pre-line">{aiInsight}</div>
          </div>
        )}

        {/* Continue button */}
        {data.currentAdventure && data.missionProgress && visibleLines >= 20 && (
          <div className="mt-4">
            <button
              onClick={handleContinueMission}
              className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-mono uppercase tracking-widest text-white transition hover:bg-white/20 hover:border-white/50"
            >
              [ CONTINUE ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
