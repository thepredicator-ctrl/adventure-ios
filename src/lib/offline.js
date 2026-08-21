// ------------------------------------------------------------------
//  Offline engine — real video downloads, HLS parsing, File System Access
// ------------------------------------------------------------------

const OFFLINE_META_KEY = 'adventure:offline';
export const CACHE_NAME = 'adventure-offline';
const DB_NAME = 'adventure-offline-fs';
const DB_VERSION = 1;
const DIR_STORE = 'handles';

/* ================================================================ */
/*  Metadata persistence (localStorage)                               */
/* ================================================================ */

export function getOfflineMeta() {
  try { const r = localStorage.getItem(OFFLINE_META_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function setOfflineMeta(m) {
  try { localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(m)); } catch {}
}
export function clearOfflineMeta() {
  try { localStorage.removeItem(OFFLINE_META_KEY); } catch {}
}

/* ================================================================ */
/*  Cache API                                                         */
/* ================================================================ */

export async function openCache() {
  try { return await caches.open(CACHE_NAME); } catch { return null; }
}
export async function getCachedCount() {
  const c = await openCache(); if (!c) return 0;
  try { return (await c.keys()).length; } catch { return 0; }
}
export async function clearOfflineCache() {
  try { await caches.delete(CACHE_NAME); } catch {}
}

/* ================================================================ */
/*  Full clear                                                        */
/* ================================================================ */

export async function clearAllOfflineData() {
  await clearOfflineCache(); clearOfflineMeta(); await removeDirHandle();
}

/* ================================================================ */
/*  File System Access API + IndexedDB handle storage                 */
/* ================================================================ */

export const supportsFileAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(DIR_STORE)) r.result.createObjectStore(DIR_STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveDirHandle(h) {
  try {
    const db = await openDB();
    const tx = db.transaction(DIR_STORE, 'readwrite');
    tx.objectStore(DIR_STORE).put(h, 'offlineDir');
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  } catch {}
}
export async function getDirHandle() {
  try {
    const db = await openDB();
    const r = db.transaction(DIR_STORE, 'readonly').objectStore(DIR_STORE).get('offlineDir');
    return new Promise((res, rej) => { r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); });
  } catch { return null; }
}
export async function removeDirHandle() {
  try {
    const db = await openDB();
    const tx = db.transaction(DIR_STORE, 'readwrite');
    tx.objectStore(DIR_STORE).delete('offlineDir');
    await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; });
  } catch {}
}

/* ================================================================ */
/*  Video URL extraction from embed pages                             */
/* ================================================================ */

/**
 * Fetch an embed page and try to read its HTML (requires CORS).
 * Returns the HTML string or null if blocked.
 */
export async function fetchEmbedHTML(url) {
  try {
    const r = await fetch(url, { mode: 'cors', cache: 'no-store', signal: AbortSignal.timeout(12_000) });
    if (r.ok) return await r.text();
  } catch {}
  return null;
}

/**
 * Extract all candidate video-source URLs from HTML.
 * Returns an array of absolute URLs, highest-priority first.
 */
export function extractVideoURLs(html, pageUrl) {
  const urls = new Set();
  let m;

  // <iframe src="...">
  const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
  while ((m = iframeRe.exec(html)) !== null) urls.add(m[1]);

  // <source|video src="...">
  const srcRe = /<(?:source|video)[^>]+src=["']([^"']+)["']/gi;
  while ((m = srcRe.exec(html)) !== null) urls.add(m[1]);

  // JS literals: file:"...", source:"...", url:"...", etc.
  const jsRe = /(?:file|source|src|url|video_url|source_url|hls_url|playlist)\s*[:=]\s*["']([^"']*(?:m3u8|mp4|webm)[^"']*)["']/gi;
  while ((m = jsRe.exec(html)) !== null) urls.add(m[1]);

  // Bare m3u8 / video URLs anywhere
  const bareRe = /https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|webm)(?:\?[^\s"'<>]*)?/gi;
  while ((m = bareRe.exec(html)) !== null) urls.add(m[0]);

  // data-src / data-file attributes
  const dataRe = /data-(?:src|file|url|source)=["']([^"']+)["']/gi;
  while ((m = dataRe.exec(html)) !== null) urls.add(m[1]);

  // Resolve relative URLs
  const base = new URL(pageUrl);
  const out = [];
  for (const u of urls) {
    try {
      if (u.startsWith('//')) out.push(base.protocol + u);
      else if (u.startsWith('http')) out.push(u);
      else if (u.startsWith('/')) out.push(base.origin + u);
      else out.push(new URL(u, pageUrl).href);
    } catch {}
  }

  // Sort: m3u8 first, then mp4, then webm, then iframes last
  out.sort((a, b) => {
    const p = u => /\.m3u8/i.test(u) ? 0 : /\.mp4/i.test(u) ? 1 : /\.webm/i.test(u) ? 2 : 3;
    return p(a) - p(b);
  });

  return out;
}

function resolveURL(u, base) {
  try {
    if (u.startsWith('//')) return new URL(u, base).href;
    if (u.startsWith('http')) return u;
    return new URL(u, base).href;
  } catch { return u; }
}

/* ================================================================ */
/*  HLS m3u8 parser                                                  */
/* ================================================================ */

function isHLS(u) { return /\.m3u8/i.test(u); }

/**
 * Parse an m3u8 URL — handles master playlists and media playlists.
 * Returns { type: 'master'|'media', streams?, segments? }.
 */
export async function parseM3U8(url) {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`m3u8 fetch ${r.status}`);
  const text = await r.text();

  if (text.includes('#EXT-X-STREAM-INF')) {
    // Master playlist — pick highest bandwidth
    const lines = text.split('\n');
    let bestBW = -1, bestURL = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
        const bw = (lines[i].match(/BANDWIDTH=(\d+)/) || [])[1];
        const b = bw ? parseInt(bw) : 0;
        for (let j = i + 1; j < lines.length; j++) {
          const n = lines[j].trim();
          if (n && !n.startsWith('#')) {
            if (b > bestBW) { bestBW = b; bestURL = resolveURL(n, url); }
            break;
          }
        }
      }
    }
    if (bestURL) return { type: 'master', mediaPlaylist: bestURL };
    throw new Error('No streams in master playlist');
  }

  // Media playlist — extract segments
  const segments = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#')) segments.push(resolveURL(t, url));
  }
  if (segments.length === 0) throw new Error('No segments in media playlist');
  return { type: 'media', segments };
}

/* ================================================================ */
/*  Stream downloaders                                               */
/* ================================================================ */

/**
 * Stream a URL directly into a FileSystemWritableFileStream.
 * Calls onProgress(downloadedBytes) after each chunk.
 */
export async function streamToFile(url, writable, onProgress, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const reader = r.body.getReader();
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writable.write(value);
        total += value.byteLength;
        if (onProgress) onProgress(total);
      }
      return total;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Download an HLS stream (m3u8 → segments → single .ts file).
 * Streams segments sequentially into a writable stream.
 * onProgress(downloadedBytes, totalSegments, doneSegments).
 */
export async function downloadHLS(m3u8Url, writable, onProgress) {
  // 1. Parse m3u8 (may be master → media → segments)
  const parsed = await parseM3U8(m3u8Url);
  let segments;
  if (parsed.type === 'master') {
    const media = await parseM3U8(parsed.mediaPlaylist);
    segments = media.segments;
  } else {
    segments = parsed.segments;
  }

  // 2. Download each segment, streaming directly to file
  let totalBytes = 0;
  for (let i = 0; i < segments.length; i++) {
    for (let retry = 0; retry <= 2; retry++) {
      try {
        const r = await fetch(segments[i], { cache: 'no-store' });
        if (!r.ok) throw new Error(`seg ${r.status}`);
        const reader = r.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writable.write(value);
          totalBytes += value.byteLength;
        }
        break;
      } catch (err) {
        if (retry === 2) throw err;
        await new Promise(r => setTimeout(r, 800 * (retry + 1)));
      }
    }
    if (onProgress) onProgress(totalBytes, segments.length, i + 1);
  }
  return totalBytes;
}

/* ================================================================ */
/*  Full episode download pipeline                                     */
/* ================================================================ */

/**
 * Create the episode directory structure inside the user's folder.
 * Returns { seasonDir, fileHandle, writable } for the video file.
 */
async function prepareEpisodeDir(dirHandle, showName, season, episode, ext) {
  const safe = showName.replace(/[/\\?%*:|"<>]/g, '-');
  const showDir = await dirHandle.getDirectoryHandle(safe, { create: true });
  const sDir = await showDir.getDirectoryHandle(`Season ${String(season).padStart(2, '0')}`, { create: true });
  const fname = `Episode ${String(episode).padStart(2, '0')}.${ext}`;
  const fh = await sDir.getFileHandle(fname, { create: true });
  const w = await fh.createWritable();
  return { seasonDir: sDir, fileHandle: fh, writable: w, fileName: fname };
}

/**
 * Download a single episode's actual video file.
 *
 * Pipeline:
 *  1. Fetch embed page HTML (CORS) to extract video source URLs
 *  2. If the embed has nested iframes, follow up to 2 levels deep
 *  3. From the final HTML, extract m3u8 / mp4 / webm URLs
 *  4. Download the video (HLS segments or direct) and stream to disk
 *  5. Fall back to a launcher .html if video extraction fails
 *
 * Returns { success, bytes, method, error? }
 */
export async function downloadEpisodeVideo(embedUrl, dirHandle, showName, season, episode, onProgress) {
  const label = `${showName} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

  // --- Step 1: Fetch embed page HTML ---
  let html = await fetchEmbedHTML(embedUrl);
  let baseUrl = embedUrl;

  // --- Step 2: Follow nested iframes (up to 2 hops) ---
  if (html) {
    for (let hop = 0; hop < 2; hop++) {
      const urls = extractVideoURLs(html, baseUrl);
      const iframes = urls.filter(u => !isHLS(u) && !/\.(mp4|webm|mkv)$/i.test(u));
      let found = false;
      for (const iframeUrl of iframes.slice(0, 2)) {
        const nested = await fetchEmbedHTML(iframeUrl);
        if (nested) { html = nested; baseUrl = iframeUrl; found = true; break; }
      }
      if (!found) break;
    }
  }

  // --- Step 3: Extract video source URLs ---
  let videoURLs = html ? extractVideoURLs(html, baseUrl) : [];

  // --- Step 4: Try downloading the video ---
  for (const vUrl of videoURLs) {
    try {
      if (isHLS(vUrl)) {
        // HLS download → .ts file
        const { writable } = await prepareEpisodeDir(dirHandle, showName, season, episode, 'ts');
        const bytes = await downloadHLS(vUrl, writable, (dl, total, done) => {
          if (onProgress) onProgress(dl, `HLS ${done}/${total} segs`);
        });
        await writable.close();
        return { success: true, bytes, method: 'hls' };
      }

      if (/\.(mp4|webm|mkv)$/i.test(vUrl)) {
        const ext = (vUrl.match(/\.(mp4|webm|mkv)/i) || ['mp4'])[1];
        const { writable } = await prepareEpisodeDir(dirHandle, showName, season, episode, ext);
        const bytes = await streamToFile(vUrl, writable, (dl) => {
          if (onProgress) onProgress(dl, 'Downloading video');
        });
        await writable.close();
        return { success: true, bytes, method: 'direct' };
      }
    } catch {
      // Try next URL
      continue;
    }
  }

  // --- Step 5: Fallback — save launcher HTML ---
  const launcher = makeLauncherHTML(showName, season, episode, embedUrl);
  try {
    const safe = showName.replace(/[/\\?%*:|"<>]/g, '-');
    const showDir = await dirHandle.getDirectoryHandle(safe, { create: true });
    const sDir = await showDir.getDirectoryHandle(`Season ${String(season).padStart(2, '0')}`, { create: true });
    const fh = await sDir.getFileHandle(`Episode ${String(episode).padStart(2, '0')}.html`, { create: true });
    const w = await fh.createWritable();
    await w.write(launcher);
    await w.close();
    return { success: true, bytes: launcher.length, method: 'launcher' };
  } catch {
    return { success: false, bytes: 0, method: 'none', error: 'CORS blocked — could not extract video URL' };
  }
}

/* ================================================================ */
/*  Launcher HTML fallback                                            */
/* ================================================================ */

export function makeLauncherHTML(showName, season, episode, url) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${showName} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;overflow:hidden}iframe{width:100vw;height:100vh;border:none}</style>
</head>
<body>
<iframe src="${url}" allowfullscreen allow="autoplay;encrypted-media;picture-in-picture"></iframe>
</body>
</html>`;
}
