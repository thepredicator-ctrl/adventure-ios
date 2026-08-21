export const SHOWS = [
  {
    id: 'tt1305826',
    name: 'Adventure Time',
    shortName: 'Adventure Time',
    icon: 'AT',
    color: '#ffdd00',
    seasons: [26, 26, 26, 26, 52, 43, 26, 27, 14, 13]
  },
  {
    id: 'tt8697554',
    name: 'Cupcake & Dino: General Services',
    shortName: 'Cupcake & Dino',
    icon: 'CD',
    color: '#ff66cc',
    seasons: [13, 13]
  },
  {
    id: 'tt1578902',
    name: 'The Amazing World of Gumball',
    shortName: 'Gumball',
    icon: 'GB',
    color: '#00d9ff',
    seasons: [36, 40, 40, 40, 40, 44]
  },
  {
    id: 'tt1710308',
    name: 'Regular Show',
    shortName: 'Regular Show',
    icon: 'RS',
    color: '#00ff88',
    seasons: [12, 28, 40, 40, 40, 31, 39, 31]
  },
  {
    id: 'tt1865718',
    name: 'Gravity Falls',
    shortName: 'Gravity Falls',
    icon: 'GF',
    color: '#b877ff',
    seasons: [20, 20]
  },
  {
    id: 'tt3061046',
    name: 'Steven Universe',
    shortName: 'Steven Universe',
    icon: 'SU',
    color: '#ff3e88',
    seasons: [52, 26, 25, 25, 32]
  },
  {
    id: 'tt14878888',
    name: 'Kiff',
    shortName: 'Kiff',
    icon: 'KF',
    color: '#ffaa00',
    seasons: [30, 15]
  },
  {
    id: 'tt0219295',
    name: 'SpongeBob SquarePants',
    shortName: 'SpongeBob',
    icon: 'SB',
    color: '#ffe135',
    seasons: [20, 20, 20, 20, 20, 20, 26, 26, 26, 26, 26, 26, 22, 26]
  },
  {
    // Mushoku Tensei: Jobless Reincarnation — exposed under the alias "Adventure Time Two",
    // surfacing only Season 3 (27 episodes across two cours). seasonOffset shifts the
    // single internal season entry so it both displays as "S03" to the user and is sent
    // to upstream embed servers as season 3.
    id: 'tt13293588',
    name: 'Adventure Time Two',
    shortName: 'Adventure Time II',
    icon: 'A2',
    color: '#ffffff',
    seasons: [27],
    seasonOffset: 2
  }
];
