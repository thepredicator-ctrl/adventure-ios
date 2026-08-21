import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { totalEpisodes, watchedPct, displaySeasonNumber } from '../lib/episodes.js';
import ShowIcon from '../components/ShowIcon.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Shows() {
  const { global, watchedMap, selectShow } = usePlayer();
  const [query, setQuery] = useState('');

  const filtered = SHOWS.map((s, i) => ({ s, i })).filter(({ s }) =>
    !query || s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Shows</h2>
        <p className="mt-1 text-white/60">{filtered.length} of {SHOWS.length} shows</p>
      </div>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search shows…"
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map(({ s, i }) => {
          const watched = watchedMap[s.id] ?? [];
          const pct = watchedPct(watched, s);
          const total = totalEpisodes(s);
          const isActive = i === global.showIndex;
          return (
            <button
              key={s.id}
              onClick={() => selectShow(i)}
              className={`rounded-2xl border p-5 text-left transition ${
                isActive
                  ? 'border-white/60 bg-white/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <ShowIcon show={s} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">{s.name}</div>
                  <div className="mt-0.5 text-xs text-white/50">
                    {s.seasonOffset
                      ? `Season ${displaySeasonNumber(s, 1)} only · ${total} eps`
                      : `${s.seasons.length} season${s.seasons.length === 1 ? '' : 's'} · ${total} eps`}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ProgressBar value={pct} className="flex-1" />
                <span className="font-mono text-xs text-white/70">{pct}%</span>
              </div>
              <div className="mt-2 text-xs text-white/40">{watched.length} / {total} watched</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
