// Comprehensive achievement system
// Categories: watching, completion, social, time, exploration

export const ACHIEVEMENT_CATEGORIES = {
  watching:   { label: 'WATCHING',   color: '#ffffff' },
  completion: { label: 'COMPLETION', color: '#a0a0a0' },
  time:       { label: 'TIME',       color: '#707070' },
  exploration:{ label: 'EXPLORATION',color: '#505050' },
  hidden:     { label: 'CLASSIFIED', color: '#303030' },
};

export const ACHIEVEMENTS = [
  // ---- Watching milestones ----
  { id: 'first_ep',     cat: 'watching',   icon: '01', name: 'FIRST FRAME',         desc: 'Watch your first episode',                        check: (s) => s.totalWatched >= 1,    progress: (s) => Math.min(s.totalWatched, 1) },
  { id: 'binge_10',     cat: 'watching',   icon: '10', name: 'TEN DOWN',            desc: 'Watch 10 episodes',                               check: (s) => s.totalWatched >= 10,   progress: (s) => Math.min(s.totalWatched, 10) },
  { id: 'binge_25',     cat: 'watching',   icon: '25', name: 'QUARTER CENTURY',     desc: 'Watch 25 episodes',                               check: (s) => s.totalWatched >= 25,   progress: (s) => Math.min(s.totalWatched, 25) },
  { id: 'binge_50',     cat: 'watching',   icon: '50', name: 'HALF HUNDRED',        desc: 'Watch 50 episodes',                               check: (s) => s.totalWatched >= 50,   progress: (s) => Math.min(s.totalWatched, 50) },
  { id: 'binge_100',    cat: 'watching',   icon: '00', name: 'TRIPLE DIGITS',       desc: 'Watch 100 episodes',                              check: (s) => s.totalWatched >= 100,  progress: (s) => Math.min(s.totalWatched, 100) },
  { id: 'binge_200',    cat: 'watching',   icon: '2H', name: 'DOUBLE CENTURY',      desc: 'Watch 200 episodes',                              check: (s) => s.totalWatched >= 200,  progress: (s) => Math.min(s.totalWatched, 200) },
  { id: 'binge_500',    cat: 'watching',   icon: '5H', name: 'MARATHON RUNNER',     desc: 'Watch 500 episodes',                              check: (s) => s.totalWatched >= 500,  progress: (s) => Math.min(s.totalWatched, 500) },

  // ---- Completion ----
  { id: 'season_done',  cat: 'completion', icon: 'S1', name: 'SEASON COMPLETE',     desc: 'Complete an entire season',                        check: (s) => s.seasonsCompleted >= 1, progress: (s) => Math.min(s.seasonsCompleted, 1) },
  { id: 'seasons_5',    cat: 'completion', icon: 'S5', name: 'FIVE SEASONS',        desc: 'Complete 5 seasons total',                        check: (s) => s.seasonsCompleted >= 5, progress: (s) => Math.min(s.seasonsCompleted, 5) },
  { id: 'show_done',    cat: 'completion', icon: 'AL', name: 'FULL ADVENTURE',      desc: 'Complete an entire show',                          check: (s) => s.showsCompleted >= 1,   progress: (s) => Math.min(s.showsCompleted, 1) },
  { id: 'shows_3',      cat: 'completion', icon: '3S', name: 'TRIPLE COMPLETION',   desc: 'Complete 3 entire shows',                         check: (s) => s.showsCompleted >= 3,   progress: (s) => Math.min(s.showsCompleted, 3) },
  { id: 'all_shows',    cat: 'completion', icon: '7S', name: 'THE COLLECTOR',       desc: 'Complete all shows',                              check: (s) => s.showsCompleted >= 7,   progress: (s) => Math.min(s.showsCompleted, 7) },
  { id: 'half_lib',    cat: 'completion', icon: '50', name: 'HALF THE LIBRARY',    desc: 'Watch 50% of all episodes',                      check: (s) => s.completionPct >= 50,   progress: (s) => Math.min(Math.floor(s.completionPct), 100) },
  { id: 'full_lib',    cat: 'completion', icon: '00', name: 'FULL COVERAGE',       desc: 'Watch every single episode',                      check: (s) => s.completionPct >= 100,  progress: (s) => Math.min(Math.floor(s.completionPct), 100) },

  // ---- Time-based ----
  { id: 'hour_1',      cat: 'time',       icon: '1H', name: 'FIRST HOUR',          desc: 'Accumulate 1 hour of watch time',                 check: (s) => s.watchHours >= 1,      progress: (s) => Math.min(s.watchHours, 1) },
  { id: 'hour_10',     cat: 'time',       icon: '10', name: 'TEN HOURS',           desc: 'Accumulate 10 hours of watch time',                check: (s) => s.watchHours >= 10,     progress: (s) => Math.min(s.watchHours, 10) },
  { id: 'hour_50',     cat: 'time',       icon: '50', name: 'FIFTY HOURS',         desc: 'Accumulate 50 hours of watch time',                check: (s) => s.watchHours >= 50,     progress: (s) => Math.min(s.watchHours, 50) },
  { id: 'hour_100',    cat: 'time',       icon: '00', name: 'CENTURION',           desc: 'Accumulate 100 hours of watch time',               check: (s) => s.watchHours >= 100,    progress: (s) => Math.min(s.watchHours, 100) },
  { id: 'night_owl',   cat: 'time',       icon: 'NO', name: 'NIGHT OWL',           desc: 'Watch between midnight and 5 AM',                  check: (s) => s.nightOwl,             progress: (s) => s.nightOwl ? 1 : 0 },
  { id: 'early_bird',  cat: 'time',       icon: 'EB', name: 'EARLY BIRD',          desc: 'Watch before 7 AM',                               check: (s) => s.earlyBird,            progress: (s) => s.earlyBird ? 1 : 0 },
  { id: 'streak_3',    cat: 'time',       icon: '3D', name: 'THREE-DAY STREAK',   desc: 'Watch on 3 consecutive days',                     check: (s) => s.streak >= 3,           progress: (s) => Math.min(s.streak, 3) },
  { id: 'streak_7',    cat: 'time',       icon: '7D', name: 'WEEK WARRIOR',        desc: 'Watch on 7 consecutive days',                     check: (s) => s.streak >= 7,           progress: (s) => Math.min(s.streak, 7) },
  { id: 'streak_30',   cat: 'time',       icon: '30', name: 'MONTHLY GRIND',       desc: 'Watch on 30 consecutive days',                    check: (s) => s.streak >= 30,          progress: (s) => Math.min(s.streak, 30) },

  // ---- Exploration ----
  { id: 'server_hop',   cat: 'exploration', icon: '4x', name: 'SERVER HOPPER',    desc: 'Try 4 different servers',                          check: (s) => s.serversTried >= 4,    progress: (s) => Math.min(s.serversTried, 4) },
  { id: 'all_servers', cat: 'exploration', icon: 'SV', name: 'FULL SCAN',         desc: 'Try every available server',                      check: (s) => s.serversTried >= 14,   progress: (s) => Math.min(s.serversTried, 14) },
  { id: 'theme_switch', cat: 'exploration', icon: '3T', name: 'STYLE CHAMELEON',   desc: 'Try 3 different themes',                           check: (s) => s.themesTried >= 3,     progress: (s) => Math.min(s.themesTried, 3) },
  { id: 'all_themes',  cat: 'exploration', icon: 'AT', name: 'THEME MASTER',       desc: 'Try every theme',                                  check: (s) => s.themesTried >= 6,     progress: (s) => Math.min(s.themesTried, 6) },
  { id: 'adventure_1', cat: 'exploration', icon: 'AM', name: 'FIRST ADVENTURE',    desc: 'Generate your first Adventure Mode route',         check: (s) => s.adventuresGenerated >= 1, progress: (s) => Math.min(s.adventuresGenerated, 1) },
  { id: 'adventure_10',cat: 'exploration', icon: 'A0', name: 'ADVENTURER',         desc: 'Generate 10 adventures',                           check: (s) => s.adventuresGenerated >= 10, progress: (s) => Math.min(s.adventuresGenerated, 10) },
  { id: 'favorite_1',  cat: 'exploration', icon: 'F1', name: 'FIRST FAVORITE',     desc: 'Add an episode to favorites',                     check: (s) => s.favoriteCount >= 1,   progress: (s) => Math.min(s.favoriteCount, 1) },
  { id: 'favorite_20', cat: 'exploration', icon: 'F0', name: 'CURATOR',             desc: 'Add 20 episodes to favorites',                    check: (s) => s.favoriteCount >= 20,  progress: (s) => Math.min(s.favoriteCount, 20) },
  { id: 'collection',  cat: 'exploration', icon: 'CL', name: 'COLLECTOR',           desc: 'Create a custom collection',                      check: (s) => s.collectionCount >= 1,  progress: (s) => Math.min(s.collectionCount, 1) },

  // ---- Hidden / rare ----
  { id: 'hidden_speed', cat: 'hidden',    icon: 'SP', name: 'SPEED DEMON',         desc: 'Set playback speed above 2x',                      check: (s) => s.speedAbove2x,         progress: (s) => s.speedAbove2x ? 1 : 0, hidden: true },
  { id: 'hidden_all',  cat: 'hidden',     icon: '**', name: 'COMPLETIONIST+',      desc: 'Complete all shows and find all hidden achievements', check: (s) => s.hiddenFound,          progress: (s) => s.hiddenFound ? 1 : 0, hidden: true },
];

export const DEFAULT_ACHIEVEMENT_STATS = {
  totalWatched: 0,
  seasonsCompleted: 0,
  showsCompleted: 0,
  completionPct: 0,
  watchHours: 0,
  nightOwl: false,
  earlyBird: false,
  streak: 0,
  serversTried: 0,
  themesTried: 0,
  adventuresGenerated: 0,
  favoriteCount: 0,
  collectionCount: 0,
  speedAbove2x: false,
  hiddenFound: false,
};
