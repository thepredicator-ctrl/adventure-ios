import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { SHOWS } from '../data/shows.js';
import { SERVERS, SERVER_LIST } from '../data/servers.js';
import { THEMES, DEFAULT_THEME_ID } from '../data/themes.js';
import { lsGet, lsSet, lsRemove, LS_KEYS, logSession, getWatchTime, addWatchTime } from '../lib/storage.js';
import { totalEpisodes, epKey, nextEpisode, isAtLastEp, displaySeasonNumber } from '../lib/episodes.js';
import { ACHIEVEMENTS, DEFAULT_ACHIEVEMENT_STATS } from '../data/achievements.js';
import { SHOW_GENRES, MOODS } from '../data/genres.js';

const PlayerContext = createContext(null);

const DEFAULT_SETTINGS = {
  defaultServer: 1,
  crtEffect: true,
  videoBg: false,
  videoBgUrl: '',
  videoBgOpacity: 0.35,
  autoplay: true,
  skipIntro: false,
  skipOutro: false,
  defaultSpeed: 1,
  subtitleLang: 'off',
  audioTrack: 0,
  adBlock: true,
  reducedMotion: false,
  animationIntensity: 1.0,
  scanlineIntensity: 0.08,
  contourIntensity: 0.6,
  glassOpacity: 0.35,
  highContrast: false,
  developerMode: false,
};

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
  settings: { ...DEFAULT_SETTINGS },
};

// ---- Profile management ----

const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Default',
  avatar: 'DE',
  pin: null,
  isKids: false,
  createdAt: Date.now(),
};

function loadProfiles() {
  return lsGet(LS_KEYS.profiles, [DEFAULT_PROFILE]);
}
function saveProfiles(profiles) { lsSet(LS_KEYS.profiles, profiles); }

export function PlayerProvider({ children }) {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState(() => lsGet(LS_KEYS.activeProfile, 'default'));

  const activeProfile = useMemo(() =>
    profiles.find(p => p.id === activeProfileId) ?? profiles[0] ?? DEFAULT_PROFILE,
    [profiles, activeProfileId]
  );

  const profileKey = (key) => `${activeProfileId}:${key}`;

  const [global, setGlobal] = useState(() => ({
    ...DEFAULT_GLOBAL,
    ...lsGet(profileKey('global'), {}),
    settings: { ...DEFAULT_SETTINGS, ...(lsGet(profileKey('global'), {}).settings || {}) }
  }));

  const [watchedMap, setWatchedMap] = useState(() => {
    const out = {};
    for (const s of SHOWS) out[s.id] = lsGet(profileKey(LS_KEYS.watched(s.id)), []);
    return out;
  });
  const [continueList, setContinueList] = useState(() => lsGet(profileKey('continue'), []));
  const [unlocked, setUnlocked] = useState(() => lsGet(profileKey('achv'), []));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // ---- New state: favorites, watchlist, collections, ratings ----
  const [favorites, setFavorites] = useState(() => lsGet(profileKey('favorites'), [])); // ["showId:S1:E5", ...]
  const [watchlist, setWatchlist] = useState(() => lsGet(profileKey('watchlist'), [])); // [showId, ...]
  const [collections, setCollections] = useState(() => lsGet(profileKey('collections'), []));
  const [playbackPositions, setPlaybackPositions] = useState(() => lsGet(profileKey('playbackPositions'), {}));
  const [watchHistory, setWatchHistory] = useState(() => lsGet(profileKey('watchHistory'), []));
  const [ratings, setRatings] = useState(() => lsGet(profileKey('ratings'), {}));
  const [adventureHistory, setAdventureHistory] = useState(() => lsGet(profileKey('adventureHistory'), []));
  const [savedAdventures, setSavedAdventures] = useState(() => lsGet(profileKey('savedAdventures'), []));
  const [aiConfig, setAiConfig] = useState(() => lsGet(profileKey('aiConfig'), { provider: '', apiKey: '', model: '' }));
  const [devSettings, setDevSettings] = useState(() => lsGet(profileKey('devSettings'), { logging: false, experimental: [] }));
  const [playbackSpeed, setPlaybackSpeed] = useState(() => global.settings.defaultSpeed || 1);
  const [sessionStart, setSessionStart] = useState(Date.now());

  const show = SHOWS[global.showIndex] ?? SHOWS[0];

  // ---- Persistence ----
  useEffect(() => { lsSet(profileKey('global'), global); }, [global, activeProfileId]);
  useEffect(() => {
    for (const s of SHOWS) lsSet(profileKey(LS_KEYS.watched(s.id)), watchedMap[s.id] ?? []);
  }, [watchedMap, activeProfileId]);
  useEffect(() => { lsSet(profileKey('continue'), continueList); }, [continueList, activeProfileId]);
  useEffect(() => { lsSet(profileKey('achv'), unlocked); }, [unlocked, activeProfileId]);
  useEffect(() => { lsSet(profileKey('favorites'), favorites); }, [favorites, activeProfileId]);
  useEffect(() => { lsSet(profileKey('watchlist'), watchlist); }, [watchlist, activeProfileId]);
  useEffect(() => { lsSet(profileKey('collections'), collections); }, [collections, activeProfileId]);
  useEffect(() => { lsSet(profileKey('playbackPositions'), playbackPositions); }, [playbackPositions, activeProfileId]);
  useEffect(() => { lsSet(profileKey('watchHistory'), watchHistory); }, [watchHistory, activeProfileId]);
  useEffect(() => { lsSet(profileKey('ratings'), ratings); }, [ratings, activeProfileId]);
  useEffect(() => { lsSet(profileKey('adventureHistory'), adventureHistory); }, [adventureHistory, activeProfileId]);
  useEffect(() => { lsSet(profileKey('savedAdventures'), savedAdventures); }, [savedAdventures, activeProfileId]);
  useEffect(() => { lsSet(profileKey('aiConfig'), aiConfig); }, [aiConfig, activeProfileId]);
  useEffect(() => { lsSet(profileKey('devSettings'), devSettings); }, [devSettings, activeProfileId]);
  useEffect(() => { lsSet(LS_KEYS.activeProfile, activeProfileId); }, [activeProfileId]);
  useEffect(() => { saveProfiles(profiles); }, [profiles]);

  // ---- Toast ----
  const showToast = useCallback((msg, opts = {}) => {
    setToast({ msg, tone: opts.tone || 'default' });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), opts.duration || 2400);
  }, []);

  // ---- Achievement engine ----
  const unlock = useCallback((id) => {
    setUnlocked(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        showToast(`${ach.name}`, { tone: 'achv', duration: 3000 });
        logSession('achievement_unlocked', { id, name: ach.name, profile: activeProfileId });
      }
      return next;
    });
  }, [showToast, activeProfileId]);

  const computeAchievementStats = useCallback(() => {
    const allWatched = Object.values(watchedMap).reduce((s, a) => s + a.length, 0);
    const totalAll = SHOWS.reduce((s, sh) => s + totalEpisodes(sh), 0);
    let seasonsCompleted = 0;
    let showsCompleted = 0;
    for (const s of SHOWS) {
      const watched = watchedMap[s.id] ?? [];
      let showDone = true;
      for (let si = 0; si < s.seasons.length; si++) {
        const seasonEps = s.seasons[si];
        let seasonDone = true;
        for (let e = 1; e <= seasonEps; e++) {
          if (!watched.includes(epKey(si + 1, e))) { seasonDone = false; showDone = false; }
        }
        if (seasonDone) seasonsCompleted++;
      }
      if (showDone) showsCompleted++;
    }
    const wt = getWatchTime();
    const watchHours = wt.totalMs / 3600000;
    const now = new Date();
    const nightOwl = now.getHours() >= 0 && now.getHours() < 5;
    const earlyBird = now.getHours() >= 4 && now.getHours() < 7;
    // Calculate streak
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let d = 0; d < 365; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const dayEntry = wt.sessions.find(s => s.date === date);
      if (dayEntry && dayEntry.ms > 0) streak++;
      else if (d > 0) break;
      else { streak = 0; break; }
    }
    return {
      totalWatched: allWatched,
      seasonsCompleted,
      showsCompleted,
      completionPct: totalAll > 0 ? (allWatched / totalAll) * 100 : 0,
      watchHours,
      nightOwl,
      earlyBird,
      streak,
      serversTried: global.serversTried.length,
      themesTried: global.themesTried.length,
      adventuresGenerated: adventureHistory.length,
      favoriteCount: favorites.length,
      collectionCount: collections.length,
      speedAbove2x: playbackSpeed > 2,
      hiddenFound: false, // Updated when all hidden achievements unlocked
    };
  }, [watchedMap, global.serversTried, global.themesTried, adventureHistory.length, favorites.length, collections.length, playbackSpeed]);

  const checkAchievements = useCallback(() => {
    const stats = computeAchievementStats();
    for (const ach of ACHIEVEMENTS) {
      if (unlocked.includes(ach.id)) continue;
      try {
        if (ach.check(stats)) unlock(ach.id);
      } catch {}
    }
  }, [computeAchievementStats, unlocked, unlock]);

  useEffect(() => { checkAchievements(); }, [checkAchievements]);

  // ---- Favorites / Watchlist ----
  const toggleFavorite = useCallback((showId, season, episode) => {
    const key = `${showId}:S${season}:E${episode}`;
    setFavorites(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  }, []);
  const isFavorite = useCallback((showId, season, episode) =>
    favorites.includes(`${showId}:S${season}:E${episode}`), [favorites]);

  const toggleWatchlist = useCallback((showId) => {
    setWatchlist(prev => prev.includes(showId) ? prev.filter(w => w !== showId) : [...prev, showId]);
  }, []);

  // ---- Collections ----
  const createCollection = useCallback((name) => {
    const col = { id: `col_${Date.now()}`, name, episodes: [], createdAt: Date.now() };
    setCollections(prev => [...prev, col]);
    showToast(`Collection created: ${name}`);
    return col.id;
  }, [showToast]);
  const deleteCollection = useCallback((colId) => {
    setCollections(prev => prev.filter(c => c.id !== colId));
    showToast('Collection deleted');
  }, [showToast]);
  const addToCollection = useCallback((colId, epRef) => {
    setCollections(prev => prev.map(c =>
      c.id === colId && !c.episodes.some(e => e.showId === epRef.showId && e.season === epRef.season && e.episode === epRef.episode)
        ? { ...c, episodes: [...c.episodes, epRef] }
        : c
    ));
  }, []);
  const removeFromCollection = useCallback((colId, showId, season, episode) => {
    setCollections(prev => prev.map(c =>
      c.id === colId ? { ...c, episodes: c.episodes.filter(e => !(e.showId === showId && e.season === season && e.episode === episode)) } : c
    ));
  }, []);

  // ---- Ratings ----
  const setRating = useCallback((showId, season, episode, rating) => {
    const key = `${showId}:S${season}:E${episode}`;
    setRatings(prev => ({ ...prev, [key]: rating }));
  }, []);
  const getRating = useCallback((showId, season, episode) => {
    return ratings[`${showId}:S${season}:E${episode}`] ?? 0;
  }, [ratings]);

  // ---- Playback positions ----
  const savePlaybackPosition = useCallback((showId, season, episode, position, duration) => {
    const key = `${showId}:${season}:${episode}`;
    setPlaybackPositions(prev => ({ ...prev, [key]: { position, duration, updatedAt: Date.now() } }));
  }, []);
  const getPlaybackPosition = useCallback((showId, season, episode) => {
    return playbackPositions[`${showId}:${season}:${episode}`] ?? null;
  }, [playbackPositions]);

  // ---- Watch history ----
  const addToWatchHistory = useCallback((entry) => {
    setWatchHistory(prev => [entry, ...prev].slice(0, 200));
  }, []);

  // ---- Mark watched / unwatched ----
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
      return [entry, ...without].slice(0, 20);
    });
    addToWatchHistory({ showId: show.id, season: global.season, episode: global.episode, ts: Date.now(), server: global.server });
    // Track ~22 min per episode for watch time estimation
    addWatchTime(22 * 60 * 1000);
    logSession('watch', { showId: show.id, season: global.season, episode: global.episode });
  }, [global.season, global.episode, show.id, addToWatchHistory]);

  const markUnwatched = useCallback((showId, season, episode) => {
    const key = epKey(season, episode);
    setWatchedMap(prev => {
      const list = prev[showId] ?? [];
      return { ...prev, [showId]: list.filter(k => k !== key) };
    });
    showToast('Marked unwatched');
  }, [showToast]);

  const markSeasonWatched = useCallback((showId, seasonIdx, seasonEps) => {
    setWatchedMap(prev => {
      const list = prev[showId] ?? [];
      const newKeys = [];
      for (let e = 1; e <= seasonEps; e++) {
        const k = epKey(seasonIdx, e);
        if (!list.includes(k)) newKeys.push(k);
      }
      if (!newKeys.length) return prev;
      return { ...prev, [showId]: [...list, ...newKeys] };
    });
    showToast(`Season ${seasonIdx} marked watched`);
  }, [showToast]);

  // ---- Navigation ----
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

  const gotoRandomEpisode = useCallback(() => {
    const si = Math.floor(Math.random() * show.seasons.length);
 const ei = Math.floor(Math.random() * show.seasons[si]) + 1;
    setGlobal(g => ({ ...g, season: si + 1, episode: ei }));
    showToast(`Random: S${String(si + 1).padStart(2, '0')}E${String(ei).padStart(2, '0')}`);
  }, [show, showToast]);

  // ---- postMessage listener for AUTO NEXT ----
  useEffect(() => {
    const handler = (event) => {
      if (!global.autoplay) return;
      let data = event.data;
      if (data == null) return;
      if (typeof data === 'string') {
        const lower = data.toLowerCase();
        if (lower === 'ended' || lower.indexOf('\"ended\"') !== -1 || lower.indexOf('\"event\":\"ended\"') !== -1) {
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

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') { e.preventDefault(); gotoNext(); }
      else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') { e.preventDefault(); gotoPrev(); }
      else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setAutoplay(!global.autoplay); showToast(`AUTO NEXT ${!global.autoplay ? 'ON' : 'OFF'}`); }
      else if (e.key >= '1' && e.key <= '9') {
        const id = Number(e.key);
        if (SERVERS[id]) { e.preventDefault(); setServer(id); showToast(`SERVER ${id}`); }
      }
      else if (e.key.toLowerCase() === 't') { e.preventDefault();
        const idx = THEMES.findIndex(t => t.id === global.theme);
        const next = THEMES[(idx + 1) % THEMES.length];
        setTheme(next.id); showToast(`THEME // ${next.name}`);
      }
      else if (e.key.toLowerCase() === 'r') { e.preventDefault(); gotoRandomEpisode(); }
      else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFavorite(show.id, global.season, global.episode); showToast(isFavorite(show.id, global.season, global.episode) ? 'FAVORITED' : 'UNFAVORITED'); }
      else if (e.key.toLowerCase() === 'w') { e.preventDefault(); markCurrentWatched(); }
      else if (e.key === ' ') { e.preventDefault(); /* play/pause — visual feedback only */ showToast('PLAY/PAUSE'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gotoNext, gotoPrev, setAutoplay, setServer, setTheme, global.autoplay, global.theme, showToast, gotoRandomEpisode, toggleFavorite, isFavorite, markCurrentWatched, show.id, global.season, global.episode]);

  // ---- Resets ----
  const resetCurrentShow = useCallback(() => {
    lsRemove(profileKey(LS_KEYS.watched(show.id)));
    setWatchedMap(prev => ({ ...prev, [show.id]: [] }));
    showToast(`RESET // ${show.shortName.toUpperCase()}`);
  }, [show.id, show.shortName, showToast, activeProfileId]);

  const resetAllProgress = useCallback(() => {
    for (const s of SHOWS) lsRemove(profileKey(LS_KEYS.watched(s.id)));
    lsRemove(profileKey('continue'));
    lsRemove(profileKey('achv'));
    setWatchedMap(() => { const out = {}; for (const s of SHOWS) out[s.id] = []; return out; });
    setContinueList([]);
    setUnlocked([]);
    setGlobal(g => ({ ...g, sessionWatched: 0 }));
    showToast('ALL PROGRESS RESET');
  }, [showToast, activeProfileId]);

  // ---- Profile management ----
  const switchProfile = useCallback((id) => {
    setActiveProfileId(id);
    showToast(`Profile: ${profiles.find(p => p.id === id)?.name || id}`);
  }, [profiles, showToast]);

  const createProfile = useCallback((name, avatar, pin) => {
    const p = { id: `profile_${Date.now()}`, name, avatar: avatar || name.slice(0, 2).toUpperCase(), pin: pin || null, isKids: false, createdAt: Date.now() };
    setProfiles(prev => [...prev, p]);
    return p;
  }, []);

  const deleteProfile = useCallback((id) => {
    if (id === 'default') return;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId('default');
    showToast('Profile deleted');
  }, [activeProfileId, showToast]);

  // ---- Adventure Mode helpers ----
  const generateAdventure = useCallback((config) => {
    const { mood, genreIds, showId, maxEps, unwatchedOnly, minLength, maxLength } = config;
    let pool = [];
    for (const s of SHOWS) {
      if (showId && s.id !== showId) continue;
      const genres = SHOW_GENRES[s.id] || [];
      if (mood && mood !== 'random') {
        const moodObj = MOODS.find(m => m.id === mood);
        if (moodObj && moodObj.genres.length && !moodObj.genres.some(g => genres.includes(g))) continue;
      }
      if (genreIds && genreIds.length && !genreIds.some(g => genres.includes(g))) continue;
      for (let si = 0; si < s.seasons.length; si++) {
        for (let e = 1; e <= s.seasons[si]; e++) {
          pool.push({ showId: s.id, showName: s.shortName, season: si + 1, episode: e });
        }
      }
    }
    if (unwatchedOnly) {
      pool = pool.filter(ep => !(watchedMap[ep.showId] ?? []).includes(epKey(ep.season, ep.episode)));
    }
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const count = Math.min(maxEps || 5, pool.length);
    const adventure = {
      id: `adv_${Date.now()}`,
      number: String(adventureHistory.length + 1).padStart(4, '0'),
      config,
      episodes: pool.slice(0, count),
      currentIdx: 0,
      completed: false,
      createdAt: Date.now(),
    };
    setAdventureHistory(prev => [...prev, adventure]);
    logSession('adventure_generated', { id: adventure.id, count });
    return adventure;
  }, [watchedMap, adventureHistory.length]);

  const saveAdventure = useCallback((adventure) => {
    setSavedAdventures(prev => {
      if (prev.find(a => a.id === adventure.id)) return prev;
      return [...prev, adventure];
    });
    showToast('Adventure saved');
  }, [showToast]);

  const deleteSavedAdventure = useCallback((id) => {
    setSavedAdventures(prev => prev.filter(a => a.id !== id));
    showToast('Adventure deleted');
  }, [showToast]);

  // ---- Recommendations ----
  const getRecommendations = useCallback((type = 'continue') => {
    const recommendations = [];
    if (type === 'continue' || type === 'all') {
      // Continue watching
      for (const entry of continueList.slice(0, 5)) {
        const s = SHOWS.find(x => x.id === entry.showId);
        if (s) recommendations.push({ type: 'continue', showId: entry.showId, showName: s.shortName, season: entry.season, episode: entry.episode });
      }
    }
    if (type === 'unwatched' || type === 'all') {
      for (const s of SHOWS) {
        const watched = watchedMap[s.id] ?? [];
        if (watched.length === 0) recommendations.push({ type: 'new', showId: s.id, showName: s.shortName, season: 1, episode: 1 });
      }
    }
    if (type === 'favorites' || type === 'all') {
      for (const fav of favorites.slice(0, 5)) {
        const [sid, rest] = fav.split(':S');
        const [sStr, eStr] = rest.split(':E');
        const s = SHOWS.find(x => x.id === sid);
        if (s) recommendations.push({ type: 'favorite', showId: sid, showName: s.shortName, season: Number(sStr), episode: Number(eStr) });
      }
    }
    return recommendations;
  }, [continueList, favorites, watchedMap]);

  // ---- Derived ----
  const currentServer = SERVERS[global.server] ?? SERVERS[1];
  const videoUrl = useMemo(
    () => currentServer.build(show.id, displaySeasonNumber(show, global.season), global.episode),
    [currentServer, show.id, global.season, show.seasonOffset, global.episode]
  );

  const stats = useMemo(() => {
    const totalAll = SHOWS.reduce((sum, s) => sum + totalEpisodes(s), 0);
    const watchedAll = SHOWS.reduce((sum, s) => sum + (watchedMap[s.id] ?? []).length, 0);
    const completionPct = totalAll > 0 ? ((watchedAll / totalAll) * 100).toFixed(1) : '0.0';
    const wt = getWatchTime();
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
      achievements: unlocked.length,
      watchHours: (wt.totalMs / 3600000).toFixed(1),
      streak: computeAchievementStats().streak,
      favoritesCount: favorites.length,
      collectionsCount: collections.length,
      adventuresCount: adventureHistory.length,
    };
  }, [show, watchedMap, global.sessionWatched, global.themesTried, global.serversTried, global.showsVisited, unlocked, favorites.length, collections.length, adventureHistory.length, computeAchievementStats]);

  const value = {
    // State
    global, show, watchedMap, continueList, unlocked, toast,
    profiles, activeProfile, activeProfileId,
    favorites, watchlist, collections, playbackPositions, watchHistory, ratings,
    adventureHistory, savedAdventures, aiConfig, devSettings,
    playbackSpeed, sessionStart,
    // Derived
    currentServer, videoUrl, stats,
    // Nav
    selectShow, setSeason, setEpisode, setServer, setAutoplay, setTheme, setSettings, setVideoBgUrl,
    gotoNext, gotoPrev, gotoRandomEpisode, markCurrentWatched, jumpTo,
    // Favorites & watchlist
    toggleFavorite, isFavorite, toggleWatchlist,
    // Collections
    createCollection, deleteCollection, addToCollection, removeFromCollection,
    // Ratings
    setRating, getRating,
    // Playback
    savePlaybackPosition, getPlaybackPosition,
    // Watch/unwatch
    markUnwatched, markSeasonWatched,
    // History
    addToWatchHistory,
    // Resets
    resetAllProgress, resetCurrentShow,
    // Profiles
    switchProfile, createProfile, deleteProfile,
    // Adventure
    generateAdventure, saveAdventure, deleteSavedAdventure,
    // AI
    aiConfig, setAiConfig,
    // Dev
    devSettings, setDevSettings,
    // Recommendations
    getRecommendations,
    // UI
    showToast,
    // Settings shortcuts
    setPlaybackSpeed,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
