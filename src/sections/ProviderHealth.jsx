import { useState, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { checkAllProviders, getProviderHealth, getStorageStatus } from '../lib/services/ProviderHealthService.js';
import { SERVERS } from '../data/servers.js';

function timeAgo(ts) {
  if (!ts) return 'NEVER';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'JUST NOW';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
  return `${Math.floor(diff / 86400000)}D AGO`;
}

export default function ProviderHealth() {
  const { global, showToast } = usePlayer();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [storage, setStorage] = useState(getStorageStatus());

  // Load cached health on mount
  useEffect(() => {
    setHealth(getProviderHealth());
    setStorage(getStorageStatus());
  }, []);

  const handleCheckAll = useCallback(async () => {
    setLoading(true);
    showToast('Checking all providers...');
    try {
      const result = await checkAllProviders(SERVERS);
      setHealth(result);
      setStorage(getStorageStatus());
      const errors = result.totalErrors;
      showToast(`Check complete: ${Object.keys(result.providers).length - errors} online, ${errors} errors`);
    } catch {
      showToast('Health check failed');
    }
    setLoading(false);
  }, [showToast]);

  const providers = health?.providers ? Object.entries(health.providers) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Provider Health</h2>
          <p className="mt-1 text-white/60">Embed provider diagnostics.</p>
        </div>
        <button
          onClick={handleCheckAll}
          disabled={loading}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-40"
        >
          {loading ? 'CHECKING...' : 'CHECK ALL'}
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <div className="font-mono text-xs text-white/60 animate-pulse">SCANNING PROVIDERS...</div>
        </div>
      )}

      {/* Provider cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {providers.map(([id, p]) => (
          <div key={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-2 text-sm font-medium text-white">{p.serverName}</div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${p.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={p.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                  {p.status === 'online' ? '● ONLINE' : '● OFFLINE'}
                </span>
              </div>
              <div className="text-white/60">LATENCY <span className="text-white">{p.latency} ms</span></div>
              <div className="text-white/30">CHECKED {timeAgo(p.lastChecked)}</div>
              {p.error && <div className="text-red-400/60">ERR {p.error}</div>}
            </div>
          </div>
        ))}
        {!loading && providers.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="text-sm text-white/40">No provider data yet.</div>
            <div className="mt-1 text-xs text-white/30">Click CHECK ALL to scan.</div>
          </div>
        )}
      </div>

      {/* Summary */}
      {health && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-sm font-medium text-white">Summary</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs font-mono text-white/40">TOTAL ERRORS</div>
              <div className="font-mono text-lg text-white">{health.totalErrors}</div>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40">NETWORK</div>
              <div className={`font-mono text-lg ${health.networkStatus === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                {health.networkStatus?.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40">STORAGE</div>
              <div className="font-mono text-lg text-white">{storage.usedKB} KB</div>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40">STORAGE STATUS</div>
              <div className={`font-mono text-lg ${storage.status === 'ok' ? 'text-green-400' : 'text-yellow-400'}`}>
                {storage.status?.toUpperCase()}
              </div>
            </div>
          </div>
          {health.lastChecked && (
            <div className="mt-3 font-mono text-xs text-white/30">
              LAST CHECKED {timeAgo(health.lastChecked)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
