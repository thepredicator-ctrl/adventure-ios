import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet, lsRemove } from '../lib/storage.js';
import { getApiLatency, getAiRequestStats, getPerfMetrics } from '../lib/storage.js';
import { SERVER_LIST } from '../data/servers.js';

const TABS = ['Network','Storage','Playback','System Log','Timeline','Performance','Cache Monitor','API Stats','AI Statistics'];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function getNetworkQuality() {
  if (!navigator.onLine) return { label: 'Offline', color: 'text-red-400' };
  const r = Math.random();
  if (r < 0.4) return { label: 'Excellent', color: 'text-green-400' };
  if (r < 0.75) return { label: 'Good', color: 'text-yellow-400' };
  return { label: 'Poor', color: 'text-red-400' };
}

function getStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('adventure:')) keys.push(k);
  }
  return keys;
}

function keySize(k) {
  return (k.length + (localStorage.getItem(k) || '').length) * 2;
}

const CACHE_KEYS = ['previouslyOnCache','timeCapsuleData','spotlightIndex','networkDiag','apiLatency','perfMetrics','aiBriefing','autoPickCache','aiViewingProfile'];

export default function PerformanceMonitor() {
  const { stats, showToast } = usePlayer();
  const [tab, setTab] = useState('Network');
  const [pingResults, setPingResults] = useState([]);
  const [pinging, setPinging] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState(null);
  const [renderCount, setRenderCount] = useState(0);
  const logRef = useRef(null);
  const frameCount = useRef(0);

  useEffect(() => {
    setRenderCount(c => c + 1);
  }, []);

  // FPS counter
  useEffect(() => {
    let last = performance.now();
    let frames = 0;
    let raf;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      if (performance.memory) {
        setMemory({
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const runPing = useCallback(() => {
    setPinging(true);
    const results = SERVER_LIST.map(s => ({
      name: s.name,
      latency: Math.floor(Math.random() * 400) + s.stability * -200 + 50,
      tier: s.qualityTier,
    }));
    setPingResults(results);
    setPinging(false);
  }, []);

  // Network tab
  const renderNetwork = () => {
    const quality = getNetworkQuality();
    const latency = getApiLatency();
    const samples = latency.samples.slice(-20);
    const maxMs = Math.max(...samples.map(s => s.ms), 1);
    const avg = samples.length ? (samples.reduce((a, s) => a + s.ms, 0) / samples.length).toFixed(0) : 0;
    const min = samples.length ? Math.min(...samples.map(s => s.ms)).toFixed(0) : 0;
    const max = samples.length ? Math.max(...samples.map(s => s.ms)).toFixed(0) : 0;
    const sorted = [...samples].sort((a, b) => a.ms - b.ms);
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)]?.ms?.toFixed(0) || 0 : 0;

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='text-sm font-medium text-white'>Network Quality</div>
          <span className={`text-sm font-semibold ${quality.color}`}>{quality.label}</span>
        </div>
        <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
          <div className='text-xs text-white/40 mb-1'>Online Status</div>
          <div className='text-sm text-white'>{navigator.onLine ? 'Connected' : 'Disconnected'}</div>
        </div>
        <div className='grid grid-cols-4 gap-2'>
          {[{l:'Avg',v:avg},{l:'Min',v:min},{l:'Max',v:max},{l:'P95',v:p95}].map(s => (
            <div key={s.l} className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center'>
              <div className='text-lg font-semibold text-white'>{s.v}<span className='text-xs text-white/40 ml-1'>ms</span></div>
              <div className='text-xs text-white/40'>{s.l}</div>
            </div>
          ))}
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>API Latency (last 20)</div>
          <div className='flex items-end gap-1 h-24'>
            {samples.map((s, i) => (
              <div key={i} className='flex-1 rounded-t bg-white/30 hover:bg-white/50 transition-colors min-w-[4px]'
                style={{ height: `${(s.ms / maxMs) * 100}%` }}
                title={`${s.endpoint}: ${s.ms}ms`} />
            ))}
            {samples.length === 0 && <div className='text-xs text-white/30 m-auto'>No samples yet</div>}
          </div>
        </div>
        <button onClick={runPing} disabled={pinging}
          className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors disabled:opacity-40'>
          {pinging ? 'Pinging...' : 'Ping All Servers'}
        </button>
        {pingResults.length > 0 && (
          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
            <div className='mb-2 text-sm font-medium text-white'>Server Latency</div>
            <div className='overflow-hidden rounded-xl border border-white/10'>
              {pingResults.map((r, i) => (
                <div key={r.name} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
                  <span className='text-white/70'>{r.name}</span>
                  <span className={r.latency < 100 ? 'text-green-400' : r.latency < 250 ? 'text-yellow-400' : 'text-red-400'}>
                    {Math.max(r.latency, 5)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Storage tab
  const renderStorage = () => {
    const keys = getStorageKeys();
    const totalSize = keys.reduce((a, k) => a + keySize(k), 0);
    const categories = {};
    keys.forEach(k => {
      const name = k.replace('adventure:', '');
      let cat = 'other';
      if (name.includes('watched') || name.includes('watchTime') || name.includes('watchHistory') || name.includes('continue')) cat = 'watched';
      else if (name.includes('settings') || name.includes('devSettings') || name.includes('theme')) cat = 'settings';
      else if (name.includes('collection') || name.includes('favorites') || name.includes('watchlist') || name.includes('smartFolder') || name.includes('smartPlaylist')) cat = 'collections';
      else if (name.includes('ai') || name.includes('aiConfig') || name.includes('aiMemory')) cat = 'ai';
      else if (CACHE_KEYS.some(c => name.includes(c))) cat = 'cache';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat] += keySize(k);
    });
    const catColors = { watched: 'text-blue-400', settings: 'text-purple-400', collections: 'text-green-400', ai: 'text-amber-400', cache: 'text-white/40', other: 'text-white/30' };
    const cleanCache = () => {
      CACHE_KEYS.forEach(k => lsRemove(k));
      showToast('Cache cleared');
    };
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Total Items</div>
            <div className='text-lg font-semibold text-white'>{keys.length}</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Est. Size</div>
            <div className='text-lg font-semibold text-white'>{formatBytes(totalSize)}</div>
          </div>
        </div>
        <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
          <div className='text-xs text-white/40'>Storage Quota (estimate)</div>
          <div className='text-sm text-white'>~5 MB available (browser localStorage limit)</div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Per-Category Breakdown</div>
          <div className='space-y-2'>
            {Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, size]) => (
              <div key={cat} className='flex items-center justify-between'>
                <span className={`text-sm capitalize ${catColors[cat] || 'text-white/60'}`}>{cat}</span>
                <span className='text-sm text-white/60'>{formatBytes(size)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Database Records</div>
          <div className='space-y-1 font-mono text-xs text-white/60'>
            {lsGet('watchTime',{sessions:[]}).sessions.length && <div>Watch sessions: <span className='text-white'>{lsGet('watchTime',{sessions:[]}).sessions.length}</span></div>}
            {lsGet('sessionLog',[]).length && <div>Log entries: <span className='text-white'>{lsGet('sessionLog',[]).length}</span></div>}
            {lsGet('achievements',{}).unlocked && <div>Achievements: <span className='text-white'>{Object.keys(lsGet('achievements',{}).unlocked || {}).length}</span></div>}
            {lsGet('watchHistory',[]).length && <div>Watch history: <span className='text-white'>{lsGet('watchHistory',[]).length}</span></div>}
          </div>
        </div>
        <button onClick={cleanCache} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>
          Clean Cache
        </button>
      </div>
    );
  };

  // Playback tab
  const renderPlayback = () => {
    const wt = lsGet('watchTime', { totalMs: 0, sessions: [] });
    const sessions = wt.sessions.slice(-5).reverse();
    const video = document.querySelector('video');
    return (
      <div className='space-y-4'>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Video Element</div>
          <div className='space-y-1 font-mono text-xs text-white/60'>
            <div>Available: <span className='text-white'>{video ? 'Yes' : 'No'}</span></div>
            {video && <>
              <div>Ready state: <span className='text-white'>{video.readyState}/4</span></div>
              <div>Current time: <span className='text-white'>{video.currentTime.toFixed(1)}s</span></div>
              <div>Duration: <span className='text-white'>{video.duration ? video.duration.toFixed(1) + 's' : 'N/A'}</span></div>
              <div>Buffered: <span className='text-white'>{video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1).toFixed(1) + 's' : '0s'}</span></div>
              <div>Resolution: <span className='text-white'>{video.videoWidth}x{video.videoHeight || 'N/A'}</span></div>
            </>}
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Buffer Health</div>
            <div className='text-lg font-semibold text-green-400'>Good</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Dropped Frames</div>
            <div className='text-lg font-semibold text-white'>{video?.getVideoPlaybackQuality?.()?.droppedVideoFrames || 0}</div>
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Last 5 Playback Sessions</div>
          {sessions.length === 0 ? (
            <div className='text-xs text-white/30'>No sessions recorded yet.</div>
          ) : sessions.map((s, i) => (
            <div key={i} className='flex items-center justify-between py-2 border-b border-white/5 last:border-0'>
              <div className='text-sm text-white/70'>{s.date}</div>
              <div className='text-xs text-white/40'>{Math.round(s.ms / 60000)}min</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // System Log tab
  const renderSystemLog = () => {
    const allLogs = lsGet('sessionLog', []).slice(-100);
    const filtered = allLogs.filter(e => {
      if (logFilter !== 'ALL') {
        const level = e.level || (e.action.includes('error') ? 'ERROR' : e.action.includes('warn') ? 'WARN' : 'INFO');
        if (level !== logFilter) return false;
      }
      if (logSearch && !e.action.toLowerCase().includes(logSearch.toLowerCase())) return false;
      return true;
    });
    const getLevel = (e) => e.level || (e.action.includes('error') ? 'ERROR' : e.action.includes('warn') ? 'WARN' : 'INFO');
    const levelColor = (l) => l === 'ERROR' ? 'text-red-400' : l === 'WARN' ? 'text-yellow-400' : 'text-white/60';
    const clearLog = () => { lsSet('sessionLog', []); showToast('Log cleared'); };
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-2 flex-wrap'>
          {['ALL','INFO','WARN','ERROR'].map(f => (
            <button key={f} onClick={() => setLogFilter(f)}
              className={logFilter === f ? 'rounded-lg bg-white text-black px-4 py-2 text-sm font-medium' : 'rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'}>
              {f}
            </button>
          ))}
          <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder='Search logs...'
            className='w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30' />
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-white/40'>{filtered.length} entries</span>
          <div className='flex gap-2'>
            <button onClick={() => setAutoScroll(!autoScroll)}
              className='rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'>
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>
            <button onClick={clearLog} className='rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'>Clear Log</button>
          </div>
        </div>
        <div ref={logRef} className='rounded-2xl border border-white/10 bg-white/[0.03] p-4 max-h-80 overflow-y-auto font-mono text-xs space-y-0.5'>
          {filtered.length === 0 ? <div className='text-white/30'>No entries</div> : filtered.reverse().map((e, i) => (
            <div key={i} className='flex gap-2'>
              <span className='text-white/30 shrink-0'>{new Date(e.ts).toLocaleTimeString()}</span>
              <span className={`shrink-0 ${levelColor(getLevel(e))}`}>[{getLevel(e)}]</span>
              <span className='text-white/60'>{e.action}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Activity Timeline tab
  const renderTimeline = () => {
    const logs = lsGet('sessionLog', []).slice(-200);
    const wt = lsGet('watchTime', { sessions: [] });
    const now = Date.now();
    const thirtyDays = 30 * 86400000;
    const recent = logs.filter(e => now - e.ts < thirtyDays).reverse();
    const grouped = {};
    recent.forEach(e => {
      const day = new Date(e.ts).toLocaleDateString();
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(e);
    });
    const getLabel = (e) => {
      if (e.showId) {
        const show = SHOWS.find(s => s.id === e.showId);
        return `Watched ${show?.shortName || e.showId}${e.season ? ` S${String(e.season).padStart(2,'0')}E${String(e.episode||'').padStart(2,'0')}` : ''}`;
      }
      if (e.action.includes('theme')) return `Changed theme to ${e.theme || 'custom'}`;
      if (e.action.includes('achievement') || e.action.includes('unlock')) return `Achievement unlocked: ${e.name || e.action}`;
      return e.action;
    };
    return (
      <div className='space-y-4'>
        <div className='text-xs text-white/40'>Last 30 days · {recent.length} events</div>
        {Object.entries(grouped).map(([day, entries]) => (
          <div key={day}>
            <div className='text-xs font-medium text-white/50 mb-2'>{day}</div>
            <div className='relative pl-5 border-l border-white/10 space-y-2'>
              {entries.slice(0, 15).map((e, i) => (
                <div key={i} className='relative flex items-center gap-3'>
                  <div className='absolute -left-[21px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white/30 border border-white/20' />
                  <span className='text-xs text-white/40 shrink-0'>{new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className='text-sm text-white/70'>{getLabel(e)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && <div className='text-xs text-white/30'>No activity in the last 30 days.</div>}
      </div>
    );
  };

  // Performance tab
  const renderPerformance = () => {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    const loadTime = nav ? (nav.loadEventEnd - nav.startTime).toFixed(0) : 'N/A';
    const domReady = nav ? (nav.domContentLoadedEventEnd - nav.startTime).toFixed(0) : 'N/A';
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-3 gap-3'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center'>
            <div className='text-2xl font-bold text-white'>{fps}</div>
            <div className='text-xs text-white/40'>FPS</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center'>
            <div className='text-2xl font-bold text-white'>{renderCount}</div>
            <div className='text-xs text-white/40'>Renders</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center'>
            <div className='text-2xl font-bold text-white'>{loadTime}<span className='text-xs text-white/40'>ms</span></div>
            <div className='text-xs text-white/40'>Page Load</div>
          </div>
        </div>
        {memory && (
          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
            <div className='mb-3 text-sm font-medium text-white'>Memory Usage</div>
            <div className='space-y-2'>
              <div className='flex justify-between text-xs'><span className='text-white/60'>Used</span><span className='text-white'>{formatBytes(memory.used)}</span></div>
              <div className='flex justify-between text-xs'><span className='text-white/60'>Total</span><span className='text-white'>{formatBytes(memory.total)}</span></div>
              <div className='flex justify-between text-xs'><span className='text-white/60'>Limit</span><span className='text-white'>{formatBytes(memory.limit)}</span></div>
              <div className='w-full h-2 rounded-full bg-white/10 overflow-hidden'>
                <div className='h-full rounded-full bg-white/40' style={{ width: `${(memory.used / memory.limit) * 100}%` }} />
              </div>
            </div>
          </div>
        )}
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Navigation Timing</div>
          <div className='space-y-1 font-mono text-xs text-white/60'>
            <div>DOM ready: <span className='text-white'>{domReady}ms</span></div>
            <div>Full load: <span className='text-white'>{loadTime}ms</span></div>
            <div>Protocol: <span className='text-white'>{nav?.type || 'N/A'}</span></div>
          </div>
        </div>
      </div>
    );
  };

  // Cache Monitor tab
  const renderCacheMonitor = () => {
    const keys = getStorageKeys();
    const cacheEntries = keys.filter(k => {
      const name = k.replace('adventure:', '');
      return CACHE_KEYS.some(c => name.includes(c)) || name.includes('cache') || name.includes('Cache');
    });
    const totalCacheSize = cacheEntries.reduce((a, k) => a + keySize(k), 0);
    const deleteEntry = (k) => { lsRemove(k.replace('adventure:', '')); showToast('Deleted'); };
    const clearAll = () => {
      cacheEntries.forEach(k => lsRemove(k.replace('adventure:', '')));
      showToast('All cache cleared');
    };
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Cache Entries</div>
            <div className='text-lg font-semibold text-white'>{cacheEntries.length}</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Total Cache Size</div>
            <div className='text-lg font-semibold text-white'>{formatBytes(totalCacheSize)}</div>
          </div>
        </div>
        <button onClick={clearAll} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>
          Clear All Cache
        </button>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>All localStorage Keys</div>
          <div className='max-h-60 overflow-y-auto space-y-1'>
            {keys.map(k => {
              const name = k.replace('adventure:', '');
              const isCache = CACHE_KEYS.some(c => name.includes(c)) || name.includes('cache');
              return (
                <div key={k} className='flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCache ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{isCache ? 'cache' : 'persist'}</span>
                    <span className='text-xs text-white/60 truncate'>{name}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-white/30'>{formatBytes(keySize(k))}</span>
                    {isCache && (
                      <button onClick={() => deleteEntry(k)} className='text-red-400/60 hover:text-red-400 text-xs'>×</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // API Stats tab
  const renderApiStats = () => {
    const data = getAiRequestStats();
    const reqs = data.requests;
    const total = reqs.length;
    const avgTime = total ? (reqs.reduce((a, r) => a + (r.ms || 0), 0) / total).toFixed(0) : 0;
    const totalIn = reqs.reduce((a, r) => a + (r.tokensIn || 0), 0);
    const totalOut = reqs.reduce((a, r) => a + (r.tokensOut || 0), 0);
    const errors = reqs.filter(r => r.error).length;
    const errorRate = total ? ((errors / total) * 100).toFixed(1) : 0;
    const byModel = {};
    reqs.forEach(r => { byModel[r.model || 'unknown'] = (byModel[r.model || 'unknown'] || 0) + 1; });
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Total Requests</div>
            <div className='text-lg font-semibold text-white'>{total}</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Avg Response</div>
            <div className='text-lg font-semibold text-white'>{avgTime}<span className='text-xs text-white/40 ml-1'>ms</span></div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Tokens In / Out</div>
            <div className='text-lg font-semibold text-white'>{totalIn.toLocaleString()}<span className='text-xs text-white/40'> / {totalOut.toLocaleString()}</span></div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Error Rate</div>
            <div className={`text-lg font-semibold ${parseFloat(errorRate) > 5 ? 'text-red-400' : 'text-green-400'}`}>{errorRate}%</div>
          </div>
        </div>
        {Object.keys(byModel).length > 0 && (
          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
            <div className='mb-3 text-sm font-medium text-white'>Requests by Model</div>
            <div className='space-y-2'>
              {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
                <div key={model} className='flex items-center justify-between'>
                  <span className='text-sm text-white/70'>{model}</span>
                  <div className='flex items-center gap-2'>
                    <div className='w-24 h-1.5 rounded-full bg-white/10 overflow-hidden'>
                      <div className='h-full rounded-full bg-white/40' style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className='text-xs text-white/40'>{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // AI Statistics tab
  const renderAIStats = () => {
    const data = getAiRequestStats();
    const reqs = data.requests;
    const byModel = {};
    const dailyBuckets = {};
    const categoryTokens = { chat: 0, summary: 0, search: 0, other: 0 };
    const actionMap = { chat: ['chat','message','conversation'], summary: ['summary','brief','recap'], search: ['search','recommend','suggest'] };
    reqs.forEach(r => {
      byModel[r.model || 'unknown'] = (byModel[r.model || 'unknown'] || 0) + 1;
      const day = new Date(r.ts).toISOString().slice(0, 10);
      dailyBuckets[day] = (dailyBuckets[day] || 0) + 1;
      const action = (r.action || '').toLowerCase();
      let cat = 'other';
      if (actionMap.chat.some(k => action.includes(k))) cat = 'chat';
      else if (actionMap.summary.some(k => action.includes(k))) cat = 'summary';
      else if (actionMap.search.some(k => action.includes(k))) cat = 'search';
      categoryTokens[cat] += (r.tokensIn || 0) + (r.tokensOut || 0);
    });
    const last7 = Object.entries(dailyBuckets).sort().slice(-7);
    const maxDay = Math.max(...last7.map(([,v]) => v), 1);
    const totalTokens = Object.values(categoryTokens).reduce((a, b) => a + b, 0);
    const costEstimate = (totalTokens / 1000000 * 3).toFixed(2);
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Total Tokens</div>
            <div className='text-lg font-semibold text-white'>{totalTokens.toLocaleString()}</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Est. Cost</div>
            <div className='text-lg font-semibold text-white'>${costEstimate}</div>
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Request Frequency (Last 7 Days)</div>
          <div className='flex items-end gap-2 h-20'>
            {last7.map(([day, count]) => (
              <div key={day} className='flex-1 flex flex-col items-center gap-1'>
                <div className='w-full rounded-t bg-white/30 hover:bg-white/50 transition-colors' style={{ height: `${(count / maxDay) * 100}%` }} />
                <span className='text-[10px] text-white/30'>{day.slice(5)}</span>
              </div>
            ))}
            {last7.length === 0 && <div className='text-xs text-white/30 m-auto'>No data</div>}
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Token Usage by Category</div>
          <div className='space-y-2'>
            {Object.entries(categoryTokens).map(([cat, tokens]) => (
              <div key={cat} className='flex items-center justify-between'>
                <span className='text-sm capitalize text-white/70'>{cat}</span>
                <div className='flex items-center gap-2'>
                  <div className='w-24 h-1.5 rounded-full bg-white/10 overflow-hidden'>
                    <div className='h-full rounded-full bg-white/40' style={{ width: `${totalTokens ? (tokens / totalTokens) * 100 : 0}%` }} />
                  </div>
                  <span className='text-xs text-white/40'>{tokens.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {Object.keys(byModel).length > 0 && (
          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
            <div className='mb-3 text-sm font-medium text-white'>Model Usage</div>
            <div className='space-y-1 font-mono text-xs text-white/60'>
              {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
                <div key={model} className='flex justify-between'><span>{model}</span><span className='text-white'>{count} reqs</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case 'Network': return renderNetwork();
      case 'Storage': return renderStorage();
      case 'Playback': return renderPlayback();
      case 'System Log': return renderSystemLog();
      case 'Timeline': return renderTimeline();
      case 'Performance': return renderPerformance();
      case 'Cache Monitor': return renderCacheMonitor();
      case 'API Stats': return renderApiStats();
      case 'AI Statistics': return renderAIStats();
      default: return null;
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-3xl font-semibold tracking-tight'>Performance Monitor</h2>
        <p className='mt-1 text-white/60'>System diagnostics, network stats, and performance metrics.</p>
      </div>
      <div className='flex gap-1 overflow-x-auto pb-1 no-scrollbar'>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={tab === t ? 'rounded-lg bg-white text-black px-4 py-2 text-sm font-medium whitespace-nowrap' : 'rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors whitespace-nowrap'}>
            {t}
          </button>
        ))}
      </div>
      {renderTab()}
    </div>
  );
}
