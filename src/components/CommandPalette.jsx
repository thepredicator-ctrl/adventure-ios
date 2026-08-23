import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { SECTIONS, getSectionIndex } from '../data/sections.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../lib/episodes.js';
import { THEMES } from '../data/themes.js';
import { SHOW_GENRES, MOODS } from '../data/genres.js';

const COMMANDS = [
  { id: 'search', label: 'Search episodes...', icon: 'SR', category: 'navigation' },
  { id: 'power_search', label: 'Power search...', icon: 'PS', category: 'navigation' },
  { id: 'play', label: 'Play current episode', icon: 'PL', category: 'player' },
  { id: 'continue', label: 'Continue watching', icon: 'CW', category: 'player' },
  { id: 'random', label: 'Random episode', icon: 'RN', category: 'player' },
  { id: 'next', label: 'Next episode', icon: 'NX', category: 'player' },
  { id: 'prev', label: 'Previous episode', icon: 'PV', category: 'player' },
  { id: 'adventure', label: 'Start Adventure Mode', icon: 'AM', category: 'mode' },
  { id: 'mission', label: 'Open Mission Control', icon: 'MC', category: 'navigation' },
  { id: 'terminal', label: 'Open Terminal', icon: 'TR', category: 'navigation' },
  { id: 'stats', label: 'Open Stats', icon: 'ST', category: 'navigation' },
  { id: 'awards', label: 'Open Awards', icon: 'AW', category: 'navigation' },
  { id: 'settings', label: 'Open Settings', icon: 'SE', category: 'navigation' },
  { id: 'ai', label: 'Open AI Assistant', icon: 'AI', category: 'navigation' },
  { id: 'analysis', label: 'Show Analysis', icon: 'SA', category: 'navigation' },
  { id: 'timeline', label: 'Show Timeline', icon: 'TL', category: 'navigation' },
  { id: 'rewatch', label: 'Smart Rewatch', icon: 'RW', category: 'mode' },
  { id: 'intel', label: 'Episode Intel', icon: 'EI', category: 'navigation' },
  { id: 'health', label: 'Provider Health', icon: 'PH', category: 'navigation' },
  { id: 'model_lab', label: 'AI Model Lab', icon: 'ML', category: 'navigation' },
  { id: 'theme', label: 'Toggle theme', icon: 'TH', category: 'visual' },
  { id: 'history', label: 'Show watch history', icon: 'WH', category: 'info' },
  { id: 'favorite', label: 'Toggle favorite', icon: 'FA', category: 'player' },
  { id: 'watched', label: 'Mark as watched', icon: 'MW', category: 'player' },
  { id: 'watchlist', label: 'Open watchlist', icon: 'WL', category: 'navigation' },
];

// getSectionIndex is imported from sections.js

export default function CommandPalette({ open, onClose, onNavigate }) {
  const {
    gotoNext, gotoPrev, gotoRandomEpisode, markCurrentWatched,
    toggleFavorite, isFavorite, show, global, setTheme,
    continueList, jumpTo, showToast, selectShow, setSeason, setEpisode,
    generateAdventure, setSettings,
    watchedMap, favorites, ratings, watchHistory, collections, watchlist,
    setAiConfig, aiConfig,
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState('commands'); // commands | power
  const inputRef = useRef(null);

  // Filter commands
  const filtered = query.trim()
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  // Show search
  const showResults = query.trim() && query.length > 1
    ? SHOWS.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
        .map(s => ({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'show', showData: s }))
    : [];

  // Power search results
  const powerResults = mode === 'power' && query.trim().length > 1 ? powerSearch(query, { watchedMap, favorites, ratings, watchHistory, collections, watchlist, show, global, SHOWS, SHOW_GENRES, MOODS, totalEpisodes, epKey, displaySeasonNumber, jumpTo, selectShow }) : [];

  const allResults = mode === 'power' && query.trim().length > 1
    ? [...powerResults]
    : [...filtered, ...showResults];

  useEffect(() => {
    if (open) { setQuery(''); setSelectedIdx(0); setMode('commands'); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  useEffect(() => { setSelectedIdx(0); }, [query, mode]);

  const executeCommand = useCallback((cmd) => {
    const id = typeof cmd === 'string' ? cmd : cmd.id;
    switch (id) {
      case 'search':
        onNavigate?.(getSectionIndex('Episodes') ?? 2); break;
      case 'power_search':
        setMode('power'); break;
      case 'play':
        showToast(`NOW PLAYING: ${show.name} S${String(displaySeasonNumber(show, global.season)).padStart(2, '0')}E${String(global.episode).padStart(2, '0')}`); break;
      case 'continue':
        if (continueList.length > 0) { const entry = continueList[0]; jumpTo(entry.showId, entry.season, entry.episode); showToast('CONTINUE WATCHING'); }
        else showToast('NO HISTORY');
        break;
      case 'random': gotoRandomEpisode(); break;
      case 'next': gotoNext(); break;
      case 'prev': gotoPrev(); break;
      case 'adventure': onNavigate?.(getSectionIndex('Adventure Mode') ?? 16); break;
      case 'mission': onNavigate?.(getSectionIndex('Mission Control') ?? 0); break;
      case 'terminal': onNavigate?.(getSectionIndex('Terminal') ?? 22); break;
      case 'stats': onNavigate?.(getSectionIndex('Stats') ?? 10); break;
      case 'awards': onNavigate?.(getSectionIndex('Awards') ?? 11); break;
      case 'settings': onNavigate?.(getSectionIndex('Settings') ?? 27); break;
      case 'ai': onNavigate?.(getSectionIndex('AI Assistant') ?? 14); break;
      case 'analysis': onNavigate?.(getSectionIndex('Show Analysis') ?? 8); break;
      case 'timeline': onNavigate?.(getSectionIndex('Show Timeline') ?? 9); break;
      case 'rewatch': onNavigate?.(getSectionIndex('Smart Rewatch') ?? 10); break;
      case 'intel': onNavigate?.(getSectionIndex('Episode Intel') ?? 3); break;
      case 'health': onNavigate?.(getSectionIndex('Provider Health') ?? 21); break;
      case 'model_lab': onNavigate?.(getSectionIndex('AI Model Lab') ?? 17); break;
      case 'theme': {
        const idx = THEMES.findIndex(t => t.id === global.theme);
        const next = THEMES[(idx + 1) % THEMES.length];
        setTheme(next.id); showToast(`THEME // ${next.name}`); break;
      }
      case 'history': onNavigate?.(getSectionIndex('Episodes') ?? 2); break;
      case 'favorite':
        toggleFavorite(show.id, global.season, global.episode);
        showToast(isFavorite(show.id, global.season, global.episode) ? 'FAVORITED' : 'UNFAVORITED'); break;
      case 'watched': markCurrentWatched(); break;
      case 'watchlist': onNavigate?.(getSectionIndex('Shows') ?? 5); break;
      default:
        if (id.startsWith('show:')) {
          const s = SHOWS.find(sh => sh.id === id.replace('show:', ''));
          if (s) { selectShow(SHOWS.indexOf(s)); showToast(`SHOW: ${s.name}`); }
        }
        if (id.startsWith('play:')) {
          const parts = id.replace('play:', '').split(':');
          if (parts.length >= 3) jumpTo(parts[0], Number(parts[1]), Number(parts[2]));
        }
        break;
    }
    onClose();
  }, [show, global, continueList, gotoNext, gotoPrev, gotoRandomEpisode, markCurrentWatched, toggleFavorite, isFavorite, setTheme, jumpTo, selectShow, showToast, onClose, onNavigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { if (mode === 'power') { setMode('commands'); setQuery(''); } else { onClose(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allResults[selectedIdx]) { executeCommand(allResults[selectedIdx]); }
  }, [allResults, selectedIdx, executeCommand, onClose, mode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/15 bg-black/95 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="text-xs font-mono text-white/40">{mode === 'power' ? 'POWER SEARCH' : 'COMMAND'}</span>
          <span className="text-white/30">›</span>
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={mode === 'power' ? 'Search episodes, shows, genres, status...' : 'Type a command...'}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none font-mono" />
          {mode === 'power' && (
            <button onClick={() => { setMode('commands'); setQuery(''); }} className="text-[10px] font-mono text-white/40 hover:text-white/70 transition">COMMANDS</button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {allResults.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-white/40 font-mono">No matching results.</div>
          )}
          {allResults.map((item, i) => (
            <button key={item.id} onClick={() => executeCommand(item)} onMouseEnter={() => setSelectedIdx(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                i === selectedIdx ? 'bg-white/10 border border-white/15' : 'border border-transparent hover:bg-white/[0.04]'}`}>
              <span className="flex h-6 w-6 items-center justify-center rounded bg-white/[0.06] text-[10px] font-mono text-white/50">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white/80">{item.label}</span>
                {item.detail && <span className="ml-2 text-[10px] text-white/30 font-mono">{item.detail}</span>}
              </div>
              <span className="ml-auto text-[10px] font-mono text-white/20 uppercase shrink-0">{item.category}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-white/5 px-4 py-2 flex gap-4 text-[10px] font-mono text-white/30">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
          {mode === 'commands' && <span>type for power search</span>}
        </div>
      </div>
    </div>
  );
}

// ---- Power Search Engine ----
function powerSearch(query, ctx) {
  const { watchedMap, favorites, ratings, watchHistory, collections, show, global, SHOWS, SHOW_GENRES, MOODS, totalEpisodes, epKey, displaySeasonNumber, jumpTo, selectShow } = ctx;
  const q = query.toLowerCase();
  const results = [];

  // Helper to add episode results
  const addEp = (s, season, episode, reason, category = 'episode') => {
    results.push({
      id: `play:${s.id}:${season}:${episode}`,
      label: `${s.shortName} S${String(displaySeasonNumber(s, season)).padStart(2, '0')}E${String(episode).padStart(2, '0')}`,
      icon: s.icon, category, detail: reason,
    });
  };

  // Show name search
  for (const s of SHOWS) {
    if (s.name.toLowerCase().includes(q) || s.shortName.toLowerCase().includes(q)) {
      results.push({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'show', detail: `${totalEpisodes(s)} episodes` });
    }
  }

  // Genre search
  for (const [showId, genres] of Object.entries(SHOW_GENRES)) {
    for (const g of genres) {
      if (g.toLowerCase().includes(q)) {
        const s = SHOWS.find(x => x.id === showId);
        if (s && !results.find(r => r.id === `show:${s.id}`)) {
          results.push({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'genre', detail: g });
        }
      }
    }
  }

  // Mood search
  for (const mood of MOODS) {
    if (mood.name.toLowerCase().includes(q) || mood.id.includes(q)) {
      for (const s of SHOWS) {
        const genres = SHOW_GENRES[s.id] || [];
        if (mood.genres.length === 0 || mood.genres.some(g => genres.includes(g))) {
          if (!results.find(r => r.id === `show:${s.id}`)) {
            results.push({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'mood', detail: mood.name });
          }
        }
      }
    }
  }

  // Unwatched search
  if (q.includes('unwatched') || q.includes('new') || q.includes("haven't")) {
    for (const s of SHOWS) {
      const watched = watchedMap[s.id] || [];
      for (let si = 0; si < s.seasons.length; si++) {
        for (let e = 1; e <= s.seasons[si]; e++) {
          if (!watched.includes(epKey(si + 1, e))) {
            addEp(s, si + 1, e, 'unwatched', 'unwatched');
            if (results.filter(r => r.category === 'unwatched').length >= 5) break;
          }
        }
        if (results.filter(r => r.category === 'unwatched').length >= 5) break;
      }
    }
  }

  // Favorites search
  if (q.includes('favorite') || q.includes('fav')) {
    for (const fav of favorites.slice(0, 10)) {
      const [sid, rest] = fav.split(':S');
      const [sStr, eStr] = rest.split(':E');
      const s = SHOWS.find(x => x.id === sid);
      if (s) addEp(s, Number(sStr), Number(eStr), 'favorite', 'favorite');
    }
  }

  // Watchlist search
  if (q.includes('watchlist')) {
    for (const showId of (typeof watchlist === 'object' && !Array.isArray(watchlist) ? Object.keys(watchlist) : Array.isArray(watchlist) ? watchlist : [])) {
      const s = SHOWS.find(x => x.id === showId);
      if (s && !results.find(r => r.id === `show:${s.id}`)) {
        results.push({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'watchlist', detail: 'In watchlist' });
      }
    }
  }

  // Close to finishing
  if (q.includes('finish') || q.includes('close') || q.includes('almost') || q.includes('progress')) {
    for (const s of SHOWS) {
      const watched = watchedMap[s.id] || [];
      const total = totalEpisodes(s);
      const pct = Math.round((watched.length / total) * 100);
      if (pct > 50 && pct < 100 && !results.find(r => r.id === `show:${s.id}`)) {
        results.push({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'progress', detail: `${pct}% complete` });
      }
    }
  }

  // Completion percentage filter
  const pctMatch = q.match(/(\d+)%/);
  if (pctMatch) {
    const target = Number(pctMatch[1]);
    for (const s of SHOWS) {
      const watched = watchedMap[s.id] || [];
      const pct = Math.round((watched.length / totalEpisodes(s)) * 100);
      if (Math.abs(pct - target) <= 10 && !results.find(r => r.id === `show:${s.id}`)) {
        results.push({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'progress', detail: `${pct}%` });
      }
    }
  }

  // Most rewatched
  if (q.includes('rewatch') || q.includes('re-watch') || q.includes('most watched')) {
    const counts = {};
    for (const entry of watchHistory) {
      const k = `${entry.showId}:${entry.season}:${entry.episode}`;
      counts[k] = (counts[k] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [k, count] of sorted) {
      const [sid, sStr, eStr] = k.split(':');
      const s = SHOWS.find(x => x.id === sid);
      if (s) addEp(s, Number(sStr), Number(eStr), `${count}x watched`, 'rewatch');
    }
  }

  // Highly rated
  if (q.includes('rated') || q.includes('rating') || q.includes('star')) {
    const sorted = Object.entries(ratings).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [k, rating] of sorted) {
      const [sid, rest] = k.split(':S');
      const [sStr, eStr] = rest.split(':E');
      const s = SHOWS.find(x => x.id === sid);
      if (s) addEp(s, Number(sStr), Number(eStr), `${rating}/5`, 'rated');
    }
  }

  // Collections search
  if (q.includes('collection')) {
    for (const col of (Array.isArray(collections) ? collections : [])) {
      if (col.name.toLowerCase().includes(q) || q.includes('collection')) {
        for (const ep of (col.episodes || []).slice(0, 3)) {
          const s = SHOWS.find(x => x.id === ep.showId);
          if (s) addEp(s, ep.season, ep.episode, col.name, 'collection');
        }
      }
    }
  }

  // Duration/episode count filter
  const epCountMatch = q.match(/(\d+)\s*ep/);
  if (epCountMatch) {
    const targetEps = Number(epCountMatch[1]);
    for (const s of SHOWS) {
      if (Math.abs(totalEpisodes(s) - targetEps) <= 10 && !results.find(r => r.id === `show:${s.id}`)) {
        results.push({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'show', detail: `${totalEpisodes(s)} episodes` });
      }
    }
  }

  return results.slice(0, 20);
}