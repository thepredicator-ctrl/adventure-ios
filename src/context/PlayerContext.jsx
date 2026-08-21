import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { SHOWS } from '../data/shows.js';
import { SERVERS } from '../data/servers.js';
import { THEMES, DEFAULT_THEME_ID } from '../data/themes.js';
import { lsGet, lsSet, lsRemove, LS_KEYS } from '../lib/storage.js';
import { totalEpisodes, epKey, nextEpisode, isAtLastEp, displaySeasonNumber } from '../lib/episodes.js';

const PlayerContext = createContext(null);

const DEFAULT_GLOBAL = {
  showIndex: 0,
  season: 1,
  episode: 1,
  server: 1,
  autoplay: false,
  theme: DEFAULT_THEME_ID,
  sessionWatched: 0,
  serversTried: [],
  themesTried: [],
  showsVisited: [],
  settings: { defaultServer: 1, crtEffect: true, videoBg: false, videoBgUrl: '' }
};

export function PlayerProvider({ children }) {
  const [global, setGlobal] = useState(() => ({ ...DEFAULT_GLOBAL, ...lsGet(LS_KEYS.global, {}) }));
  const [watchedMap, setWatchedMap] = useState(() => {
    // Lazy-load watched lists per show on demand — store as a map keyed by show id.
    const out = {};
    for (const s of SHOWS) out[s.id] = lsGet(LS_KEYS.watched(s.id), []);
    return out;
  });
  const [continueList, setContinueList] = useState(() => lsGet(LS_KEYS.continue, []));
  const [unlocked, setUnlocked] = useState(() => lsGet(LS_KEYS.achv, []));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const show = SHOWS[global.showIndex] ?? SHOWS[0];

  // ---- persistence ----
  useEffect(() => { lsSet(LS_KEYS.global, global); }, [global]);
  useEffect(() => {
    for (const s of SHOWS) lsSet(LS_KEYS.watched(s.id), watchedMap[s.id] ?? []);
  }, [watchedMap]);
  useEffect(() => { lsSet(LS_KEYS.continue, continueList); }, [continueList]);
  useEffect(() => { lsSet(LS_KEYS.achv, unlocked); }, [unlocked]);
  useEffect(() => { lsSet(LS_KEYS.theme, global.theme); }, [global.theme]);

  // ---- toast helper ----
  const showToast = useCallback((msg, opts = {}) => {
    setToast({ msg, tone: opts.tone || 'default' });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), opts.duration || 2400);
  }, []);

  // ---- achievement check ----
  const unlock = useCallback((id) => {
    setUnlocked(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const checkAchievements = useCallback(() => {
    const allWatched = Object.values(watchedMap).reduce((s, a) => s + a.length, 0);
    if (allWatched >= 1) unlock('first_ep');
    if (allWatched >= 10) unlock('binge_10');
    if (allWatched >= 50) unlock('binge_50');
    for (const s of SHOWS) {
      if ((watchedMap[s.id] ?? []).length >= totalEpisodes(s)) unlock('show_done');
      for (let i = 0; i < s.seasons.length; i++) {
        const seasonEps = s.seasons[i];
        const watched = watchedMap[s.id] ?? [];
        let seasonComplete = true;
        for (let e = 1; e <= seasonEps; e++) {
          if (!watched.includes(epKey(i + 1, e))) { seasonComplete = false; break; }
        }
        if (seasonComplete) { unlock('season_done'); break; }
      }
    }
    if (global.serversTried.length >= 4) unlock('server_hop');
    if (global.themesTried.length >= 3) unlock('theme_switch');
    if (global.showsVisited.length >= 7) unlock('all_shows');
  }, [watchedMap, global.serversTried, global.themesTried, global.showsVisited, unlock]);

  useEffect(() => { checkAchievements(); }, [watchedMap, global.serversTried, global.themesTried, global.showsVisited]);

  // ---- mark current episode watched ----
  const markCurrentWatched = useCallback(() => {
    const key = epKey(global.season, global.episode);
    setWatchedMap(prev => {
      const list = prev[show.id] ?? [];
      if (list.includes(key)) return prev;
      return { ...prev, [show.id]: [...list, key] };
    });
    setGlobal(g => ({ ...g, sessionWatched: g.sessionWatched + 1 }));
    setContinueList(prev => {
      const entry = { showId: show.id, season: global.season, episode: global.episode, ts: Date.now() };
      const without = prev.filter(e => !(e.showId === show.id && e.season === global.season && e.episode === global.episode));
      return [entry, ...without].slice(0, 6);
    });
  }, [global.season, global.episode, show.id]);

  // ---- navigation ----
  const selectShow = useCallback((index) => {
    setGlobal(g => ({
      ...g,
      showIndex: index,
      season: 1,
      episode: 1,
      showsVisited: g.showsVisited.includes(index) ? g.showsVisited : [...g.showsVisited, index]
    }));
  }, []);

  const setSeason = useCallback((s) => setGlobal(g => ({ ...g, season: s, episode: 1 })), []);
  const setEpisode = useCallback((e) => setGlobal(g => ({ ...g, episode: e })), []);
  const setServer = useCallback((id) => {
    setGlobal(g => ({
      ...g,
      server: id,
      serversTried: g.serversTried.includes(id) ? g.serversTried : [...g.serversTried, id]
    }));
  }, []);
  const setAutoplay = useCallback((on) => setGlobal(g => ({ ...g, autoplay: !!on })), []);
  const setTheme = useCallback((id) => {
    setGlobal(g => ({
      ...g,
      theme: id,
      themesTried: g.themesTried.includes(id) ? g.themesTried : [...g.themesTried, id]
    }));
  }, []);
  const setSettings = useCallback((patch) => setGlobal(g => ({ ...g, settings: { ...g.settings, ...patch } })), []);
  const setVideoBgUrl = useCallback((url) => setGlobal(g => ({ ...g, settings: { ...g.settings, videoBgUrl: url } })), []);

  // Jump directly to any (showIndex, season, episode) — used by Continue Watching rail.
  const jumpTo = useCallback((showId, season, episode) => {
    const idx = SHOWS.findIndex(s => s.id === showId);
    if (idx < 0) return;
    setGlobal(g => ({
      ...g,
      showIndex: idx,
      season,
      episode,
      showsVisited: g.showsVisited.includes(idx) ? g.showsVisited : [...g.showsVisited, idx]
    }));
  }, []);

  const gotoNext = useCallback(() => {
    const n = nextEpisode(show, global.season, global.episode);
    if (!n) { showToast('SERIES COMPLETE'); return; }
    setGlobal(g => ({ ...g, season: n.season, episode: n.episode }));
  }, [show, global.season, global.episode, showToast]);

  const gotoPrev = useCallback(() => {
    if (global.season === 1 && global.episode === 1) { showToast('ALREADY AT FIRST EP'); return; }
    let s = global.season, e = global.episode - 1;
    if (e < 1) { s -= 1; e = show.seasons[s - 1]; }
    setGlobal(g => ({ ...g, season: s, episode: e }));
  }, [global.season, global.episode, show.seasons, showToast]);

  // ---- postMessage listener for AUTO NEXT ----
  useEffect(() => {
    const handler = (event) => {
      if (!global.autoplay) return;
      let data = event.data;
      if (data == null) return;
      if (typeof data === 'string') {
        const lower = data.toLowerCase();
        if (lower === 'ended' || lower.indexOf('"ended"') !== -1 || lower.indexOf('"event":"ended"') !== -1) {
          if (!isAtLastEp(show, global.season, global.episode)) {
            showToast('VIDEO ENDED // AUTO NEXT');
            setTimeout(gotoNext, 600);
          }
          return;
        }
        try { data = JSON.parse(data); } catch { return; }
      }
      if (typeof data !== 'object' || data === null) return;
      const keys = ['event', 'type', 'action', 'name', 'playerEvent', 'state', 'method', 'message'];
      const isEnded = keys.some(k => typeof data[k] === 'string' && data[k].toLowerCase() === 'ended');
      const nested = data.event && typeof data.event === 'object'
        ? keys.some(k => typeof data.event[k] === 'string' && data.event[k].toLowerCase() === 'ended')
        : false;
      if (isEnded || nested) {
        if (!isAtLastEp(show, global.season, global.episode)) {
          showToast('VIDEO ENDED // AUTO NEXT');
          setTimeout(gotoNext, 600);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [global.autoplay, global.season, global.episode, show, gotoNext, showToast]);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const handler = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') { e.preventDefault(); gotoNext(); }
      else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') { e.preventDefault(); gotoPrev(); }
      else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setAutoplay(!global.autoplay); showToast(`AUTO NEXT ${!global.autoplay ? 'ON' : 'OFF'}`); }
      else if (e.key >= '1' && e.key <= '9') {
        const id = Number(e.key);
        if (SERVERS[id]) {
          e.preventDefault();
          setServer(id);
          showToast(`SERVER ${id}`);
        }
      }
      else if (e.key.toLowerCase() === 't') { e.preventDefault();
        const idx = THEMES.findIndex(t => t.id === global.theme);
        const next = THEMES[(idx + 1) % THEMES.length];
        setTheme(next.id);
        showToast(`THEME // ${next.name}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gotoNext, gotoPrev, setAutoplay, setServer, setTheme, global.autoplay, global.theme, showToast]);

  // ---- resets ----
  const resetAllProgress = useCallback(() => {
    for (const s of SHOWS) lsRemove(LS_KEYS.watched(s.id));
    lsRemove(LS_KEYS.continue);
    lsRemove(LS_KEYS.achv);
    setWatchedMap(() => { const out = {}; for (const s of SHOWS) out[s.id] = []; return out; });
    setContinueList([]);
    setUnlocked([]);
    setGlobal(g => ({ ...g, sessionWatched: 0 }));
    showToast('ALL PROGRESS RESET');
  }, [showToast]);

  const resetCurrentShow = useCallback(() => {
    lsRemove(LS_KEYS.watched(show.id));
    setWatchedMap(prev => ({ ...prev, [show.id]: [] }));
    showToast(`RESET // ${show.shortName.toUpperCase()}`);
  }, [show.id, show.shortName, showToast]);

  // ---- derived ----
  const currentServer = SERVERS[global.server] ?? SERVERS[1];
  const videoUrl = useMemo(
    () => currentServer.build(show.id, displaySeasonNumber(show, global.season), global.episode),
    [currentServer, show.id, global.season, show.seasonOffset, global.episode]
  );

  const stats = useMemo(() => {
    const totalAll = SHOWS.reduce((sum, s) => sum + totalEpisodes(s), 0);
    const watchedAll = SHOWS.reduce((sum, s) => sum + (watchedMap[s.id] ?? []).length, 0);
    const completionPct = totalAll > 0 ? ((watchedAll / totalAll) * 100).toFixed(1) : '0.0';
    return {
      currentShow: show.shortName,
      position: `${global.episode}/${totalEpisodes(show)}`,
      watchedAll,
      totalAll,
      sessionWatched: global.sessionWatched,
      completionPct,
      themesTried: global.themesTried.length,
      serversTried: global.serversTried.length,
      showsVisited: global.showsVisited.length,
      achievements: unlocked.length
    };
  }, [show, watchedMap, global.sessionWatched, global.themesTried, global.serversTried, global.showsVisited, unlocked]);

  const value = {
    // state
    global, show, watchedMap, continueList, unlocked, toast,
    // derived
    currentServer, videoUrl, stats,
    // nav
    selectShow, setSeason, setEpisode, setServer, setAutoplay, setTheme, setSettings, setVideoBgUrl,
    gotoNext, gotoPrev, markCurrentWatched, jumpTo,
    // resets
    resetAllProgress, resetCurrentShow,
    // ui
    showToast
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
