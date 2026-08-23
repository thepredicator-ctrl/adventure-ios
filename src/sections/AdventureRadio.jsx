import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet } from '../lib/storage.js';
import { pad2 } from '../lib/format.js';

const FILTERS = ['ALL','FUNNY','SHORT','UNWATCHED','FAVORITES','LONG','ACTION','DRAMA'];
const DELAY_OPTIONS = [5, 10, 15, 30];

function epDuration(showId, season, episode) {
  let h = 0;
  for (let i = 0; i < showId.length; i++) h = ((h << 5) - h + showId.charCodeAt(i)) | 0;
  h = ((h << 5) - h + season * 31 + episode * 17) | 0;
  return 20 + (Math.abs(h) % 26);
}

function EqualizerBars({ playing }) {
  if (!playing) return null;
  return (
    <div className="flex items-end gap-[2px] h-6">
      {[0,1,2,3,4,5,6].map(i => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/60"
          style={{
            height: `${30 + Math.random() * 70}%`,
            animation: `eqBar ${0.3 + Math.random() * 0.4}s ease-in-out ${i * 0.05}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function generateQueue(watchedMap, favorites, activeFilters) {
  const eps = [];
  for (const show of SHOWS) {
    const watched = new Set(watchedMap[show.id] || []);
    for (let si = 0; si < show.seasons.length; si++) {
      for (let e = 1; e <= show.seasons[si]; e++) {
        const key = `S${si + 1}E${e}`;
        const dur = epDuration(show.id, si + 1, e);
        const isFav = favorites.includes(`${show.id}:${key}`);
        const isWatched = watched.has(key);
        eps.push({ showId: show.id, showName: show.shortName, color: show.color, season: si + 1, episode: e, dur, isFav, isWatched });
      }
    }
  }
  let pool = [...eps];
  if (activeFilters.includes('UNWATCHED')) pool = pool.filter(e => !e.isWatched);
  if (activeFilters.includes('FAVORITES')) pool = pool.filter(e => e.isFav);
  if (activeFilters.includes('SHORT')) pool = pool.filter(e => e.dur <= 22);
  if (activeFilters.includes('LONG')) pool = pool.filter(e => e.dur >= 35);
  if (activeFilters.includes('FUNNY')) pool = pool.filter(e => e.dur <= 25);
  if (activeFilters.includes('ACTION')) {
    const actionIds = ['tt1710308','tt8697554'];
    pool = pool.filter(e => actionIds.includes(e.showId));
  }
  if (activeFilters.includes('DRAMA')) {
    const dramaIds = ['tt1865718','tt3061046','tt13293588'];
    pool = pool.filter(e => dramaIds.includes(e.showId));
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export default function AdventureRadio() {
  const p = usePlayer();
  const [playing, setPlaying] = useState(false);
  const [filters, setFilters] = useState(['ALL']);
  const [queue, setQueue] = useState(() => lsGet('radioState', { queue: [] }).queue);
  const [history, setHistory] = useState(() => lsGet('radioState', { history: [] }).history);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoDelay, setAutoDelay] = useState(10);
  const [countdown, setCountdown] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    lsSet('radioState', { playing, queue, filters, history });
  }, [playing, queue, filters, history]);

  const regenerate = useCallback(() => {
    const newQueue = generateQueue(p.watchedMap, p.favorites, filters);
    setQueue(newQueue);
    setCurrentIndex(0);
    p.showToast(`Radio queued: ${newQueue.length} episodes`);
  }, [p.watchedMap, p.favorites, filters, p.showToast]);

  useEffect(() => { if (queue.length === 0) regenerate(); }, []);

  const toggleFilter = useCallback((f) => {
    setFilters(prev => {
      if (f === 'ALL') return ['ALL'];
      const without = prev.filter(x => x !== 'ALL' && x !== f);
      return [...without, f];
    });
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const ep = queue[currentIndex];
    setHistory(prev => [{ ...ep, playedAt: Date.now() }, ...prev].slice(0, 50));
    setSessionCount(c => c + 1);
    setSessionTime(t => t + ep.dur);
    const nextIdx = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIdx);
    if (nextIdx === 0) regenerate();
    p.showToast(`Played: ${ep.showName} S${pad2(ep.season)}E${pad2(ep.episode)}`);
  }, [queue, currentIndex, regenerate, p.showToast]);

  const togglePlay = useCallback(() => {
    if (!playing && !countdown) {
      setPlaying(true);
      setCountdown(autoDelay);
    } else {
      setPlaying(false);
      setCountdown(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [playing, countdown, autoDelay]);

  useEffect(() => {
    if (playing && countdown !== null && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timerRef.current);
            return null;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [playing, countdown]);

  useEffect(() => {
    if (playing && countdown === null && queue.length > 0) {
      playNext();
      setCountdown(autoDelay);
    }
  }, [countdown, playing, playNext, autoDelay, queue.length]);

  const currentEp = queue[currentIndex] || null;
  const upNext = queue.length > 1
    ? Array.from({ length: 5 }, (_, i) => queue[(currentIndex + 1 + i) % queue.length]).filter(Boolean)
    : [];

  const jumpToEp = useCallback((ep) => {
    const s = SHOWS.find(x => x.id === ep.showId);
    const intS = ep.season - (s?.seasonOffset || 0);
    p.jumpTo(ep.showId, intS, ep.episode);
  }, [p.jumpTo]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Adventure Radio</h2>
        <p className="mt-1 text-white/60">Continuous randomized episode stream.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => toggleFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${filters.includes(f) ? 'bg-white/20 text-white border border-white/30' : 'bg-white/[0.03] text-white/40 border border-white/10 hover:border-white/20'}`}>
              {f}
            </button>
          ))}
        </div>

        {currentEp && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.05] border border-white/10">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: currentEp.color + '20', border: `1px solid ${currentEp.color}40` }}>
              <EqualizerBars playing={playing && countdown !== null} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono text-white/50">S{pad2(currentEp.season)}E{pad2(currentEp.episode)} &middot; {currentEp.dur} min</div>
              <div className="text-sm font-medium text-white truncate">{currentEp.showName}</div>
              {playing && countdown !== null && <div className="text-xs text-white/30 font-mono mt-0.5">Next in {countdown}s</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => jumpToEp(currentEp)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">Play</button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button onClick={regenerate} className="rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white hover:bg-white/20 transition-colors font-mono">Shuffle</button>
          <button onClick={togglePlay} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${playing ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {playing
              ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <button onClick={playNext} className="rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white hover:bg-white/20 transition-colors font-mono">Next</button>
        </div>

        <div className="flex items-center justify-between text-xs text-white/30 font-mono">
          <span>Session: {sessionCount} played / {sessionTime} min</span>
          <div className="flex items-center gap-2">
            <span>Auto-advance:</span>
            {DELAY_OPTIONS.map(d => (
              <button key={d} onClick={() => setAutoDelay(d)} className={`rounded px-2 py-0.5 transition-colors ${autoDelay === d ? 'text-white bg-white/10' : 'text-white/30 hover:text-white/60'}`}>{d}s</button>
            ))}
          </div>
        </div>
      </div>

      {upNext.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <div className="text-xs font-mono text-white/40">UP NEXT</div>
          {upNext.map((ep, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/20 w-4">{i + 1}</span>
                <span className="text-xs font-mono text-white/50">S{pad2(ep.season)}E{pad2(ep.episode)}</span>
                <span className="text-sm text-white/60">{ep.showName}</span>
              </div>
              <span className="text-xs text-white/30 font-mono">{ep.dur}m</span>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-white/40">PLAYED THIS SESSION</div>
          {history.slice(0, 10).map((ep, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/30">S{pad2(ep.season)}E{pad2(ep.episode)}</span>
                <span className="text-sm text-white/50">{ep.showName}</span>
              </div>
              <span className="text-xs text-white/20 font-mono">{ep.dur}m</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
