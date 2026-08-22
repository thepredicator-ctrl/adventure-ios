import { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../lib/episodes.js';
import { pad2 } from '../lib/format.js';

function SeasonTimelineRow({ show, internalSeason, watchedSet, currentSeason, currentEpisode, onJump, onToast }) {
  const numEps = show.seasons[internalSeason - 1];
  const displayNum = displaySeasonNumber(show, internalSeason);
  const isLargeSeason = numEps >= 40;
  const isCurrentSeason = currentSeason === internalSeason;

  const seasonWatched = useMemo(() => {
    let count = 0;
    for (let e = 1; e <= numEps; e++) {
      if (watchedSet.has(epKey(internalSeason, e))) count++;
    }
    return count;
  }, [watchedSet, internalSeason, numEps]);

  const pct = numEps > 0 ? Math.round((seasonWatched / numEps) * 100) : 0;

  // Build the visual timeline
  const timeline = useMemo(() => {
    if (isLargeSeason) {
      // Show every 5th episode with connecting lines
      const points = [];
      for (let e = 1; e <= numEps; e += 5) {
        const end = Math.min(e + 4, numEps);
        let chunkWatched = 0;
        for (let c = e; c <= end; c++) {
          if (watchedSet.has(epKey(internalSeason, c))) chunkWatched++;
        }
        const chunkTotal = end - e + 1;
        const allWatched = chunkWatched === chunkTotal;
        const noneWatched = chunkWatched === 0;
        points.push({
          key: epKey(internalSeason, e),
          episode: e,
          endEp: end,
          chunkTotal,
          chunkWatched,
          watched: watchedSet.has(epKey(internalSeason, e)),
          dot: allWatched ? '●' : noneWatched ? '○' : '◌',
          isCurrent: isCurrentSeason && currentEpisode >= e && currentEpisode <= end,
          displayEp: e,
        });
      }
      return { points, compact: true };
    } else {
      const points = [];
      for (let e = 1; e <= numEps; e++) {
        points.push({
          key: epKey(internalSeason, e),
          episode: e,
          watched: watchedSet.has(epKey(internalSeason, e)),
          dot: watchedSet.has(epKey(internalSeason, e)) ? '●' : '○',
          isCurrent: isCurrentSeason && currentEpisode === e,
        });
      }
      return { points, compact: false };
    }
  }, [isLargeSeason, numEps, watchedSet, internalSeason, isCurrentSeason, currentEpisode]);

  const handleClick = (point) => {
    if (!point.watched) {
      onJump(show.id, internalSeason, point.episode);
      onToast(`JUMP → S${pad2(displayNum)}E${pad2(point.episode)}`);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-mono text-white/40">SEASON {pad2(displayNum)}</span>
        <span className="text-xs font-mono text-white/30">
          {seasonWatched}/{numEps}
        </span>
      </div>

      {/* Visual timeline */}
      <div className="flex items-center flex-wrap gap-y-2">
        {timeline.points.map((point, idx) => (
          <span key={point.key} className="inline-flex items-center">
            <span className="font-mono text-xs leading-none">
              {idx > 0 && <span className="text-white/20">─</span>}
              {point.isCurrent ? (
                <span
                  className="text-white cursor-pointer"
                  onClick={() => handleClick(point)}
                  title={`S${pad2(displayNum)}E${pad2(point.episode)}`}
                >
                  ◄
                </span>
              ) : (
                <span
                  className={`cursor-pointer transition ${
                    point.watched
                      ? 'text-white'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                  onClick={() => handleClick(point)}
                  title={`S${pad2(displayNum)}E${pad2(point.episode)}${
                    timeline.compact
                      ? ` (${point.chunkWatched}/${point.chunkTotal} watched)`
                      : point.watched
                        ? ' (watched)'
                        : ' (unwatched)'
                  }`}
                >
                  {point.dot}
                </span>
              )}
              {timeline.compact && (
                <span className="ml-0.5 text-[10px] text-white/20">
                  {point.chunkWatched}/{point.chunkTotal}
                </span>
              )}
            </span>
          </span>
        ))}
      </div>

      {/* Completion bar */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs font-mono text-white/40">COMPLETION</span>
        <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/60 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-white/60">{pct}%</span>
      </div>
    </div>
  );
}

export default function ShowTimeline() {
  const { show, global, watchedMap, jumpTo, showToast } = usePlayer();
  const [selectedId, setSelectedId] = useState(show?.id || SHOWS[0]?.id);

  const selectedShow = SHOWS.find(s => s.id === selectedId);

  const watchedSet = useMemo(() => {
    return new Set(watchedMap[selectedId] || []);
  }, [watchedMap, selectedId]);

  const totalPct = useMemo(() => {
    if (!selectedShow) return 0;
    const total = totalEpisodes(selectedShow);
    if (!total) return 0;
    return Math.round((watchedSet.size / total) * 100);
  }, [selectedShow, watchedSet]);

  if (!selectedShow) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold tracking-tight">Show Timeline</h2>
        <p className="text-white/60">No show selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Show Timeline</h2>
        <p className="mt-1 text-white/60">Visual progress through each season.</p>
      </div>

      {/* Show selector */}
      <div className="flex flex-wrap gap-2">
        {SHOWS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-mono transition ${
              s.id === selectedId
                ? 'border-white/50 bg-white/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/30 hover:text-white/70'
            }`}
          >
            {s.shortName}
          </button>
        ))}
      </div>

      {/* Overall completion */}
      <div className="font-mono text-xs text-white/40">
        TIMELINE // {selectedShow.shortName.toUpperCase()} // {totalPct}% COMPLETE
      </div>

      {/* Season rows */}
      <div className="space-y-3">
        {selectedShow.seasons.map((_, idx) => (
          <SeasonTimelineRow
            key={idx}
            show={selectedShow}
            internalSeason={idx + 1}
            watchedSet={watchedSet}
            currentSeason={global.showIndex === SHOWS.findIndex(s => s.id === selectedId) ? global.season : -1}
            currentEpisode={global.episode}
            onJump={jumpTo}
            onToast={showToast}
          />
        ))}
      </div>
    </div>
  );
}
