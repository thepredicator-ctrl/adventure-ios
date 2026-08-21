import { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { totalEpisodes, watchedPct, displaySeasonNumber } from '../lib/episodes.js';
import { SHOW_GENRES, GENRES } from '../data/genres.js';
import ShowIcon from '../components/ShowIcon.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

const STATUS_FILTERS = ['all', 'in-progress', 'completed', 'unwatched', 'favorites', 'watchlist'];

export default function Shows() {
  const { global, watchedMap, selectShow, toggleWatchlist, watchlist, showToast } = usePlayer();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('');
  const [sortBy, setSortBy] = useState('default');

  const filtered = useMemo(() => {
    let items = SHOWS.map((s, i) => ({ s, i }));
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(({ s }) => s.name.toLowerCase().includes(q) || s.shortName.toLowerCase().includes(q) || s.id.includes(q));
    }
    if (genreFilter) {
      items = items.filter(({ s }) => (SHOW_GENRES[s.id] || []).includes(genreFilter));
    }
    items = items.filter(({ s }) => {
      const w = watchedMap[s.id] ?? [];
      const pct = watchedPct(w, s);
      if (statusFilter === 'in-progress') return pct > 0 && pct < 100;
      if (statusFilter === 'completed') return pct === 100;
      if (statusFilter === 'unwatched') return pct === 0;
      if (statusFilter === 'favorites') return false; // favorites are episodes, filter shows with any favorites
      if (statusFilter === 'watchlist') return watchlist.includes(s.id);
      return true;
    });
    if (sortBy === 'name') items.sort((a, b) => a.s.name.localeCompare(b.s.name));
    else if (sortBy === 'progress') items.sort((a, b) => watchedPct(watchedMap[b.s.id] ?? [], b.s) - watchedPct(watchedMap[a.s.id] ?? [], a.s));
    else if (sortBy === 'episodes') items.sort((a, b) => totalEpisodes(b.s) - totalEpisodes(a.s));
    return items;
  }, [query, statusFilter, genreFilter, sortBy, watchedMap, watchlist]);

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

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-mono uppercase transition ${
                statusFilter === f ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={genreFilter}
          onChange={e => setGenreFilter(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-white/70 focus:border-white/30 focus:outline-none"
        >
          <option value="">All genres</option>
          {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-white/70 focus:border-white/30 focus:outline-none"
        >
          <option value="default">Default</option>
          <option value="name">Name</option>
          <option value="progress">Progress</option>
          <option value="episodes">Most episodes</option>
        </select>
      </div>

      {/* Show cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map(({ s, i }) => {
          const watched = watchedMap[s.id] ?? [];
          const pct = watchedPct(watched, s);
          const total = totalEpisodes(s);
          const isActive = i === global.showIndex;
          const isInWatchlist = watchlist.includes(s.id);
          const genres = SHOW_GENRES[s.id] || [];
          let statusLabel = 'UNWATCHED';
          if (pct === 100) statusLabel = 'COMPLETE';
          else if (pct > 0) statusLabel = `${pct}%`;
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
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-white">{s.name}</span>
                    <span className="shrink-0 font-mono text-[10px] uppercase text-white/40">{statusLabel}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-white/50">
                    {s.seasonOffset
                      ? `Season ${displaySeasonNumber(s, 1)} only · ${total} eps`
                      : `${s.seasons.length} season${s.seasons.length === 1 ? '' : 's'} · ${total} eps`}
                  </div>
                  {genres.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {genres.slice(0, 3).map(g => (
                        <span key={g} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-mono uppercase text-white/30">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ProgressBar value={pct} className="flex-1" />
                <span className="font-mono text-xs text-white/70">{pct}%</span>
                <button
                  onClick={e => { e.stopPropagation(); toggleWatchlist(s.id); showToast(isInWatchlist ? 'Removed from watchlist' : 'Added to watchlist'); }}
                  className={`rounded border px-2 py-1 text-[10px] font-mono transition ${isInWatchlist ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/40 hover:border-white/30'}`}
                >
                  {isInWatchlist ? 'WL' : '+WL'}
                </button>
              </div>
              <div className="mt-2 text-xs text-white/40">{watched.length} / {total} watched · {s.id}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
