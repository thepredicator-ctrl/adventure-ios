import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../lib/episodes.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { getWatchTime } from '../lib/storage.js';
import { pad2 } from '../lib/format.js';
import AsciiSweepTerminal from '../components/AsciiSweepTerminal.jsx';

export default function Terminal() {
  const {
    global, show, watchedMap, unlocked, favorites, watchlist,
    adventureHistory, savedAdventures, continueList, watchHistory,
    collections, stats, jumpTo, generateAdventure, showToast, setSettings,
    currentServer, autoServerStatus,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState('system');
  const [aiInsight, setAiInsight] = useState('');
  const [visibleLines, setVisibleLines] = useState(0);
  const sweepRef = useRef(null);

  // Compute terminal data from real application state
  const data = useMemo(() => {
    const wt = getWatchTime();
    const totalAllEps = SHOWS.reduce((s, sh) => s + totalEpisodes(sh), 0);
    const totalWatched = SHOWS.reduce((s, sh) => s + (watchedMap[sh.id] ?? []).length, 0);
    const librarySize = totalAllEps;
    const totalMs = wt.totalMs || 0;
    const totalHours = Math.floor(totalMs / 3600000);
    const totalMinutes = Math.floor((totalMs % 3600000) / 60000);

    let streak = 0;
    for (let d = 0; d < 365; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const dayEntry = wt.sessions?.find(s => s.date === date);
      if (dayEntry && dayEntry.ms > 0) streak++;
      else if (d > 0) break;
      else { streak = 0; break; }
    }

    let longestStreak = 0, currentRun = 0;
    for (let d = 0; d < 365; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const dayEntry = wt.sessions?.find(s => s.date === date);
      if (dayEntry && dayEntry.ms > 0) { currentRun++; longestStreak = Math.max(longestStreak, currentRun); }
      else { currentRun = 0; }
    }

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

    const today = new Date().toISOString().slice(0, 10);
    const todayMs = wt.sessions?.find(s => s.date === today)?.ms || 0;
    const todayMins = Math.floor(todayMs / 60000);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const weekMs = wt.sessions?.filter(s => s.date >= weekAgo).reduce((sum, s) => sum + s.ms, 0);
    const weekHours = Math.floor(weekMs / 3600000);
    const weekMins = Math.floor((weekMs % 3600000) / 60000);

    const currentShowWatched = (watchedMap[show.id] ?? []).length;
    const currentShowTotal = totalEpisodes(show);
    const currentShowPct = currentShowTotal > 0 ? Math.round((currentShowWatched / currentShowTotal) * 100) : 0;

    const unlockedAch = unlocked.filter(id => ACHIEVEMENTS.find(a => a.id === id));
    const recentAch = unlockedAch.length > 0 ? ACHIEVEMENTS.find(a => a.id === unlockedAch[unlockedAch.length - 1]) : null;

    const currentAdv = savedAdventures.length > 0 ? savedAdventures[savedAdventures.length - 1]
      : adventureHistory.length > 0 ? adventureHistory[adventureHistory.length - 1] : null;

    const unwatchedShows = SHOWS.filter(s => (watchedMap[s.id] ?? []).length === 0);
    const recommendation = unwatchedShows.length > 0 ? unwatchedShows[0].name
      : continueList.length > 0 && continueList[0].showId ? SHOWS.find(s => s.id === continueList[0].showId)?.name || 'None' : 'None';

    const totalAchievements = ACHIEVEMENTS.length;
    const unlockedCount = unlocked.length;
    const achPct = totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

    return {
      systemStatus: 'ONLINE', librarySize, totalWatchTime: `${String(totalHours).padStart(2, '0')}H ${String(totalMinutes).padStart(2, '0')}M`,
      currentStreak: streak, longestStreak, adventuresGenerated: adventureHistory.length,
      adventuresCompleted: savedAdventures.filter(a => a.completed).length, achievementPct: achPct,
      episodesWatched: totalWatched, showsCompleted, currentShowName: show.name,
      currentEpisode: `S${pad2(displaySeasonNumber(show, global.season))}E${pad2(global.episode)}`,
      currentViewProgress: `${currentShowWatched} / ${currentShowTotal} (${currentShowPct}%)`,
      todayWatchTime: `${todayMins}M`, weekWatchTime: `${String(weekHours).padStart(2, '0')}H ${String(weekMins).padStart(2, '0')}M`,
      recentAchievement: recentAch ? recentAch.name : 'NONE', currentAdventure: currentAdv,
      missionProgress: currentAdv ? `${Math.min((currentAdv.currentIdx || 0) + 1, currentAdv.episodes.length)} / ${currentAdv.episodes.length}` : null,
      recommendation, achievements: `${unlockedCount} / ${totalAchievements}`,
      serverName: currentServer?.name || 'UNKNOWN',
      serverStatus: autoServerStatus === 'probing' ? 'SCANNING' : 'LOCKED',
      favoritesCount: favorites.length, collectionsCount: collections.length,
    };
  }, [watchedMap, unlocked, adventureHistory, savedAdventures, continueList, show, global.season, global.episode, favorites, collections, currentServer, autoServerStatus]);

  // Terminal typewriter animation
  useEffect(() => {
    setVisibleLines(0);
    let line = 0;
    const interval = setInterval(() => {
      line++;
      setVisibleLines(line);
      if (line >= 24) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [activeTab]);

  // AI insight
  useEffect(() => {
    if (data.currentAdventure) {
      const adv = data.currentAdventure;
      const remaining = adv.episodes.length - (adv.currentIdx || 0) - 1;
      const pct = adv.episodes.length > 0 ? Math.round(((adv.currentIdx || 0) + 1) / adv.episodes.length * 100) : 0;
      const nextEp = remaining > 0 ? adv.episodes[(adv.currentIdx || 0) + 1] : null;
      let insight = `You are ${pct}% through ADVENTURE // ${adv.number}.`;
      if (remaining > 0) insight += ` ${remaining} episode${remaining > 1 ? 's' : ''} remain.`;
      if (nextEp) insight += `\nNEXT: ${nextEp.showName} S${pad2(nextEp.season)}E${pad2(nextEp.episode)}`;
      setAiInsight(insight);
    } else {
      setAiInsight('');
    }
  }, [data.currentAdventure]);

  const handleTabSwitch = useCallback((tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      sweepRef.current?.triggerSweep(tab === 'system' ? 1 : -1);
    }
  }, [activeTab]);

  const handleContinueMission = () => {
    if (data.currentAdventure?.episodes?.length > 0) {
      const ep = data.currentAdventure.episodes[data.currentAdventure.currentIdx || 0];
      if (ep) { jumpTo(ep.showId, ep.season, ep.episode); showToast('MISSION CONTINUE'); }
    }
  };

  const line = (label, value, idx, extra = '') => {
    const visible = idx < visibleLines;
    return (
      <div key={idx} className={`flex items-baseline gap-3 transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`} style={{ transitionDelay: `${idx * 25}ms` }}>
        <span className="w-52 shrink-0 text-[11px] text-white/40 uppercase tracking-widest font-mono">{label}</span>
        <span className={`text-sm font-mono ${extra || 'text-white'}`}>{visible ? value : ''}</span>
      </div>
    );
  };

  const tabs = [
    { id: 'system', label: 'SYSTEM' },
    { id: 'library', label: 'LIBRARY' },
    { id: 'mission', label: 'MISSION' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">ADVENTURE TERMINAL</h2>
        <p className="mt-1 text-white/60">System interface — real-time data from your library.</p>
      </div>

      <AsciiSweepTerminal ref={sweepRef} color="#4ade80">
        <div className="rounded-2xl border border-white/10 bg-black/90 font-mono overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-green-400 bg-white/[0.03]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 pr-4">
              <span className={`h-1.5 w-1.5 rounded-full ${data.systemStatus === 'ONLINE' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[10px] text-white/30">{data.systemStatus}</span>
            </div>
          </div>

          {/* Terminal content */}
          <div className="p-6 space-y-1.5">
            {activeTab === 'system' && (
              <>
                {line('SYSTEM STATUS', data.systemStatus, 0, 'text-green-400')}
                {line('SERVER', data.serverName, 1, 'text-green-400/80')}
                {line('SERVER STATUS', data.serverStatus, 2, 'text-amber-400/80')}
                {line('WATCH TIME', data.totalWatchTime, 3)}
                {line('CURRENT STREAK', `${data.currentStreak} DAYS`, 4, data.currentStreak > 0 ? 'text-white' : 'text-white/40')}
                {line('LONGEST STREAK', `${data.longestStreak} DAYS`, 5)}
                {line('ACHIEVEMENTS', `${data.achievementPct}%`, 6, data.achievementPct >= 50 ? 'text-white' : 'text-white/60')}
                {line('EPISODES WATCHED', data.episodesWatched.toString(), 7)}
                {line("TODAY'S WATCH TIME", data.todayWatchTime, 8)}
                {line("THIS WEEK", data.weekWatchTime, 9)}
              </>
            )}

            {activeTab === 'library' && (
              <>
                {line('LIBRARY', `${data.librarySize} ITEMS`, 0)}
                {line('SHOWS COMPLETED', data.showsCompleted.toString(), 1, data.showsCompleted > 0 ? 'text-green-400' : 'text-white/60')}
                {line('CURRENT SHOW', data.currentShowName, 2)}
                {line('CURRENT EPISODE', data.currentEpisode, 3)}
                {line('VIEWING PROGRESS', data.currentViewProgress, 4)}
                {line('FAVORITES', data.favoritesCount.toString(), 5)}
                {line('COLLECTIONS', data.collectionsCount.toString(), 6)}
                {line('RECOMMENDATION', data.recommendation, 7, 'text-white/60')}
                {line('RECENT ACHIEVEMENT', data.recentAchievement, 8, 'text-white/70')}
              </>
            )}

            {activeTab === 'mission' && (
              <>
                {line('ADVENTURES', data.adventuresGenerated.toString(), 0)}
                {line('ADVENTURES COMPLETED', data.adventuresCompleted.toString(), 1)}
                {data.currentAdventure ? (
                  <>
                    {line('CURRENT MISSION', `ADVENTURE // ${data.currentAdventure.number}`, 2)}
                    {line('MISSION PROGRESS', data.missionProgress, 3, 'text-green-400/80')}
                    {aiInsight && visibleLines >= 4 && (
                      <div className="mt-2 border-t border-white/10 pt-2">
                        <span className="text-[11px] text-white/40 uppercase tracking-widest block mb-1">AI INSIGHT</span>
                        <span className="text-sm text-green-400/70 whitespace-pre-line block">{aiInsight}</span>
                      </div>
                    )}
                    {data.missionProgress && visibleLines >= 5 && (
                      <div className="mt-4">
                        <button onClick={handleContinueMission} className="rounded-lg border border-green-400/30 bg-green-400/10 px-6 py-2.5 text-xs font-mono uppercase tracking-widest text-green-400 transition-all duration-200 hover:bg-green-400/20 hover:border-green-400/50 hover:scale-[1.02] active:scale-[0.98]">
                          [ CONTINUE MISSION ]
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-4 text-sm text-white/30">NO ACTIVE MISSION // START AN ADVENTURE</div>
                )}
              </>
            )}

            {/* Cursor blink */}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-block w-2 h-4 bg-green-400/80 animate-pulse" />
              <span className="text-[11px] text-white/20">READY</span>
            </div>
          </div>
        </div>
      </AsciiSweepTerminal>
    </div>
  );
}
