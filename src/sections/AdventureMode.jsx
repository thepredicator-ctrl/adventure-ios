import { useState, useCallback, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { MOODS, GENRES } from '../data/genres.js';
import { pad2 } from '../lib/format.js';
import { displaySeasonNumber, epKey } from '../lib/episodes.js';
import { watchedPct } from '../lib/episodes.js';

const LENGTHS = [
  { id: 'any',    label: 'ANY' },
  { id: 'short',  label: '< 15 MIN' },
  { id: 'medium', label: '15–25 MIN' },
  { id: 'long',   label: '25+ MIN' },
];

const STATUS_OPTIONS = [
  { id: 'any',       label: 'ANY' },
  { id: 'unwatched', label: 'UNWATCHED' },
  { id: 'watched',   label: 'WATCHED' },
];

export default function AdventureMode() {
  const {
    generateAdventure, savedAdventures, adventureHistory, deleteSavedAdventure,
    jumpTo, watchedMap, showToast, selectShow, show, global, setServer, currentServer, markCurrentWatched, continueList, switchProfile, createProfile, deleteProfile, activeProfileId, profiles, toggleWatchlist, watchlist,
    getRecommendations, aiConfig, setAiConfig, devSettings, setDevSettings, global: g, setSettings, setSeason, setEpisode, resetAllProgress, resetCurrentShow, gotoNext, gotoPrev, markUnwatched, markSeasonWatched, toggleFavorite, isFavorite, addToWatchHistory, addToCollection, collections, favorites, setRating, getRating, savePlaybackPosition, getPlaybackPosition, setVideoBgUrl, setPlaybackSpeed, playbackSpeed, setAutoplay, setTheme, setServer: setServerFn, gotoRandomEpisode,
  } = usePlayer();

  const [mood, setMood] = useState('random');
  const [genreId, setGenreId] = useState('');
  const [showId, setShowId] = useState('');
  const [length, setLength] = useState('any');
  const [status, setStatus] = useState('unwatched');
  const [count, setCount] = useState(5);
  const [currentAdv, setCurrentAdv] = useState(null);
  const [advIdx, setAdvIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState('config'); // config | result | history | saved

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      const adv = generateAdventure({ mood, genreIds: genreId ? [genreId] : [], showId: showId || undefined, maxEps: count, unwatchedOnly: status === 'unwatched', minLength: length, maxLength: length });
      setCurrentAdv(adv);
      setAdvIdx(0);
      setView('result');
      setGenerating(false);
    }, 400); // Brief delay for animation effect
  }, [mood, genreId, showId, length, status, count, generateAdventure]);

  const handleStart = useCallback((ep, idx) => {
    const s = SHOWS.find(x => x.id === ep.showId);
    if (!s) return;
    const showIdx = SHOWS.indexOf(s);
    selectShow(showIdx);
    // Small delay to let context update
    setTimeout(() => {
      jumpTo(ep.showId, ep.season, ep.episode);
      showToast(`ADVENTURE // ${currentAdv.number} — Episode ${idx + 1}`);
    }, 50);
  }, [selectShow, jumpTo, currentAdv, showToast]);

  const handleSave = useCallback(() => {
    if (currentAdv) { savedAdventures.find(a => a.id === currentAdv.id) || showToast('Already saved'); }
  }, [currentAdv, savedAdventures, showToast]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Adventure Mode</h2>
        <p className="mt-1 text-white/60">Generate curated episode routes based on mood and preference.</p>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {[['config', 'GENERATE'], ['result', 'CURRENT'], ['history', 'HISTORY'], ['saved', 'SAVED']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            className={`rounded-md border px-3 py-1.5 text-xs font-mono uppercase transition ${
              view === v ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
            }`}>
            {l}
            {v === 'saved' && ` (${savedAdventures.length})`}
            {v === 'history' && ` (${adventureHistory.length})`}
          </button>
        ))}
      </div>

      {view === 'config' && (
        <>
          {/* Configuration */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
            <div className="text-sm font-medium text-white">Configure adventure</div>

            {/* Mood */}
            <div>
              <div className="mb-2 text-xs text-white/50 uppercase tracking-widest">Mood</div>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button key={m.id} onClick={() => setMood(m.id)}
                    className={`rounded-md border px-3 py-2 text-xs font-mono uppercase transition ${
                      mood === m.id ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
                    }`}>{m.name}</button>
                ))}
              </div>
            </div>

            {/* Genre */}
            <div>
              <div className="mb-2 text-xs text-white/50 uppercase tracking-widest">Genre</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setGenreId('')} className={`rounded-md border px-3 py-2 text-xs font-mono uppercase transition ${!genreId ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'}`}>ANY</button>
                {GENRES.map(g => (
                  <button key={g.id} onClick={() => setGenreId(g.id)}
                    className={`rounded-md border px-3 py-2 text-xs font-mono uppercase transition ${
                      genreId === g.id ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
                    }`}>{g.name}</button>
                ))}
              </div>
            </div>

            {/* Show */}
            <div>
              <div className="mb-2 text-xs text-white/50 uppercase tracking-widest">Show</div>
              <select value={showId} onChange={e => setShowId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none">
                <option value="">Any show</option>
                {SHOWS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Status + Count row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-xs text-white/50 uppercase tracking-widest">Status</div>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setStatus(o.id)}
                      className={`rounded-md border px-2.5 py-2 text-xs font-mono transition ${
                        status === o.id ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/30'
                      }`}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs text-white/50 uppercase tracking-widest">Episodes</div>
                <div className="flex items-center gap-2">
                  <input type="range" min="1" max="20" value={count} onChange={e => setCount(Number(e.target.value))}
                    className="h-1 flex-1 appearance-none rounded-full bg-white/10 accent-white" />
                  <span className="w-6 text-right font-mono text-sm text-white">{count}</span>
                </div>
              </div>
            </div>

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={generating}
              className="w-full rounded-xl border border-white/20 bg-white/10 py-4 text-center text-sm font-medium uppercase tracking-widest text-white transition hover:bg-white/20 disabled:opacity-50">
              {generating ? 'GENERATING...' : 'GENERATE ADVENTURE'}
            </button>
          </div>
        </>
      )}

      {view === 'result' && currentAdv && (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">ADVENTURE // {currentAdv.number}</div>
                <div className="mt-0.5 text-xs text-white/50">
                  {currentAdv.config.mood !== 'random' ? currentAdv.config.mood.toUpperCase() : 'RANDOM'}
                  {currentAdv.config.genreIds?.length ? ` · ${currentAdv.config.genreIds[0].toUpperCase()}` : ''}
                  · {currentAdv.episodes.length} episodes
                </div>
              </div>
              <button onClick={() => { if (currentAdv) { showToast('Adventure saved'); } }}
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40">SAVE</button>
            </div>

            <div className="mt-4 space-y-2">
              {currentAdv.episodes.map((ep, i) => {
                const isCurrent = i === advIdx;
                const watched = (watchedMap[ep.showId] ?? []).includes(epKey(ep.season, ep.episode));
                return (
                  <button key={i} onClick={() => { setAdvIdx(i); handleStart(ep, i); }}
                    className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${
                      isCurrent ? 'border-white/60 bg-white/15' : 'border-white/10 bg-white/[0.02] hover:border-white/30'
                    }`}>
                    <span className="w-6 text-xs font-mono text-white/40">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white">{ep.showName}</div>
                      <div className="text-xs text-white/50 font-mono">S{pad2(ep.season)}E{pad2(ep.episode)}</div>
                    </div>
                    {watched && <span className="text-xs text-white/40">WATCHED</span>}
                    {isCurrent && <span className="text-xs font-mono text-white">NOW</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={handleGenerate} className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40">REGENERATE</button>
              <button onClick={() => {
                const shuffled = [...currentAdv.episodes].sort(() => Math.random() - 0.5);
                setCurrentAdv({ ...currentAdv, episodes: shuffled });
                showToast('Shuffled');
              }} className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/40">SHUFFLE</button>
            </div>
          </div>
        </>
      )}

      {view === 'history' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-sm font-medium text-white">Adventure history</div>
          {adventureHistory.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">No adventures generated yet.</div>
          ) : (
            <div className="space-y-2">
              {[...adventureHistory].reverse().slice(0, 20).map((adv, i) => (
                <div key={adv.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="text-sm text-white">ADVENTURE // {adv.number}</div>
                    <div className="text-xs text-white/50 font-mono">{adv.episodes.length} eps · {new Date(adv.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => { setCurrentAdv(adv); setAdvIdx(0); setView('result'); }}
                    className="text-xs text-white/50 hover:text-white transition">VIEW</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'saved' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-sm font-medium text-white">Saved adventures</div>
          {savedAdventures.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">No saved adventures.</div>
          ) : (
            <div className="space-y-2">
              {savedAdventures.map(adv => (
                <div key={adv.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <button onClick={() => { setCurrentAdv(adv); setAdvIdx(0); setView('result'); }} className="text-left">
                    <div className="text-sm text-white">ADVENTURE // {adv.number}</div>
                    <div className="text-xs text-white/50 font-mono">{adv.episodes.length} eps · {new Date(adv.createdAt).toLocaleDateString()}</div>
                  </button>
                  <button onClick={() => { deleteSavedAdventure(adv.id); showToast('Deleted'); }}
                    className="text-xs text-white/40 hover:text-red-300 transition">DELETE</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
