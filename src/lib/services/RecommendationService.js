/**
 * RecommendationService - Smart Rewatch routes and recommendations.
 */
import { SHOWS } from '../../data/shows.js';
import { totalEpisodes, epKey, displaySeasonNumber } from '../../lib/episodes.js';

export const REWATCH_MODES = [
  { id: 'favorites', name: 'Favorite Episodes' },
  { id: 'high_rated', name: 'Highest Rated' },
  { id: 'most_rewatched', name: 'Most Rewatched' },
  { id: 'random_favorites', name: 'Random Favorites' },
  { id: 'character_arc', name: 'Character Arc' },
  { id: 'story_arc', name: 'Story Arc' },
  { id: 'custom', name: 'Custom Selection' },
];

export function generateRewatchRoute(mode, watchedMap, favorites, ratings, watchHistory, options = {}) {
  const { showId, seasonFilter, count = 10, excludeIds = [] } = options;
  let pool = [];

  // Build pool of watched episodes
  for (const s of SHOWS) {
    if (showId && s.id !== showId) continue;
    const watched = watchedMap[s.id] || [];
    for (const si = 0; si < s.seasons.length; si++) {
      for (let e = 1; e <= s.seasons[si]; e++) {
        const key = epKey(si + 1, e);
        if (watched.includes(key)) {
          pool.push({
            showId: s.id,
            showName: s.shortName,
            season: displaySeasonNumber(s, si + 1),
            episode: e,
            epKey: key,
            rating: ratings[key] || 0,
          });
        }
      }
    }
  }

  // Filter out excluded
  pool = pool.filter(ep => !excludeIds.includes(ep.epKey));

  // Filter by season
  if (seasonFilter) {
    pool = pool.filter(ep => ep.season === seasonFilter);
  }

  // Apply mode
  let route = [];
  switch (mode) {
    case 'favorites': {
      const favKeys = new Set(favorites);
      route = pool.filter(ep => favKeys.has(`${ep.showId}:S${ep.season}:E${ep.episode}`));
      break;
    }
    case 'high_rated': {
      route = [...pool].sort((a, b) => b.rating - a.rating).filter(ep => ep.rating > 0);
      break;
    }
    case 'most_rewatched': {
      const counts = {};
      for (const entry of watchHistory) {
        const k = `${entry.showId}:S${entry.season}:E${entry.episode}`;
        counts[k] = (counts[k] || 0) + 1;
      }
      route = [...pool].sort((a, b) => (counts[b.epKey] || 0) - (counts[a.epKey] || 0)).filter(ep => (counts[ep.epKey] || 0) > 1);
      break;
    }
    case 'random_favorites': {
      const favKeys = new Set(favorites);
      const favs = pool.filter(ep => favKeys.has(`${ep.showId}:S${ep.season}:E${ep.episode}`));
      for (let i = favs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [favs[i], favs[j]] = [favs[j], favs[i]];
      }
      route = favs;
      break;
    }
    case 'character_arc':
    case 'story_arc': {
      // Group by show, sort by season/episode for arc progression
      route = [...pool].sort((a, b) => {
        if (a.showId !== b.showId) return a.showId.localeCompare(b.showId);
        if (a.season !== b.season) return a.season - b.season;
        return a.episode - b.episode;
      });
      break;
    }
    default:
      break;
  }

  route = route.slice(0, count);

  return {
    id: `rewatch_${Date.now()}`,
    mode,
    episodes: route,
    createdAt: Date.now(),
    currentIdx: 0,
    completed: false,
  };
}

export function shuffleRoute(route) {
  const episodes = [...route.episodes];
  for (let i = episodes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [episodes[i], episodes[j]] = [episodes[j], episodes[i]];
  }
  return { ...route, episodes, id: `rewatch_${Date.now()}` };
}

export function removeFromRoute(route, epKey) {
  return { ...route, episodes: route.episodes.filter(ep => ep.epKey !== epKey), id: `rewatch_${Date.now()}` };
}

export function addToRoute(route, episode) {
  return { ...route, episodes: [...route.episodes, episode], id: `rewatch_${Date.now()}` };
}