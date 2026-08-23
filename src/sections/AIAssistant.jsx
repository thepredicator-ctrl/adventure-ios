import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet } from '../lib/storage.js';

const TABS = ['Assistant','Summaries','Characters','Spoilers','Explainer','Time Fit','Decider','Order','Marathons','Rewatch','Prefs','Profile','NL Search','Voice','Briefing'];

const CHARACTERS = {
  'tt1305826': [
    { name: 'Finn the Human', role: 'Protagonist', desc: 'A brave hero who fights evil across the Land of Ooo. His sense of justice drives every adventure.' },
    { name: 'Jake the Dog', role: 'Best Friend', desc: 'A magical dog who can stretch and shape-shift. He is Finn\'s loyal companion and moral compass.' },
    { name: 'Princess Bubblegum', role: 'Ruler', desc: 'The brilliant scientist-queen of the Candy Kingdom. Her experiments often have unexpected consequences.' },
    { name: 'Ice King', role: 'Antagonist', desc: 'A lonely wizard obsessed with kidnapping princesses. His tragic backstory is revealed gradually.' },
    { name: 'Marceline', role: 'Vampire Queen', desc: 'A thousand-year-old vampire with a complicated past. Her music carries deep emotional weight.' },
    { name: 'BMO', role: 'Companion', desc: 'A sentient game console who lives with Finn and Jake. Their innocence belies hidden depths.' },
  ],
  'tt1710308': [
    { name: 'Mordecai', role: 'Protagonist', desc: 'A blue jay who works at the park with his best friend Rigby. He struggles with relationships and responsibility.' },
    { name: 'Rigby', role: 'Best Friend', desc: 'A hyperactive raccoon who always finds trouble. His impulsiveness creates most of the show\'s conflicts.' },
    { name: 'Benson', role: 'Boss', desc: 'The strict gumball machine manager of the park. He demands professionalism from his staff.' },
    { name: 'Pops', role: 'Owner', desc: 'A naive lollipop man who owns the park. His childlike wonder contrasts with the chaos around him.' },
    { name: 'Skips', role: 'Wiseman', desc: 'An immortal yeti who has seen everything. He solves problems the others cannot.' },
  ],
  'tt1865718': [
    { name: 'Dipper Pines', role: 'Protagonist', desc: 'A curious boy spending summer in Gravity Falls. His journal holds the key to the town\'s mysteries.' },
    { name: 'Mabel Pines', role: 'Sister', desc: 'Dipper\'s optimistic twin who loves sweaters and optimism. Her warmth balances Dipper\'s intensity.' },
    { name: 'Grunkle Stan', role: 'Guardian', desc: 'The con-man uncle running the Mystery Shack. His secret identity drives the overarching plot.' },
    { name: 'Bill Cipher', role: 'Villain', desc: 'A dream demon seeking to merge dimensions. His chaotic nature makes him an unpredictable threat.' },
    { name: 'Soos', role: 'Handyman', desc: 'The lovable handyman at the Mystery Shack. His loyalty to the Pines family is unwavering.' },
    { name: 'Wendy', role: 'Friend', desc: 'A cool teenager who works at the Shack. She often helps Dipper on his investigations.' },
  ],
};

function epDuration(showId, season, episode) {
  let h = 0; for (let i = 0; i < showId.length; i++) h = ((h << 5) - h + showId.charCodeAt(i)) | 0;
  h = ((h << 5) - h + season * 31 + episode * 17) | 0;
  return 20 + (Math.abs(h) % 26);
}

function seededRandom(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const SUGGESTIONS = ['What should I watch?','Summarize last episode','Recommend something funny','How far am I in my shows?'];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-white/40" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <span className="text-xs text-white/30">Thinking...</span>
    </div>
  );
}

function generateResponse(q, p) {
  const ql = q.toLowerCase();
  if (ql.includes('watch') || ql.includes('recommend')) {
    const unwatched = SHOWS.filter(s => (p.watchedMap[s.id] || []).length === 0);
    if (unwatched.length) return `You haven\'t started ${unwatched[0].name} yet! It\'s a ${unwatched[0].seasons.length}-season show that would be a great pick. Or if you want to continue, I see you have progress in several shows. What mood are you in?`;
    return `Based on your watch history, you\'re making great progress! You\'ve watched ${p.stats.totalWatched} episodes total. I\'d suggest continuing with ${p.stats.currentShow} or trying a show you haven\'t started yet.`;
  }
  if (ql.includes('summar') || ql.includes('last episode')) {
    return `In your last session, you were on ${p.stats.currentShow} S${String(p.global.season).padStart(2,'0')}E${String(p.global.episode).padStart(2,'0')}. The episode continued the season\'s arc with character development and plot progression. Key moments tied back to earlier foreshadowing, and the ending set up the next conflict nicely.`;
  }
  if (ql.includes('far') || ql.includes('progress')) {
    return `You\'re at ${p.stats.completionPct}% overall completion across all ${p.stats.totalAll} episodes. You\'ve completed ${p.stats.seasonsCompleted} seasons and ${p.stats.showsCompleted} shows fully. Your current streak is ${p.stats.streak} days!`;
  }
  if (ql.includes('funny')) {
    return `For comedy, I\'d recommend SpongeBob for classic laughs, or Gumball for absurdist humor. Regular Show also has great comedic timing with its duo dynamic. Based on your history, you seem to enjoy animated comedies the most!`;
  }
  return `Great question! Based on your viewing patterns, you tend to watch ${p.stats.currentShow} most frequently. Your average session is about 2-3 episodes. Is there a specific show or genre you\'d like to explore?`;
}

function generateSummary(showId, season, episode) {
  const show = SHOWS.find(s => s.id === showId);
  if (!show) return 'No summary available.';
  const r = seededRandom(showId.charCodeAt(1) * 100 + season * 50 + episode);
  const openings = [
    `This episode kicks off with an unexpected twist that recontextualizes the season so far.`,
    `The narrative centers on character development in a way that deepens our understanding.`,
    `The story takes a bold turn, blending humor with genuine stakes.`,
  ];
  const middles = [
    `The B-plot provides comic relief while the A-story builds toward a tense confrontation. Character motivations are explored through well-crafted dialogue.`,
    `Visual storytelling shines here, with several scenes conveying emotion without dialogue. The pacing keeps things moving while allowing breathing room.`,
    `Supporting characters get their moment to shine, adding depth to the ensemble. The writing balances episodic fun with ongoing narrative threads.`,
  ];
  const endings = [
    `The cliffhanger ending leaves you wanting more, perfectly setting up the next episode.`,
    `By the end, the status quo has shifted in meaningful ways that will ripple through the rest of the season.`,
    `The resolution is satisfying while planting seeds for future storylines, showcasing the show's long-form planning.`,
  ];
  return openings[Math.floor(r() * openings.length)] + ' ' + middles[Math.floor(r() * middles.length)] + ' ' + endings[Math.floor(r() * endings.length)];
}

export default function AIAssistant() {
  const p = usePlayer();
  const [tab, setTab] = useState(0);
  const [chat, setChat] = useState(() => lsGet('aiChatHistory', []));
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [summaries, setSummaries] = useState(() => lsGet('aiSummaries', {}));
  const [loadingSummary, setLoadingSummary] = useState(null);
  const [spoilerMode, setSpoilerMode] = useState(() => lsGet('spoilerMode', { enabled: false, sensitivity: 'medium' }));
  const [explainerData, setExplainerData] = useState(null);
  const [explainerLoading, setExplainerLoading] = useState(false);
  const [timeBudget, setTimeBudget] = useState(60);
  const [deciderPicks, setDeciderPicks] = useState([]);
  const [watchOrder, setWatchOrder] = useState(() => lsGet('watchOrder', []));
  const [marathonType, setMarathonType] = useState('');
  const [marathonQueue, setMarathonQueue] = useState([]);
  const [nlQuery, setNlQuery] = useState('');
  const [nlResults, setNlResults] = useState([]);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [prefs, setPrefs] = useState(() => lsGet('aiPreferences', { genres: ['comedy','adventure'], length: 'medium', timeOfDay: 'evening' }));
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, typing]);
  useEffect(() => { lsSet('aiChatHistory', chat); }, [chat]);
  useEffect(() => { lsSet('aiSummaries', summaries); }, [summaries]);
  useEffect(() => { lsSet('spoilerMode', spoilerMode); }, [spoilerMode]);
  useEffect(() => { lsSet('watchOrder', watchOrder); }, [watchOrder]);
  useEffect(() => { lsSet('aiPreferences', prefs); }, [prefs]);

  const sendChat = useCallback((text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text, ts: Date.now() };
    const updated = [...chat, userMsg];
    setChat(updated);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = { role: 'ai', text: generateResponse(text, p), ts: Date.now() };
      setChat(prev => [...prev, reply]);
      setTyping(false);
    }, 800);
  }, [chat, p]);

  const loadSummary = useCallback((showId, s, e) => {
    const key = `${showId}:${s}:${e}`;
    if (summaries[key]) return;
    setLoadingSummary(key);
    setTimeout(() => {
      setSummaries(prev => ({ ...prev, [key]: generateSummary(showId, s, e) }));
      setLoadingSummary(null);
    }, 1200);
  }, [summaries]);

  const loadExplainer = useCallback(() => {
    const show = p.show;
    const s = p.global.season;
    const e = p.global.episode;
    setExplainerLoading(true);
    setTimeout(() => {
      setExplainerData({
        plot: `S${s}E${e} of ${show.name} advances the overarching narrative through key character decisions. The episode balances standalone storytelling with season-long arcs, making it accessible to new viewers while rewarding dedicated fans.`,
        themes: ['Identity and self-discovery', 'Friendship and loyalty', 'Growth through adversity'],
        moments: ['The opening scene sets a new status quo', 'An unexpected character pairing creates memorable dialogue', 'The climax recontextualizes an earlier scene'],
        theories: ['The background details hint at a larger conspiracy', 'A throwaway line may foreshadow a future character arc', 'The episode\'s title has a double meaning'],
      });
      setExplainerLoading(false);
    }, 1500);
  }, [p.show, p.global.season, p.global.episode]);

  const watchedEps = useMemo(() => {
    const eps = [];
    for (const show of SHOWS) {
      const watched = p.watchedMap[show.id] || [];
      for (const key of watched) {
        const m = key.match(/S(\d+)E(\d+)/);
        if (m) eps.push({ showId: show.id, showName: show.shortName, season: Number(m[1]), episode: Number(m[2]), key });
      }
    }
    return eps;
  }, [p.watchedMap]);

  const unwatchedEps = useMemo(() => {
    const eps = [];
    for (const show of SHOWS) {
      const watched = new Set(p.watchedMap[show.id] || []);
      for (let si = 0; si < show.seasons.length; si++) {
        for (let e = 1; e <= show.seasons[si]; e++) {
          if (!watched.has(`S${si+1}E${e}`)) eps.push({ showId: show.id, showName: show.shortName, season: si + 1, episode: e, dur: epDuration(show.id, si+1, e) });
        }
      }
    }
    return eps;
  }, [p.watchedMap]);

  const timeResults = useMemo(() => {
    if (timeBudget <= 0) return [];
    const sorted = [...unwatchedEps].sort((a, b) => a.dur - b.dur);
    const result = []; let total = 0;
    for (const ep of sorted) {
      if (total + ep.dur > timeBudget) break;
      result.push({ ...ep, cumDur: total + ep.dur });
      total += ep.dur;
    }
    return result;
  }, [timeBudget, unwatchedEps]);

  const refreshDecider = useCallback(() => {
    const shuffled = [...unwatchedEps].sort(() => Math.random() - 0.5);
    setDeciderPicks(shuffled.slice(0, 3));
  }, [unwatchedEps]);
  useEffect(() => { refreshDecider(); }, [refreshDecider]);

  const allEps = useMemo(() => {
    const eps = [];
    for (const show of SHOWS) {
      for (let si = 0; si < show.seasons.length; si++) {
        for (let e = 1; e <= show.seasons[si]; e++) {
          eps.push({ showId: show.id, showName: show.shortName, season: si + 1, episode: e, dur: epDuration(show.id, si+1, e) });
        }
      }
    }
    return eps;
  }, []);

  const generateMarathon = useCallback((type) => {
    setMarathonType(type);
    let pool = [...allEps];
    if (type === 'Laugh Track') pool = pool.filter(e => e.dur <= 25);
    else if (type === 'Edge of Seat') pool = pool.filter(e => e.dur >= 30);
    else if (type === 'Short & Sweet') pool = pool.filter(e => e.dur <= 22);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    setMarathonQueue(shuffled.slice(0, 8));
  }, [allEps]);

  const handleNlSearch = useCallback(() => {
    if (!nlQuery.trim()) return;
    const q = nlQuery.toLowerCase();
    let results = allEps;
    if (q.includes('cliffhanger')) results = results.filter((_, i) => i % 5 === 0);
    if (q.includes('funny')) results = results.filter(e => e.dur <= 25);
    if (q.includes('under 20') || q.includes('short')) results = results.filter(e => e.dur <= 20);
    if (q.includes('long') || q.includes('epic')) results = results.filter(e => e.dur >= 35);
    const showMatch = SHOWS.find(s => q.includes(s.shortName.toLowerCase()) || q.includes(s.name.toLowerCase()));
    if (showMatch) results = results.filter(e => e.showId === showMatch.id);
    setNlResults(results.slice(0, 20));
  }, [nlQuery, allEps]);

  const simulateVoice = useCallback(() => {
    setVoiceListening(true);
    setTimeout(() => {
      setVoiceListening(false);
      setVoiceText('funny episodes under 20 minutes');
      setNlQuery('funny episodes under 20 minutes');
    }, 2500);
  }, []);

  const briefing = useMemo(() => {
    const wt = lsGet('watchTime', { totalMs: 0, sessions: [] });
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yestEntry = wt.sessions.find(s => s.date === yesterday);
    const yestCount = yestEntry ? Math.round(yestEntry.ms / (22 * 60000)) : 0;
    const nearComplete = SHOWS.filter(s => {
      const w = (p.watchedMap[s.id] || []).length;
      const t = s.seasons.reduce((a, b) => a + b, 0);
      return w > 0 && w < t && (t - w) <= 5;
    }).slice(0, 3);
    return { yestCount, watchHours: (wt.totalMs / 3600000).toFixed(1), nearComplete, totalWatched: p.stats.totalWatched, streak: p.stats.streak };
  }, [p.watchedMap, p.stats]);

  const moveOrderItem = useCallback((idx, dir) => {
    const next = [...watchOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setWatchOrder(next);
  }, [watchOrder]);

  const addToOrder = useCallback((ep) => {
    if (watchOrder.some(o => o.showId === ep.showId && o.season === ep.season && o.episode === ep.episode)) return;
    setWatchOrder(prev => [...prev, ep]);
    p.showToast('Added to watch order');
  }, [watchOrder, p.showToast]);

  const viewingBars = useMemo(() => {
    const showCounts = SHOWS.map(s => ({ name: s.shortName, count: (p.watchedMap[s.id] || []).length, total: s.seasons.reduce((a,b) => a+b, 0) }));
    const max = Math.max(...showCounts.map(s => s.count), 1);
    return showCounts.map(s => ({ ...s, pct: (s.count / max) * 100 }));
  }, [p.watchedMap]);

  const rewatchRoutes = [
    { name: 'Best Episodes Only', desc: 'Hand-picked fan favorites' },
    { name: 'Character Arcs', desc: 'Follow specific character journeys' },
    { name: 'Chronological', desc: 'Original air order' },
    { name: 'Fan Favorites', desc: 'Top rated by the community' },
  ];

  const jumpToEp = useCallback((ep) => {
    const s = SHOWS.find(x => x.id === ep.showId);
    const intS = ep.season - (s?.seasonOffset || 0);
    p.jumpTo(ep.showId, intS, ep.episode);
  }, [p.jumpTo]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">AI Assistant</h2>
        <p className="mt-1 text-white/60">Your intelligent viewing companion.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${tab === i ? 'bg-white text-black font-medium' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 max-h-[400px] overflow-y-auto space-y-3">
            {chat.length === 0 && <p className="text-sm text-white/30 text-center py-8">Ask me anything about your shows...</p>}
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.role === 'user' ? 'bg-white/10 text-white' : 'bg-white/[0.05] text-white/80'}`}>{m.text}</div>
              </div>
            ))}
            {typing && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendChat(s)} className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/30 transition-colors">{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat(input)} placeholder="Ask the AI..." className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
            <button onClick={() => sendChat(input)} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors shrink-0">Send</button>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-white/60">Click any watched episode to generate an AI summary.</p>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {watchedEps.slice(0, 30).map(ep => {
              const key = `${ep.showId}:${ep.season}:${ep.episode}`;
              const hasSummary = !!summaries[key];
              const isLoading = loadingSummary === key;
              return (
                <div key={key} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div><span className="text-xs font-mono text-white/50">S{String(ep.season).padStart(2,'0')}E{String(ep.episode).padStart(2,'0')}</span> <span className="text-sm text-white ml-2">{ep.showName}</span></div>
                    <button onClick={() => loadSummary(ep.showId, ep.season, ep.episode)} disabled={isLoading} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors disabled:opacity-50">{isLoading ? 'Loading...' : hasSummary ? 'View' : 'Summarize'}</button>
                  </div>
                  {hasSummary && <p className="text-sm text-white/60 mt-2 leading-relaxed">{summaries[key]}</p>}
                </div>
              );
            })}
            {watchedEps.length === 0 && <p className="text-sm text-white/30">No watched episodes yet. Start watching to see summaries here.</p>}
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-white/60">Character guide for <span className="text-white font-medium">{p.show.name}</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(CHARACTERS[p.show.id] || [
              { name: 'Main Character', role: 'Protagonist', desc: 'The hero of this story, facing challenges and growing with each episode. Their journey drives the narrative forward.' },
              { name: 'Supporting Cast', role: 'Friends', desc: 'A group of loyal companions who provide humor and heart. Their dynamics create memorable moments.' },
              { name: 'Antagonist', role: 'Villain', desc: 'A complex foe whose motivations are gradually revealed. Their presence raises the stakes.' },
            ]).map(c => (
              <div key={c.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
                <div className="text-sm font-medium text-white">{c.name}</div>
                <div className="text-xs text-white/50">{c.role}</div>
                <p className="text-sm text-white/60 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Spoiler-Free Mode</span>
              <button onClick={() => setSpoilerMode(prev => ({ ...prev, enabled: !prev.enabled }))} className={`w-12 h-6 rounded-full transition-colors ${spoilerMode.enabled ? 'bg-white/30' : 'bg-white/10'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${spoilerMode.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-white/50">Sensitivity</div>
              <div className="flex gap-2">
                {['low','medium','high'].map(l => (
                  <button key={l} onClick={() => setSpoilerMode(prev => ({ ...prev, sensitivity: l }))} className={`rounded-lg px-4 py-2 text-xs font-mono transition-colors ${spoilerMode.sensitivity === l ? 'bg-white text-black font-medium' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{l}</button>
                ))}
              </div>
            </div>
            {spoilerMode.enabled && <div className="rounded-lg bg-white/[0.05] border border-yellow-500/30 px-4 py-3 text-sm text-yellow-200/80">Spoiler protection active. Episode descriptions will be filtered based on your sensitivity level ({spoilerMode.sensitivity}).</div>}
          </div>
        </div>
      )}

      {tab === 4 && (
        <div className="space-y-4">
          <div className="text-xs text-white/40 font-mono">CURRENTLY ON: {p.show.shortName} S{String(p.global.season).padStart(2,'0')}E{String(p.global.episode).padStart(2,'0')}</div>
          <button onClick={loadExplainer} disabled={explainerLoading} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50">{explainerLoading ? 'Analyzing...' : 'Generate Analysis'}</button>
          {explainerData && (
            <div className="space-y-4">
              {[['Plot Summary', explainerData.plot], ['Key Themes', explainerData.themes.join('; ')], ['Notable Moments', explainerData.moments.map((m,i) => `${i+1}. ${m}`).join('\n')], ['Fan Theories', explainerData.theories.map((t,i) => `${i+1}. ${t}`).join('\n')]].map(([title, content]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
                  <div className="text-sm font-medium text-white">{title}</div>
                  <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 5 && (
        <div className="space-y-4">
          <div className="text-xs text-white/40 font-mono">AVAILABLE TIME (MINUTES)</div>
          <div className="flex gap-2 flex-wrap">
            {[15,30,45,60,90,120].map(t => (
              <button key={t} onClick={() => setTimeBudget(t)} className={`rounded-lg px-4 py-2 text-sm font-mono transition-colors ${timeBudget === t ? 'bg-white text-black font-medium' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{t}</button>
            ))}
          </div>
          <div className="text-xs text-white/40 font-mono">FOUND {timeResults.length} EPISODES ({timeResults.reduce((a,e) => a+e.dur, 0)} min total)</div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {timeResults.map((ep, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
                <div><span className="text-xs font-mono text-white/50">S{String(ep.season).padStart(2,'0')}E{String(ep.episode).padStart(2,'0')}</span> <span className="text-sm text-white ml-2">{ep.showName}</span> <span className="text-xs text-white/40 ml-2">{ep.dur}m</span></div>
                <button onClick={() => jumpToEp(ep)} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors">Watch</button>
              </div>
            ))}
            {timeResults.length === 0 && <p className="text-sm text-white/30">No episodes fit in {timeBudget} minutes.</p>}
          </div>
        </div>
      )}

      {tab === 6 && (
        <div className="space-y-4">
          <p className="text-sm text-white/60">Can't decide? Let fate choose.</p>
          <button onClick={refreshDecider} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">Shuffle Again</button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {deciderPicks.map((ep, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center space-y-3 group">
                <div className="text-xs font-mono text-white/50">S{String(ep.season).padStart(2,'0')}E{String(ep.episode).padStart(2,'0')}</div>
                <div className="text-sm font-medium text-white">{ep.showName}</div>
                <div className="text-xs text-white/40">{ep.dur} min</div>
                <button onClick={() => jumpToEp(ep)} className="w-full rounded-lg bg-white text-black px-4 py-2.5 text-sm font-bold hover:bg-white/90 transition-all group-hover:scale-105">PICK THIS</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 7 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">Custom watch order ({watchOrder.length} episodes)</p>
            <button onClick={() => { setWatchOrder([]); p.showToast('Order cleared'); }} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/20 transition-colors">Clear</button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {watchOrder.map((ep, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="text-xs font-mono text-white/30 w-6">{i+1}</span><span className="text-xs font-mono text-white/50">S{String(ep.season).padStart(2,'0')}E{String(ep.episode).padStart(2,'0')}</span><span className="text-sm text-white/60">{ep.showName}</span></div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveOrderItem(i, -1)} className="px-2 py-1 text-xs text-white/40 hover:text-white transition-colors" disabled={i === 0}>UP</button>
                  <button onClick={() => moveOrderItem(i, 1)} className="px-2 py-1 text-xs text-white/40 hover:text-white transition-colors" disabled={i === watchOrder.length - 1}>DOWN</button>
                  <button onClick={() => setWatchOrder(prev => prev.filter((_, j) => j !== i))} className="px-2 py-1 text-xs text-white/30 hover:text-red-400 transition-colors">X</button>
                </div>
              </div>
            ))}
            {watchOrder.length === 0 && <p className="text-sm text-white/30">Add episodes from any show to build a custom order.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {SHOWS.map(s => (
              <button key={s.id} onClick={() => addToOrder({ showId: s.id, showName: s.shortName, season: 1, episode: 1 })} className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/30 transition-colors">+ {s.shortName} S01E01</button>
            ))}
          </div>
        </div>
      )}

      {tab === 8 && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['Laugh Track','Edge of Seat','Mind Benders','Comfort Binge','Short & Sweet'].map(m => (
              <button key={m} onClick={() => generateMarathon(m)} className={`rounded-lg px-4 py-2 text-sm transition-colors ${marathonType === m ? 'bg-white text-black font-medium' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{m}</button>
            ))}
          </div>
          {marathonQueue.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-white/40">MARATHON QUEUE: {marathonQueue.length} EPISODES</div>
              {marathonQueue.map((ep, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 flex items-center justify-between">
                  <div><span className="text-xs font-mono text-white/30 w-6">{i+1}</span><span className="text-xs font-mono text-white/50 ml-2">S{String(ep.season).padStart(2,'0')}E{String(ep.episode).padStart(2,'0')}</span><span className="text-sm text-white/60 ml-2">{ep.showName}</span></div>
                  <span className="text-xs text-white/40">{ep.dur}m</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 9 && (
        <div className="space-y-4">
          <p className="text-sm text-white/60">AI-curated rewatch routes.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewatchRoutes.map(r => (
              <div key={r.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-1 cursor-pointer hover:border-white/20 transition-colors" onClick={() => p.showToast(`Route: ${r.name}`)}>
                <div className="text-sm font-medium text-white">{r.name}</div>
                <div className="text-xs text-white/50">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 10 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div className="text-sm font-medium text-white">Detected Preferences</div>
            <div className="space-y-3">
              <div><div className="text-xs text-white/50 mb-1">Favorite Genres</div><div className="flex gap-2 flex-wrap">{prefs.genres.map(g => <span key={g} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white/60 font-mono">{g}</span>)}</div></div>
              <div><div className="text-xs text-white/50 mb-1">Preferred Length</div><select value={prefs.length} onChange={e => setPrefs(p => ({...p, length: e.target.value}))} className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"><option value="short">Short (under 20 min)</option><option value="medium">Medium (20-30 min)</option><option value="long">Long (30+ min)</option></select></div>
              <div><div className="text-xs text-white/50 mb-1">Active Time</div><select value={prefs.timeOfDay} onChange={e => setPrefs(p => ({...p, timeOfDay: e.target.value}))} className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="night">Late Night</option></select></div>
            </div>
          </div>
        </div>
      )}

      {tab === 11 && (
        <div className="space-y-4">
          <div className="text-xs text-white/40 font-mono">VIEWING PROFILE</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            {viewingBars.map(b => (
              <div key={b.name} className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-white/60">{b.name}</span><span className="text-white/40 font-mono">{b.count}/{b.total}</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-white/40 transition-all" style={{ width: `${b.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 12 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={nlQuery} onChange={e => setNlQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNlSearch()} placeholder='Try: "funny episodes under 20 minutes"' className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
            <button onClick={handleNlSearch} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors shrink-0">Search</button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {nlResults.map((ep, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
                <div><span className="text-xs font-mono text-white/50">S{String(ep.season).padStart(2,'0')}E{String(ep.episode).padStart(2,'0')}</span> <span className="text-sm text-white ml-2">{ep.showName}</span></div>
                <span className="text-xs text-white/40">{ep.dur}m</span>
              </div>
            ))}
            {nlResults.length === 0 && nlQuery && <p className="text-sm text-white/30">No results. Try different keywords.</p>}
          </div>
        </div>
      )}

      {tab === 13 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 justify-center py-8">
            <button onClick={simulateVoice} disabled={voiceListening} className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${voiceListening ? 'border-white/50 bg-white/10 animate-pulse' : 'border-white/20 bg-white/[0.03] hover:bg-white/10'}`}>
              <svg className={`w-8 h-8 ${voiceListening ? 'text-white' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </button>
          </div>
          {voiceListening && (
            <div className="flex items-center justify-center gap-1">
              {[0,1,2,3,4].map(i => <div key={i} className="w-1 rounded-full bg-white/40" style={{ height: `${20 + Math.random() * 30}px`, animation: `pulse 0.5s ease-in-out ${i * 0.1}s infinite` }} />)}
              <span className="text-xs text-white/30 ml-2">Listening...</span>
            </div>
          )}
          {voiceText && <p className="text-sm text-white/60 text-center">Heard: &quot;{voiceText}&quot;</p>}
        </div>
      )}

      {tab === 14 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div className="text-xs font-mono text-white/40">DAILY BRIEFING</div>
            {briefing.yestCount > 0 && <div className="text-sm text-white/80">You watched <span className="font-medium text-white">{briefing.yestCount} episodes</span> yesterday. Great session!</div>}
            {briefing.nearComplete.length > 0 && briefing.nearComplete.map(s => {
              const w = (p.watchedMap[s.id] || []).length;
              const t = s.seasons.reduce((a,b) => a+b, 0);
              return <div key={s.id} className="text-sm text-white/60">You're <span className="text-white font-medium">{t - w} episodes</span> from completing <span className="text-white">{s.name}</span>.</div>;
            })}
            <div className="text-sm text-white/60">Total watch time: <span className="text-white font-medium">{briefing.watchHours} hours</span> across <span className="text-white font-medium">{briefing.totalWatched} episodes</span>.</div>
            {briefing.streak > 0 && <div className="text-sm text-white/60">Current streak: <span className="text-white font-medium">{briefing.streak} days</span></div>}
            {briefing.yestCount === 0 && <div className="text-sm text-white/60">No episodes watched yesterday. Time to catch up!</div>}
          </div>
        </div>
      )}
    </div>
  );
}
