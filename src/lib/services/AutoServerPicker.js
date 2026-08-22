/**
 * AutoServerPicker — picks the best available embed server.
 *
 * Strategy:
 *  1. Run parallel HEAD probes (no-cors, 6s timeout) against all servers.
 *  2. Score each server:  qualityTier * 100  +  stability * 50  −  latency_penalty.
 *  3. Return the highest-scoring online server.
 *  4. Cache results for 5 minutes so we don't probe on every episode change.
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 min
const PROBE_TIMEOUT = 6000;
const TEST_ID = 'tt1305826'; // Adventure Time
const TEST_S = 1;
const TEST_E = 1;

let cached = null; // { serverId, score, checkedAt, allResults }

/**
 * Probe a single server. Returns { serverId, name, online, latency, error }.
 */
async function probe(server) {
  const start = performance.now();
  try {
    const url = server.build(TEST_ID, TEST_S, TEST_E);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT);
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(timer);
    return {
      serverId: server.id,
      name: server.name,
      online: true,
      latency: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      serverId: server.id,
      name: server.name,
      online: false,
      latency: Math.round(performance.now() - start),
      error: err.name === 'AbortError' ? 'TIMEOUT' : err.message,
    };
  }
}

/**
 * Compute a score for a server result. Higher = better.
 */
function score(server, result) {
  if (!result.online) return -1;
  const qualityScore = (server.qualityTier === 1 ? 100 : server.qualityTier === 2 ? 60 : 30);
  const stabilityScore = server.stability * 50;
  // Latency penalty: >3s starts hurting, >5s a lot
  const latencyPenalty = result.latency > 5000 ? 40 : result.latency > 3000 ? 20 : 0;
  return qualityScore + stabilityScore - latencyPenalty;
}

/**
 * Run the full auto-pick cycle. Returns the best server id.
 * Falls back to server 1 if nothing responds.
 */
export async function autoPickBestServer(servers) {
  // Return cache if fresh
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached.serverId;
  }

  const entries = Object.values(servers);
  const results = await Promise.allSettled(entries.map(s => probe(s)));
  const allResults = results.map(r => r.status === 'fulfilled' ? r.value : { serverId: 0, online: false, latency: 9999, error: 'REJECTED' });

  let bestId = 1;
  let bestScore = -Infinity;

  for (const r of allResults) {
    const srv = entries.find(s => s.id === r.serverId);
    if (!srv) continue;
    const s = score(srv, r);
    if (s > bestScore) {
      bestScore = s;
      bestId = r.serverId;
    }
  }

  // If every server failed, fall back to 1
  if (bestScore < 0) bestId = 1;

  cached = { serverId: bestId, score: bestScore, checkedAt: Date.now(), allResults };
  return bestId;
}

/**
 * Get the cached pick result (for UI display) without probing.
 */
export function getAutoPickCache() {
  return cached;
}

/**
 * Force-clear the cache so next pick re-probes.
 */
export function clearAutoPickCache() {
  cached = null;
}
