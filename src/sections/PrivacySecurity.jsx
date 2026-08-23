import { useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet, lsRemove, exportAllData, importAllData, clearAllData } from '../lib/storage.js';

const TABS = ['App Lock', 'Profiles', 'Import/Export', 'Encryption', 'Privacy Dashboard', 'Data Controls'];
const TIMEOUTS = ['immediately', '1min', '5min', '15min', '30min'];

export default function PrivacySecurity() {
  const { profiles, activeProfileId, switchProfile, addProfile, deleteProfile, showToast } = usePlayer();
  const [tab, setTab] = useState('App Lock');
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState('idle'); // idle | set | confirm
  const [newProfileName, setNewProfileName] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmReset2, setConfirmReset2] = useState(false);
  const fileRef = useRef(null);

  const privacy = lsGet('privacySettings', { faceIdEnabled: false, pin: null, lockTimeout: 'immediately' });
  const setPrivacy = (updates) => lsSet('privacySettings', { ...privacy, ...updates });

  // App Lock tab
  const renderAppLock = () => {
    const setPin = () => {
      if (pinStep === 'idle') { setPinStep('set'); setPinInput(''); setPinConfirm(''); }
      else if (pinStep === 'set') { if (pinInput.length === 4) { setPinStep('confirm'); } else { showToast('PIN must be 4 digits'); } }
      else if (pinStep === 'confirm') {
        if (pinConfirm === pinInput) { setPrivacy({ pin: pinInput }); setPinStep('idle'); setPinInput(''); showToast('PIN set'); }
        else { showToast('PINs do not match'); setPinStep('set'); }
      }
    };
    return (
      <div className='space-y-4'>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Biometric Lock</div>
          <div className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div>
              <div className='text-sm text-white'>Face ID / Touch ID</div>
              <div className='text-xs text-white/40'>Use device biometrics to unlock</div>
            </div>
            <button onClick={() => setPrivacy({ faceIdEnabled: !privacy.faceIdEnabled })}
              className={`relative h-6 w-10 rounded-full transition ${privacy.faceIdEnabled ? 'bg-white' : 'bg-white/15'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${privacy.faceIdEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className='mt-2 text-xs text-white/30'>{typeof Capacitor !== 'undefined' ? 'Native biometric auth available' : 'Web mode — biometric UI shown'}</div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>PIN Lock</div>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-sm text-white'>PIN: {privacy.pin ? '••••' : 'Not set'}</span>
            {privacy.pin && (
              <button onClick={() => { setPrivacy({ pin: null }); showToast('PIN removed'); }}
                className='rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'>Remove</button>
            )}
          </div>
          {pinStep !== 'idle' && (
            <div className='space-y-2'>
              <input value={pinStep === 'set' ? pinInput : pinConfirm} onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                pinStep === 'set' ? setPinInput(v) : setPinConfirm(v);
              }} placeholder={pinStep === 'set' ? 'Enter 4-digit PIN' : 'Confirm PIN'}
                className='w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30' />
            </div>
          )}
          <button onClick={setPin}
            className='mt-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>
            {pinStep === 'idle' ? 'Set PIN' : pinStep === 'set' ? 'Continue' : 'Confirm'}
          </button>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Lock Timeout</div>
          <div className='flex flex-wrap gap-2'>
            {TIMEOUTS.map(t => (
              <button key={t} onClick={() => setPrivacy({ lockTimeout: t })}
                className={privacy.lockTimeout === t ? 'rounded-lg bg-white text-black px-4 py-2 text-sm font-medium capitalize' : 'rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors capitalize'}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
          <div className='flex items-center gap-2'>
            <div className={`h-2 w-2 rounded-full ${privacy.faceIdEnabled || privacy.pin ? 'bg-green-400' : 'bg-white/20'}`} />
            <span className='text-sm text-white/60'>Lock: {privacy.faceIdEnabled || privacy.pin ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Profiles tab
  const renderProfiles = () => {
    const current = profiles.find(p => p.id === activeProfileId);
    const createProfile = () => {
      if (!newProfileName.trim()) return;
      const initials = newProfileName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      addProfile({ name: newProfileName.trim(), avatar: initials || '??' });
      setNewProfileName('');
      showToast('Profile created');
    };
    return (
      <div className='space-y-4'>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Create Profile</div>
          <div className='flex gap-2'>
            <input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder='Profile name'
              className='w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30' />
            <button onClick={createProfile} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors shrink-0'>Create</button>
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Profiles ({profiles.length})</div>
          <div className='space-y-2'>
            {profiles.map(p => (
              <div key={p.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 transition ${p.id === activeProfileId ? 'border-white/20 bg-white/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white'>{p.avatar}</div>
                  <div>
                    <div className='text-sm text-white'>{p.name}</div>
                    {p.id === activeProfileId && <div className='text-xs text-green-400'>Active</div>}
                  </div>
                </div>
                <div className='flex gap-2'>
                  {p.id !== activeProfileId && (
                    <button onClick={() => { switchProfile(p.id); showToast(`Switched to ${p.name}`); }}
                      className='rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'>Switch</button>
                  )}
                  {profiles.length > 1 && (
                    <button onClick={() => { if (confirmDelete === p.id) { deleteProfile(p.id); setConfirmDelete(null); showToast('Deleted'); } else { setConfirmDelete(p.id); setTimeout(() => setConfirmDelete(null), 3000); }}}
                      className='rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors'>
                      {confirmDelete === p.id ? 'Confirm?' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Import/Export tab
  const renderImportExport = () => {
    const lastExport = lsGet('lastExportDate', null);
    const handleImport = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const keys = Object.keys(parsed).filter(k => k.startsWith('adventure:'));
          setImportPreview({ json: ev.target.result, count: keys.length, size: (ev.target.result.length / 1024).toFixed(1) });
        } catch { showToast('Invalid JSON file'); }
      };
      reader.readAsText(file);
    };
    const confirmImport = () => {
      if (!importPreview) return;
      const result = importAllData(importPreview.json);
      if (result.success) { showToast(`Imported ${result.count} items`); setImportPreview(null); }
      else showToast('Import failed: ' + result.error);
    };
    const doExport = (category) => {
      const data = {};
      const prefix = 'adventure:';
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(prefix)) {
          if (!category || k.includes(category)) data[k] = localStorage.getItem(k);
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `adventure-backup${category ? '-' + category : ''}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      lsSet('lastExportDate', Date.now());
      showToast('Exported');
    };
    return (
      <div className='space-y-4'>
        {lastExport && <div className='text-xs text-white/40'>Last export: {new Date(lastExport).toLocaleString()}</div>}
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Export</div>
          <div className='flex flex-wrap gap-2'>
            <button onClick={() => doExport(null)} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Export All</button>
            <button onClick={() => doExport('watched')} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Watch History</button>
            <button onClick={() => doExport('collection')} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Collections</button>
            <button onClick={() => doExport('achv')} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Achievements</button>
            <button onClick={() => doExport('settings')} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Settings</button>
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Import</div>
          <input ref={fileRef} type='file' accept='.json' onChange={handleImport} className='hidden' />
          <button onClick={() => fileRef.current?.click()} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Choose File...</button>
          {importPreview && (
            <div className='mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 space-y-2'>
              <div className='text-sm text-white/70'>Preview: {importPreview.count} items ({importPreview.size} KB)</div>
              <div className='flex gap-2'>
                <button onClick={confirmImport} className='rounded-lg bg-white text-black px-4 py-2 text-sm font-medium'>Confirm Import</button>
                <button onClick={() => setImportPreview(null)} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Encryption tab
  const renderEncryption = () => {
    const aiMemory = lsGet('aiMemory', []);
    const secureKeys = lsGet('secureApiKeys', []);
    return (
      <div className='space-y-4'>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Encryption Status</div>
          <div className='rounded-lg border border-amber-400/20 bg-amber-500/5 px-4 py-3'>
            <div className='text-sm text-amber-200'>Data encrypted at rest: No (localStorage)</div>
            <div className='text-xs text-white/40 mt-1'>All data is stored in the browser's localStorage. For Capacitor/iOS builds, data persists in the app sandbox but is not encrypted. Enable device-level encryption for full protection.</div>
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Secure API Key Storage</div>
          {secureKeys.length === 0 ? (
            <div className='text-sm text-white/30'>No API keys stored.</div>
          ) : (
            <div className='space-y-1'>
              {secureKeys.map((k, i) => (
                <div key={i} className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2'>
                  <span className='text-sm text-white/70'>{k.provider || 'key'}: {k.key?.slice(0, 6)}••••••</span>
                  <button onClick={() => { const next = secureKeys.filter((_, j) => j !== i); lsSet('secureApiKeys', next); showToast('Key removed'); }}
                    className='text-red-400/60 hover:text-red-400 text-xs'>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='text-sm font-medium text-white'>AI Memory ({aiMemory.length} entries)</div>
            <button onClick={() => { lsSet('aiMemory', []); showToast('AI memory cleared'); }}
              className='rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'>Clear All</button>
          </div>
          <div className='max-h-40 overflow-y-auto space-y-1'>
            {aiMemory.length === 0 ? <div className='text-xs text-white/30'>No AI memory stored.</div> :
              aiMemory.slice(0, 20).map((m, i) => (
                <div key={i} className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2'>
                  <span className='text-xs text-white/60 truncate max-w-[70%]'>{typeof m === 'string' ? m : m.text || m.key || JSON.stringify(m).slice(0, 60)}</span>
                  <button onClick={() => { const next = aiMemory.filter((_, j) => j !== i); lsSet('aiMemory', next); showToast('Removed'); }}
                    className='text-red-400/60 hover:text-red-400 text-xs shrink-0'>×</button>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  // Privacy Dashboard tab
  const renderPrivacyDashboard = () => {
    const categories = {
      'Watch History': lsGet('watchHistory', []).length,
      'Collections': Object.keys(lsGet('collections', {})).length,
      'Achievements': Object.keys(lsGet('achievements', {}).unlocked || {}).length,
      'AI Queries': getAiRequestStats().requests.length,
      'Settings': Object.keys(lsGet('settings', {})).length,
      'Profiles': lsGet('profiles', []).length,
      'Watch Time Sessions': lsGet('watchTime', { sessions: [] }).sessions.length,
    };
    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    let totalKeys = 0;
    for (let i = 0; i < localStorage.length; i++) { if (localStorage.key(i)?.startsWith('adventure:')) totalKeys++; }
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Total Data Points</div>
            <div className='text-lg font-semibold text-white'>{total}</div>
          </div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='text-xs text-white/40'>Storage Keys</div>
            <div className='text-lg font-semibold text-white'>{totalKeys}</div>
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Data Footprint</div>
          <div className='space-y-2'>
            {Object.entries(categories).map(([cat, count]) => (
              <div key={cat} className='flex items-center justify-between'>
                <span className='text-sm text-white/70'>{cat}</span>
                <span className='text-sm text-white/60'>{count} items</span>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
          <div className='text-xs text-white/40'>Data Retention</div>
          <div className='text-sm text-white/60 mt-1'>Watch history and AI memory are retained indefinitely. Session logs are capped at 500 entries. Cache data is automatically cleaned.</div>
        </div>
      </div>
    );
  };

  // Data Controls tab
  const renderDataControls = () => {
    const deleteCategory = (filter) => {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('adventure:') && k.includes(filter)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      showToast(`Deleted ${toRemove.length} entries`);
    };
    const doFactoryReset = () => {
      clearAllData();
      showToast('All data deleted — reloading');
      setTimeout(() => window.location.reload(), 500);
    };
    return (
      <div className='space-y-4'>
        <div className='rounded-lg border border-amber-400/20 bg-amber-500/5 px-4 py-3'>
          <div className='text-sm text-amber-200'>These actions are irreversible.</div>
        </div>
        {[
          { label: 'Delete All Activity History', filter: 'sessionLog', desc: 'Session log and activity tracking' },
          { label: 'Delete Watch History', filter: 'watchHistory', desc: 'All watched episode records' },
          { label: 'Delete AI Memory', filter: 'aiMemory', desc: 'All AI conversation memory' },
          { label: 'Delete Collections', filter: 'collection', desc: 'Custom collections and folders' },
        ].map(item => (
          <div key={item.filter} className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm text-white'>{item.label}</div>
                <div className='text-xs text-white/40'>{item.desc}</div>
              </div>
              <button onClick={() => deleteCategory(item.filter)}
                className='rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors'>Delete</button>
            </div>
          </div>
        ))}
        <div className='rounded-2xl border border-red-400/30 bg-red-500/5 p-5'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-sm text-red-200'>Factory Reset</div>
              <div className='text-xs text-white/40'>Delete everything — all data, settings, profiles</div>
            </div>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className='rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30 transition-colors'>Reset</button>
            ) : !confirmReset2 ? (
              <div className='flex gap-2'>
                <button onClick={() => setConfirmReset2(true)} className='rounded-lg bg-red-500/30 px-4 py-2 text-sm text-red-200 font-medium'>Are you sure?</button>
                <button onClick={() => { setConfirmReset(false); setConfirmReset2(false); }} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Cancel</button>
              </div>
            ) : (
              <div className='flex gap-2'>
                <button onClick={doFactoryReset} className='rounded-lg bg-red-500 px-4 py-2 text-sm text-white font-medium'>Confirm Reset</button>
                <button onClick={() => { setConfirmReset(false); setConfirmReset2(false); }} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors'>Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getAiRequestStats = () => lsGet('aiRequestStats', { requests: [] });

  const renderTab = () => {
    switch (tab) {
      case 'App Lock': return renderAppLock();
      case 'Profiles': return renderProfiles();
      case 'Import/Export': return renderImportExport();
      case 'Encryption': return renderEncryption();
      case 'Privacy Dashboard': return renderPrivacyDashboard();
      case 'Data Controls': return renderDataControls();
      default: return null;
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-3xl font-semibold tracking-tight'>Privacy & Security</h2>
        <p className='mt-1 text-white/60'>App lock, profiles, data export, and privacy controls.</p>
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
