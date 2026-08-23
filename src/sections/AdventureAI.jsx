import { useState, useRef, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { SHOW_GENRES, MOODS } from '../data/genres.js';
import { pad2 } from '../lib/format.js';
import { displaySeasonNumber, epKey, totalEpisodes } from '../lib/episodes.js';
import {
  AI_PROVIDERS, KNOWN_FREE_MODELS,
  sendChatRequest, testConnection, fetchOpenRouterFreeModels,
  buildSystemPrompt, parseActions, maskKey,
} from '../lib/ai-providers.js';
import { secureGet } from '../lib/secure-storage.js';

// Conversation storage key prefix
const CONV_PREFIX = 'adventure:ai_conv_';

export default function AdventureAI() {
  const {
    aiConfig, setAiConfig, showToast, jumpTo, watchedMap,
    generateAdventure, saveAdventure, show, global,
    toggleWatchlist, watchlist, markCurrentWatched, markUnwatched,
    continueList, favorites, stats, unlocked, adventureHistory,
    savedAdventures, setSettings, setSeason, setEpisode, selectShow,
    addToWatchHistory,
  } = usePlayer();

  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'ADVENTURE AI online. Ask me anything about your library.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | connected | error
  const [freeModels, setFreeModels] = useState(KNOWN_FREE_MODELS[aiConfig.provider] || []);
  const [lastError, setLastError] = useState('');
  const [conversations, setConversations] = useState(() => loadConversations());
  const [currentConvId, setCurrentConvId] = useState(() => {
    const convs = loadConversations();
    return convs.length > 0 ? convs[0].id : null;
  });
  const [showActions, setShowActions] = useState(null); // Parsed actions from AI
  const bottomRef = useRef(null);

  // Get API key from secure storage
  const apiKey = secureGet('ai_api_key') || aiConfig.apiKey || '';

  // Build library context for AI
  const buildContext = useCallback(() => {
    const shows = SHOWS.map(s => ({
      id: s.id,
      name: s.name,
      seasonCount: s.seasons.length,
      totalEps: totalEpisodes(s),
      watchedCount: (watchedMap[s.id] ?? []).length,
      progressPct: totalEpisodes(s) > 0 ? Math.round((watchedMap[s.id] ?? []).length / totalEpisodes(s) * 100) : 0,
      genres: SHOW_GENRES[s.id] || [],
    }));
    return {
      shows,
      currentShow: {
        name: show.name,
        season: displaySeasonNumber(show, global.season),
        episode: global.episode,
      },
      stats,
      watchTime: { totalMs: stats.watchHours * 3600000 },
    };
  }, [watchedMap, show, global.season, global.episode, stats]);

  // ---- Connection status ----
  useEffect(() => {
    if (aiConfig.provider && apiKey) {
      testConnection(aiConfig.provider, apiKey)
        .then(() => setConnectionStatus('connected'))
        .catch(() => setConnectionStatus('error'));
    } else {
      setConnectionStatus('disconnected');
    }
  }, [aiConfig.provider, apiKey]);

  // ---- Fetch free models on provider change ----
  useEffect(() => {
    if (aiConfig.provider === 'openrouter' && apiKey) {
      fetchOpenRouterFreeModels(apiKey)
        .then(models => {
          if (models.length > 0) {
            setFreeModels(models);
            // Auto-select first free model if none selected
            if (!aiConfig.model || !models.find(m => m.id === aiConfig.model)) {
              setAiConfig({ ...aiConfig, model: models[0].id });
            }
          }
        })
        .catch(() => {
          setFreeModels(KNOWN_FREE_MODELS.openrouter || []);
        });
    } else if (aiConfig.provider === 'huggingface') {
      setFreeModels(KNOWN_FREE_MODELS.huggingface || []);
    } else {
      setFreeModels([]);
    }
  }, [aiConfig.provider, apiKey]);

  // ---- Auto-scroll ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ---- Local smart search fallback ----
  const localSmartSearch = useCallback((query) => {
    const q = query.toLowerCase();
    const results = [];

    // Duration-based search
    const durationMatch = q.match(/(\d+)\s*(min|minute|minutes)/);
    if (durationMatch) {
      const maxMin = parseInt(durationMatch[1]);
      for (const s of SHOWS) {
        const genres = SHOW_GENRES[s.id] || [];
        const unwatched = (watchedMap[s.id] ?? []).length === 0;
        if (s.seasons[0] <= 26) { // ~11 min episodes
          results.push({ show: s, match: `${s.seasons[0]} min episodes`, unwatched: s.seasons.reduce((a, b) => a + b, 0) - (watchedMap[s.id] ?? []).length, genre: genres[0] });
        }
      }
    }

    // Mood-based
    for (const mood of MOODS) {
      if (q.includes(mood.id) || q.includes(mood.name.toLowerCase())) {
        for (const s of SHOWS) {
          const genres = SHOW_GENRES[s.id] || [];
          if (mood.genres.length === 0 || mood.genres.some(g => genres.includes(g))) {
            const totalEps = totalEpisodes(s);
            const watched = watchedMap[s.id] ?? [];
            results.push({ show: s, match: `${mood.name} match`, unwatched: totalEps - watched.length, genre: genres[0] });
          }
        }
      }
    }

    // Unwatched
    if (q.includes('unwatched') || q.includes('new') || q.includes('haven\'t') || q.includes('haven')) {
      for (const s of SHOWS) {
        const watched = watchedMap[s.id] ?? [];
        const totalEps = totalEpisodes(s);
        const unwatched = totalEps - watched.length;
        if (unwatched > 0) results.push({ show: s, match: `${unwatched} unwatched`, unwatched, genre: SHOW_GENRES[s.id]?.[0] });
      }
    }

    // Progress-based: shows close to finishing
    if (q.includes('finish') || q.includes('close') || q.includes('almost')) {
      for (const s of SHOWS) {
        const watched = watchedMap[s.id] ?? [];
        const totalEps = totalEpisodes(s);
        const pct = Math.round((watched.length / totalEps) * 100);
        if (pct > 50 && pct < 100) {
          results.push({ show: s, match: `${pct}% complete`, unwatched: totalEps - watched.length, genre: SHOW_GENRES[s.id]?.[0] });
        }
      }
    }

    // Character search (via genre keywords)
    if (q.includes('character') || q.includes('featuring')) {
      const allMatched = new Set();
      for (const s of SHOWS) {
        allMatched.add(s);
      }
      allMatched.forEach(s => {
        const watched = watchedMap[s.id] ?? [];
        results.push({ show: s, match: 'All shows available', unwatched: totalEpisodes(s) - watched.length, genre: SHOW_GENRES[s.id]?.[0] });
      });
    }

    // Similar to recently watched
    if (q.includes('similar') || q.includes('like what i watched') || q.includes('like recent')) {
      const recentGenres = new Set();
      for (const entry of continueList.slice(0, 3)) {
        const s = SHOWS.find(x => x.id === entry.showId);
        if (s) (SHOW_GENRES[s.id] || []).forEach(g => recentGenres.add(g));
      }
      for (const s of SHOWS) {
        const genres = SHOW_GENRES[s.id] || [];
        if (genres.some(g => recentGenres.has(g))) {
          const watched = watchedMap[s.id] ?? [];
          results.push({ show: s, match: 'Similar to recent', unwatched: totalEpisodes(s) - watched.length, genre: genres[0] });
        }
      }
    }

    // Yesterday's watching
    if (q.includes('yesterday')) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      // We don't have per-day episode tracking in watchHistory, but we have timestamps
      // This is a best-effort from continueList
      if (continueList.length > 0) {
        const entry = continueList[0];
        const s = SHOWS.find(x => x.id === entry.showId);
        if (s) results.push({ show: s, match: `Last watched: S${pad2(entry.season)}E${pad2(entry.episode)}`, unwatched: totalEpisodes(s) - (watchedMap[s.id] ?? []).length, genre: SHOW_GENRES[s.id]?.[0] });
      }
    }

    // Adventure generation request
    if (q.includes('adventure') || q.includes('generate') || q.includes('make me')) {
      const countMatch = q.match(/(\d+)\s*(episode|ep)/);
      const count = countMatch ? parseInt(countMatch[1]) : 5;
      return { type: 'adventure', count };
    }

    // Deduplicate
    const seen = new Set();
    const unique = results.filter(r => { if (seen.has(r.show.id)) return false; seen.add(r.show.id); return true; });
    return unique;
  }, [watchedMap, continueList, favorites]);

  // ---- Handle AI actions ----
  const executeAction = useCallback((action) => {
    const { type, params } = action;
    switch (type) {
      case 'PLAY_EPISODE': {
        const s = SHOWS.find(x => x.id === params.SHOW_ID);
        if (s) {
          jumpTo(params.SHOW_ID, parseInt(params.SEASON), parseInt(params.EPISODE));
          showToast(`Playing: ${s.name} S${params.SEASON}E${params.EPISODE}`);
        }
        break;
      }
      case 'OPEN_SHOW': {
        const s = SHOWS.find(x => x.id === params.SHOW_ID);
        if (s) {
          const idx = SHOWS.indexOf(s);
          selectShow(idx);
          showToast(`SHOW: ${s.name}`);
        }
        break;
      }
      case 'ADD_TO_WATCHLIST': {
        const sid = params.SHOW_ID;
        if (sid && !watchlist.includes(sid)) {
          toggleWatchlist(sid);
          showToast('ADDED TO WATCHLIST');
        }
        break;
      }
      case 'MARK_WATCHED': {
        if (params.SHOW_ID && params.SEASON && params.EPISODE) {
          const idx = SHOWS.findIndex(s => s.id === params.SHOW_ID);
          if (idx >= 0) {
            selectShow(idx);
            setTimeout(() => {
              setSeason(parseInt(params.SEASON));
              setEpisode(parseInt(params.EPISODE));
              setTimeout(() => markCurrentWatched(), 100);
            }, 50);
          }
        } else {
          markCurrentWatched();
        }
        break;
      }
      case 'CREATE_ADVENTURE': {
        const count = parseInt(params.COUNT) || 5;
        const mood = params.MOOD || 'random';
        const genre = params.GENRE || '';
        const adv = generateAdventure({
          mood,
          genreIds: genre ? [genre] : [],
          maxEps: count,
          unwatchedOnly: true,
        });
        saveAdventure(adv);
        showToast(`ADVENTURE CREATED: ${count} episodes`);
        break;
      }
      case 'OPEN_SECTION': {
        const sectionMap = { 'Terminal': 11, 'Stats': 3, 'Awards': 4, 'Settings': 6, 'Adventure Mode': 8, 'Adventure AI': 9 };
        // We can't directly navigate from here, but we can show a toast
        showToast(`Navigate to ${params.SECTION} in the sidebar`);
        break;
      }
      default:
        break;
    }
  }, [jumpTo, selectShow, setSeason, setEpisode, markCurrentWatched, toggleWatchlist, watchlist, generateAdventure, saveAdventure, showToast]);

  // ---- Handle send ----
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setShowActions(null);
    setLastError('');

    const newMessages = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Check for adventure generation request first
      const localResult = localSmartSearch(userMsg);
      if (localResult && typeof localResult === 'object' && localResult.type === 'adventure') {
        const adv = generateAdventure({
          mood: 'random',
          maxEps: localResult.count,
          unwatchedOnly: true,
        });
        saveAdventure(adv);
        const epList = adv.episodes.map((ep, i) =>
          `${String(i + 1).padStart(2, '0')}  ${ep.showName} · S${pad2(ep.season)}E${pad2(ep.episode)}`
        ).join('\n');
        const reply = `ADVENTURE // ${adv.number} generated.\n${adv.episodes.length} episodes selected.\n\n${epList}\n\nSwitch to Adventure Mode to begin.`;
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        setLoading(false);
        return;
      }

      // Try external AI if configured
      if (aiConfig.provider && apiKey && aiConfig.model) {
        try {
          const contextData = buildContext();
          const systemPrompt = buildSystemPrompt(contextData);

          const chatMessages = [
            { role: 'system', content: systemPrompt },
            ...newMessages.slice(-8).map(m => ({ role: m.role, content: m.text })),
          ];

          const result = await sendChatRequest(
            aiConfig.provider,
            apiKey,
            aiConfig.model,
            chatMessages,
            { maxTokens: 512, temperature: 0.7 }
          );

          const replyText = result.content;
          const actions = parseActions(replyText);

          // Clean the response text (remove ACTION blocks for display)
          const displayText = replyText
            .split('\n')
            .filter(line => !line.trim().startsWith('ACTION:'))
            .join('\n')
            .trim();

          setMessages(prev => [...prev, { role: 'assistant', text: displayText || replyText }]);
          if (actions.length > 0) setShowActions(actions);
          setLoading(false);
          return;
        } catch (err) {
          const errMsg = err.message;
          if (errMsg === 'INVALID_API_KEY') {
            setLastError('INVALID_API_KEY');
            setConnectionStatus('error');
          } else if (errMsg === 'RATE_LIMITED') {
            setLastError('RATE_LIMITED');
          } else if (errMsg === 'MODEL_UNAVAILABLE' || errMsg === 'MODEL_LOADING') {
            setLastError('MODEL_UNAVAILABLE');
          } else {
            setLastError(errMsg);
          }
          // Fall through to local search
        }
      }

      // Local fallback
      await new Promise(r => setTimeout(r, 200));
      const localResults = localSmartSearch(userMsg);

      if (Array.isArray(localResults) && localResults.length > 0) {
        const text = `${localResults.length} match${localResults.length > 1 ? 'es' : ''} found.\n\n` +
          localResults.map((r, i) =>
            `${String(i + 1).padStart(2, '0')}  ${r.show.name}\n    ${r.match}${r.genre ? ` · ${r.genre}` : ''}${r.unwatched > 0 ? ` · ${r.unwatched} unwatched` : ''}`
          ).join('\n\n') +
          '\n\nTap a show to start watching.';
        setMessages(prev => [...prev, {
          role: 'assistant',
          text,
          shows: localResults.map(r => r.show),
        }]);
      } else if (userMsg.toLowerCase().includes('what should') || userMsg.toLowerCase().includes('recommend') || userMsg.toLowerCase().includes('surprise')) {
        const unwatched = SHOWS.filter(s => (watchedMap[s.id] ?? []).length === 0);
        if (unwatched.length > 0) {
          const pick = unwatched[Math.floor(Math.random() * unwatched.length)];
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: `Try: ${pick.name}.\nYou have ${unwatched.length} unwatched show${unwatched.length > 1 ? 's' : ''} available.`,
            shows: [pick],
          }]);
        } else {
          const randomShow = SHOWS[Math.floor(Math.random() * SHOWS.length)];
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: `You've started every show. How about revisiting ${randomShow.name}?\n\nOr try Adventure Mode for a curated experience.`,
            shows: [randomShow],
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: 'No local match. Configure an AI provider in Settings for full natural language support.\n\nTry: "find something funny" or "recommend a show".',
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${e.message}` }]);
      setLastError(e.message);
    }
    setLoading(false);
  }, [input, loading, messages, aiConfig, apiKey, localSmartSearch, buildContext, generateAdventure, saveAdventure, watchedMap, jumpTo, showToast, continueList]);

  // ---- Conversation management ----
  const saveConversations = (convs) => {
    try {
      localStorage.setItem(CONV_PREFIX + 'list', JSON.stringify(convs.slice(0, 50)));
    } catch {}
  };

  const handleNewConversation = () => {
    const id = `conv_${Date.now()}`;
    const conv = { id, title: 'New conversation', messages: [], createdAt: Date.now() };
    const updated = [conv, ...conversations.filter(c => c.id !== currentConvId)];
    setConversations(updated);
    setCurrentConvId(id);
    setMessages([{ role: 'assistant', text: 'ADVENTURE AI online. Ask me anything.' }]);
    saveConversations(updated);
  };

  const handleDeleteConversation = (id) => {
    localStorage.removeItem(CONV_PREFIX + id);
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    if (currentConvId === id) {
      if (updated.length > 0) {
        setCurrentConvId(updated[0].id);
        // Load that conversation's messages
        const saved = localStorage.getItem(CONV_PREFIX + updated[0].id);
        if (saved) {
          try { setMessages(JSON.parse(saved)); } catch {}
        }
      } else {
        setCurrentConvId(null);
        setMessages([{ role: 'assistant', text: 'ADVENTURE AI online.' }]);
      }
    }
    saveConversations(updated);
  };

  // Save current messages when they change
  useEffect(() => {
    if (currentConvId && messages.length > 1) {
      try {
        localStorage.setItem(CONV_PREFIX + currentConvId, JSON.stringify(messages));
        // Update title from first user message
        const firstUser = messages.find(m => m.role === 'user');
        if (firstUser) {
          const updated = conversations.map(c =>
            c.id === currentConvId ? { ...c, title: firstUser.text.slice(0, 40) } : c
          );
          setConversations(updated);
          saveConversations(updated);
        }
      } catch {}
    }
  }, [messages, currentConvId]);

  const handleClearHistory = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(CONV_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    setConversations([]);
    setCurrentConvId(null);
    setMessages([{ role: 'assistant', text: 'ADVENTURE AI online.' }]);
    showToast('AI history cleared');
  };

  const isConnected = connectionStatus === 'connected';
  const providerInfo = AI_PROVIDERS[aiConfig.provider];
  const currentModel = freeModels.find(m => m.id === aiConfig.model);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 14rem)', minHeight: '400px' }}>
      {/* Header with status bar */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Adventure AI</h2>
          <p className="mt-1 text-white/60">Media library assistant with natural language.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleNewConversation} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 hover:border-white/30 hover:text-white transition">NEW</button>
          <button onClick={handleClearHistory} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 hover:border-white/30 hover:text-white transition">CLEAR</button>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-3 flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 font-mono text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-white/30'}`} />
          <span className="text-white/50">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        {providerInfo && (
          <span className="text-white/30">PROVIDER · <span className="text-white/60">{providerInfo.name.toUpperCase()}</span></span>
        )}
        {currentModel && (
          <span className="text-white/30">MODEL · <span className="text-white/60">{currentModel.name}</span></span>
        )}
        {isConnected && (
          <span className="text-green-400/60">● FREE</span>
        )}
      </div>

      {/* Error state */}
      {lastError && (
        <div className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-red-200">
            {lastError === 'INVALID_API_KEY' && 'Invalid or expired API key.'}
            {lastError === 'RATE_LIMITED' && 'Rate limited. Try again shortly.'}
            {lastError === 'MODEL_UNAVAILABLE' && 'Selected model is currently unavailable.'}
            {lastError !== 'INVALID_API_KEY' && lastError !== 'RATE_LIMITED' && lastError !== 'MODEL_UNAVAILABLE' && lastError}
          </span>
          <button onClick={() => setLastError('')} className="text-xs text-red-300/60 hover:text-red-200">DISMISS</button>
        </div>
      )}

      {/* Offline notice */}
      {!aiConfig.provider && (
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/40 font-mono">
          AI features unavailable. Configure a provider in Settings.\nYour library, player, statistics and local features remain available.
        </div>
      )}

      {/* Messages area */}
      <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-12 text-right' : ''}>
              {m.role === 'user' && (
                <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">USER</div>
              )}
              {m.role === 'assistant' && (
                <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">ADVENTURE AI</div>
              )}
              <div className={`inline-block max-w-[85%] rounded-xl border px-4 py-3 text-sm text-left ${
                m.role === 'user'
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/80'
              }`}>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.text}</pre>

                {/* Show results as actionable items */}
                {m.shows?.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
                    {m.shows.map(s => (
                      <button key={s.id} onClick={() => { jumpTo(s.id, 1, 1); showToast(`Playing: ${s.name}`); }}
                        className="block w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-xs hover:border-white/30 transition">
                        <span className="text-white">{s.name}</span>
                        <span className="ml-2 text-white/30">S01E01</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Parsed actions from AI */}
          {showActions && showActions.length > 0 && (
            <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 space-y-2">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">AI ACTIONS</div>
              {showActions.map((action, i) => (
                <button key={i} onClick={() => { executeAction(action); setShowActions(null); }}
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs hover:border-white/30 transition">
                  <span className="text-white/60">{action.type}</span>
                  <span className="ml-2 text-white/30 font-mono">
                    {Object.entries(action.params).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </span>
                </button>
              ))}
              <button onClick={() => setShowActions(null)} className="text-[10px] text-white/30 hover:text-white/50 transition">DISMISS</button>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
              <span className="animate-pulse font-mono">Processing...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={isConnected ? 'Ask anything about your library...' : 'Ask a question...'}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/20 disabled:opacity-30">
              SEND
            </button>
          </div>
        </div>
      </div>

      {/* Conversation history sidebar (compact) */}
      {conversations.length > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {conversations.slice(0, 8).map(conv => (
            <div key={conv.id} className={`shrink-0 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition ${
              conv.id === currentConvId
                ? 'border-white/30 bg-white/10 text-white'
                : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20'
            }`}>
              <span className="truncate max-w-[120px]">{conv.title}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }} className="text-white/20 hover:text-red-300 transition">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function loadConversations() {
  try {
    const raw = localStorage.getItem(CONV_PREFIX + 'list');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
