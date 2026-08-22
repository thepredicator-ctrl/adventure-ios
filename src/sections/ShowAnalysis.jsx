import { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { pad2 } from '../lib/format.js';
import { getShowAnalysis } from '../lib/services/StatisticsService.js';

function SeasonBar({ pct, width = 20 }) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return (
    <span className="font-mono text-white/70">
      {'█'.repeat(filled)}{'░'.repeat(empty)}
    </span>
  );
}

export default function ShowAnalysis() {
  const { show, watchedMap, ratings, playbackPositions, watchHistory, favorites } = usePlayer();
  const [selectedId, setSelectedId] = useState(show?.id || SHOWS[0]?.id);

  const analysis = useMemo(() => getShowAnalysis(selectedId, watchedMap, ratings, playbackPositions, watchHistory, favorites), [selectedId, watchedMap, ratings, playbackPositions, watchHistory, favorites]);

  if (!analysis) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold tracking-tight">Show Analysis</h2>
        <p className="text-white/60">No show selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Show Analysis</h2>
        <p className="mt-1 text-white/60">Deep per-show statistics.</p>
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

      {/* Heading */}
      <div className="font-mono text-xs text-white/40">
        SHOW ANALYSIS // {analysis.showName.toUpperCase()}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">EPISODES</div>
          <div className="mt-1 font-mono text-lg text-white">{analysis.totalEpisodes}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">COMPLETED</div>
          <div className="mt-1 font-mono text-lg text-white">{analysis.completionPct}%</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">WATCH TIME</div>
          <div className="mt-1 font-mono text-lg text-white">{analysis.estimatedWatchHours}H</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">FAVORITE SEASON</div>
          <div className="mt-1 font-mono text-lg text-white">S{pad2(analysis.favoriteSeason)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">MOST REWATCHED</div>
          <div className="mt-1 font-mono text-sm text-white">
            {analysis.mostWatched
              ? `S${pad2(analysis.mostWatched.season)}E${pad2(analysis.mostWatched.episode)} (${analysis.mostWatched.count}x)`
              : '--'}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">YOUR RATING</div>
          <div className="mt-1 font-mono text-lg text-white">
            {analysis.avgRating}/5
            <span className="text-xs text-white/30 ml-1">({analysis.ratingCount})</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-mono text-white/40">TOTAL REWATCHES</div>
          <div className="mt-1 font-mono text-lg text-white">{Math.max(0, analysis.totalRewatches)}</div>
        </div>
      </div>

      {/* Season breakdown */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 text-sm font-medium text-white">Season Breakdown</div>
        <div className="space-y-3">
          {analysis.seasonStats.map(s => (
            <div key={s.season} className="flex items-center gap-3">
              <span className="w-10 text-xs font-mono text-white/50 shrink-0">S{pad2(s.season)}</span>
              <div className="flex-1">
                <SeasonBar pct={s.pct} width={24} />
              </div>
              <span className="text-xs font-mono text-white/60 shrink-0">
                {s.watched}/{s.total}
              </span>
              <span className="w-10 text-right text-xs font-mono text-white/30 shrink-0">
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
