/**
 * DeepLinkRouter - handles adventure:// deep links.
 */
import { SHOWS } from '../../data/shows.js';

const ROUTE_HANDLERS = [];

export function registerRouteHandler(handler) {
  ROUTE_HANDLERS.push(handler);
  return () => { const idx = ROUTE_HANDLERS.indexOf(handler); if (idx >= 0) ROUTE_HANDLERS.splice(idx, 1); };
}

export function parseDeepLink(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '');
    const parts = path.split('/');
    const route = parts[0];
    const params = Object.fromEntries(u.searchParams);
    return { route, params, pathParts: parts.slice(1) };
  } catch { return null; }
}

export function handleDeepLink(url, playerActions) {
  const parsed = parseDeepLink(url);
  if (!parsed) return false;

  const { route, params, pathParts } = parsed;

  switch (route) {
    case 'show': {
      const showId = pathParts[0] || params.id;
      const season = Number(pathParts[1] || params.season || 1);
      const episode = Number(pathParts[2] || params.episode || 1);
      if (showId && playerActions.jumpTo) {
        playerActions.jumpTo(showId, season, episode);
        return true;
      }
      break;
    }
    case 'episode': {
      const showId = params.show || params.showId;
      const season = Number(params.season || 1);
      const episode = Number(params.episode || 1);
      if (showId && playerActions.jumpTo) {
        playerActions.jumpTo(showId, season, episode);
        return true;
      }
      break;
    }
    case 'adventure': {
      if (playerActions.openSection) playerActions.openSection('Adventure Mode');
      return true;
    }
    case 'collection': {
      if (playerActions.openSection) playerActions.openSection('Shows');
      return true;
    }
    default:
      break;
  }

  // Pass to custom handlers
  for (const handler of ROUTE_HANDLERS) {
    if (handler(parsed, playerActions)) return true;
  }

  return false;
}

export function buildDeepLink(route, params = {}) {
  const base = 'adventure://';
  const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return query ? `${base}${route}?${query}` : `${base}${route}`;
}
