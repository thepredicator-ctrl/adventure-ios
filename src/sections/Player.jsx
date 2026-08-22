import { usePlayer } from '../context/PlayerContext.jsx';
import { SERVER_LIST } from '../data/servers.js';
import { SHOWS } from '../data/shows.js';
import { isAtFirstEp, isAtLastEp, displaySeasonNumber, epKey } from '../lib/episodes.js';
import { pad2 } from '../lib/format.js';
import ShowIcon from '../components/ShowIcon.jsx';
import OptionWheel from '../components/OptionWheel.jsx';
import AdShield from '../components/AdShield.jsx';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmtTime(sec) {
  if (!sec || sec <= 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${pad2(m)}:${pad2(s)}`;
}

export default function Player() {
  const {
    show, global, currentServer, videoUrl,
    setSeason, setEpisode, setServer, setAutoplay,
    gotoNext, gotoPrev, markCurrentWatched, markUnwatched,
    continueList, jumpTo, watchedMap,
    toggleFavorite, isFavorite,
    savePlaybackPosition, getPlaybackPosition,
    playbackSpeed, setPlaybackSpeed,
    showToast,
  } = usePlayer();

  const atFirst = isAtFirstEp(show, global.season, global.episode);
  const atLast = isAtLastEp(show, global.season, global.episode);
  const seasonEps = show.seasons[global.season - 1] ?? 0;
  const visibleSeason = displaySeasonNumber(show, global.season);
  const currentEpKey = epKey(global.season, global.episode);
  const isWatched = (watchedMap[show.id] ?? []).includes(currentEpKey);
  const isFav = isFavorite(show.id, global.season, global.episode);
  const savedPos = getPlaybackPosition(show.id, global.season, global.episode);
  const hasResume = savedPos && savedPos.position > 0 && savedPos.duration > 0;
  const resumePct = hasResume ? ((savedPos.position / savedPos.duration) * 100).toFixed(1) : null;

  const seasonItems = show.seasons.map((_, i) => `S${pad2(displaySeasonNumber(show, i + 1))}`);
  const episodeItems = Array.from({ length: seasonEps }, (_, i) => `E${pad2(i + 1)}`);

  return (
    <AdShield>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Player</h2>
          <p className="mt-1 text-white/60">
            Now playing:{' '}
            <span className="text-white">{show.name}</span>
            {' '}— S{pad2(visibleSeason)}E{pad2(global.episode)}
            <span className="ml-2 font-mono text-[11px] text-white/30">
              {show.id} · {currentServer.name}
            </span>
          </p>
        </div>

        {/* ── Video iframe ── */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              key={videoUrl}
              src={videoUrl}
              title={`${show.shortName} S${visibleSeason}E${global.episode}`}
              className="absolute inset-0 h-full w-full"
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
              allowFullScreen
            />
          </div>

          {/* Resume banner */}
          {hasResume && (
            <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-white/70">RESUME</span>
                <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${Math.min(Number(resumePct), 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-white/50">
                  {fmtTime(savedPos.position)} / {fmtTime(savedPos.duration)}
                  <span className="ml-1.5 text-white/30">({resumePct}%)</span>
                </span>
              </div>
              <button
                onClick={() => showToast('RESUME // playback position sent')}
                className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:border-white/40 hover:bg-white/15"
              >
                ▶ Resume
              </button>
            </div>
          )}

          {/* Playback position display (non-resume) */}
          {!hasResume && savedPos && (
            <div className="border-t border-white/10 px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-white/40">SAVED POSITION</span>
                <span className="font-mono text-[11px] text-white/50">
                  {fmtTime(savedPos.position)} / {fmtTime(savedPos.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="font-mono text-white/80">{currentServer.name}</span>
              <span>·</span>
              <span>{show.id}</span>
              {isWatched && (
                <>
                  <span>·</span>
                  <span className="text-white/60">&#10003; watched</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={gotoPrev}
                disabled={atFirst}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => showToast('PLAY/PAUSE')}
                className="rounded-md border border-white/40 bg-white/15 px-3 py-1.5 text-sm text-white transition hover:bg-white/25"
              >
                &#9646;&#9646;
              </button>
              <button
                onClick={gotoNext}
                disabled={atLast}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* ── Mark watched / unwatched + favorite ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button
            onClick={() => {
              markCurrentWatched();
              showToast('MARKED WATCHED');
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/30"
          >
            <div className="text-sm font-medium text-white">&#10003; Mark watched</div>
            <div className="mt-1 text-[11px] text-white/40">S{pad2(visibleSeason)}E{pad2(global.episode)}</div>
          </button>
          <button
            onClick={() => markUnwatched(show.id, global.season, global.episode)}
            disabled={!isWatched}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <div className="text-sm font-medium text-white">Mark unwatched</div>
            <div className="mt-1 text-[11px] text-white/40">Clear progress for this ep</div>
          </button>
          <button
            onClick={() => {
              toggleFavorite(show.id, global.season, global.episode);
              showToast(isFav ? 'UNFAVORITED' : 'FAVORITED');
            }}
            className={`col-span-2 rounded-2xl border p-4 text-left transition hover:border-white/30 sm:col-span-1 ${
              isFav
                ? 'border-white/40 bg-white/[0.08]'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <div className="text-sm font-medium text-white">
              {isFav ? '★ Favorited' : '☆ Favorite'}
            </div>
            <div className="mt-1 text-[11px] text-white/40">
              {isFav ? 'Remove from favorites' : 'Add current episode to favorites'}
            </div>
          </button>
        </div>

        {/* ── Speed control ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Playback speed</div>
            <div className="font-mono text-xs text-white/50">
              CURRENT{' '}
              <span className="text-white">{playbackSpeed}x</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SPEEDS.map(sp => (
              <button
                key={sp}
                onClick={() => setPlaybackSpeed(sp)}
                className={`rounded-lg border px-3 py-2 text-center text-sm font-mono transition ${
                  playbackSpeed === sp
                    ? 'border-white/50 bg-white/15 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/30 hover:text-white'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>
          <div className="mt-2 text-center text-[11px] text-white/35">
            Speed preference is saved to your profile settings
          </div>
        </div>

        {/* ── Season & Episode picker (OptionWheel) ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Season &amp; Episode</div>
            <div className="font-mono text-xs text-white/50">
              <span className="text-white">S{pad2(visibleSeason)}</span>
              <span className="mx-1 text-white/30">·</span>
              <span className="text-white">E{pad2(global.episode)}</span>
              <span className="mx-2 text-white/20">|</span>
              <span className="text-white/40">{seasonEps} eps this season</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Season wheel */}
            <div className="relative rounded-xl bg-black/30 p-2">
              <div className="absolute left-0 right-0 top-2 text-center text-[10px] uppercase tracking-widest text-white/40">
                Season
              </div>
              <div className="h-[260px]">
                <OptionWheel
                  key={`season-wheel-${show.id}-${global.season}`}
                  items={seasonItems}
                  defaultSelected={global.season - 1}
                  onChange={(idx) => setSeason(idx + 1)}
                  side="right"
                  textColor="#9ca3af"
                  activeColor="#f0abfc"
                  fontSize={2}
                  spacing={1.3}
                  curve={1}
                  tilt={7}
                  blur={1.4}
                  fade={0.32}
                  minOpacity={0.05}
                  smoothing={180}
                  inset={36}
                />
              </div>
            </div>

            {/* Episode wheel */}
            <div className="relative rounded-xl bg-black/30 p-2">
              <div className="absolute left-0 right-0 top-2 text-center text-[10px] uppercase tracking-widest text-white/40">
                Episode
              </div>
              <div className="h-[260px]">
                <OptionWheel
                  key={`episode-wheel-${show.id}-${global.season}-${global.episode}`}
                  items={episodeItems}
                  defaultSelected={Math.min(global.episode - 1, episodeItems.length - 1)}
                  onChange={(idx) => setEpisode(idx + 1)}
                  side="left"
                  textColor="#9ca3af"
                  activeColor="#f0abfc"
                  fontSize={2}
                  spacing={1.3}
                  curve={1}
                  tilt={7}
                  blur={1.4}
                  fade={0.32}
                  minOpacity={0.05}
                  smoothing={180}
                  inset={36}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 text-center text-[11px] text-white/35">
            Scroll, drag, or click an item · Arrow keys also work
          </div>
        </div>

        {/* ── Server picker ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Embed server</div>
            <div className="text-xs text-white/40">If a server has no source, try another · keys 1–9</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SERVER_LIST.map(s => (
              <button
                key={s.id}
                onClick={() => setServer(s.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  global.server === s.id
                    ? 'border-white/60 bg-white/15 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30'
                }`}
              >
                <div className="font-mono text-xs text-white/40">0{s.id}</div>
                <div className="mt-0.5 font-medium">{s.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Auto Next toggle ── */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <div className="text-sm font-medium text-white">Auto Next</div>
            <div className="mt-1 text-xs text-white/50">
              Listen for &ldquo;ended&rdquo; postMessages from the iframe and auto-advance.
            </div>
          </div>
          <button
            onClick={() => setAutoplay(!global.autoplay)}
            role="switch"
            aria-checked={global.autoplay}
            className={`relative h-7 w-12 rounded-full transition ${global.autoplay ? 'bg-white' : 'bg-white/15'}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${global.autoplay ? 'left-6' : 'left-1'}`}
            />
          </button>
        </div>

        {/* ── Playback position info ── */}
        {savedPos && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium text-white">Playback position</div>
              <div className="font-mono text-[11px] text-white/40">
                {savedPos.updatedAt
                  ? `saved ${new Date(savedPos.updatedAt).toLocaleDateString()}`
                  : '—'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="font-mono text-2xl font-light text-white">
                {fmtTime(savedPos.position)}
              </div>
              <div className="text-white/20">/</div>
              <div className="font-mono text-sm text-white/50">
                {fmtTime(savedPos.duration)}
              </div>
              {savedPos.duration > 0 && (
                <div className="ml-auto font-mono text-xs text-white/40">
                  {((savedPos.position / savedPos.duration) * 100).toFixed(1)}% complete
                </div>
              )}
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/40 transition-all"
                style={{ width: `${Math.min((savedPos.position / savedPos.duration) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Continue watching rail ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-sm font-medium text-white">Continue watching</div>
          {continueList.length === 0 ? (
            <div className="py-6 text-center text-sm text-white/40">
              No episodes watched yet. Press &ldquo;Mark watched&rdquo; to start.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {continueList.map((entry, i) => {
                const s = SHOWS.find(x => x.id === entry.showId);
                if (!s) return null;
                return (
                  <button
                    key={`${entry.showId}-${entry.season}-${entry.episode}-${i}`}
                    onClick={() => jumpTo(entry.showId, entry.season, entry.episode)}
                    className="group flex w-32 shrink-0 flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2 text-left transition hover:border-white/40"
                  >
                    <ShowIcon show={s} size={28} />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-white">{s.shortName}</div>
                      <div className="text-[11px] text-white/50">
                        S{pad2(displaySeasonNumber(s, entry.season))}E{pad2(entry.episode)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdShield>
  );
}
