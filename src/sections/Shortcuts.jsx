const SHORTCUTS = [
  { key: '← / P',  action: 'Previous episode' },
  { key: '→ / N',  action: 'Next episode' },
  { key: 'A',      action: 'Toggle Auto Next' },
  { key: '1 – 9',  action: 'Switch server' },
  { key: 'T',      action: 'Cycle theme' },
  { key: 'S',      action: 'Focus search (on Shows tab)' },
  { key: '?',      action: 'Show this help' },
  { key: 'Esc',    action: 'Close dialogs' }
];

export default function Shortcuts() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Keyboard shortcuts</h2>
        <p className="mt-1 text-white/60">Active everywhere except when typing in an input.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {SHORTCUTS.map((s, i) => (
          <div
            key={s.key}
            className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}
          >
            <span className="text-sm text-white/80">{s.action}</span>
            <kbd className="rounded border border-white/15 bg-black/40 px-2 py-1 font-mono text-xs text-white/70">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
