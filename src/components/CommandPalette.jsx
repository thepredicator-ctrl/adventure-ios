import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { SECTIONS } from '../data/sections.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../lib/episodes.js';
import { THEMES } from '../data/themes.js';

const COMMANDS = [
  { id: 'search', label: 'Search episodes...', icon: 'SR', category: 'navigation' },
  { id: 'play', label: 'Play current episode', icon: 'PL', category: 'player' },
  { id: 'continue', label: 'Continue watching', icon: 'CW', category: 'player' },
  { id: 'random', label: 'Random episode', icon: 'RN', category: 'player' },
  { id: 'next', label: 'Next episode', icon: 'NX', category: 'player' },
  { id: 'prev', label: 'Previous episode', icon: 'PV', category: 'player' },
  { id: 'adventure', label: 'Start Adventure Mode', icon: 'AM', category: 'mode' },
  { id: 'terminal', label: 'Open Terminal', icon: 'TR', category: 'navigation' },
  { id: 'stats', label: 'Open Stats', icon: 'ST', category: 'navigation' },
  { id: 'awards', label: 'Open Awards', icon: 'AW', category: 'navigation' },
  { id: 'settings', label: 'Open Settings', icon: 'SE', category: 'navigation' },
  { id: 'ai', label: 'Open AI Assistant', icon: 'AI', category: 'navigation' },
  { id: 'theme', label: 'Toggle theme', icon: 'TH', category: 'visual' },
  { id: 'history', label: 'Show watch history', icon: 'WH', category: 'info' },
  { id: 'favorite', label: 'Toggle favorite', icon: 'FA', category: 'player' },
  { id: 'watched', label: 'Mark as watched', icon: 'MW', category: 'player' },
];

export default function CommandPalette({ open, onClose, onNavigate }) {
  const {
    gotoNext, gotoPrev, gotoRandomEpisode, markCurrentWatched,
    toggleFavorite, isFavorite, show, global, setTheme,
    continueList, jumpTo, showToast, selectShow, setSeason, setEpisode,
    generateAdventure, setSettings,
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  // Filter commands based on query
  const filtered = query.trim()
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  // Also search shows if query matches
  const showResults = query.trim() && query.length > 1
    ? SHOWS.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
        .map(s => ({ id: `show:${s.id}`, label: s.name, icon: s.icon, category: 'show', showData: s }))
    : [];

  const allResults = [...filtered, ...showResults];

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const executeCommand = useCallback((cmd) => {
    const id = typeof cmd === 'string' ? cmd : cmd.id;
    switch (id) {
      case 'search':
        // Navigate to episodes section
        onNavigate?.(1);
        break;
      case 'play':
        showToast(`NOW PLAYING: ${show.name} S${String(displaySeasonNumber(show, global.season)).padStart(2, '0')}E${String(global.episode).padStart(2, '0')}`);
        break;
      case 'continue':
        if (continueList.length > 0) {
          const entry = continueList[0];
          jumpTo(entry.showId, entry.season, entry.episode);
          showToast('CONTINUE WATCHING');
        } else {
          showToast('NO HISTORY');
        }
        break;
      case 'random':
        gotoRandomEpisode();
        break;
      case 'next':
        gotoNext();
        break;
      case 'prev':
        gotoPrev();
        break;
      case 'adventure':
        onNavigate?.(8);
        break;
      case 'terminal':
        onNavigate?.(11);
        break;
      case 'stats':
        onNavigate?.(3);
        break;
      case 'awards':
        onNavigate?.(4);
        break;
      case 'settings':
        onNavigate?.(6);
        break;
      case 'ai':
        onNavigate?.(9);
        break;
      case 'theme': {
        const idx = THEMES.findIndex(t => t.id === global.theme);
        const next = THEMES[(idx + 1) % THEMES.length];
        setTheme(next.id);
        showToast(`THEME // ${next.name}`);
        break;
      }
      case 'history':
        onNavigate?.(1);
        break;
      case 'favorite':
        toggleFavorite(show.id, global.season, global.episode);
        showToast(isFavorite(show.id, global.season, global.episode) ? 'FAVORITED' : 'UNFAVORITED');
        break;
      case 'watched':
        markCurrentWatched();
        break;
      default:
        if (id.startsWith('show:')) {
          const s = SHOWS.find(sh => sh.id === id.replace('show:', ''));
          if (s) {
            const idx = SHOWS.indexOf(s);
            selectShow(idx);
            showToast(`SHOW: ${s.name}`);
          }
        }
        break;
    }
    onClose();
  }, [show, global, continueList, gotoNext, gotoPrev, gotoRandomEpisode, markCurrentWatched, toggleFavorite, isFavorite, setTheme, jumpTo, selectShow, showToast, onClose, onNavigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allResults[selectedIdx]) { executeCommand(allResults[selectedIdx]); }
  }, [allResults, selectedIdx, executeCommand, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/15 bg-black/95 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="text-xs font-mono text-white/40">COMMAND</span>
          <span className="text-white/30">›</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none font-mono"
          />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {allResults.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-white/40 font-mono">No matching commands.</div>
          )}
          {allResults.map((item, i) => (
            <button
              key={item.id}
              onClick={() => executeCommand(item)}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                i === selectedIdx
                  ? 'bg-white/10 border border-white/15'
                  : 'border border-transparent hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-white/[0.06] text-[10px] font-mono text-white/50">
                {item.icon}
              </span>
              <span className="text-sm text-white/80">{item.label}</span>
              <span className="ml-auto text-[10px] font-mono text-white/20 uppercase">{item.category}</span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-white/5 px-4 py-2 flex gap-4 text-[10px] font-mono text-white/30">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}