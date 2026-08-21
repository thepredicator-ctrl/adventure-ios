import { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { pad2 } from '../lib/format.js';
import { epKey, displaySeasonNumber, totalEpisodes } from '../lib/episodes.js';

const FILTERS = ['all', 'watched', 'unwatched', 'favorites'];

export default function Episodes() {
  const { show, global, watchedMap, setSeason, setEpisode, jumpTo, toggleFavorite, isFavorite, markSeasonWatched, showToast, markUnwatched, watchHistory } = usePlayer();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortDesc, setSortDesc] = useState(false);

  const watched = watchedMap[show.id] ?? [];
  const seasonEps = show.seasons[global.season - 1];
  const visibleSeason = displaySeasonNumber(show, global.season);

  const episodes = useMemo(() => {
    let list = Array.from({ length: seasonEps }, (_, i) => {
      const ep = i + 1;
      const key = epKey(global.season, ep);
      return {
        ep, key,
        isWatched: watched.includes(key),
        isFav: isFavorite(show.id, global.season, ep),
        label: `S${pad2(visibleSeason)}E${pad2(ep)}`,
      };
    });
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(e => e.label.toLowerCase().includes(q) || String(e.ep).includes(q));
    }
    if (filter === 'watched') list = list.filter(e => e.isWatched);
    else if (filter === 'unwatched') list = list.filter(e => !e.isWatched);
    else if (filter === 'favorites') list = list.filter(e => e.isFav);
    if (sortDesc) list.reverse();
    return list;
  }, [seasonEps, watched, query, filter, sortDesc, visibleSeason, global.season, show.id, isFavorite]);

  const watchedInSeason = episodes.filter(e => e.isWatched).length;
  const recentEps = useMemo(() => {
    return (watchHistory || [])
      .filter(h => h.showId === show.id && h.season === global.season)
      .slice(0, 5);
  }, [watchHistory, show.id, global.season]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Episodes</h2>
        <p className="mt-1 text-white/60">
          {show.name} — {show.seasons.length} season{show.seasons.length === 1 ? '' : 's'}
          {show.seasonOffset ? ` (showing S${pad2(displaySeasonNumber(show, 1))} only)` : ''}
          <span className="ml-2 font-mono text-white/30">{watchedInSeason}/{seasonEps} watched</span>
        </p>
      </div>

      {/* Season tabs */}
      <div className="flex flex-wrap gap-2">
        {show.seasons.map((_, i) => {
          const sw = watchedMap[show.id] ?? [];
          const seasonWatched = Array.from({ length: show.seasons[i] }, (_, j) => epKey(i + 1, j + 1)).filter(k => sw.includes(k)).length;
          const total = show.seasons[i];
          return (
            <button
              key={i}
              onClick={() => setSeason(i + 1)}
              className={`rounded-md border px-3 py-1.5 text-sm font-mono transition ${
                global.season === i + 1
                  ? 'border-white/60 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
              }`}
            >
              S{pad2(displaySeasonNumber(show, i + 1))}
              <span className="ml-1.5 text-white/30">{seasonWatched}/{total}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search episodes…"
          className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
        />
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md border px-2.5 py-2 text-xs font-mono uppercase transition ${
                filter === f ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2 text-xs font-mono text-white/50 transition hover:border-white/30"
        >
          {sortDesc ? 'DESC' : 'ASC'}
        </button>
      </div>

      {/* Episode grid */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium text-white">Season {visibleSeason}</div>
          <div className="text-xs text-white/40">{episodes.length} of {seasonEps} episodes</div>
        </div>
        {episodes.length === 0 ? (
          <div className="py-8 text-center text-sm text-white/40">No episodes match filter.</div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {episodes.map(({ ep, key, isWatched, isFav, label }) => {
              const isActive = ep === global.episode;
              return (
                <button
                  key={ep}
                  onClick={() => jumpTo(show.id, global.season, ep)}
                  onContextMenu={e => { e.preventDefault(); toggleFavorite(show.id, global.season, ep); showToast(isFav ? 'UNFAVORITED' : 'FAVORITED'); }}
                  className={`relative aspect-square rounded-lg border text-sm font-mono transition ${
                    isActive
                      ? 'border-white/60 bg-white/15 text-white'
                      : isWatched
                      ? 'border-white/30 bg-white/10 text-white hover:border-white/60'
                      : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
                  }`}
                  title={`${label} · ${isWatched ? 'Watched' : 'Unwatched'}${isFav ? ' · Favorite' : ''}\nRight-click to favorite`}
                >
                  {pad2(ep)}
                  {isWatched && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white" />}
                  {isFav && <span className="absolute left-1 bottom-1 text-[8px] text-white/70">*</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { markSeasonWatched(show.id, global.season, seasonEps); }}
          className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Mark all watched
        </button>
        <button
          onClick={() => {
            for (let e = 1; e <= seasonEps; e++) markUnwatched(show.id, global.season, e);
          }}
          className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Mark all unwatched
        </button>
        <button
          onClick={() => {
            const ep = Math.floor(Math.random() * seasonEps) + 1;
            jumpTo(show.id, global.season, ep);
            showToast(`Random: E${pad2(ep)}`);
          }}
          className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Random episode
        </button>
      </div>

      {/* Recently watched in this season */}
      {recentEps.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-sm font-medium text-white">Recently watched</div>
          <div className="flex flex-wrap gap-2">
            {recentEps.map((h, i) => (
              <button
                key={i}
                onClick={() => jumpTo(h.showId, h.season, h.episode)}
                className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-mono text-white/70 transition hover:border-white/30 hover:text-white"
              >
                S{pad2(h.season)}E{pad2(h.episode)}
                <span className="ml-1.5 text-white/30">{new Date(h.ts).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
