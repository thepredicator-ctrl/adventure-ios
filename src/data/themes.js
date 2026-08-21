// Themes applied to the whole page via data-theme on <html>.
// Black & white palette — five monochrome variants that all share the same
// achromatic identity but vary in contrast / grain / glow.
// Each theme provides accent/text/marker colors for LineSidebar
// plus a Topography palette.
export const THEMES = [
  {
    id: 'noir',
    name: 'NOIR',
    swatch: ['#000000', '#1a1a1a', '#a0a0a0', '#ffffff'],
    sidebar:   { accent: '#ffffff', text: '#c4c4c4', marker: '#5a5a5a' },
    topography: { lowColor: '#000000', midColor: '#4a4a4a', highColor: '#ffffff' }
  },
  {
    id: 'ink',
    name: 'INK',
    swatch: ['#0a0a0a', '#222222', '#888888', '#ededed'],
    sidebar:   { accent: '#ededed', text: '#bdbdbd', marker: '#3d3d3d' },
    topography: { lowColor: '#0a0a0a', midColor: '#3a3a3a', highColor: '#ededed' }
  },
  {
    id: 'ash',
    name: 'ASH',
    swatch: ['#050505', '#1c1c1c', '#9a9a9a', '#e8e8e8'],
    sidebar:   { accent: '#e8e8e8', text: '#c0c0c0', marker: '#4a4a4a' },
    topography: { lowColor: '#050505', midColor: '#323232', highColor: '#e8e8e8' }
  },
  {
    id: 'ghost',
    name: 'GHOST',
    swatch: ['#080808', '#1a1a1a', '#b0b0b0', '#f5f5f5'],
    sidebar:   { accent: '#f5f5f5', text: '#cccccc', marker: '#5c5c5c' },
    topography: { lowColor: '#080808', midColor: '#404040', highColor: '#f5f5f5' }
  },
  {
    id: 'static',
    name: 'STATIC',
    swatch: ['#000000', '#2a2a2a', '#808080', '#dcdcdc'],
    sidebar:   { accent: '#dcdcdc', text: '#b0b0b0', marker: '#454545' },
    topography: { lowColor: '#000000', midColor: '#2a2a2a', highColor: '#dcdcdc' }
  },
  {
    id: 'glass',
    name: 'GLASS',
    glass: true,
    swatch: ['#0a1628', '#1a3050', '#5ac8fa', '#e8f4ff'],
    sidebar:   { accent: '#5ac8fa', text: '#b8dce8', marker: '#1a3050' },
    topography: { lowColor: '#0a1628', midColor: '#1a4a6e', highColor: '#5ac8fa' }
  }
];

export const DEFAULT_THEME_ID = 'noir';
