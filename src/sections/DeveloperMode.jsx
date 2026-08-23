import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, exportAllData, clearAllData, logSession, getSessionId } from '../lib/storage.js';
import { SERVER_LIST } from '../data/servers.js';

export default function DeveloperMode() {
  const { devSettings, setDevSettings, global, showToast, stats, aiConfig, profiles, activeProfileId } = usePlayer();
  const [logs, setLogs] = useState([]);
  const [featureFlags, setFeatureFlags] = useState(devSettings.experimental || []);

  const sessionLog = lsGet('sessionLog', []);
  const sessionId = getSessionId();
  const storageKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('adventure:')) storageKeys.push(k);
  }

  const estimateStorageSize = () => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      total += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    return (total / 1024).toFixed(1);
  };

  const toggleFlag = (flag) => {
    const next = featureFlags.includes(flag) ? featureFlags.filter(f => f !== flag) : [...featureFlags, flag];
    setFeatureFlags(next);
    setDevSettings({ experimental: next });
    showToast(`${flag} ${next.includes(flag) ? 'ON' : 'OFF'}`);
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-3xl font-semibold tracking-tight'>Developer Mode</h2>
        <p className='mt-1 text-white/60'>Diagnostics, feature flags, and debugging tools.</p>
      </div>

      {/* System info */}
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>System</div>
        <div className='space-y-1 font-mono text-xs text-white/60'>
          <div>Session: <span className='text-white'>{sessionId}</span></div>
          <div>Profile: <span className='text-white'>{activeProfileId}</span></div>
          <div>Storage: <span className='text-white'>{estimateStorageSize()} KB</span> ({storageKeys.length} keys)</div>
          <div>Platform: <span className='text-white'>{typeof Capacitor !== 'undefined' ? 'Capacitor ' + Capacitor.getPlatform() : 'Web'}</span></div>
          <div>UA: <span className='text-white/40'>{navigator.userAgent?.slice(0, 80)}</span></div>
        </div>
      </div>

      {/* Provider config */}
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Provider</div>
        <div className='font-mono text-xs text-white/60 space-y-1'>
          <div>Current server: <span className='text-white'>{SERVER_LIST.find(s => s.id === global.server)?.name || global.server}</span></div>
          <div>Servers available: <span className='text-white'>{SERVER_LIST.length}</span></div>
          <div>AI provider: <span className='text-white'>{aiConfig.provider || 'none'}</span></div>
          <div>AI model: <span className='text-white'>{aiConfig.model || 'none'}</span></div>
        </div>
      </div>

      {/* Storage inspection */}
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Storage ({storageKeys.length} keys)</div>
        <div className='max-h-48 overflow-y-auto space-y-1'>
          {storageKeys.map(k => (
            <div key={k} className='flex items-center justify-between font-mono text-[11px]'>
              <span className='text-white/50 truncate max-w-[60%]'>{k}</span>
              <span className='text-white/30'>{((localStorage.getItem(k) || '').length * 2 / 1024).toFixed(1)}KB</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature flags */}
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Feature flags</div>
        <div className='space-y-2'>
          {['adventure_ai', 'profiles_v2', 'collections', 'offline_v2', 'recommendations'].map(flag => (
            <div key={flag} className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2'>
              <span className='font-mono text-xs text-white/70'>{flag}</span>
              <button onClick={() => toggleFlag(flag)}
                className={`relative h-6 w-10 rounded-full transition ${featureFlags.includes(flag) ? 'bg-white' : 'bg-white/15'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${featureFlags.includes(flag) ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Session log */}
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 flex items-center justify-between'>
          <div className='text-sm font-medium text-white'>Session log</div>
          <div className='text-xs text-white/40'>{sessionLog.length} entries</div>
        </div>
        <div className='max-h-48 overflow-y-auto space-y-1'>
          {[...sessionLog].reverse().slice(0, 30).map((entry, i) => (
            <div key={i} className='font-mono text-[11px] text-white/50'>
              <span className='text-white/30'>{new Date(entry.ts).toLocaleTimeString()}</span>
              {' '}<span className='text-white/60'>{entry.action}</span>
              {entry.showId && <span className='text-white/30'> · {entry.showId}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className='rounded-2xl border border-red-400/20 bg-red-500/5 p-5'>
        <div className='mb-3 text-sm font-medium text-red-200'>Danger zone</div>
        <div className='flex flex-wrap gap-2'>
          <button onClick={() => { const d = exportAllData(); navigator.clipboard.writeText(d); showToast('Data copied to clipboard'); }}
            className='rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40'>Copy all data</button>
          <button onClick={() => { clearAllData(); showToast('All data cleared'); setTimeout(() => window.location.reload(), 500); }}
            className='rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20'>Reset database</button>
        </div>
      </div>
    </div>
  );
}
