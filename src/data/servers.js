export const SERVERS = {
  1: { id: 1, name: 'VIDSRC.IN',      build: (id, s, e) => `https://vidsrc.in/embed/tv/${id}/${s}/${e}` },
  2: { id: 2, name: 'VIDSRC.ME',      build: (id, s, e) => `https://vidsrc.me/embed/${id}/${s}/${e}` },
  3: { id: 3, name: 'VIDSRC.IO',      build: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}` },
  4: { id: 4, name: 'VIDSRC.IR',      build: (id, s, e) => `https://vidsrc.ir/embed/tv/${id}/${s}/${e}` },
  5: { id: 5, name: 'VIDSRC.TW',      build: (id, s, e) => `https://vidsrc.tw/embed/tv/${id}/${s}/${e}` },
  6: { id: 6, name: 'VIDSRC2.RU',     build: (id, s, e) => `https://vidsrc2.ru/embed/tv/${id}/${s}/${e}` },
  7: { id: 7, name: 'VIDSRC-ME.RU',   build: (id, s, e) => `https://vidsrc-me.ru/embed/${id}/${s}/${e}` },
  8: { id: 8, name: 'VIDSRCME.RU',    build: (id, s, e) => `https://vidsrcme.ru/embed/${id}/${s}/${e}` },
  9: { id: 9, name: 'VIDSRCME.SU',    build: (id, s, e) => `https://vidsrcme.su/embed/${id}/${s}/${e}` },
  10: { id: 10, name: 'VIDCORE',        build: (id, s, e) => `https://vidcore.org/embed/tv/${id}/${s}/${e}` },
  11: { id: 11, name: 'SUPEREMBED',     build: (id, s, e) => `https://www.superembed.stream/?video_id=${id}&tv=1&s=${s}&e=${e}` },
  12: { id: 12, name: '2EMBED.ORG',     build: (id, s, e) => `https://www.2embed.org/embedtv/${id}&s=${s}&e=${e}` },
  13: { id: 13, name: '2EMBED.CC',      build: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  14: { id: 14, name: 'FSAPI',          build: (id, s, e) => `https://fsapi.xyz/tv/imdb/${id}/${s}/${e}` },
};

export const SERVER_LIST = Object.values(SERVERS);
