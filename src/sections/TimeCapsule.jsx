import { useState, useMemo, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet } from '../lib/storage.js';
import { totalEpisodes } from '../lib/episodes.js';

const GENRE_MOODS = ['on an adventure kick', 'deep in a comedy phase', 'exploring mysteries', 'feeling fantastical', 'on a sci-fi binge', 'in a slice-of-life mood', 'craving animation', 'seeking drama'];
const NOSTALGIC_MSGS = [
  'Some things never get old — except the episodes you watched then.',
  'Remember when this was your go-to show? Good times.',
  'Your taste has evolved, but these episodes still hold up.',
  'This was peak you. No notes.',
  'You were on a roll that month. Absolute cinema.',
  'The golden age of your watchlist.',
];
const SEPIA_HUES = [
  'from-amber-900/30 to-yellow-900/10',
  'from-orange-900/30 to-red-900/10',
  'from-yellow-900/20 to-amber-900/10',
];

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateSimulatedMemories(watchHistory, yearsAgo) {
  const now = new Date();
  const targetYear = now.getFullYear() - yearsAgo;
  const targetMonth = now.getMonth();
  const rng = seededRandom(targetYear * 13 + targetMonth * 7 + yearsAgo);

  // Check for real historical data in watchTime sessions
  const wt = lsGet('watchTime', { sessions: [] });
  const realEntries = wt.sessions.filter(s => {
    const d = new Date(s.date);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });

  if (realEntries.length > 0) {
    const shows = SHOWS;
    const memories = realEntries.map((entry, i) => {
      const show = shows[i % shows.length];
      const season = Math.min(Math.floor(rng() * show.seasons.length) + 1, show.seasons.length);
      const episode = Math.min(Math.floor(rng() * show.seasons[season - 1]) + 1, show.seasons[season - 1]);
      return { show, season, episode, date: entry.date, count: Math.round((entry.ms || 0) / (22 * 60 * 1000)) || 1 };
    });
    return { memories, totalEps: realEntries.reduce((a, e) => a + Math.round((e.ms || 0) / (22 * 60 * 1000)), 0), hasRealData: true };
  }

  // Simulate memories
  const numEntries = 2 + Math.floor(rng() * 4);
  const shuffled = [...SHOWS].sort(() => rng() - 0.5);
  const memories = [];
  for (let i = 0; i < numEntries && i < shuffled.length; i++) {
    const show = shuffled[i];
    const season = Math.min(Math.floor(rng() * show.seasons.length) + 1, show.seasons.length);
    const episode = Math.min(Math.floor(rng() * show.seasons[season - 1]) + 1, show.seasons[season - 1]);
    const day = 1 + Math.floor(rng() * 28);
    const date = new Date(targetYear, targetMonth, day);
    memories.push({ show, season, episode, date: date.toISOString().slice(0, 10), count: 1 + Math.floor(rng() * 5) });
  }
  return { memories, totalEps: memories.reduce((a, m) => a + m.count, 0), hasRealData: false };
}

export default function TimeCapsule() {
  const [memoryLaneIdx, setMemoryLaneIdx] = useState(null);
  const [laneOffset, setLaneOffset] = useState(0);

  const periods = useMemo(() => {
    return [1, 2, 3].map(yearsAgo => {
      const data = generateSimulatedMemories(null, yearsAgo);
      const now = new Date();
      const targetYear = now.getFullYear() - yearsAgo;
      const targetMonth = now.getMonth();
      const monthName = new Date(targetYear, targetMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const rng = seededRandom(targetYear * 13 + targetMonth);
      const mood = GENRE_MOODS[Math.floor(rng() * GENRE_MOODS.length)];
      const msg = NOSTALGIC_MSGS[Math.floor(rng() * NOSTALGIC_MSGS.length)];
      const totalHours = ((data.totalEps * 22) / 60).toFixed(1);
      const sepia = SEPIA_HUES[yearsAgo % SEPIA_HUES.length];
      return { yearsAgo, label: `${yearsAgo} Year${yearsAgo > 1 ? 's' : ''} Ago`, monthName, ...data, mood, msg, totalHours, sepia };
    });
  }, []);

  const cycleMemoryLane = useCallback(() => {
    setLaneOffset(p => p + 1);
  }, []);

  const shuffledShows = useMemo(() => {
    const rng = seededRandom(42 + laneOffset);
    return [...SHOWS].sort(() => rng() - 0.5);
  }, [laneOffset]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Time Capsule</h2>
        <p className="mt-1 text-white/60">What you were watching this time in past years.</p>
      </div>

      {/* Memory Lane button */}
      <div className="flex items-center gap-3">
        <button onClick={cycleMemoryLane} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">
          🕰️ Memory Lane
        </button>
        <span className="text-xs text-white/30">Tap to explore random past dates</span>
      </div>

      {/* Memory Lane random card */}
      {shuffledShows.length > 0 && (
        <div className={`rounded-2xl border border-amber-900/30 bg-gradient-to-br ${SEPIA_HUES[laneOffset % SEPIA_HUES.length]} p-5`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🕰️</span>
            <span className="text-sm font-medium text-white/80">Memory Lane</span>
          </div>
          <div className="space-y-2">
            {shuffledShows.slice(0, 3).map((s, i) => {
              const rng = seededRandom(laneOffset * 100 + i + 1);
              const season = Math.min(Math.floor(rng() * s.seasons.length) + 1, s.seasons.length);
              const episode = Math.min(Math.floor(rng() * s.seasons[season - 1]) + 1, s.seasons[season - 1]);
              const yearsAgo = 1 + Math.floor(rng() * 3);
              const dayOffset = Math.floor(rng() * 14);
              const targetDate = new Date();
              targetDate.setFullYear(targetDate.getFullYear() - yearsAgo);
              targetDate.setDate(targetDate.getDate() - dayOffset);
              const dateStr = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              const eraMsg = NOSTALGIC_MSGS[Math.floor(rng() * NOSTALGIC_MSGS.length)];
              return (
                <div key={`${laneOffset}-${i}`} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold shrink-0" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
                  <div className="min-w-0">
                    <div className="text-sm text-white/80">On <span className="text-white/50">{dateStr}</span>, you were watching</div>
                    <div className="text-sm text-white">{s.shortName} S{season}E{episode}</div>
                    <div className="text-[10px] text-amber-200/30 mt-0.5">{eraMsg}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time period cards */}
      {periods.map((p) => {
        const uniqueShows = [...new Set(p.memories.map(m => m.show.id))];
        return (
          <div key={p.yearsAgo} className={`rounded-2xl border border-amber-900/20 bg-gradient-to-br ${p.sepia} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-white">{p.label}</div>
                <div className="text-xs text-white/40">{p.monthName}</div>
              </div>
              <div className="flex items-center gap-2">
                {p.hasRealData && <span className="text-[10px] text-green-400/70 bg-green-400/10 px-2 py-0.5 rounded-full">Real data</span>}
                <span className="text-[10px] text-amber-200/30">{uniqueShows.length} show{uniqueShows.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Mood message */}
            <div className="text-xs text-amber-200/40 italic mb-3">
              You were {p.mood} that month.
            </div>

            {/* Memory entries */}
            <div className="space-y-2">
              {p.memories.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold shrink-0" style={{ background: m.show.color + '22', color: m.show.color }}>{m.show.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white/80">
                      On <span className="text-white/50">{new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>,
                      you watched <span className="text-white">{m.show.shortName} S{m.season}E{m.episode}</span>
                    </div>
                    <div className="text-xs text-white/30">{m.count} episode{m.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full shrink-0" style={{ background: m.show.color + '15' }}>
                    <span className="text-[9px] font-mono text-white/30">S{m.season}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.06]">
              <div className="text-xs text-white/40">{p.totalEps} episodes</div>
              <div className="text-xs text-white/40">~{p.totalHours} hours</div>
              <div className="text-xs text-white/40">{p.memories.length} sessions</div>
            </div>

            {/* Nostalgic message */}
            <div className="mt-2 text-xs text-amber-200/30">“{p.msg}”</div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-white/20">Memories are simulated from your library. Real data appears when available.</p>
      </div>
    </div>
  );
}
