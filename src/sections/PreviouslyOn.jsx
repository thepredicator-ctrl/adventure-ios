import { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet } from '../lib/storage.js';
import { pad2 } from '../lib/format.js';
import { displaySeasonNumber } from '../lib/episodes.js';

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const RECAP_TEMPLATES = {
  'tt1305826': {
    '1': [
      'Finn and Jake found themselves drawn into an unexpected quest when the Lich released dark energy across the Land of Ooo. With Princess Bubblegum occupied in her lab, it fell to our heroes to rally the remaining kingdoms.',
      'Their journey led them through the Ice Kingdom, where they confronted the Ice King about his latest kidnapping scheme. Meanwhile, Marceline revealed a piece of her past that changed how the group viewed the vampire queen forever.',
      'BMO discovered a hidden function that could alter reality itself, leading to a philosophical debate between Finn and Jake about the nature of their world.',
    ],
    '2': [
      'The Candy Kingdom faced its greatest crisis yet as a mysterious plague turned citizens into sour versions of themselves. Princess Bubblegum worked tirelessly in her lab while Finn and Jake searched for the source.',
      'Finn began questioning his role as a hero after a particularly devastating defeat. Jake tried to lift his spirits with a camping trip that went hilariously wrong.',
      'New alliances were forged when the Flame Princess entered the scene, bringing both danger and an unexpected connection to Finn. The season explored themes of identity and belonging.',
    ],
  },
  'tt1865718': {
    '1': [
      'Dipper and Mabel arrived in Gravity Falls expecting a boring summer, but the mysterious journal changed everything. They uncovered a conspiracy involving the town founder and a hidden machine beneath the Mystery Shack.',
      'The twins encountered a series of supernatural threats, each more bizarre than the last. Meanwhile, Grunkle Stan grew increasingly suspicious as the kids dug deeper into the town secrets.',
      'A shape-shifting creature infiltrated the group, testing the bonds of trust between Dipper, Mabel, and their friends. The season built toward a confrontation that would change everything.',
    ],
  },
};

function getDefaultRecap(showId, season) {
  const show = SHOWS.find(s => s.id === showId);
  const showRecaps = RECAP_TEMPLATES[showId];
  if (showRecaps && showRecaps[String(season)]) {
    return showRecaps[String(season)];
  }
  const r = seededRandom(showId.charCodeAt(1) * 100 + season * 37);
  return [
    `The ${season === 1 ? 'first' : 'latest'} season of ${show?.name || 'this show'} introduced compelling new challenges for our characters. Relationships were tested and alliances shifted in unexpected ways.`,
    `Key revelations changed the audience's understanding of the world. Characters faced moral dilemmas that pushed them to grow, and the writing balanced humor with genuine emotional stakes.`,
    `The season finale left viewers on the edge of their seats, setting up questions that demanded answers. The ensemble cast delivered some of their best performances yet, particularly in the quieter character moments.`,
  ];
}

export default function PreviouslyOn() {
  const p = usePlayer();
  const [fadeIn, setFadeIn] = useState(false);
  const [showRecap, setShowRecap] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const lastWatched = useMemo(() => {
    if (p.continueList.length > 0) {
      return p.continueList[0];
    }
    return null;
  }, [p.continueList]);

  const show = useMemo(() => {
    if (!lastWatched) return null;
    return SHOWS.find(s => s.id === lastWatched.showId) || null;
  }, [lastWatched]);

  const seasonWatchedEps = useMemo(() => {
    if (!lastWatched || !show) return [];
    const watched = p.watchedMap[show.id] || [];
    const seasonEps = watched.filter(k => {
      const m = k.match(/S(\d+)E(\d+)/);
      return m && Number(m[1]) === lastWatched.season;
    });
    return seasonEps.sort();
  }, [lastWatched, show, p.watchedMap]);

  const recapLines = useMemo(() => {
    if (!show || !lastWatched) return [];
    return getDefaultRecap(show.id, lastWatched.season);
  }, [show, lastWatched]);

  const nextEp = useMemo(() => {
    if (!show || !lastWatched) return null;
    const maxEp = show.seasons[(lastWatched.season - 1) - (show.seasonOffset || 0)] || 0;
    if (lastWatched.episode < maxEp) return { season: lastWatched.season, episode: lastWatched.episode + 1 };
    const intSeason = lastWatched.season - (show.seasonOffset || 0);
    if (intSeason < show.seasons.length) return { season: lastWatched.season + 1, episode: 1 };
    return null;
  }, [show, lastWatched]);

  const handleContinue = () => {
    if (!nextEp || !show) return;
    const intSeason = nextEp.season - (show.seasonOffset || 0);
    p.jumpTo(show.id, intSeason, nextEp.episode);
    p.showToast(`Continuing to S${pad2(nextEp.season)}E${pad2(nextEp.episode)}`);
  };

  if (!lastWatched || !show) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Previously On</h2>
          <p className="mt-1 text-white/60">Cinematic recaps before you continue.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/30" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <p className="text-lg text-white/40">Start your adventure</p>
          <p className="text-sm text-white/20">Watch some episodes and come back for recaps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Previously On</h2>
        <p className="mt-1 text-white/60">Cinematic recaps before you continue.</p>
      </div>

      <div className={`transition-all duration-1000 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="text-xs font-mono text-white/30 tracking-[0.3em] uppercase mb-2">Previously On</div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: show.color || '#fff' }}>{show.name}</div>
            <div className="text-sm text-white/40 font-mono mt-1">Season {lastWatched.season}</div>
          </div>

          {showRecap && (
            <div className="relative z-10 space-y-3 max-w-xl mx-auto text-left">
              {recapLines.map((line, i) => (
                <p key={i} className="text-sm text-white/60 leading-relaxed italic">
                  &ldquo;{line}&rdquo;
                </p>
              ))}
            </div>
          )}

          <div className="relative z-10">
            <div className="text-xs text-white/30 font-mono mb-3">EPISODES WATCHED THIS SEASON</div>
            <div className="flex justify-center gap-2 flex-wrap">
              {seasonWatchedEps.map((ep, i) => (
                <div key={ep} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5">
                  <span className="text-xs font-mono text-white/50">{ep}</span>
                </div>
              ))}
            </div>
            {seasonWatchedEps.length === 0 && (
              <p className="text-xs text-white/20">No episodes watched in this season yet.</p>
            )}
          </div>

          {nextEp && (
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleContinue}
                  className="group flex items-center gap-3 rounded-xl bg-white/[0.05] border border-white/20 px-6 py-4 hover:bg-white/10 transition-all hover:border-white/40"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-white/40 font-mono">CONTINUE TO</div>
                    <div className="text-sm font-medium text-white">S{pad2(nextEp.season)}E{pad2(nextEp.episode)}</div>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowRecap(!showRecap)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                {showRecap ? 'Hide recap' : 'Show recap'}
              </button>
            </div>
          )}

          {!nextEp && (
            <div className="relative z-10">
              <div className="rounded-lg bg-white/[0.05] border border-white/10 px-4 py-3 inline-block">
                <span className="text-sm text-white/50">Season complete!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
