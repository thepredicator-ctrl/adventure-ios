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
  settings:  'settings'
};
