import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet } from '../lib/storage.js';
import { pad2 } from '../lib/format.js';

const TIME_OPTIONS = [30, 60, 90, 120, 180];
const SORT_OPTIONS = [
  { id: 'shortest', label: 'Shortest First' },
  { id: 'longest', label: 'Longest First' },
  { id: 'favorites', label: 'Prefer Favorites' },
];

function epDuration(showId, season, episode) {
  let h = 0;
  for (let i = 0; i < showId.length; i++) h = ((h << 5) - h + showId.charCodeAt(i)) | 0;
  h = ((h << 5) - h + season * 31 + episode * 17) | 0;
  return 20 + (Math.abs(h) % 26);
}

export default function FinishTonight() {
  const p = usePlayer();
  const [timeBudget, setTimeBudget] = useState(60);
  const [sortMode, setSortMode] = useState('shortest');
  const [excludeGenres, setExcludeGenres] = useState([]);
  const [history, setHistory] = useState(() => lsGet('finishTonightHistory', []));

  useEffect(() => { lsSet('finishTonightHistory', history); }, [history]);

  const unwatchedEps = useMemo(() => {
    const eps = [];
    for (const show of SHOWS) {
      const watched = new Set(p.watchedMap[show.id] || []);
      for (let si = 0; si < show.seasons.length; si++) {
        for (let e = 1; e <= show.seasons[si]; e++) {
          const key = `S${si + 1}E${e}`;
          if (!watched.has(key)) {
            eps.push({
              showId: show.id,
              showName: show.shortName,
              color: show.color,
              season: si + 1,
              episode: e,
              dur: epDuration(show.id, si + 1, e),
              isFavorite: p.favorites.includes(`${show.id}:${key}`),
            });
          }
        }
      }
    }
    return eps;
  }, [p.watchedMap, p.favorites]);

  const filteredEps = useMemo(() => {
    let pool = [...unwatchedEps];
    if (excludeGenres.length > 0) {
      pool = pool.filter(ep => {
        const showGenres = SHOWS.find(s => s.id === ep.showId);
        return showGenres;
      });
    }
    if (sortMode === 'shortest') pool.sort((a, b) => a.dur - b.dur);
    else if (sortMode === 'longest') pool.sort((a, b) => b.dur - a.dur);
    else if (sortMode === 'favorites') pool.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) || a.dur - b.dur);
    return pool;
  }, [unwatchedEps, sortMode, excludeGenres]);

  const queue = useMemo(() => {
    const result = [];
    let cumDur = 0;
    for (const ep of filteredEps) {
      if (cumDur + ep.dur > timeBudget) break;
      result.push({ ...ep, cumDur: cumDur + ep.dur });
      cumDur += ep.dur;
    }
    return result;
  }, [filteredEps, timeBudget]);

  const totalQueueTime = useMemo(() => {
    if (queue.length === 0) return 0;
    return queue[queue.length - 1].cumDur;
  }, [queue]);

  const utilization = useMemo(() => {
    if (timeBudget === 0) return 0;
    return Math.min(100, Math.round((totalQueueTime / timeBudget) * 100));
  }, [totalQueueTime, timeBudget]);

  const handleStartWatching = useCallback(() => {
    if (queue.length === 0) return;
    const first = queue[0];
    const s = SHOWS.find(x => x.id === first.showId);
    const intS = first.season - (s?.seasonOffset || 0);
    p.jumpTo(first.showId, intS, first.episode);
    setHistory(prev => [{
      date: new Date().toISOString(),
      budget: timeBudget,
      episodes: queue.length,
      totalTime: totalQueueTime,
    }, ...prev].slice(0, 20));
    p.showToast(`Starting ${queue.length} episodes (${totalQueueTime} min)`);
  }, [queue, timeBudget, totalQueueTime, p]);

  const jumpToEp = useCallback((ep) => {
    const s = SHOWS.find(x => x.id === ep.showId);
    const intS = ep.season - (s?.seasonOffset || 0);
    p.jumpTo(ep.showId, intS, ep.episode);
  }, [p.jumpTo]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Finish Tonight</h2>
        <p className="mt-1 text-white/60">Plan your perfect evening of watching.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
        <div className="space-y-2">
          <div className="text-xs text-white/50">I have</div>
          <div className="flex gap-2 flex-wrap">
            {TIME_OPTIONS.map(t => (
              <button key={t} onClick={() => setTimeBudget(t)}
                className={`rounded-lg px-4 py-2 text-sm font-mono transition-colors ${timeBudget === t ? 'bg-white text-black font-medium' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                {t} min
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-white/50">Sort by</div>
          <div className="flex gap-2">
            {SORT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setSortMode(o.id)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${sortMode === o.id ? 'bg-white/20 text-white border border-white/20' : 'bg-white/[0.03] text-white/50 border border-white/10 hover:border-white/30'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Optimal Queue</div>
            <div className="text-xs text-white/40 font-mono">{queue.length} episodes fit in {timeBudget} minutes</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-semibold text-white">{totalQueueTime}<span className="text-sm text-white/40">/{timeBudget} min</span></div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${utilization}%`, backgroundColor: utilization > 90 ? '#4ade80' : utilization > 60 ? '#fbbf24' : '#f87171' }} />
          </div>
          <div className="flex justify-between text-xs text-white/30 font-mono">
            <span>{utilization}% utilized</span>
            <span>{timeBudget - totalQueueTime} min remaining</span>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {queue.map((ep, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between group hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-white/30 w-6 shrink-0">{i + 1}</span>
                <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: ep.color || 'rgba(255,255,255,0.2)' }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/50">S{pad2(ep.season)}E{pad2(ep.episode)}</span>
                    {ep.isFavorite && <span className="text-yellow-400 text-xs">&#9733;</span>}
                  </div>
                  <div className="text-sm text-white/60 truncate">{ep.showName}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-white/30 font-mono">{ep.dur}m</span>
                <button onClick={() => jumpToEp(ep)} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100">Play</button>
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-white/30">No episodes fit in {timeBudget} minutes.</p>
              <p className="text-xs text-white/20 mt-1">Try increasing your time budget.</p>
            </div>
          )}
        </div>

        {queue.length > 0 && (
          <button onClick={handleStartWatching} className="w-full rounded-lg bg-white text-black px-4 py-3 text-sm font-medium hover:bg-white/90 transition-colors">
            Start Watching ({queue.length} episodes)
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-white/40">PLANNING HISTORY</div>
          {history.slice(0, 5).map((h, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 flex items-center justify-between">
              <div className="text-xs text-white/50">{new Date(h.date).toLocaleDateString()}</div>
              <div className="flex items-center gap-3 text-xs text-white/40 font-mono">
                <span>{h.episodes} eps</span>
                <span>{h.totalTime}/{h.budget} min</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
