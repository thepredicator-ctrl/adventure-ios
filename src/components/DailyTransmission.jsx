import { useState, useEffect, useCallback, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../lib/episodes.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { getWatchTime } from '../lib/storage.js';
import { pad2 } from '../lib/format.js';

export default function DailyTransmission({ onComplete }) {
  const { global, show, watchedMap, unlocked, adventureHistory, continueList, jumpTo, showToast } = usePlayer();
  const [phase, setPhase] = useState(0);
  const [entering, setEntering] = useState(false);
  const timerRef = useRef(null);

  const wt = getWatchTime();
  const today = new Date();
  const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}.${String(today.getFullYear()).slice(-2)}`;

  // Streak
  let streak = 0;
  for (let d = 0; d < 365; d++) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    const dayEntry = wt.sessions?.find(s => s.date === date);
    if (dayEntry && dayEntry.ms > 0) streak++;
    else if (d > 0) break;
    else { streak = 0; break; }
  }

  // Recommendation
  const unwatchedShows = SHOWS.filter(s => (watchedMap[s.id] ?? []).length === 0);
  const recommendation = unwatchedShows.length > 0 ? unwatchedShows[0] : continueList.length > 0
    ? SHOWS.find(s => s.id === continueList[0].showId) || null : null;

  // New achievement available (find next locked)
  const nextAch = ACHIEVEMENTS.find(a => !unlocked.includes(a.id) && !a.hidden);

  // Streak bar (visual blocks)
  const maxStreakDisplay = Math.max(streak, 30);
  const filledBlocks = Math.min(Math.floor((streak / maxStreakDisplay) * 12), 12);

  useEffect(() => {
    const timers = [];
    // Phase progression: 0→1→2→3→4
    timers.push(setTimeout(() => setPhase(1), 400));
    timers.push(setTimeout(() => setPhase(2), 900));
    timers.push(setTimeout(() => setPhase(3), 1500));
    timers.push(setTimeout(() => setPhase(4), 2200));
    timers.push(setTimeout(() => setPhase(5), 3000));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = useCallback(() => {
    setEntering(true);
    setTimeout(() => onComplete(), 600);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${entering ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      {/* Subtle scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          opacity: 0.04,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)',
          animation: 'scanline 8s linear infinite',
        }}
      />

      <div className="relative z-20 text-center max-w-md px-6">
        {/* Header */}
        <div className={`transition-all duration-700 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-xs font-mono text-white/40 tracking-[0.3em] uppercase mb-2">ADVENTURE //</div>
          <div className="text-2xl font-mono text-white/60 tracking-widest">{dateStr}</div>
        </div>

        {/* Welcome */}
        <div className={`mt-8 transition-all duration-700 delay-200 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-xl font-light tracking-widest text-white/80">WELCOME BACK.</div>
        </div>

        {/* Current adventure info */}
        <div className={`mt-10 text-left space-y-6 transition-all duration-700 delay-500 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Current Show</div>
            <div className="text-sm text-white/70">{show.name}</div>
            <div className="text-xs font-mono text-white/40">Season {displaySeasonNumber(show, global.season)} · Episode {global.episode}</div>
          </div>

          {/* Streak */}
          <div>
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">WATCH STREAK</div>
            <div className="flex gap-0.5 items-center">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-sm transition-all duration-500 ${i < filledBlocks ? 'bg-white/70' : 'bg-white/10'}`}
                  style={{ transitionDelay: `${(phase >= 3 ? 800 : 0) + i * 60}ms` }}
                />
              ))}
            </div>
            <div className="text-xs font-mono text-white/50 mt-1">{streak} {streak === 1 ? 'DAY' : 'DAYS'}</div>
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div>
              <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Tonight's Recommendation</div>
              <div className="text-sm text-white/60">{recommendation.name}</div>
            </div>
          )}

          {/* Achievement */}
          {nextAch && (
            <div>
              <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Next Achievement</div>
              <div className="text-sm text-white/50">{nextAch.name}</div>
            </div>
          )}
        </div>

        {/* Enter button */}
        <div className={`mt-12 transition-all duration-700 delay-700 ${phase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={handleEnter}
            className="rounded-lg border border-white/20 bg-white/10 px-10 py-4 text-sm font-mono uppercase tracking-[0.3em] text-white transition-all duration-300 hover:bg-white/20 hover:border-white/40 active:scale-95"
          >
            [ ENTER ]
          </button>
        </div>
      </div>
    </div>
  );
}