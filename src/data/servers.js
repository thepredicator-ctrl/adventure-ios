// Embed server registry with quality/stability tiers.
//
// qualityTier: 1 = best (1080p+, stable), 2 = good (720p-1080p), 3 = backup
// stability:  0.0–1.0 historical uptime estimate

export const SERVERS = {
  1:  { id: 1,  name: 'VIDSRC.IN',    qualityTier: 1, stability: 0.90, build: (id, s, e) => `https://vidsrc.in/embed/tv/${id}/${s}/${e}` },
  2:  { id: 2,  name: 'VIDSRC.ME',    qualityTier: 1, stability: 0.85, build: (id, s, e) => `https://vidsrc.me/embed/${id}/${s}/${e}` },
  3:  { id: 3,  name: 'VIDSRC.IO',    qualityTier: 2, stability: 0.80, build: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}` },
  4:  { id: 4,  name: 'VIDSRC.IR',    qualityTier: 2, stability: 0.75, build: (id, s, e) => `https://vidsrc.ir/embed/tv/${id}/${s}/${e}` },
  5:  { id: 5,  name: 'VIDSRC.TW',    qualityTier: 2, stability: 0.70, build: (id, s, e) => `https://vidsrc.tw/embed/tv/${id}/${s}/${e}` },
  6:  { id: 6,  name: 'VIDSRC2.RU',   qualityTier: 3, stability: 0.60, build: (id, s, e) => `https://vidsrc2.ru/embed/tv/${id}/${s}/${e}` },
  7:  { id: 7,  name: 'VIDSRC-ME.RU', qualityTier: 3, stability: 0.55, build: (id, s, e) => `https://vidsrc-me.ru/embed/${id}/${s}/${e}` },
  8:  { id: 8,  name: 'VIDSRCME.RU',  qualityTier: 3, stability: 0.50, build: (id, s, e) => `https://vidsrcme.ru/embed/${id}/${s}/${e}` },
  9:  { id: 9,  name: 'VIDSRCME.SU',  qualityTier: 3, stability: 0.45, build: (id, s, e) => `https://vidsrcme.su/embed/${id}/${s}/${e}` },
  10: { id: 10, name: 'VIDCORE',      qualityTier: 1, stability: 0.88, build: (id, s, e) => `https://vidcore.org/embed/tv/${id}/${s}/${e}` },
  11: { id: 11, name: 'SUPEREMBED',   qualityTier: 1, stability: 0.82, build: (id, s, e) => `https://www.superembed.stream/?video_id=${id}&tv=1&s=${s}&e=${e}` },
  12: { id: 12, name: '2EMBED.ORG',  qualityTier: 2, stability: 0.70, build: (id, s, e) => `https://www.2embed.org/embedtv/${id}&s=${s}&e=${e}` },
  13: { id: 13, name: '2EMBED.CC',   qualityTier: 2, stability: 0.65, build: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  14: { id: 14, name: 'FSAPI',        qualityTier: 3, stability: 0.50, build: (id, s, e) => `https://fsapi.xyz/tv/imdb/${id}/${s}/${e}` },
};

export const SERVER_LIST = Object.values(SERVERS);
