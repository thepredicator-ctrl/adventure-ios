import { usePlayer } from '../context/PlayerContext.jsx';

const SHORTCUTS = [
  { key: 'Space',     action: 'Play / Pause' },
  { key: '\u2192 / N',  action: 'Next episode' },
  { key: '\u2190 / P',  action: 'Previous episode' },
  { key: 'A',         action: 'Toggle Auto Next' },
  { key: 'T',         action: 'Cycle theme' },
  { key: 'R',         action: 'Random episode' },
  { key: 'F',         action: 'Favorite episode' },
  { key: 'W',         action: 'Mark watched' },
  { key: '1 \u2013 9',  action: 'Switch server' },
  { key: 'S',         action: 'Focus search (Shows tab)' },
  { key: 'Esc',       action: 'Close dialogs' },
  { key: '?',         action: 'Show this help' },
];

const GAMEPAD_ACTIONS = [
  { btn: 'A / Cross',   action: 'Play / Pause' },
  { btn: 'D-Pad Right', action: 'Next episode' },
  { btn: 'D-Pad Left',  action: 'Previous episode' },
  { btn: 'X / Square',  action: 'Mark watched' },
  { btn: 'Y / Triangle',action: 'Favorite' },
  { btn: 'LB / L1',     action: 'Previous season' },
  { btn: 'RB / R1',     action: 'Next season' },
  { btn: 'Start',       action: 'Toggle autoplay' },
];

export default function Shortcuts() {
  const { stats } = usePlayer();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Shortcuts</h2>
        <p className="mt-1 text-white/60">Active everywhere except when typing in an input.</p>
      </div>

      {/* Keyboard shortcuts */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Keyboard</div>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {SHORTCUTS.map((s, i) => (
            <div key={s.key} className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
              <span className="text-sm text-white/80">{s.action}</span>
              <kbd className="rounded border border-white/15 bg-black/40 px-2 py-1 font-mono text-xs text-white/70">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Controller / Gamepad */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Controller / Gamepad</div>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {GAMEPAD_ACTIONS.map((g, i) => (
            <div key={g.btn} className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
              <span className="text-sm text-white/80">{g.action}</span>
              <span className="rounded border border-white/15 bg-black/40 px-2 py-1 font-mono text-xs text-white/70">{g.btn}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-white/40">Connect a gamepad via Bluetooth or USB. Supported on iPad and compatible iPhones.</div>
      </div>

      {/* Gestures (touch) */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Touch gestures</div>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {[
            { gesture: 'Double-tap left', action: 'Seek back 10s' },
            { gesture: 'Double-tap right', action: 'Seek forward 10s' },
            { gesture: 'Swipe up (player)', action: 'Toggle fullscreen' },
            { gesture: 'Long-press episode', action: 'Toggle favorite' },
            { gesture: 'Pinch (player)', action: 'Toggle PiP' },
          ].map((g, i) => (
            <div key={g.gesture} className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
              <span className="text-sm text-white/80">{g.action}</span>
              <span className="rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white/70">{g.gesture}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}