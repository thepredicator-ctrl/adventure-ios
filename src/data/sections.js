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
      { label: 'Player',          blurb: 'Video player, server picker, speed, gestures, PiP, AirPlay, mini-player.' },
      { label: 'Episodes',        blurb: 'Season tabs, episode grid, search, filter, favorites.' },
      { label: 'Episode Intel',   blurb: 'Episode intelligence: metadata, ratings, watch history, related episodes.' },
      { label: 'Previously On',   blurb: 'Cinematic recaps before you continue watching.' },
      { label: 'Finish Tonight',  blurb: 'Plan your perfect evening with time-budget optimizer.' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    icon: 'LB',
    children: [
      { label: 'Shows',          blurb: 'Show cards with progress, genres, watchlist, filtering.' },
      { label: 'Smart Library',   blurb: 'Smart folders, collections, bulk ops, playlists, and advanced library management.' },
      { label: 'Show Analysis',   blurb: 'Per-show deep analysis: completion, seasons, rewatch stats, ratings.' },
      { label: 'Show Timeline',   blurb: 'Visual timeline of show progress with interactive episode navigation.' },
      { label: 'Smart Rewatch',   blurb: 'Generate rewatch routes by favorites, ratings, arcs, or custom selection.' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: 'ST',
    children: [
      { label: 'Stats',            blurb: 'Watch time, activity graphs, personal records, viewing profile, analytics.' },
      { label: 'Awards',           blurb: '115 achievements with XP, levels, rarity, unlockable themes and effects.' },
      { label: 'Rewatch Heatmap',  blurb: 'Calendar heatmap of viewing activity with streaks and monthly breakdown.' },
      { label: 'Time Capsule',     blurb: 'What you were watching 1, 2, and 3 years ago today.' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'AI',
    children: [
      { label: 'AI Assistant',    blurb: 'Chat, summaries, characters, spoilers, explainer, time fit, decider, and more.' },
      { label: 'Adventure AI',     blurb: 'Natural-language search, recommendations, and AI chat.' },
      { label: 'Adventure Mode',   blurb: 'Generate curated episode routes by mood and preference.' },
      { label: 'AI Model Lab',     blurb: 'AI model diagnostics, testing, capabilities, free model browser.' },
    ],
  },
  {
    id: 'extras',
    label: 'Extras',
    icon: 'EX',
    children: [
      { label: 'Adventure Radio', blurb: 'Continuous randomized episode stream with filters and auto-advance.' },
      { label: 'Watch Together',   blurb: 'Synchronized viewing sessions with chat and sync controls.' },
    ],
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    icon: 'DG',
    children: [
      { label: 'Performance Monitor', blurb: 'Network, storage, playback, system log, timeline, FPS, cache, API and AI stats.' },
      { label: 'Provider Health',      blurb: 'Embed provider diagnostics, latency, error tracking.' },
      { label: 'Terminal',             blurb: 'System interface with real-time library data.' },
    ],
  },
  {
    id: 'config',
    label: 'Config',
    icon: 'CF',
    children: [
      { label: 'iOS Features',      blurb: 'Widgets, Live Activities, Dynamic Island, Siri, deep links, Handoff, iPad.' },
      { label: 'Privacy & Security', blurb: 'Face ID lock, profiles, import/export, encryption, AI memory, data controls.' },
      { label: 'Themes',             blurb: '6 themes, scanline/contour/glass/animation intensity.' },
      { label: 'Settings',           blurb: 'Playback, video BG, profiles, AI config, AI memory, data, dev mode.' },
      { label: 'Shortcuts',          blurb: 'Keyboard, gamepad, and touch gesture reference.' },
      { label: 'Developer',          blurb: 'Diagnostics, storage inspection, feature flags, logs.' },
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
