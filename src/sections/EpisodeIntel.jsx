import { useMemo, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { epKey, displaySeasonNumber, prevEpisode, nextEpisode } from '../lib/episodes.js';
import { pad2, formatDate } from '../lib/format.js';

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs font-mono text-white/40">{label}</div>
      <div className="mt-1 text-sm text-white font-medium truncate">{value}</div>
    </div>
  );
}

function StarRating({ rating, onRate }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onRate(n)}
          className={`text-lg transition ${
            n <= rating ? 'text-white' : 'text-white/15 hover:text-white/40'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function SeededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function EpisodeIntel() {
  const {
    show, global, watchedMap, playbackPositions, watchHistory,
    favorites, jumpTo, showToast, setRating, getRating,
  } = usePlayer();

  const currentShow = show;
  const internalSeason = global.season;
  const currentEpisode = global.episode;
  const displayS = displaySeasonNumber(currentShow, internalSeason);
  const favKey = `${currentShow.id}:S${internalSeason}:E${currentEpisode}`;
  const intKey = epKey(internalSeason, currentEpisode);

  const isWatched = (watchedMap[currentShow.id] || []).includes(intKey);

  // Watch count from history
  const timesWatched = useMemo(() => {
    return watchHistory.filter(
      h => h.showId === currentShow.id && h.season === internalSeason && h.episode === currentEpisode
    ).length;
  }, [watchHistory, currentShow.id, internalSeason, currentEpisode]);

  // Last watched date
  const lastWatched = useMemo(() => {
    const entries = watchHistory.filter(
      h => h.showId === currentShow.id && h.season === internalSeason && h.episode === currentEpisode
    );
    if (entries.length === 0) return null;
    const latest = entries.reduce((a, b) => (b.ts > a.ts ? b : a));
    return latest.ts;
  }, [watchHistory, currentShow.id, internalSeason, currentEpisode]);

  // Favorite status
  const isFav = favorites.includes(favKey);

  // Current rating
  const currentRating = getRating(currentShow.id, internalSeason, currentEpisode);

  // Playback position
  const pb = playbackPositions[`${currentShow.id}:${internalSeason}:${currentEpisode}`] || null;

  // Season completion
  const seasonEps = currentShow.seasons[internalSeason - 1] || 0;
  const seasonWatchedCount = (watchedMap[currentShow.id] || []).filter(k => k.startsWith(`S${internalSeason}E`)).length;
  const seasonPct = seasonEps > 0 ? Math.round((seasonWatchedCount / seasonEps) * 100) : 0;

  // Previous / Next episodes
  const prev = useMemo(() => prevEpisode(currentShow, internalSeason, currentEpisode), [currentShow, internalSeason, currentEpisode]);
  const next = useMemo(() => nextEpisode(currentShow, internalSeason, currentEpisode), [currentShow, internalSeason, currentEpisode]);

  // Related episodes: 3 random from same show, unwatched preferred
  const related = useMemo(() => {
    const allEps = [];
    for (let si = 0; si < currentShow.seasons.length; si++) {
      for (let e = 1; e <= currentShow.seasons[si]; e++) {
        if (si + 1 === internalSeason && e === currentEpisode) continue;
        allEps.push({ season: si + 1, episode: e, displaySeason: displaySeasonNumber(currentShow, si + 1) });
      }
    }
    const watchedSet = new Set(watchedMap[currentShow.id] || []);
    const unwatched = allEps.filter(ep => !watchedSet.has(epKey(ep.season, ep.episode)));
    const watched = allEps.filter(ep => watchedSet.has(epKey(ep.season, ep.episode)));

    // Deterministic-ish shuffle using current episode as seed
    const rng = SeededRandom(currentEpisode * 1000 + internalSeason);
    const shuffled = (list) => {
      const arr = [...list];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const shuffledUnwatched = shuffled(unwatched);
    const shuffledWatched = shuffled(watched);
    const picked = [...shuffledUnwatched, ...shuffledWatched].slice(0, 3);
    return picked;
  }, [currentShow, internalSeason, currentEpisode, watchedMap]);

  const handleRate = useCallback((n) => {
    setRating(currentShow.id, internalSeason, currentEpisode, n);
    showToast(`Rated S${pad2(displayS)}E${pad2(currentEpisode)}: ${'★'.repeat(n)}`);
  }, [setRating, currentShow.id, internalSeason, displayS, currentEpisode, showToast]);

  const handleJumpTo = useCallback((season, episode) => {
    jumpTo(currentShow.id, season, episode);
    showToast(`S${pad2(displaySeasonNumber(currentShow, season))}E${pad2(episode)}`);
  }, [jumpTo, currentShow, showToast]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Episode Intel</h2>
        <p className="mt-1 text-white/60">Detailed intelligence for the current episode.</p>
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoCard label="SHOW" value={currentShow.name} />
        <InfoCard label="SEASON" value={`S${pad2(displayS)}`} />
        <InfoCard label="EPISODE" value={`E${pad2(currentEpisode)}`} />
        <InfoCard label="STATUS" value={isWatched ? 'WATCHED' : 'UNWATCHED'} />
        <InfoCard label="COMPLETION" value={`${seasonPct}%`} />
        <InfoCard label="TIMES WATCHED" value={String(timesWatched)} />
        <InfoCard label="LAST WATCHED" value={lastWatched ? formatDate(lastWatched) : 'NEVER'} />
        <InfoCard label="FAVORITE" value={isFav ? 'YES' : 'NO'} />
        <InfoCard
          label="RATING"
          value={currentRating > 0 ? `${'★'.repeat(currentRating)}${'☆'.repeat(5 - currentRating)}` : 'NOT RATED'}
        />
      </div>

      {/* User rating selector */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs font-mono text-white/40 mb-3">USER RATING</div>
        <StarRating rating={currentRating} onRate={handleRate} />
        {currentRating > 0 && (
          <button
            onClick={() => handleRate(0)}
            className="mt-2 text-xs font-mono text-white/30 hover:text-white/60 transition"
          >
            CLEAR RATING
          </button>
        )}
      </div>

      {/* Playback progress bar */}
      {isWatched && pb && pb.duration > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40 mb-3">WATCH PROGRESS</div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/60 transition-all"
              style={{ width: `${Math.min(100, (pb.position / pb.duration) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs font-mono text-white/30">
            <span>{Math.round(pb.position / 60)}m</span>
            <span>{Math.round(pb.duration / 60)}m</span>
          </div>
        </div>
      )}

      {/* Previous / Next navigation */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {prev ? (
          <button
            onClick={() => handleJumpTo(prev.season, prev.episode)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/30 hover:bg-white/[0.06]"
          >
            <div className="text-xs font-mono text-white/40">PREVIOUS EPISODE</div>
            <div className="mt-1 text-sm text-white">
              S{pad2(displaySeasonNumber(currentShow, prev.season))}E{pad2(prev.episode)}
            </div>
            <div className="mt-1 text-xs font-mono text-white/30">← GO</div>
          </button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs font-mono text-white/40">PREVIOUS EPISODE</div>
            <div className="mt-1 text-sm text-white/30">NONE</div>
          </div>
        )}

        {next ? (
          <button
            onClick={() => handleJumpTo(next.season, next.episode)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/30 hover:bg-white/[0.06]"
          >
            <div className="text-xs font-mono text-white/40">NEXT EPISODE</div>
            <div className="mt-1 text-sm text-white">
              S{pad2(displaySeasonNumber(currentShow, next.season))}E{pad2(next.episode)}
            </div>
            <div className="mt-1 text-xs font-mono text-white/30">GO →</div>
          </button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs font-mono text-white/40">NEXT EPISODE</div>
            <div className="mt-1 text-sm text-white/30">SERIES COMPLETE</div>
          </div>
        )}
      </div>

      {/* Related episodes */}
      {related.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-xs font-mono text-white/40">RELATED</div>
          <div className="space-y-1">
            {related.map(ep => {
              const watchedSet = new Set(watchedMap[currentShow.id] || []);
              const epWatched = watchedSet.has(epKey(ep.season, ep.episode));
              return (
                <button
                  key={`${ep.season}-${ep.episode}`}
                  onClick={() => handleJumpTo(ep.season, ep.episode)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition hover:bg-white/[0.06] text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${epWatched ? 'text-white/40' : 'text-white/60'}`}>
                      S{pad2(ep.displaySeason)}E{pad2(ep.episode)}
                    </span>
                    <span className="text-sm text-white/60">{currentShow.shortName}</span>
                  </div>
                  <span className={`text-xs font-mono ${epWatched ? 'text-white/20' : 'text-white/40'}`}>
                    {epWatched ? 'WATCHED' : 'NEW'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
