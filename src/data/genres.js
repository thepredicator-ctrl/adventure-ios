// Genre metadata for shows — used for filtering, recommendations, and Adventure Mode
export const GENRES = [
  { id: 'comedy',       name: 'Comedy',       icon: 'CM' },
  { id: 'adventure',    name: 'Adventure',    icon: 'AV' },
  { id: 'fantasy',      name: 'Fantasy',      icon: 'FN' },
  { id: 'sci-fi',       name: 'Sci-Fi',       icon: 'SF' },
  { id: 'mystery',      name: 'Mystery',      icon: 'MY' },
  { id: 'action',       name: 'Action',       icon: 'AC' },
  { id: 'horror',       name: 'Horror',       icon: 'HR' },
  { id: 'drama',        name: 'Drama',        icon: 'DR' },
  { id: 'slice-of-life',name: 'Slice of Life', icon: 'SL' },
  { id: 'animation',    name: 'Animation',    icon: 'AN' },
];

// Show-to-genre mapping
export const SHOW_GENRES = {
  'tt1305826':  ['comedy', 'adventure', 'fantasy', 'animation'],       // Adventure Time
  'tt8697554':  ['comedy', 'action', 'animation'],                   // Cupcake & Dino
  'tt1578902': ['comedy', 'adventure', 'animation'],                // Gumball
  'tt1710308': ['comedy', 'adventure', 'sci-fi', 'animation'],      // Regular Show
  'tt1865718': ['comedy', 'mystery', 'adventure', 'animation'],     // Gravity Falls
  'tt3061046': ['adventure', 'fantasy', 'drama', 'animation'],      // Steven Universe
  'tt14878888': ['comedy', 'adventure', 'animation'],                // Kiff
  'tt0219295': ['comedy', 'slice-of-life', 'animation'],            // SpongeBob
  'tt13293588': ['fantasy', 'adventure', 'drama', 'animation'],      // AT Two (Mushoku Tensei)
};

// Mood mappings for Adventure Mode
export const MOODS = [
  { id: 'funny',     name: 'FUNNY',         genres: ['comedy', 'slice-of-life'] },
  { id: 'epic',      name: 'EPIC',          genres: ['adventure', 'action', 'fantasy'] },
  { id: 'mysterious', name: 'MYSTERIOUS',  genres: ['mystery', 'sci-fi'] },
  { id: 'chill',     name: 'CHILL',         genres: ['slice-of-life', 'drama'] },
  { id: 'intense',   name: 'INTENSE',       genres: ['action', 'horror', 'drama'] },
  { id: 'wholesome', name: 'WHOLESOME',     genres: ['comedy', 'fantasy', 'animation'] },
  { id: 'random',    name: 'RANDOM',        genres: [] },
];
