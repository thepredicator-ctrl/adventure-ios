import { useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SERVER_LIST } from '../data/servers.js';
import { exportAllData, importAllData, clearAllData } from '../lib/storage.js';

export default function Settings() {
  const {
    global, setServer, setSettings, resetAllProgress, resetCurrentShow,
    show, showToast, setVideoBgUrl, setPlaybackSpeed, playbackSpeed,
    devSettings, setDevSettings, profiles, switchProfile, createProfile, deleteProfile, activeProfileId, aiConfig, setAiConfig,
  } = usePlayer();
  const [confirm, setConfirm] = useState(null);
  const [videoInput, setVideoInput] = useState(global.settings.videoBgUrl || '');
  const [newProfileName, setNewProfileName] = useState('');
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const s = global.settings;

  const doReset = (fn) => { fn(); setConfirm(null); };
  const updateSetting = (key, val) => setSettings({ [key]: val });

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `adventure-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importAllData(reader.result);
      if (result.success) { showToast(`Imported ${result.count} keys`); setTimeout(() => window.location.reload(), 500); }
      else showToast(`Import failed: ${result.error}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearCache = () => {
    const count = clearAllData();
    showToast(`Cleared ${count} entries`);
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-white/60">All preferences stored locally.</p>
      </div>

      {/* Default server */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Default server</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SERVER_LIST.map(sv => (
            <button key={sv.id} onClick={() => { setServer(sv.id); showToast(`Default server: ${sv.name}`); }}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                global.server === sv.id ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
              }`}>
              <div className="font-mono text-xs text-white/40">{String(sv.id).padStart(2, '0')}</div>
              <div className="mt-0.5 font-medium">{sv.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Playback settings */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Playback</div>
        <div className="space-y-4">
          {/* Default speed */}
          <div className="flex items-center justify-between">
            <div><div className="text-sm text-white">Default speed</div><div className="text-xs text-white/50">Applied to new episodes.</div></div>
            <select value={s.defaultSpeed || 1} onChange={e => { updateSetting('defaultSpeed', parseFloat(e.target.value)); setPlaybackSpeed(parseFloat(e.target.value)); showToast(`Speed: ${e.target.value}x`); }}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(sp => <option key={sp} value={sp}>{sp}x</option>)}
            </select>
          </div>
          {/* Autoplay */}
          <ToggleRow label="Auto Next" desc="Auto-advance to next episode when video ends." value={s.autoplay ?? false} onChange={v => updateSetting('autoplay', v)} />
          {/* Skip intro */}
          <ToggleRow label="Skip intro" desc="Skip intro sequences when supported." value={s.skipIntro ?? false} onChange={v => updateSetting('skipIntro', v)} />
          {/* Skip outro */}
          <ToggleRow label="Skip outro" desc="Skip outro/credits when supported." value={s.skipOutro ?? false} onChange={v => updateSetting('skipOutro', v)} />
          {/* Ad block */}
          <ToggleRow label="Ad shield" desc="Block ads from embed sources." value={s.adBlock !== false} onChange={v => { updateSetting('adBlock', v); showToast(`Ad shield ${v ? 'ON' : 'OFF'}`); }} />
        </div>
      </div>

      {/* Video background */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <ToggleRow label="Video background" desc="Play a video behind the topographic background." value={s.videoBg} onChange={v => { updateSetting('videoBg', v); showToast(`Video BG ${v ? 'ON' : 'OFF'}`); }} />
        {s.videoBg && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={videoInput} onChange={e => setVideoInput(e.target.value)} placeholder="https://example.com/bg.mp4"
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none" />
              <button onClick={() => { if (videoInput.trim()) { setVideoBgUrl(videoInput.trim()); showToast('Video BG URL set'); } }}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white">Apply</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white">Pick local file</button>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return;
                const url = URL.createObjectURL(file); setVideoBgUrl(url); setVideoInput(url);
                showToast(`Video loaded: ${file.name}`);
              }} />
              {s.videoBgUrl && <button onClick={() => { updateSetting('videoBgUrl', ''); setVideoInput(''); showToast('Video BG cleared'); }}
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20">Clear</button>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50">Opacity</span>
              <input type="range" min="0.05" max="0.8" step="0.05" value={s.videoBgOpacity ?? 0.35} onChange={e => updateSetting('videoBgOpacity', parseFloat(e.target.value))}
                className="h-1 flex-1 appearance-none rounded-full bg-white/10 accent-white" />
              <span className="font-mono text-xs text-white/50">{(s.videoBgOpacity ?? 0.35).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* CRT toggle */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <ToggleRow label="CRT scanline overlay" desc="Subtle scanlines over the whole page (visual only)." value={s.crtEffect} onChange={v => updateSetting('crtEffect', v)} />
      </div>

      {/* Profiles */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Profiles</div>
        <div className="space-y-2">
          {profiles.map(p => (
            <div key={p.id} className={`flex items-center justify-between rounded-lg border px-4 py-2 ${p.id === activeProfileId ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/[0.02]'}`}>
              <button onClick={() => switchProfile(p.id)} className="flex items-center gap-3 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black border border-white/20 text-xs font-bold text-white">{p.avatar}</div>
                <span className="text-sm text-white">{p.name}</span>
                {p.id === activeProfileId && <span className="text-[10px] font-mono text-white/50">ACTIVE</span>}
              </button>
              {p.id !== 'default' && (
                <button onClick={() => deleteProfile(p.id)} className="text-xs text-white/40 hover:text-red-300 transition">DELETE</button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input type="text" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Profile name" className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none" />
          <button onClick={() => { if (newProfileName.trim()) { createProfile(newProfileName.trim()); setNewProfileName(''); showToast('Profile created'); } }}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40">Create</button>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Adventure AI</div>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-white/50 mb-1">API Endpoint</div>
            <input type="text" value={aiConfig.provider || ''} onChange={e => setAiConfig({ ...aiConfig, provider: e.target.value })} placeholder="https://api.example.com/v1"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none" />
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">API Key</div>
            <input type="password" value={aiConfig.apiKey || ''} onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })} placeholder="sk-..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none" />
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">Model</div>
            <input type="text" value={aiConfig.model || ''} onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })} placeholder="gpt-4"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Data</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white">Export data</button>
          <button onClick={() => importRef.current?.click()} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white">Import data</button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setConfirm({ msg: `Reset all progress for ${show.shortName}?`, fn: resetCurrentShow })}
            className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white">Reset current show</button>
          <button onClick={() => setConfirm({ msg: 'Reset ALL progress across every show? This cannot be undone.', fn: resetAllProgress })}
            className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20">Reset everything</button>
          <button onClick={() => setConfirm({ msg: 'Clear all cached data? This will reset everything.', fn: handleClearCache })}
            className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20">Clear cache</button>
        </div>
      </div>

      {/* Developer mode */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <ToggleRow label="Developer mode" desc="Enable diagnostics and experimental features." value={s.developerMode ?? false}
          onChange={v => updateSetting('developerMode', v)} />
      </div>

      {/* App info */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">About</div>
        <div className="space-y-1 text-xs text-white/50 font-mono">
          <div>adventure · v2.0</div>
          <div>Platform: Capacitor iOS / Web</div>
          <div>Profile: {profiles.find(p => p.id === activeProfileId)?.name || 'default'}</div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-black p-6">
            <div className="text-sm text-white">{confirm.msg}</div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/40">Cancel</button>
              <button onClick={() => doReset(confirm.fn)} className="rounded-md border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-sm text-red-100 hover:bg-red-500/30">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div><div className="text-sm text-white">{label}</div>{desc && <div className="mt-0.5 text-xs text-white/50">{desc}</div>}</div></div>
      <button onClick={() => onChange(!value)} role="switch" aria-checked={value}
        className={`relative h-7 w-12 rounded-full transition ${value ? 'bg-white' : 'bg-white/15'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}