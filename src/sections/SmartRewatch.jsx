import { useState, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { pad2 } from '../lib/format.js';
import { REWATCH_MODES, generateRewatchRoute, shuffleRoute, removeFromRoute, addToRoute } from '../lib/services/RecommendationService.js';

function toInternalSeason(showId, displaySeason) {
  const s = SHOWS.find(x => x.id === showId);
  return displaySeason - (s?.seasonOffset || 0);
}

const LS_KEY = 'adventure:rewatch_routes';

function loadSavedRoutes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedRoutes(routes) {
  localStorage.setItem(LS_KEY, JSON.stringify(routes));
}

export default function SmartRewatch() {
  const { watchedMap, favorites, ratings, watchHistory, jumpTo, showToast } = usePlayer();
  const [selectedMode, setSelectedMode] = useState(REWATCH_MODES[0]?.id || 'favorites');
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [count, setCount] = useState(10);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState(loadSavedRoutes);
  const [progressIdx, setProgressIdx] = useState(0);

  useEffect(() => {
    persistSavedRoutes(savedRoutes);
  }, [savedRoutes]);

  const handleGenerate = useCallback(() => {
    const route = generateRewatchRoute(selectedMode, watchedMap, favorites, ratings, watchHistory, {
      showId: selectedShowId,
      count,
    });
    setCurrentRoute(route);
    setProgressIdx(0);
    showToast(`Route generated: ${route.episodes.length} episodes`);
  }, [selectedMode, watchedMap, favorites, ratings, watchHistory, selectedShowId, count, showToast]);

  const handleShuffle = useCallback(() => {
    if (!currentRoute) return;
    setCurrentRoute(shuffleRoute(currentRoute));
    showToast('Route shuffled');
  }, [currentRoute, showToast]);

  const handleRemove = useCallback((key) => {
    if (!currentRoute) return;
    const updated = removeFromRoute(currentRoute, key);
    setCurrentRoute(updated);
    setProgressIdx(prev => Math.min(prev, Math.max(0, updated.episodes.length - 1)));
  }, [currentRoute]);

  const handleSave = useCallback(() => {
    if (!currentRoute) return;
    setSavedRoutes(prev => {
      const existing = prev.findIndex(r => r.id === currentRoute.id);
      if (existing >= 0) return prev;
      return [currentRoute, ...prev].slice(0, 20);
    });
    showToast('Route saved');
  }, [currentRoute, showToast]);

  const handleStart = useCallback(() => {
    if (!currentRoute || currentRoute.episodes.length === 0) return;
    const ep = currentRoute.episodes[0];
    const intSeason = toInternalSeason(ep.showId, ep.season);
    jumpTo(ep.showId, intSeason, ep.episode);
    showToast(`Starting rewatch: S${pad2(ep.season)}E${pad2(ep.episode)}`);
  }, [currentRoute, jumpTo, showToast]);

  const handlePlayEp = useCallback((ep) => {
    const intSeason = toInternalSeason(ep.showId, ep.season);
    jumpTo(ep.showId, intSeason, ep.episode);
    showToast(`▶ S${pad2(ep.season)}E${pad2(ep.episode)} ${ep.showName}`);
  }, [jumpTo, showToast]);

  const handleLoadRoute = useCallback((route) => {
    setCurrentRoute(route);
    setProgressIdx(0);
    showToast('Route loaded');
  }, [showToast]);

  const handleDeleteRoute = useCallback((routeId) => {
    setSavedRoutes(prev => prev.filter(r => r.id !== routeId));
    if (currentRoute?.id === routeId) setCurrentRoute(null);
    showToast('Route deleted');
  }, [currentRoute, showToast]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Smart Rewatch</h2>
        <p className="mt-1 text-white/60">Generate curated rewatch routes from your history.</p>
      </div>

      {/* Mode selector */}
      <div>
        <div className="mb-2 text-xs font-mono text-white/40">MODE</div>
        <div className="flex flex-wrap gap-2">
          {REWATCH_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              className={`rounded-lg border px-3 py-2 text-xs font-mono transition ${
                m.id === selectedMode
                  ? 'border-white/50 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/30 hover:text-white/70'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Show filter */}
      <div>
        <div className="mb-2 text-xs font-mono text-white/40">SHOW FILTER</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedShowId(null)}
            className={`rounded-lg border px-3 py-2 text-xs font-mono transition ${
              selectedShowId === null
                ? 'border-white/50 bg-white/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/30 hover:text-white/70'
            }`}
          >
            ALL SHOWS
          </button>
          {SHOWS.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedShowId(s.id)}
              className={`rounded-lg border px-3 py-2 text-xs font-mono transition ${
                s.id === selectedShowId
                  ? 'border-white/50 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/30 hover:text-white/70'
              }`}
            >
              {s.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Count selector */}
      <div>
        <div className="mb-2 text-xs font-mono text-white/40">COUNT</div>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20].map(n => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`rounded-lg border px-4 py-2 text-xs font-mono transition ${
                n === count
                  ? 'border-white/50 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/30 hover:text-white/70'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        className="rounded-lg border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
      >
        GENERATE
      </button>

      {/* Current route */}
      {currentRoute && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-white/40">
              MODE: {REWATCH_MODES.find(m => m.id === currentRoute.mode)?.name || currentRoute.mode}
            </div>
            <div className="text-xs font-mono text-white/30">
              {progressIdx} / {currentRoute.episodes.length} episodes
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/50 transition-all"
              style={{ width: `${currentRoute.episodes.length > 0 ? (progressIdx / currentRoute.episodes.length) * 100 : 0}%` }}
            />
          </div>

          {/* Episode list */}
          {currentRoute.episodes.length === 0 ? (
            <p className="text-sm text-white/30">No episodes match this configuration. Try different filters.</p>
          ) : (
            <div className="space-y-1">
              {currentRoute.episodes.map((ep, idx) => (
                <div
                  key={`${ep.epKey}_${idx}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                    idx < progressIdx
                      ? 'bg-white/5'
                      : idx === progressIdx
                        ? 'bg-white/10'
                        : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-white/40 shrink-0 w-8">
                      {idx < progressIdx ? '✓' : pad2(idx + 1)}
                    </span>
                    <span className="text-xs font-mono text-white shrink-0">
                      S{pad2(ep.season)}E{pad2(ep.episode)}
                    </span>
                    <span className="text-sm text-white/60 truncate">{ep.showName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePlayEp(ep)}
                      className="text-xs font-mono text-white/50 hover:text-white transition"
                    >
                      ▶ PLAY
                    </button>
                    <button
                      onClick={() => handleRemove(ep.epKey)}
                      className="text-xs font-mono text-white/30 hover:text-white/60 transition"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {currentRoute.episodes.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleShuffle}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-mono text-white/60 hover:text-white hover:border-white/30 transition"
              >
                SHUFFLE
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-mono text-white/60 hover:text-white hover:border-white/30 transition"
              >
                SAVE ROUTE
              </button>
              <button
                onClick={handleStart}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-mono text-white hover:bg-white/20 transition"
              >
                START REWATCH
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved routes */}
      {savedRoutes.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-white/40">SAVED ROUTES</div>
          {savedRoutes.map(route => (
            <div
              key={route.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono text-white/40">
                  {REWATCH_MODES.find(m => m.id === route.mode)?.name || route.mode}
                </div>
                <div className="text-sm text-white/60 truncate">
                  {route.episodes.length} episodes
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => handleLoadRoute(route)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-mono text-white/50 hover:text-white hover:border-white/30 transition"
                >
                  LOAD
                </button>
                <button
                  onClick={() => handleDeleteRoute(route.id)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-mono text-white/30 hover:text-white/60 transition"
                >
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
