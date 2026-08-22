// Sidebar section registry — grouped into collapsible categories.
//
// Navigation uses a flat `active` index into FLAT_SECTIONS (preserves backward compat
// with SectionRenderer, CommandPalette, and any code that reads SECTIONS[active]).
// TAB_GROUPS drives the new collapsible sidebar UI.

export const TAB_GROUPS = [
  {
    id: 'mission',
    label: 'Mission Control',
    icon: 'MC',
    children: [
      { label: 'Mission Control', blurb: 'Live system console: mission, progress, AI status, provider health, storage.' },
    ],
  },
  {
    id: 'watch',
    label: 'Watch',
    icon: 'PL',
    children: [
      { label: 'Player',        blurb: 'Video player, server picker, speed, favorites, continue rail.' },
      { label: 'Episodes',      blurb: 'Season tabs, episode grid, search, filter, favorites.' },
      { label: 'Episode Intel', blurb: 'Episode intelligence: metadata, ratings, watch history, related episodes.' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    icon: 'LB',
    children: [
      { label: 'Shows',          blurb: 'Show cards with progress, genres, watchlist, filtering.' },
      { label: 'Show Analysis',  blurb: 'Per-show deep analysis: completion, seasons, rewatch stats, ratings.' },
      { label: 'Show Timeline',  blurb: 'Visual timeline of show progress with interactive episode navigation.' },
      { label: 'Smart Rewatch',  blurb: 'Generate rewatch routes by favorites, ratings, arcs, or custom selection.' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: 'ST',
    children: [
      { label: 'Stats',  blurb: 'Watch time, activity graphs, personal records, analytics.' },
      { label: 'Awards', blurb: '30+ achievements with categories, progress, classified.' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'AI',
    children: [
      { label: 'Adventure AI',   blurb: 'Natural-language search, recommendations, and AI chat.' },
      { label: 'Adventure Mode', blurb: 'Generate curated episode routes by mood and preference.' },
      { label: 'AI Model Lab',   blurb: 'AI model diagnostics, testing, capabilities, free model browser.' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: 'SY',
    children: [
      { label: 'Provider Health', blurb: 'Embed provider diagnostics, latency, error tracking.' },
      { label: 'Themes',          blurb: '6 themes, scanline/contour/glass/animation intensity.' },
      { label: 'Settings',        blurb: 'Playback, video BG, profiles, AI config, AI memory, data, dev mode.' },
      { label: 'Shortcuts',       blurb: 'Keyboard, gamepad, and touch gesture reference.' },
      { label: 'Developer',       blurb: 'Diagnostics, storage inspection, feature flags, logs.' },
      { label: 'Terminal',        blurb: 'System interface with real-time library data.' },
    ],
  },
];

// Flat list derived from groups — preserves index-based navigation.
export const SECTIONS = TAB_GROUPS.flatMap(g => g.children);

// Helper: get flat index for a section label.
export function getSectionIndex(label) {
  return SECTIONS.findIndex(s => s.label === label);
}

// Helper: get the group that contains a given flat index.
export function getGroupForIndex(flatIndex) {
  let offset = 0;
  for (const group of TAB_GROUPS) {
    if (flatIndex < offset + group.children.length) return group;
    offset += group.children.length;
  }
  return TAB_GROUPS[0];
}

// Default expanded groups (all expanded on first load).
export const DEFAULT_EXPANDED = TAB_GROUPS.reduce((acc, g) => { acc[g.id] = true; return acc; }, {});
