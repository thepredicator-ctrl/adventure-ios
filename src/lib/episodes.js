export function totalEpisodes(show) {
  return show.seasons.reduce((s, n) => s + n, 0);
}

// Convert an internal 1-indexed season (position inside show.seasons) into the
// externally-visible season number. Shows that surface only a later season — e.g.
// "Adventure Time Two" which only carries Season 3 of its source series — set
// `seasonOffset` so internal season 1 is shown to the user (and embedded server
// URLs) as season `1 + offset`.
export function displaySeasonNumber(show, internalSeason) {
  return internalSeason + (show.seasonOffset || 0);
}

export function epsBeforeSeason(show, sIdx) {
  let t = 0;
  for (let i = 0; i < sIdx - 1 && i < show.seasons.length; i++) t += show.seasons[i];
  return t;
}

export function isAtFirstEp(show, season, episode) {
  return season === 1 && episode === 1;
}

export function isAtLastEp(show, season, episode) {
  const s = show.seasons.length;
  return season === s && episode === show.seasons[s - 1];
}

export function watchedPct(watched, show) {
  const total = totalEpisodes(show);
  if (!total) return 0;
  return Math.round((watched.length / total) * 100);
}

export function epKey(season, episode) {
  return `S${season}E${episode}`;
}

export function nextEpisode(show, season, episode) {
  const max = show.seasons[season - 1];
  if (episode < max) return { season, episode: episode + 1 };
  if (season < show.seasons.length) return { season: season + 1, episode: 1 };
  return null;
}

export function prevEpisode(show, season, episode) {
  if (episode > 1) return { season, episode: episode - 1 };
  if (season > 1) return { season: season - 1, episode: show.seasons[season - 2] };
  return null;
}
