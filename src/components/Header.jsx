import { usePlayer } from '../context/PlayerContext.jsx';
import { displaySeasonNumber } from '../lib/episodes.js';

export default function Header({ activeLabel }) {
  const { show, global } = usePlayer();
  const visibleSeason = displaySeasonNumber(show, global.season);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 text-sm font-bold text-black"
          style={{ background: '#ffffff' }}
          title={show.name}
        >
          {show.icon}
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-white">adventure</div>
          <div className="text-[11px] uppercase tracking-widest text-white/40">
            S{String(visibleSeason).padStart(2, '0')} · E{String(global.episode).padStart(2, '0')} · {activeLabel}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="hidden sm:inline">Server: <span className="font-mono text-white/80">{global.server}</span></span>
        <a
          href="https://github.com/thepredicator-ctrl/Adventure"
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-white/10 px-3 py-1.5 text-white/70 transition hover:border-white/30 hover:text-white"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
