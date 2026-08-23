import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet } from '../lib/storage.js';
import { pad2 } from '../lib/format.js';

const FAKE_NAMES = ['Alex','Jordan','Sam','Casey','Riley','Morgan','Quinn','Avery','Blake','Drew','Taylor','Skyler'];
const SYNC_DELAYS = [0, 1, 2, 5];

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function randomName(exclude) {
  const available = FAKE_NAMES.filter(n => !exclude.includes(n));
  return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : 'Viewer';
}

export default function WatchTogether() {
  const p = usePlayer();
  const [sessions, setSessions] = useState(() => lsGet('watchTogetherSessions', []));
  const [activeSession, setActiveSession] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [syncStatus, setSyncStatus] = useState('synced');
  const [syncDelay, setSyncDelay] = useState(1);
  const [autoSync, setAutoSync] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { lsSet('watchTogetherSessions', sessions); }, [sessions]);

  const createSession = useCallback(() => {
    const code = generateCode();
    const session = {
      id: `wt_${Date.now()}`,
      code,
      host: 'You',
      participants: [{ name: 'You', isHost: true, joinedAt: Date.now() }],
      episode: { showId: p.show.id, showName: p.show.shortName, season: p.global.season, episode: p.global.episode, color: p.show.color },
      syncDelay: 1,
      autoSync: true,
      createdAt: Date.now(),
    };
    setSessions(prev => [session, ...prev].slice(0, 20));
    setActiveSession(session);
    setChatMessages([]);
    setSyncStatus('synced');
    p.showToast(`Session created: ${code}`);
  }, [p.show, p.global.season, p.global.episode, p.showToast]);

  const joinSession = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    const existing = sessions.find(s => s.code === code);
    if (!existing) {
      const session = {
        id: `wt_${Date.now()}`,
        code,
        host: randomName([]),
        participants: [
          { name: randomName([]), isHost: true, joinedAt: Date.now() - 60000 },
          { name: 'You', isHost: false, joinedAt: Date.now() },
          { name: randomName(['You', existing?.host]), isHost: false, joinedAt: Date.now() + 30000 },
        ],
        episode: { showId: SHOWS[Math.floor(Math.random() * SHOWS.length)].id, showName: SHOWS[Math.floor(Math.random() * SHOWS.length)].shortName, season: 1, episode: 1, color: '#888' },
        syncDelay: 1,
        autoSync: true,
        createdAt: Date.now(),
      };
      setSessions(prev => [session, ...prev].slice(0, 20));
      setActiveSession(session);
      setChatMessages([{ name: 'System', text: 'You joined the session.', ts: Date.now() }]);
      setSyncStatus('synced');
      p.showToast(`Joined session ${code}`);
    } else {
      setActiveSession(existing);
      setChatMessages([]);
      p.showToast(`Rejoined session ${code}`);
    }
    setShowJoin(false);
    setJoinCode('');
  }, [joinCode, sessions, p.showToast]);

  const addFakeParticipant = useCallback(() => {
    if (!activeSession) return;
    const name = randomName(activeSession.participants.map(p => p.name));
    const updated = {
      ...activeSession,
      participants: [...activeSession.participants, { name, isHost: false, joinedAt: Date.now() }],
    };
    setActiveSession(updated);
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    setChatMessages(prev => [...prev, { name: 'System', text: `${name} joined the session.`, ts: Date.now() }]);
  }, [activeSession]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { name: 'You', text: chatInput.trim(), ts: Date.now() }]);
    setChatInput('');
    setTimeout(() => {
      const names = activeSession?.participants.filter(p => p.name !== 'You').map(p => p.name) || [];
      const responder = names.length > 0 ? names[Math.floor(Math.random() * names.length)] : 'Someone';
      const responses = ['Nice!', 'This part is great', 'LOL', 'Wait for it...', 'Classic!', 'I love this episode', 'No way!', 'Best show ever'];
      setChatMessages(prev => [...prev, { name: responder, text: responses[Math.floor(Math.random() * responses.length)], ts: Date.now() }]);
    }, 1500 + Math.random() * 2000);
  }, [chatInput, activeSession]);

  const simulateSyncEvent = useCallback(() => {
    const events = ['synced', 'paused'];
    const pauser = activeSession?.participants.filter(p => p.name !== 'You').map(p => p.name) || [];
    if (Math.random() > 0.5 && pauser.length > 0) {
      const who = pauser[Math.floor(Math.random() * pauser.length)];
      setSyncStatus(`paused_${who}`);
      setTimeout(() => setSyncStatus('synced'), 3000);
    } else {
      setSyncStatus('reconnecting');
      setTimeout(() => setSyncStatus('synced'), 2000);
    }
  }, [activeSession]);

  const endSession = useCallback(() => {
    if (!activeSession) return;
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, endedAt: Date.now() } : s));
    setActiveSession(null);
    setChatMessages([]);
    setShowEndConfirm(false);
    p.showToast('Session ended');
  }, [activeSession, p.showToast]);

  const syncStatusDisplay = useMemo(() => {
    if (syncStatus === 'synced') return { text: 'Synced', color: 'text-green-400', dot: 'bg-green-400' };
    if (syncStatus === 'reconnecting') return { text: 'Reconnecting...', color: 'text-yellow-400', dot: 'bg-yellow-400' };
    if (syncStatus.startsWith('paused_')) {
      const who = syncStatus.replace('paused_', '');
      return { text: `Paused by ${who}`, color: 'text-orange-400', dot: 'bg-orange-400' };
    }
    return { text: 'Synced', color: 'text-green-400', dot: 'bg-green-400' };
  }, [syncStatus]);

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Watch Together</h2>
          <p className="mt-1 text-white/60">Synchronized viewing with friends.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4 hover:border-white/20 transition-colors cursor-pointer" onClick={createSession}>
            <div className="text-lg font-medium text-white">Create Session</div>
            <p className="text-sm text-white/50">Start a new watch party and invite friends with a code.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4 hover:border-white/20 transition-colors cursor-pointer" onClick={() => setShowJoin(true)}>
            <div className="text-lg font-medium text-white">Join Session</div>
            <p className="text-sm text-white/50">Enter a 6-character code to join an existing session.</p>
          </div>
        </div>

        {showJoin && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div className="text-sm font-medium text-white">Join a Session</div>
            <div className="flex gap-2">
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="Enter code" maxLength={6} className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 font-mono tracking-[0.2em] text-center" />
              <button onClick={joinSession} disabled={joinCode.length < 4} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 shrink-0">Join</button>
            </div>
            <button onClick={() => setShowJoin(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">Cancel</button>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-mono text-white/40">RECENT SESSIONS</div>
            {sessions.slice(0, 5).map(s => (
              <div key={s.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-white/60">{s.code}</span>
                  <span className="text-xs text-white/40">{s.participants.length} viewers</span>
                </div>
                <span className="text-xs text-white/20">{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Watch Together</h2>
        <p className="mt-1 text-white/60">Session <span className="font-mono text-white/80">{activeSession.code}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${syncStatusDisplay.dot}`} />
                <span className={`text-xs font-mono ${syncStatusDisplay.color}`}>{syncStatusDisplay.text}</span>
              </div>
              <span className="text-xs text-white/30 font-mono">{activeSession.participants.length} viewers</span>
            </div>

            <div className="rounded-xl bg-white/[0.05] border border-white/10 p-4 text-center space-y-2">
              <div className="text-xs font-mono text-white/50">NOW WATCHING</div>
              <div className="text-sm font-medium text-white">{activeSession.episode.showName}</div>
              <div className="text-xs font-mono text-white/40">S{pad2(activeSession.episode.season)}E{pad2(activeSession.episode.episode)}</div>
              <div className="flex justify-center gap-2 mt-3">
                <button onClick={simulateSyncEvent} className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Pause</button>
                <button onClick={simulateSyncEvent} className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Play</button>
                <button className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Seek</button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-white/50">Participants</div>
              <div className="space-y-1">
                {activeSession.participants.map((part, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">{part.name[0]}</div>
                    <span className="text-sm text-white/60">{part.name}</span>
                    {part.isHost && <span className="text-xs text-white/30 font-mono">HOST</span>}
                  </div>
                ))}
              </div>
              <button onClick={addFakeParticipant} className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:text-white/60 hover:border-white/20 transition-colors">+ Add participant</button>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="text-xs text-white/50">Settings</div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Auto-sync</span>
                <button onClick={() => setAutoSync(!autoSync)} className={`w-10 h-5 rounded-full transition-colors ${autoSync ? 'bg-white/30' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoSync ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Sync delay</span>
                <div className="flex gap-1">
                  {SYNC_DELAYS.map(d => (
                    <button key={d} onClick={() => setSyncDelay(d)} className={`rounded px-2 py-0.5 text-xs font-mono transition-colors ${syncDelay === d ? 'bg-white/20 text-white' : 'text-white/30 hover:text-white/60'}`}>{d}s</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col" style={{ minHeight: '400px' }}>
            <div className="text-xs font-mono text-white/40 mb-3">CHAT</div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`${msg.name === 'You' ? 'text-right' : ''}`}>
                  <div className="text-xs text-white/30 mb-0.5">{msg.name === 'System' ? '' : msg.name} <span className="text-white/15">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div className={`inline-block rounded-lg px-3 py-1.5 text-sm max-w-[85%] ${msg.name === 'You' ? 'bg-white/10 text-white' : msg.name === 'System' ? 'bg-white/[0.03] text-white/30 italic' : 'bg-white/[0.05] text-white/70'}`}>
                    {msg.name === 'System' ? msg.text : msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Message..." className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
              <button onClick={sendChat} className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors shrink-0">Send</button>
            </div>
          </div>

          {!showEndConfirm ? (
            <button onClick={() => setShowEndConfirm(true)} className="w-full rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400/80 hover:bg-red-500/10 transition-colors">End Session</button>
          ) : (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-3">
              <p className="text-sm text-red-300">End this session for everyone?</p>
              <div className="flex gap-2">
                <button onClick={endSession} className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/30 transition-colors">End</button>
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/20 transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
