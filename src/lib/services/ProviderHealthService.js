/**
 * ProviderHealthService - monitors embed provider health.
 */
const CACHE_KEY = 'adventure:provider_health';
const CACHE_TTL = 60000;

let healthData = null;
let lastFetch = 0;

function getDefaultHealth() {
  return {
    providers: {},
    lastChecked: null,
    totalErrors: 0,
    networkStatus: navigator.onLine ? 'online' : 'offline',
  };
}

function loadHealth() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Date.now() - data.lastChecked < CACHE_TTL * 30) return data;
    }
  } catch {}
  return null;
}

function saveHealth(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

export async function checkProviderHealth(serverId, serverName, buildUrl) {
  const start = performance.now();
  try {
    const url = buildUrl('tt1305826', 1, 1); // Test with Adventure Time S01E01
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latency = Math.round(performance.now() - start);
    return { serverId, serverName, status: 'online', latency, lastChecked: Date.now(), error: null };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return { serverId, serverName, status: 'error', latency, lastChecked: Date.now(), error: err.name === 'AbortError' ? 'TIMEOUT' : err.message };
  }
}

export async function checkAllProviders(servers) {
  const results = {};
  const entries = Object.entries(servers).filter(([k]) => k !== 'default');
  const checks = entries.map(async ([id, server]) => {
    const r = await checkProviderHealth(Number(id), server.name, server.build);
    results[id] = r;
  });
  await Promise.allSettled(checks);
  const totalErrors = Object.values(results).filter(r => r.status === 'error').length;
  const data = {
    providers: results,
    lastChecked: Date.now(),
    totalErrors,
    networkStatus: navigator.onLine ? 'online' : 'offline',
  };
  healthData = data;
  lastFetch = Date.now();
  saveHealth(data);
  return data;
}

export function getProviderHealth() {
  if (healthData && Date.now() - lastFetch < CACHE_TTL) return healthData;
  const saved = loadHealth();
  if (saved) {
    healthData = saved;
    lastFetch = saved.lastChecked || 0;
    return saved;
  }
  return getDefaultHealth();
}

export function getStorageStatus() {
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      used += k.length + (localStorage.getItem(k) || '').length;
    }
  } catch {}
  // Rough estimate: 5MB typical limit
  const estimate = (used / 1024).toFixed(1);
  return {
    usedKB: estimate,
    items: localStorage.length,
    status: used > 4000000 ? 'near_limit' : 'ok',
  };
}
