const PREFIX = 'adventure:';

export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key, val) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(val));
  } catch {
    /* storage may be unavailable */
  }
}

export function lsRemove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const LS_KEYS = {
  global:    'global',
  show:      id => `show:${id}`,
  watched:   id => `watched:${id}`,
  continue:  'continue',
  achv:      'achv',
  theme:     'theme',
  settings:  'settings',
  // New keys
  profiles:           'profiles',
  activeProfile:      'activeProfile',
  favorites:          'favorites',
  watchlist:          'watchlist',
  collections:        'collections',
  playbackPositions:  'playbackPositions',
  watchHistory:       'watchHistory',
  watchTime:          'watchTime',
  sessionLog:         'sessionLog',
  achievements:       'achievements',
  adventureHistory:   'adventureHistory',
  savedAdventures:    'savedAdventures',
  aiConfig:           'aiConfig',
  devSettings:        'devSettings',
  genreMeta:          'genreMeta',
  episodeMeta:        'episodeMeta',
  shortcuts:          'shortcuts',
  ratings:            'ratings',
};

/* ---- Data export / import ---- */

export function exportAllData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) {
      data[k] = localStorage.getItem(k);
    }
  }
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    let count = 0;
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith(PREFIX)) {
        localStorage.setItem(k, v);
        count++;
      }
    }
    return { success: true, count };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function clearAllData() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  return keysToRemove.length;
}

/* ---- Session tracking ---- */

export function getSessionId() {
  let id = lsGet('_sessionId', null);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    lsSet('_sessionId', id);
  }
  return id;
}

export function logSession(action, meta = {}) {
  const log = lsGet('sessionLog', []);
  log.push({
    ts: Date.now(),
    action,
    ...meta
  });
  // Keep last 500 entries
  if (log.length > 500) log.splice(0, log.length - 500);
  lsSet('sessionLog', log);
}

export function getWatchTime() {
  return lsGet('watchTime', { totalMs: 0, sessions: [] });
}

export function addWatchTime(ms) {
  const wt = getWatchTime();
  wt.totalMs += ms;
  const today = new Date().toISOString().slice(0, 10);
  let todayEntry = wt.sessions.find(s => s.date === today);
  if (!todayEntry) {
    todayEntry = { date: today, ms: 0 };
    wt.sessions.push(todayEntry);
  }
  todayEntry.ms += ms;
  // Keep last 365 days
  if (wt.sessions.length > 365) wt.sessions.splice(0, wt.sessions.length - 365);
  lsSet('watchTime', wt);
}
