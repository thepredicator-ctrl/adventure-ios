import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SERVER_LIST } from '../data/servers.js';

export default function Settings() {
  const { global, setServer, setSettings, resetAllProgress, resetCurrentShow, show, showToast } = usePlayer();
  const [confirm, setConfirm] = useState(null);

  const doReset = (fn) => {
    fn();
    setConfirm(null);
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
          {SERVER_LIST.map(s => (
            <button
              key={s.id}
              onClick={() => { setServer(s.id); showToast(`Default server: ${s.name}`); }}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                global.server === s.id
                  ? 'border-white/60 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
              }`}
            >
              <div className="font-mono text-xs text-white/40">0{s.id}</div>
              <div className="mt-0.5 font-medium">{s.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CRT toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div>
          <div className="text-sm font-medium text-white">CRT scanline overlay</div>
          <div className="mt-1 text-xs text-white/50">Subtle scanlines over the whole page (visual only).</div>
        </div>
        <button
          onClick={() => {
            const next = !global.settings.crtEffect;
            setSettings({ crtEffect: next });
            showToast(`CRT ${next ? 'ON' : 'OFF'}`);
          }}
          role="switch"
          aria-checked={global.settings.crtEffect}
          className={`relative h-7 w-12 rounded-full transition ${global.settings.crtEffect ? 'bg-white' : 'bg-white/15'}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${global.settings.crtEffect ? 'left-6' : 'left-1'}`}
          />
        </button>
      </div>

      {/* Resets */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Reset progress</div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setConfirm({ msg: `Reset all progress for ${show.shortName}?`, fn: resetCurrentShow })}
            className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Reset current show
          </button>
          <button
            onClick={() => setConfirm({ msg: 'Reset ALL progress across every show? This cannot be undone.', fn: resetAllProgress })}
            className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
          >
            Reset everything
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-black p-6">
            <div className="text-sm text-white">{confirm.msg}</div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/40"
              >
                Cancel
              </button>
              <button
                onClick={() => doReset(confirm.fn)}
                className="rounded-md border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-sm text-red-100 hover:bg-red-500/30"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
