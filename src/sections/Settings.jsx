import { useState, useRef, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SERVER_LIST } from '../data/servers.js';
import { exportAllData, importAllData, clearAllData } from '../lib/storage.js';
import { generateBackup, validateBackup, importBackup, confirmReplaceImport, getBackupSummary } from '../lib/services/LibraryBackupService.js';
import { AI_PROVIDERS, KNOWN_FREE_MODELS, fetchOpenRouterFreeModels, testConnection, maskKey } from '../lib/ai-providers.js';
import { secureGet, secureSet, secureRemove, clearAllSecure } from '../lib/secure-storage.js';

export default function Settings() {
  const {
    global, setServer, setSettings, resetAllProgress, resetCurrentShow,
    show, showToast, setVideoBgUrl, setPlaybackSpeed, playbackSpeed,
    devSettings, setDevSettings, profiles, switchProfile, createProfile, deleteProfile, activeProfileId, aiConfig, setAiConfig,
    aiMemory, setAiMemory, aiMemoryEnabled, setAiMemoryEnabled,
    appLockEnabled, setAppLockEnabled, appLockSettings, setAppLockSettings,
  } = usePlayer();
  const [confirm, setConfirm] = useState(null);
  const [videoInput, setVideoInput] = useState(global.settings.videoBgUrl || '');
  const [newProfileName, setNewProfileName] = useState('');
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const s = global.settings;

  // AI Settings state
  const [aiProvider, setAiProvider] = useState(aiConfig.provider || 'openrouter');
  const [aiModel, setAiModel] = useState(aiConfig.model || '');
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [freeModels, setFreeModels] = useState([]);
  const [aiStatus, setAiStatus] = useState('disconnected'); // disconnected | testing | connected | error
  const [aiError, setAiError] = useState('');
  const [showAiAdvanced, setShowAiAdvanced] = useState(false);
  const [aiTemperature, setAiTemperature] = useState(aiConfig.temperature ?? 0.7);
  const [aiMaxTokens, setAiMaxTokens] = useState(aiConfig.maxTokens ?? 512);

  // Load secure key on mount
  const storedKey = secureGet('ai_api_key');
  useEffect(() => {
    if (storedKey) {
      // Don't show full key, just indicate it's stored
      setAiKeyInput('STORED');
    }
    if (aiConfig.provider && aiConfig.model) {
      setAiProvider(aiConfig.provider);
      setAiModel(aiConfig.model);
    }
    // Load available free models
    if (aiConfig.provider) {
      setFreeModels(KNOWN_FREE_MODELS[aiConfig.provider] || []);
    }
  }, []);

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

  // ---- AI Key management ----
  const handleSaveKey = () => {
    if (!aiKeyInput || aiKeyInput === 'STORED') return;
    secureSet('ai_api_key', aiKeyInput.trim());
    setAiKeyInput('STORED');
    showToast('API key saved securely');
  };

  const handleClearKey = () => {
    secureRemove('ai_api_key');
    setAiKeyInput('');
    setAiStatus('disconnected');
    showToast('API key removed');
  };

  // ---- AI Provider switch ----
  const handleProviderChange = (newProvider) => {
    setAiProvider(newProvider);
    setAiModel('');
    setAiStatus('disconnected');
    setFreeModels(KNOWN_FREE_MODELS[newProvider] || []);
    setAiConfig({ ...aiConfig, provider: newProvider, model: '' });
  };

  // ---- Test connection ----
  const handleTestConnection = async () => {
    const key = secureGet('ai_api_key');
    if (!key && aiKeyInput !== 'STORED') {
      setAiError('Save an API key first');
      setAiStatus('error');
      return;
    }
    setAiStatus('testing');
    setAiError('');
    try {
      await testConnection(aiProvider, key);
      setAiStatus('connected');
      showToast('Connection successful');
    } catch (err) {
      setAiStatus('error');
      if (err.message === 'INVALID_API_KEY') setAiError('Invalid or expired API key.');
      else setAiError(err.message);
    }
  };

  // ---- Refresh free models ----
  const handleRefreshModels = async () => {
    const key = secureGet('ai_api_key');
    if (!key && aiKeyInput !== 'STORED') {
      showToast('Save an API key first');
      return;
    }
    if (aiProvider === 'openrouter' && key) {
      try {
        const models = await fetchOpenRouterFreeModels(key);
        setFreeModels(models);
        showToast(`${models.length} free models found`);
      } catch {
        setFreeModels(KNOWN_FREE_MODELS.openrouter || []);
        showToast('Could not fetch models');
      }
    }
  };

  // ---- Save AI config ----
  const handleSaveAiConfig = () => {
    setAiConfig({
      ...aiConfig,
      provider: aiProvider,
      model: aiModel,
      temperature: aiTemperature,
      maxTokens: aiMaxTokens,
    });
    showToast('AI configuration saved');
  };

  // ---- Clear AI credentials ----
  const handleClearAiCredentials = () => {
    setConfirm({
      msg: 'Clear all AI credentials and conversation history?',
      fn: () => {
        clearAllSecure();
        setAiKeyInput('');
        setAiStatus('disconnected');
        setAiModel('');
        setFreeModels([]);
        setAiConfig({ provider: '', apiKey: '', model: '' });
        // Clear conversation history
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith('adventure:ai_conv_')) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
        showToast('AI credentials cleared');
      },
    });
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
          <div className="flex items-center justify-between">
            <div><div className="text-sm text-white">Default speed</div><div className="text-xs text-white/50">Applied to new episodes.</div></div>
            <select value={s.defaultSpeed || 1} onChange={e => { updateSetting('defaultSpeed', parseFloat(e.target.value)); setPlaybackSpeed(parseFloat(e.target.value)); showToast(`Speed: ${e.target.value}x`); }}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(sp => <option key={sp} value={sp}>{sp}x</option>)}
            </select>
          </div>
          <ToggleRow label="Auto Next" desc="Auto-advance to next episode when video ends." value={s.autoplay ?? false} onChange={v => updateSetting('autoplay', v)} />
          <ToggleRow label="Skip intro" desc="Skip intro sequences when supported." value={s.skipIntro ?? false} onChange={v => updateSetting('skipIntro', v)} />
          <ToggleRow label="Skip outro" desc="Skip outro/credits when supported." value={s.skipOutro ?? false} onChange={v => updateSetting('skipOutro', v)} />
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

      {/* Daily Transmission toggle */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <ToggleRow label="Daily Transmission" desc="Show a startup experience when opening the application." value={s.dailyTransmission ?? true} onChange={v => { updateSetting('dailyTransmission', v); showToast(`Daily Transmission ${v ? 'ON' : 'OFF'}`); }} />
      </div>

      {/* Command Palette shortcut */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <div><div className="text-sm text-white">Command Palette</div><div className="text-xs text-white/50">Press Cmd+K (Mac) or Ctrl+K to open.</div></div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-mono text-white/40">⌘K</div>
        </div>
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

      {/* AI Configuration — Full rewrite */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white">Adventure AI</div>
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${aiStatus === 'connected' ? 'bg-green-400' : aiStatus === 'testing' ? 'bg-yellow-400 animate-pulse' : 'bg-white/30'}`} />
            <span className="text-[10px] font-mono text-white/40 uppercase">{aiStatus === 'connected' ? 'CONNECTED' : aiStatus === 'testing' ? 'TESTING' : aiStatus === 'error' ? 'ERROR' : 'DISCONNECTED'}</span>
          </div>
        </div>

        {/* Provider selector */}
        <div>
          <div className="text-xs text-white/50 mb-2 uppercase tracking-widest font-mono">AI Provider</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(AI_PROVIDERS).map(p => (
              <button key={p.id} onClick={() => handleProviderChange(p.id)}
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  aiProvider === p.id
                    ? 'border-white/60 bg-white/15 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/30'
                }`}>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <div className="text-xs text-white/50 mb-1 uppercase tracking-widest font-mono">API Key</div>
          {aiKeyInput === 'STORED' ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60 font-mono">
                {maskKey(secureGet('ai_api_key') || '')}
              </div>
              <button onClick={handleClearKey} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 transition hover:bg-red-500/20">Remove</button>
              <button onClick={() => setAiKeyInput('')} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/60 transition hover:border-white/40">Replace</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="password" value={aiKeyInput} onChange={e => setAiKeyInput(e.target.value)}
                placeholder={aiProvider === 'openrouter' ? 'sk-or-...' : 'hf_...'}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none" />
              <button onClick={handleSaveKey} disabled={!aiKeyInput.trim()}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 disabled:opacity-30">Save</button>
            </div>
          )}
        </div>

        {/* Model selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-white/50 uppercase tracking-widest font-mono">Model</div>
            <button onClick={handleRefreshModels} className="text-[10px] text-white/30 hover:text-white/60 transition">Refresh models</button>
          </div>
          <select value={aiModel} onChange={e => { setAiModel(e.target.value); }}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none">
            <option value="">Select a free model</option>
            {freeModels.map(m => (
              <option key={m.id} value={m.id}>{m.name} — FREE</option>
            ))}
          </select>
          {aiModel && (
            <div className="mt-2 flex items-center gap-3 font-mono text-[11px]">
              <span className="text-white/40">MODEL</span>
              <span className="text-white/70">{freeModels.find(m => m.id === aiModel)?.name || aiModel}</span>
              <span className="text-white/30">STATUS</span>
              <span className="text-green-400">● FREE</span>
              <span className="text-white/30">PROVIDER</span>
              <span className="text-white/70">{AI_PROVIDERS[aiProvider]?.name || aiProvider}</span>
            </div>
          )}
        </div>

        {/* Test + Save */}
        <div className="flex gap-2">
          <button onClick={handleTestConnection} disabled={aiStatus === 'testing'}
            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 disabled:opacity-50">
            {aiStatus === 'testing' ? 'TESTING...' : 'TEST CONNECTION'}
          </button>
          <button onClick={handleSaveAiConfig} disabled={!aiProvider || !aiModel}
            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 disabled:opacity-30">
            SAVE CONFIG
          </button>
        </div>

        {aiError && <div className="text-xs text-red-300/80">{aiError}</div>}

        {/* Advanced AI settings */}
        <div className="border-t border-white/10 pt-4">
          <button onClick={() => setShowAiAdvanced(!showAiAdvanced)} className="text-xs text-white/40 hover:text-white/60 uppercase tracking-widest font-mono transition">
            {showAiAdvanced ? '−' : '+'} ADVANCED AI
          </button>
          {showAiAdvanced && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/50">Temperature</div>
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="1" step="0.1" value={aiTemperature} onChange={e => setAiTemperature(parseFloat(e.target.value))}
                    className="h-1 w-24 appearance-none rounded-full bg-white/10 accent-white" />
                  <span className="font-mono text-xs text-white/50 w-8 text-right">{aiTemperature}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/50">Max response length</div>
                <select value={aiMaxTokens} onChange={e => setAiMaxTokens(parseInt(e.target.value))}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white focus:border-white/30 focus:outline-none">
                  {[128, 256, 512, 1024].map(v => <option key={v} value={v}>{v} tokens</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/50">AI History</div>
                <button onClick={() => {
                  const keys = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k.startsWith('adventure:ai_conv_')) keys.push(k);
                  }
                  keys.forEach(k => localStorage.removeItem(k));
                  showToast('AI history cleared');
                }} className="text-xs text-white/40 hover:text-red-300 transition">Clear AI history</button>
              </div>
            </div>
          )}
        </div>

        {/* Clear credentials */}
        <div className="border-t border-white/10 pt-4">
          <button onClick={handleClearAiCredentials} className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/20">
            Clear AI Credentials
          </button>
        </div>
      </div>

      {/* AI Privacy */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">AI Privacy</div>
        <div className="space-y-2 text-xs text-white/50 leading-relaxed">
          <p>API keys are stored securely using obfuscated local storage. On iOS, credentials can be migrated to Keychain.</p>
          <p>AI requests are sent directly to your selected provider. No data is routed through third-party servers.</p>
          <p>Local viewing history is only included in AI requests when necessary to answer your question. The system provides the minimum relevant context.</p>
          <p>The app minimizes unnecessary data sent to AI providers. You control when and what is shared.</p>
        </div>
      </div>

      {/* AI Memory */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white">AI Memory</div>
          <ToggleRow label="" value={aiMemoryEnabled} onChange={setAiMemoryEnabled} />
        </div>
        <div className="text-xs text-white/50">Allow AI to remember your viewing preferences and provide personalized recommendations.</div>
        {aiMemoryEnabled && (
          <div className="space-y-2">
            {aiMemory.length === 0 ? (
              <div className="text-xs text-white/40 font-mono py-3 text-center">No memories stored. The AI will learn from your interactions.</div>
            ) : (
              aiMemory.map((mem, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/80 truncate">{mem.content}</div>
                    <div className="text-[10px] font-mono text-white/30 mt-0.5">{new Date(mem.ts).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => setAiMemory(prev => prev.filter((_, j) => j !== i))} className="ml-2 text-xs text-white/30 hover:text-red-300 transition">×</button>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <input type="text" id="new-memory-input" placeholder="e.g. I prefer episodes under 25 minutes" className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none" />
              <button onClick={() => {
                const input = document.getElementById('new-memory-input');
                if (input?.value.trim()) {
                  setAiMemory(prev => [...prev, { content: input.value.trim(), ts: Date.now() }]);
                  input.value = '';
                  showToast('Memory added');
                }
              }} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40">ADD</button>
            </div>
            {aiMemory.length > 0 && (
              <button onClick={() => setConfirm({ msg: 'Clear all AI memories?', fn: () => { setAiMemory([]); showToast('AI memories cleared'); } })}
                className="text-xs text-white/30 hover:text-red-300 transition">Clear all memories</button>
            )}
          </div>
        )}
      </div>

      {/* App Lock */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white">App Lock</div>
          <ToggleRow label="" value={appLockEnabled} onChange={setAppLockEnabled} />
        </div>
        <div className="text-xs text-white/50">Require authentication to access the app. Uses device biometrics (Face ID / Touch ID) when available.</div>
        {appLockEnabled && (
          <div className="space-y-3">
            <ToggleRow label="Lock when backgrounded" desc="Require auth when returning to the app." value={appLockSettings.lockOnBackground} onChange={v => setAppLockSettings({ ...appLockSettings, lockOnBackground: v })} />
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">Lock after inactivity</div>
              <select value={appLockSettings.lockAfterInactivity || 0} onChange={e => setAppLockSettings({ ...appLockSettings, lockAfterInactivity: Number(e.target.value) })}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white focus:border-white/30 focus:outline-none">
                <option value={0}>Disabled</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={900}>15 minutes</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Data management - Enhanced */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <div className="text-sm font-medium text-white">Library Backup</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white">Export backup</button>
          <button onClick={() => importRef.current?.click()} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white">Import backup</button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={e => {
            const file = e.target.files?.[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const validation = validateBackup(reader.result);
              if (!validation.valid) { showToast(`Invalid backup: ${validation.errors[0]}`); return; }
              setConfirm({ msg: `Import ${validation.stats.totalKeys} keys?\n\nSize: ${validation.stats.estimatedSize}\n\nThis will MERGE with existing data.`, fn: () => { const r = importBackup(reader.result, 'merge'); if (r.success) { showToast(`Imported ${r.importedKeys} keys`); setTimeout(() => window.location.reload(), 500); } else showToast(`Import failed: ${r.error}`); } });
            };
            reader.readAsText(file); e.target.value = '';
          }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
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
          <div>adventure · v2.1</div>
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
      <div><div className="text-sm text-white">{label}</div>{desc && <div className="mt-0.5 text-xs text-white/50">{desc}</div>}</div>
      <button onClick={() => onChange(!value)} role="switch" aria-checked={value}
        className={`relative h-7 w-12 rounded-full transition ${value ? 'bg-white' : 'bg-white/15'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}