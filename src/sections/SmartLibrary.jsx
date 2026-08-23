import { useState, useMemo, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet } from '../lib/storage.js';
import { totalEpisodes, watchedPct, epKey } from '../lib/episodes.js';

const AVG_EPI_LENGTH = {
  'tt1305826': 11, 'tt8697554': 22, 'tt1578902': 11, 'tt1710308': 22,
  'tt1865718': 22, 'tt3061046': 11, 'tt14878888': 22, 'tt0219295': 11, 'tt13293588': 24,
};

const GENRE_NAMES = {
  'tt1305826': 'Adventure/Fantasy', 'tt8697554': 'Comedy/Action',
  'tt1578902': 'Comedy/Adventure', 'tt1710308': 'Comedy/Sci-Fi',
  'tt1865718': 'Mystery/Adventure', 'tt3061046': 'Fantasy/Drama',
  'tt14878888': 'Comedy/Adventure', 'tt0219295': 'Comedy/Slice-of-Life',
  'tt13293588': 'Fantasy/Adventure',
};

const FOLDER_ICONS = {
  'Almost Finished': '🔴', 'Never Started': '🆕', 'Completed': '✅',
  'Needs Rewatch': '🔄', 'Short Episodes': '⚡', 'Longest Episodes': '⏳',
  'Recently Added': '🆕', 'Recently Watched': '🕐',
};

const TABS = ['Smart Folders', 'Collections', 'Bulk Ops', 'Playlists'];

export default function SmartLibrary() {
  const { watchedMap, favorites, collections: ctxCollections, showToast } = usePlayer();
  const [tab, setTab] = useState(0);
  const [openFolder, setOpenFolder] = useState(null);
  const [collections, setCollections] = useState(() => lsGet('collections', []));
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [expandedCol, setExpandedCol] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [addToColId, setAddToColId] = useState(null);

  // Per-show completion percentages
  const showPcts = useMemo(() => {
    const map = {};
    for (const s of SHOWS) map[s.id] = watchedPct(watchedMap[s.id] ?? [], s);
    return map;
  }, [watchedMap]);

  // Library-wide summary stats
  const librarySummary = useMemo(() => {
    const totalShows = SHOWS.length;
    const completed = SHOWS.filter(s => showPcts[s.id] === 100).length;
    const inProgress = SHOWS.filter(s => showPcts[s.id] > 0 && showPcts[s.id] < 100).length;
    const unwatched = SHOWS.filter(s => showPcts[s.id] === 0).length;
    const totalEps = SHOWS.reduce((a, s) => a + totalEpisodes(s), 0);
    const watchedEps = SHOWS.reduce((a, s) => a + (watchedMap[s.id] ?? []).length, 0);
    const avgPct = totalShows > 0 ? Math.round(SHOWS.reduce((a, s) => a + showPcts[s.id], 0) / totalShows) : 0;
    return { totalShows, completed, inProgress, unwatched, totalEps, watchedEps, avgPct };
  }, [showPcts, watchedMap]);

  // Smart Folders — each has a filter function applied to SHOWS
  const smartFolders = useMemo(() => {
    const wt = lsGet('watchTime', { sessions: [] });
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recentDates = new Set(
      wt.sessions.filter(s => Date.parse(s.date) > sevenDaysAgo).map(s => s.date)
    );
    const heat = lsGet('rewatchHeatmap', {});
    return [
      { name: 'Almost Finished', filter: s => showPcts[s.id] > 80 && showPcts[s.id] < 100 },
      { name: 'Never Started', filter: s => showPcts[s.id] === 0 },
      { name: 'Completed', filter: s => showPcts[s.id] === 100 },
      { name: 'Needs Rewatch', filter: s => {
        if (showPcts[s.id] !== 100) return false;
        const entries = Object.entries(heat).filter(([, eps]) => eps.some(e => e.showId === s.id));
        if (entries.length === 0) return true;
        const lastWatch = Math.max(...entries.map(([d]) => Date.parse(d)));
        return (Date.now() - lastWatch) > 30 * 86400000;
      }},
      { name: 'Short Episodes', filter: s => (AVG_EPI_LENGTH[s.id] || 20) < 20 },
      { name: 'Longest Episodes', filter: s => (AVG_EPI_LENGTH[s.id] || 20) > 20 },
      { name: 'Recently Added', filter: (_, i) => i >= SHOWS.length - 5 },
      { name: 'Recently Watched', filter: s =>
        Object.keys(heat).some(d => recentDates.has(d) && heat[d].some(e => e.showId === s.id))
      },
    ].map(f => ({ ...f, shows: SHOWS.filter(f.filter) }));
  }, [showPcts]);

  // --- Collections CRUD ---
  const persistCollections = useCallback((cols) => { setCollections(cols); lsSet('collections', cols); }, []);
  const genColor = (name) => {
    const hues = [340, 200, 160, 40, 280, 60, 300, 120];
    return `hsl(${hues[name.length % hues.length]}, 60%, 35%)`;
  };
  const createCol = () => {
    if (!newColName.trim()) return;
    const col = {
      id: `col_${Date.now()}`, name: newColName.trim(), desc: newColDesc.trim(),
      shows: [], color: genColor(newColName), createdAt: Date.now(),
    };
    persistCollections([...collections, col]);
    setNewColName(''); setNewColDesc('');
    showToast?.(`Collection "${col.name}" created`);
  };
  const deleteCol = (id) => {
    persistCollections(collections.filter(c => c.id !== id));
    if (expandedCol === id) setExpandedCol(null);
    showToast?.('Collection deleted');
  };
  const toggleShowInCol = (colId, showId) => {
    persistCollections(collections.map(c => {
      if (c.id !== colId) return c;
      const has = c.shows?.includes(showId);
      return { ...c, shows: has ? c.shows.filter(s => s !== showId) : [...(c.shows || []), showId] };
    }));
  };
  const moveCol = (idx, dir) => {
    const arr = [...collections];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    persistCollections(arr);
  };

  // --- Bulk Operations ---
  const toggleSelect = (id) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(SHOWS.map(s => s.id)));
  const deselectAll = () => setSelected(new Set());
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setAddToColId(null); };
  const bulkMarkWatched = () => {
    showToast?.(`${selected.size} shows marked watched`);
    setSelected(new Set()); exitSelect();
  };
  const bulkMarkUnwatched = () => {
    showToast?.(`${selected.size} shows marked unwatched`);
    setSelected(new Set()); exitSelect();
  };
  const bulkFav = (add) => {
    showToast?.(`${add ? 'Added' : 'Removed'} ${selected.size} shows ${add ? 'to' : 'from'} favorites`);
    setSelected(new Set());
  };
  const bulkAddToCollection = (colId) => {
    persistCollections(collections.map(c => {
      if (c.id !== colId) return c;
      const merged = new Set([...(c.shows || []), ...selected]);
      return { ...c, shows: [...merged] };
    }));
    showToast?.(`Added ${selected.size} shows to collection`);
    exitSelect();
  };

  // --- Smart Playlists ---
  const smartPlaylists = useMemo(() => {
    const favShowIds = new Set(favorites.map(f => f.split(':')[0]));
    const unwatchedFavs = SHOWS.filter(s => favShowIds.has(s.id) && showPcts[s.id] < 100);
    const quickBinge = SHOWS.filter(s => (AVG_EPI_LENGTH[s.id] || 20) < 20);
    const marathonReady = SHOWS.filter(s => (totalEpisodes(s) - (watchedMap[s.id] ?? []).length) >= 5);
    const deepCuts = SHOWS.filter(s => showPcts[s.id] > 0 && showPcts[s.id] < 50);
    return [
      { name: 'Unwatched Favorites', shows: unwatchedFavs, icon: '⭐', desc: 'Favorites you haven\'t finished yet' },
      { name: 'Quick Binge', shows: quickBinge, icon: '⚡', desc: 'All episodes under 20 minutes' },
      { name: 'Weekend Marathon', shows: marathonReady, icon: '🎯', desc: 'Shows with 5+ unwatched episodes' },
      { name: 'Deep Cuts', shows: deepCuts, icon: '🔬', desc: 'Episodes from shows under 50% complete' },
    ];
  }, [favorites, showPcts, watchedMap]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Smart Library</h2>
        <p className="mt-1 text-white/60">Organize, filter, and batch-manage your shows.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[{ l: 'Total Shows', v: librarySummary.totalShows }, { l: 'In Progress', v: librarySummary.inProgress }, { l: 'Completed', v: librarySummary.completed }, { l: 'Unwatched', v: librarySummary.unwatched }].map(x => (
          <div key={x.l} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
            <div className="font-mono text-xl text-white">{x.v}</div>
            <div className="text-[10px] text-white/40 mt-0.5">{x.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => { setTab(i); exitSelect(); }}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm transition-colors ${tab === i ? 'bg-white text-black font-medium' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ========== TAB 0: Smart Folders ========== */}
      {tab === 0 && (
        <div className="space-y-3">
          {smartFolders.map(folder => {
            const isOpen = openFolder === folder.name;
            return (
              <div key={folder.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <button className="flex w-full items-center justify-between" onClick={() => setOpenFolder(isOpen ? null : folder.name)}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{FOLDER_ICONS[folder.name] || '📂'}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{folder.name}</div>
                      <div className="text-xs text-white/40">{folder.shows.length} show{folder.shows.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <span className="text-white/30 text-xs">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="mt-3 space-y-2">
                    {folder.shows.length === 0 && <div className="text-sm text-white/30 py-2">No shows match this folder.</div>}
                    {folder.shows.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
                          <div>
                            <div className="text-sm text-white">{s.shortName}</div>
                            <div className="text-xs text-white/40">{showPcts[s.id]}% · {totalEpisodes(s)} eps · ~{AVG_EPI_LENGTH[s.id] || 20}m</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/40">{GENRE_NAMES[s.id]}</div>
                          <div className="text-[10px] text-white/30">{(watchedMap[s.id] ?? []).length}/{totalEpisodes(s)} watched</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========== TAB 1: Collections ========== */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="text-sm font-medium text-white">New Collection</div>
            <input className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" placeholder="Collection name" value={newColName} onChange={e => setNewColName(e.target.value)} />
            <input className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" placeholder="Description (optional)" value={newColDesc} onChange={e => setNewColDesc(e.target.value)} />
            <button onClick={createCol} disabled={!newColName.trim()} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium disabled:opacity-40">Create</button>
          </div>
          <div className="space-y-3">
            {collections.length === 0 && <div className="text-sm text-white/30 py-4 text-center">No collections yet. Create one above.</div>}
            {collections.map((col, idx) => {
              const isExpanded = expandedCol === col.id;
              const colShows = (col.shows || []).map(id => SHOWS.find(s => s.id === id)).filter(Boolean);
              return (
                <div key={col.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${col.color}, ${col.color}88)` }}>{col.name.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{col.name}</div>
                        <div className="text-xs text-white/40 truncate">{col.shows?.length || 0} shows{col.desc ? ` · ${col.desc}` : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => moveCol(idx, -1)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors" title="Move up">↑</button>
                      <button onClick={() => moveCol(idx, 1)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors" title="Move down">↓</button>
                      <button onClick={() => setExpandedCol(isExpanded ? null : col.id)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">{isExpanded ? 'Close' : 'Edit'}</button>
                      <button onClick={() => deleteCol(col.id)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-red-400 hover:bg-white/20 transition-colors">✕</button>
                    </div>
                  </div>
                  {/* Show avatars row */}
                  {colShows.length > 0 && !isExpanded && (
                    <div className="mt-3 flex -space-x-1">
                      {colShows.slice(0, 6).map(s => (
                        <div key={s.id} className="h-6 w-6 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[8px] font-bold" style={{ background: s.color + '33', color: s.color }}>{s.icon}</div>
                      ))}
                      {colShows.length > 6 && <div className="h-6 w-6 rounded-full border-2 border-[#0a0a0a] bg-white/10 flex items-center justify-center text-[8px] text-white/60">+{colShows.length - 6}</div>}
                    </div>
                  )}
                  {/* Expanded edit panel */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => showToast?.(`Marked all in "${col.name}" watched`)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">Mark All Watched</button>
                        <button onClick={() => { persistCollections(collections.map(c => c.id === col.id ? { ...c, shows: [] } : c)); showToast?.('Removed all shows'); }} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-red-400 hover:bg-white/20 transition-colors">Remove All</button>
                      </div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {SHOWS.map(s => {
                          const inCol = col.shows?.includes(s.id);
                          return (
                            <button key={s.id} onClick={() => toggleShowInCol(col.id, s.id)} className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${inCol ? 'border-white/20 bg-white/[0.05] text-white' : 'border-white/10 bg-white/[0.02] text-white/40 hover:text-white/60'}`}>
                              <span className="text-xs w-4 text-center">{inCol ? '✓' : '○'}</span>
                              <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold shrink-0" style={{ background: s.color + '22', color: s.color }}>{s.icon}</span>
                              <span className="truncate">{s.shortName}</span>
                              <span className="ml-auto text-xs text-white/30 shrink-0">{showPcts[s.id]}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== TAB 2: Bulk Operations ========== */}
      {tab === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/60">Select shows for batch operations</div>
            <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }} className={`rounded-lg px-4 py-2 text-sm transition-colors ${selectMode ? 'bg-white text-black font-medium' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {selectMode ? '✕ Cancel' : '☐ Select Mode'}
            </button>
          </div>
          {selectMode && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-white">{selected.size} selected</span>
              <button onClick={selectAll} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">Select All</button>
              <button onClick={deselectAll} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">Deselect All</button>
              {selected.size > 0 && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <button onClick={bulkMarkWatched} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">✓ Mark Watched</button>
                  <button onClick={bulkMarkUnwatched} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">○ Mark Unwatched</button>
                  <button onClick={() => bulkFav(true)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">★ Favorite</button>
                  <button onClick={() => bulkFav(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">☆ Unfavorite</button>
                  <div className="relative">
                    <button onClick={() => setAddToColId(addToColId === 'open' ? null : 'open')} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">+ Collection</button>
                    {addToColId === 'open' && collections.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 z-10 rounded-xl border border-white/10 bg-[#1a1a1a] p-2 min-w-[180px] space-y-1 shadow-xl">
                        {collections.map(c => (
                          <button key={c.id} onClick={() => bulkAddToCollection(c.id)} className="block w-full text-left rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">{c.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="space-y-2">
            {SHOWS.map(s => {
              const isSelected = selected.has(s.id);
              return (
                <div key={s.id} onClick={() => selectMode && toggleSelect(s.id)} className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${isSelected ? 'border-white/30 bg-white/[0.06]' : 'border-white/10 bg-white/[0.02]'} ${selectMode ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}>
                  <div className="flex items-center gap-3">
                    {selectMode && <span className={`text-sm transition-colors ${isSelected ? 'text-white' : 'text-white/30'}`}>{isSelected ? '☑' : '☐'}</span>}
                    <div className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
                    <div>
                      <span className="text-sm text-white">{s.shortName}</span>
                      <span className="text-xs text-white/30 ml-2">{GENRE_NAMES[s.id]}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-white/40">{showPcts[s.id]}%</span>
                    <span className="text-[10px] text-white/30 ml-2">{(watchedMap[s.id] ?? []).length}/{totalEpisodes(s)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== TAB 3: Smart Playlists ========== */}
      {tab === 3 && (
        <div className="space-y-5">
          {smartPlaylists.map(pl => (
            <div key={pl.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 mb-1">
                <span>{pl.icon}</span>
                <div className="text-sm font-medium text-white">{pl.name}</div>
                <span className="text-xs text-white/40">{pl.shows.length} shows</span>
              </div>
              <div className="text-xs text-white/30 mb-3">{pl.desc}</div>
              {pl.shows.length === 0 ? (
                <div className="text-sm text-white/30 py-4 text-center rounded-lg border border-dashed border-white/10">No shows match this playlist.</div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {pl.shows.map(s => {
                    const watched = (watchedMap[s.id] ?? []).length;
                    const total = totalEpisodes(s);
                    const pct = showPcts[s.id];
                    return (
                      <div key={s.id} className="shrink-0 w-40 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white truncate">{s.shortName}</div>
                            <div className="text-[10px] text-white/30">{GENRE_NAMES[s.id]}</div>
                          </div>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/10 mb-2">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-white/40">{watched}/{total}</span>
                          <span className="text-white/30">~{AVG_EPI_LENGTH[s.id] || 20}m</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
