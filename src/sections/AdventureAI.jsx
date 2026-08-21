import { useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { pad2 } from '../lib/format.js';
import { displaySeasonNumber, epKey } from '../lib/episodes.js';

export default function AdventureAI() {
  const { aiConfig, showToast, jumpTo, watchedMap, generateAdventure } = usePlayer();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'ADVENTURE AI online. Ask me anything about your library, get recommendations, or generate adventures.\n\nExamples:\n• "Give me something funny around 20 minutes"\n• "Find episodes I haven\'t watched"\n• "Build me a 5-episode adventure"\n• "What should I watch?"' }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const localSearch = (query) => {
    const q = query.toLowerCase();
    const results = [];
    for (const s of SHOWS) {
      const watched = watchedMap[s.id] ?? [];
      const total = s.seasons.reduce((a, b) => a + b, 0);
      const unwatched = total - watched.length;
      if (q.includes('funny') || q.includes('comedy')) {
        if (['tt1305826', 'tt1578902', 'tt1710308', 'tt14878888', 'tt8697554'].includes(s.id)) {
          results.push({ show: s, match: 'Comedy match', unwatched });
        }
      }
      if (q.includes('mystery') || q.includes('strange')) {
        if (s.id === 'tt1865718') results.push({ show: s, match: 'Mystery match', unwatched });
      }
      if (q.includes('fantasy') || q.includes('magic')) {
        if (['tt1305826', 'tt3061046', 'tt13293588'].includes(s.id)) {
          results.push({ show: s, match: 'Fantasy match', unwatched });
        }
      }
      if (q.includes('short') || q.includes('quick')) {
        if (s.seasons[0] <= 26) results.push({ show: s, match: 'Short episodes', unwatched });
      }
      if (q.includes('unwatched') || q.includes('new') || q.includes('haven')) {
        if (unwatched > 0) results.push({ show: s, match: `${unwatched} unwatched`, unwatched });
      }
    }
    // Deduplicate
    const seen = new Set();
    return results.filter(r => { if (seen.has(r.show.id)) return false; seen.add(r.show.id); return true; });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // Try external AI first
      if (aiConfig.provider && aiConfig.apiKey) {
        try {
          const resp = await fetch(`${aiConfig.provider}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
            body: JSON.stringify({
              model: aiConfig.model || 'gpt-4',
              messages: [
                { role: 'system', content: 'You are ADVENTURE AI, a minimal monochrome media assistant. Give short, technical responses. Match the user\'s mood/genre/length preferences to shows in the library: ' + SHOWS.map(s => `${s.name} (${s.id}, ${s.seasons.length} seasons, ${s.seasons.reduce((a,b)=>a+b,0)} eps)`).join('; ') },
                ...messages.slice(-6).map(m => ({ role: m.role, content: m.text })),
                { role: 'user', content: userMsg }
              ],
              max_tokens: 500,
            })
          });
          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) { setMessages(prev => [...prev, { role: 'assistant', text: reply }]); setLoading(false); return; }
        } catch (e) { /* Fall through to local */ }
      }

      // Local fallback
      await new Promise(r => setTimeout(r, 300)); // Simulate thinking
      const results = localSearch(userMsg);
      if (results.length > 0) {
        const text = `${results.length} matching show${results.length > 1 ? 's' : ''} found.\n\n` +
          results.map((r, i) => `${String(i+1).padStart(2,'0')} — ${r.show.name}\n     ${r.match}${r.unwatched ? ` · ${r.unwatched} unwatched` : ''}`).join('\n\n') +
          '\n\nClick a show to start watching.';
        setMessages(prev => [...prev, { role: 'assistant', text, shows: results.map(r => r.show) }]);
      } else if (userMsg.toLowerCase().includes('adventure') || userMsg.toLowerCase().includes('generate')) {
        const count = (userMsg.match(/\d+/)?.[0] || '5');
        setMessages(prev => [...prev, { role: 'assistant', text: `Switch to Adventure Mode (tab 09) to generate a ${count}-episode adventure. You can configure mood, genre, and show filters there.` }]);
      } else if (userMsg.toLowerCase().includes('what should') || userMsg.toLowerCase().includes('recommend')) {
        const unwatched = SHOWS.filter(s => (watchedMap[s.id] ?? []).length === 0);
        if (unwatched.length > 0) {
          setMessages(prev => [...prev, { role: 'assistant', text: `Try starting with: ${unwatched[0].name}. You have ${unwatched.length} unwatched show${unwatched.length > 1 ? 's' : ''} in your library.`, shows: unwatched }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', text: 'You\'ve watched at least one episode from every show. Try Adventure Mode for curated routes, or check Stats for what to rewatch.' }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Query not matched locally. Configure an AI provider in Settings for full natural language support, or try: "find something funny" or "recommend a show".' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 14rem)', minHeight: '400px' }}>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Adventure AI</h2>
        <p className="mt-1 text-white/60">Natural-language search and recommendations. {aiConfig.provider ? 'Provider connected.' : 'Configure in Settings.'}</p>
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-12 text-right' : ''}>
              <div className={`inline-block max-w-[85%] rounded-xl border px-4 py-3 text-sm text-left ${
                m.role === 'user'
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/80'
              }`}>
                <pre className="whitespace-pre-wrap font-sans text-sm">{m.text}</pre>
                {m.shows?.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
                    {m.shows.map(s => (
                      <button key={s.id} onClick={() => { jumpTo(s.id, 1, 1); showToast(`Playing: ${s.name}`); }}
                        className="block w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-xs hover:border-white/30 transition">
                        <span className="text-white">{s.name}</span>
                        <span className="ml-2 font-mono text-white/40">{s.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-sm text-white/40 animate-pulse">Processing...</div>
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
              placeholder="Ask anything..."
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/20 disabled:opacity-30">
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}