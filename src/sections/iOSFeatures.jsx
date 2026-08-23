import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SHOWS } from '../data/shows.js';
import { lsGet, lsSet } from '../lib/storage.js';

const TABS = ['Widgets', 'Dynamic Island', 'Siri & Intents', 'Deep Links', 'Handoff', 'Keyboard & Gamepad', 'iPad', 'PiP & AirPlay'];

export default function iOSFeatures() {
  const { global, stats, showToast } = usePlayer();
  const [tab, setTab] = useState('Widgets');
  const [widgetMode, setWidgetMode] = useState('dark');
  const [widgetSize, setWidgetSize] = useState('expanded');
  const [deepLinkInput, setDeepLinkInput] = useState('');
  const [parsedLink, setParsedLink] = useState(null);
  const [airplayDevice, setAirplayDevice] = useState(null);
  const show = SHOWS[global.showIndex] || SHOWS[0];
  const shortcuts = lsGet('shortcuts', {});
  const progress = stats?.watched || 0;

  const testDeepLink = () => {
    try {
      const url = new URL(deepLinkInput);
      const parts = url.pathname.split('/').filter(Boolean);
      setParsedLink({ scheme: url.protocol, host: url.host, path: url.pathname, params: Object.fromEntries(url.searchParams), segments: parts });
    } catch { setParsedLink({ error: 'Invalid URL' }); }
  };

  // Widgets tab
  const renderWidgets = () => (
    <div className='space-y-4'>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Home Screen Widget</div>
        <div className='flex gap-2 mb-4'>
          {[['dark','Dark'],['light','Light']].map(([v,l]) => (
            <button key={v} onClick={() => setWidgetMode(v)}
              className={widgetMode === v ? 'rounded-lg bg-white text-black px-3 py-1.5 text-xs font-medium' : 'rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'}>{l}</button>
          ))}
          <span className='text-white/20 self-center mx-1'>|</span>
          {[['compact','Compact'],['expanded','Expanded']].map(([v,l]) => (
            <button key={v} onClick={() => setWidgetSize(v)}
              className={widgetSize === v ? 'rounded-lg bg-white text-black px-3 py-1.5 text-xs font-medium' : 'rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'}>{l}</button>
          ))}
        </div>
        {/* Widget preview - Home Screen */}
        <div className={`mx-auto rounded-3xl p-5 border transition-colors ${widgetMode === 'dark' ? 'bg-[#1c1c1e] border-white/5' : 'bg-white border-black/5'}`} style={{ maxWidth: widgetSize === 'compact' ? 170 : 360 }}>
          <div className='flex items-center gap-3'>
            <div className='flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold' style={{ backgroundColor: show.color + '30', color: show.color }}>{show.icon}</div>
            <div className='min-w-0'>
              <div className={`text-sm font-medium truncate ${widgetMode === 'dark' ? 'text-white' : 'text-black'}`}>{show.shortName}</div>
              {widgetSize === 'expanded' && (
                <div className={`text-xs ${widgetMode === 'dark' ? 'text-white/50' : 'text-black/40'}`}>S{String(global.season).padStart(2,'0')}E{String(global.episode).padStart(2,'0')}</div>
              )}
            </div>
            {widgetSize === 'expanded' && <div className='ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/10'><span className='text-xs'>▶</span></div>}
          </div>
          {widgetSize === 'expanded' && (
            <div className='mt-3'>
              <div className={`h-1 rounded-full overflow-hidden ${widgetMode === 'dark' ? 'bg-white/10' : 'bg-black/10'}`}>
                <div className='h-full rounded-full' style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: show.color }} />
              </div>
              <div className='flex justify-between mt-1'><span className={`text-[10px] ${widgetMode === 'dark' ? 'text-white/30' : 'text-black/30'}`}>Next: S{String(global.season).padStart(2,'0')}E{String(global.episode + 1).padStart(2,'0')}</span></div>
            </div>
          )}
        </div>
        <div className='mt-3 text-xs text-white/30'>Requires iOS 17+</div>
      </div>
      {/* Lock Screen widget preview */}
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Lock Screen Widget</div>
        <div className='mx-auto flex items-center gap-3 rounded-2xl bg-[#1c1c1e] border border-white/5 px-4 py-3' style={{ maxWidth: 280 }}>
          <div className='relative h-10 w-10 shrink-0'>
            <svg viewBox='0 0 40 40' className='h-10 w-10 -rotate-90'>
              <circle cx='20' cy='20' r='16' fill='none' stroke='rgba(255,255,255,0.1)' strokeWidth='3' />
              <circle cx='20' cy='20' r='16' fill='none' stroke={show.color} strokeWidth='3' strokeDasharray={`${Math.min(progress, 100) / 100 * 100.5} 100.5`} strokeLinecap='round' />
            </svg>
            <div className='absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white'>{Math.min(progress, 100)}%</div>
          </div>
          <div className='min-w-0'>
            <div className='text-xs font-medium text-white truncate'>{show.shortName}</div>
            <div className='text-[10px] text-white/40'>Now playing</div>
          </div>
        </div>
        <div className='mt-3 text-xs text-white/30'>Requires iOS 16+</div>
      </div>
    </div>
  );

  // Dynamic Island tab
  const renderDynamicIsland = () => (
    <div className='space-y-4'>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Dynamic Island Preview</div>
        <div className='flex justify-center py-8'>
          {/* Dynamic Island CSS mockup - pill shape */}
          <div className='relative flex items-center gap-3 rounded-full bg-black px-5 py-2.5 min-w-[200px] shadow-lg shadow-black/50 border border-white/10'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0' style={{ backgroundColor: show.color + '30', color: show.color }}>{show.icon}</div>
            <div className='min-w-0 flex-1'>
              <div className='text-xs font-medium text-white truncate'>Now Playing</div>
              <div className='text-[10px] text-white/40'>{show.shortName} S{String(global.season).padStart(2,'0')}E{String(global.episode).padStart(2,'0')}</div>
            </div>
            <div className='h-1.5 w-8 rounded-full bg-white/10 overflow-hidden shrink-0'>
              <div className='h-full rounded-full' style={{ width: '35%', backgroundColor: show.color }} />
            </div>
          </div>
        </div>
      </div>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Live Activity Configuration</div>
        <div className='space-y-3'>
          {[
            { label: 'Show Episode Progress', desc: 'Display progress bar in Live Activity' },
            { label: 'Show Remaining Time', desc: 'Display time remaining in current episode' },
            { label: 'Show Artwork', desc: 'Display show artwork thumbnail' },
          ].map(item => (
            <div key={item.label} className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
              <div><div className='text-sm text-white'>{item.label}</div><div className='text-xs text-white/40'>{item.desc}</div></div>
              <button onClick={() => showToast('Toggled')}
                className='relative h-6 w-10 rounded-full transition bg-white/15'>
                <span className='absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-all' />
              </button>
            </div>
          ))}
        </div>
        <div className='mt-3 text-xs text-white/30'>Requires iPhone 14 Pro+ / iOS 16.1+</div>
      </div>
    </div>
  );

  // Siri & Intents tab
  const renderSiri = () => {
    const commands = [
      { phrase: `Play ${show.shortName}`, desc: 'Start playing the specified show' },
      { phrase: 'Resume watching', desc: 'Continue from where you left off' },
      { phrase: 'What should I watch', desc: 'Get AI-powered recommendations' },
      { phrase: 'Show my stats', desc: 'Display viewing statistics' },
      { phrase: 'Open Favorites', desc: 'Navigate to favorites section' },
      { phrase: 'Next episode', desc: 'Skip to the next episode' },
    ];
    return (
      <div className='space-y-4'>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Siri Commands</div>
          <div className='space-y-2'>
            {commands.map(c => (
              <div key={c.phrase} className='flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
                <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs'>S</div>
                <div><div className='text-sm text-white'>"{c.phrase}"</div><div className='text-xs text-white/40'>{c.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Registered App Intents</div>
          <div className='space-y-1 font-mono text-xs text-white/60'>
            <div>PlayShowIntent</div>
            <div>ResumePlaybackIntent</div>
            <div>GetRecommendationsIntent</div>
            <div>ToggleFavoriteIntent</div>
            <div>OpenSectionIntent</div>
          </div>
        </div>
      </div>
    );
  };

  // Deep Links tab
  const renderDeepLinks = () => (
    <div className='space-y-4'>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Supported URL Schemes</div>
        <div className='space-y-2 font-mono text-xs'>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5'><span className='text-white/40'>Show:</span> <span className='text-white'>adventure://show/{'{id}'}/{'{season}'}/{'{episode}'}</span></div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5'><span className='text-white/40'>Section:</span> <span className='text-white'>adventure://section/{'{name}'}</span></div>
          <div className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5'><span className='text-white/40'>Search:</span> <span className='text-white'>adventure://search?query={'{q}'}</span></div>
        </div>
      </div>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Deep Link Tester</div>
        <div className='flex gap-2'>
          <input value={deepLinkInput} onChange={e => setDeepLinkInput(e.target.value)} placeholder='adventure://show/tt1305826/1/1'
            className='w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30' />
          <button onClick={testDeepLink} className='rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors shrink-0'>Test</button>
        </div>
        {parsedLink && (
          <div className='mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 font-mono text-xs text-white/60 space-y-1'>
            {parsedLink.error ? <div className='text-red-400'>{parsedLink.error}</div> : <>
              <div>Scheme: <span className='text-white'>{parsedLink.scheme}</span></div>
              <div>Path: <span className='text-white'>{parsedLink.path}</span></div>
              <div>Segments: <span className='text-white'>[{parsedLink.segments.join(', ')}]</span></div>
              {Object.keys(parsedLink.params).length > 0 && <div>Params: <span className='text-white'>{JSON.stringify(parsedLink.params)}</span></div>}
            </>}
          </div>
        )}
      </div>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Share Sheet Formats</div>
        <div className='space-y-1 text-xs text-white/60'>
          <div>• Text: "Watch [show] on Adventure"</div>
          <div>• URL: adventure://show/{show.id}/1/1</div>
          <div>• JSON: {`{show, season, episode, timestamp}`}</div>
        </div>
      </div>
    </div>
  );

  // Handoff tab
  const renderHandoff = () => (
    <div className='space-y-4'>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Handoff Status</div>
        <div className='flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
          <div className='h-3 w-3 rounded-full bg-green-400 animate-pulse' />
          <div><div className='text-sm text-white'>Active</div><div className='text-xs text-white/40'>{typeof Capacitor !== 'undefined' ? 'Native Handoff supported' : 'Web mode — simulated'}</div></div>
        </div>
      </div>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Continue on Another Device</div>
        <div className='text-sm text-white/60 mb-3'>When watching on one Apple device, you can seamlessly continue on another (iPhone, iPad, Mac) using Handoff.</div>
        <div className='space-y-2'>
          {[
            { type: 'Watching', desc: 'Current playback position and show state' },
            { type: 'Browsing', desc: 'Current section and scroll position' },
          ].map(h => (
            <div key={h.type} className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
              <div><div className='text-sm text-white'>{h.type}</div><div className='text-xs text-white/40'>{h.desc}</div></div>
              <div className='rounded-full bg-green-400/10 px-2.5 py-1 text-[10px] text-green-400'>Enabled</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Keyboard & Gamepad tab
  const renderKeyboard = () => {
    const kb = [
      { key: 'Space', action: 'Play / Pause' }, { key: 'Arrow Right / N', action: 'Next episode' },
      { key: 'Arrow Left / P', action: 'Previous episode' }, { key: 'A', action: 'Toggle Auto Next' },
      { key: 'T', action: 'Cycle theme' }, { key: 'R', action: 'Random episode' },
      { key: 'F', action: 'Favorite episode' }, { key: '1–9', action: 'Switch server' },
      { key: 'S', action: 'Focus search' }, { key: 'Esc', action: 'Close dialogs' },
    ];
    const gp = [
      { btn: 'D-Pad', action: 'Navigate' }, { btn: 'A / Cross', action: 'Select / Play' },
      { btn: 'B / Circle', action: 'Back' }, { btn: 'X / Square', action: 'Favorite' },
      { btn: 'Y / Triangle', action: 'Search' }, { btn: 'LB / RB', action: 'Prev / Next season' },
      { btn: 'Start', action: 'Toggle autoplay' },
    ];
    return (
      <div className='space-y-4'>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>External Keyboard Shortcuts</div>
          <div className='overflow-hidden rounded-xl border border-white/10'>
            {kb.map((s, i) => (
              <div key={s.key} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
                <span className='text-white/70'>{s.action}</span>
                <kbd className='rounded border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-xs text-white/70'>{s.key}</kbd>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Game Controller Mapping</div>
          <div className='overflow-hidden rounded-xl border border-white/10'>
            {gp.map((g, i) => (
              <div key={g.btn} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
                <span className='text-white/70'>{g.action}</span>
                <span className='rounded border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-xs text-white/70'>{g.btn}</span>
              </div>
            ))}
          </div>
          <div className='mt-3 text-xs text-white/40'>Connect via Bluetooth or USB. Supported on iPad and compatible iPhones.</div>
        </div>
      </div>
    );
  };

  // iPad tab
  const renderIPad = () => (
    <div className='space-y-4'>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Stage Manager</div>
        <div className='flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
          <div className='h-3 w-3 rounded-full bg-green-400' />
          <div><div className='text-sm text-white'>Optimized</div><div className='text-xs text-white/40'>Adapts to Stage Manager window sizes</div></div>
        </div>
      </div>
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Multi-Window Support</div>
        <div className='space-y-3'>
          {[
            { label: 'Open Show in New Window', desc: 'Watch a show in a separate window' },
            { label: 'Split View: Player + Episodes', desc: 'Side-by-side player and episode list' },
          ].map(m => (
            <div key={m.label} className='rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
              <div className='text-sm text-white'>{m.label}</div>
              <div className='text-xs text-white/40'>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
      {/* iPad multitasking CSS mockup */}
      <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
        <div className='mb-3 text-sm font-medium text-white'>Split View Preview</div>
        <div className='mx-auto rounded-2xl border border-white/10 bg-[#1c1c1e] overflow-hidden' style={{ maxWidth: 480, height: 220 }}>
          {/* Simulated iPad split view */}
          <div className='flex h-full'>
            {/* Player side - 60% */}
            <div className='w-[60%] border-r border-white/10 flex flex-col items-center justify-center bg-black/40 p-4'>
              <div className='text-[10px] text-white/30 mb-2'>Player</div>
              <div className='w-full flex-1 rounded-lg border border-white/10 bg-black/60 flex items-center justify-center'>
                <div className='text-center'>
                  <div className='text-2xl mb-1' style={{ color: show.color }}>{show.icon}</div>
                  <div className='text-[10px] text-white/50'>{show.shortName} S{String(global.season).padStart(2,'0')}E{String(global.episode).padStart(2,'0')}</div>
                  <div className='mt-2 w-16 h-0.5 rounded-full bg-white/10 mx-auto'><div className='h-full rounded-full' style={{ width: '35%', backgroundColor: show.color }} /></div>
                </div>
              </div>
            </div>
            {/* Episodes side - 40% */}
            <div className='w-[40%] flex flex-col p-3'>
              <div className='text-[10px] text-white/30 mb-2'>Episodes</div>
              <div className='space-y-1.5 flex-1 overflow-hidden'>
                {[1,2,3,4,5].map(ep => (
                  <div key={ep} className={`rounded-lg px-2 py-1.5 text-[9px] border ${ep === global.episode ? 'border-white/20 bg-white/5 text-white' : 'border-white/5 bg-white/[0.02] text-white/40'}`}>
                    E{String(ep).padStart(2,'0')} {ep === global.episode && <span className='text-white/30 ml-1'>▶</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // PiP & AirPlay tab
  const renderPiP = () => {
    const simulatedDevices = ['Apple TV — Living Room', 'HomePod Mini', 'MacBook Pro'];
    return (
      <div className='space-y-4'>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>Picture-in-Picture</div>
          <div className='space-y-3'>
            {[
              { label: 'Auto-enable PiP', desc: 'Automatically enter PiP when leaving the app' },
              { label: 'Start PiP on Background', desc: 'Enter PiP immediately when app goes to background' },
            ].map(item => (
              <div key={item.label} className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3'>
                <div><div className='text-sm text-white'>{item.label}</div><div className='text-xs text-white/40'>{item.desc}</div></div>
                <button onClick={() => showToast('Toggled')}
                  className='relative h-6 w-10 rounded-full transition bg-white/15'>
                  <span className='absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-all' />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='text-sm font-medium text-white'>AirPlay</div>
            <div className={`flex items-center gap-1.5 text-xs ${airplayDevice ? 'text-green-400' : 'text-white/40'}`}>
              <div className={`h-2 w-2 rounded-full ${airplayDevice ? 'bg-green-400' : 'bg-white/20'}`} />
              {airplayDevice ? 'Connected' : 'Not connected'}
            </div>
          </div>
          {airplayDevice ? (
            <div className='rounded-lg border border-green-400/20 bg-green-500/5 px-4 py-3'>
              <div className='text-sm text-green-200'>{airplayDevice}</div>
              <button onClick={() => setAirplayDevice(null)} className='mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/20 transition-colors'>Disconnect</button>
            </div>
          ) : (
            <div className='space-y-2'>
              <div className='text-xs text-white/40'>Available devices (simulated):</div>
              {simulatedDevices.map(d => (
                <button key={d} onClick={() => { setAirplayDevice(d); showToast(`Connected to ${d}`); }}
                  className='w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-left hover:bg-white/5 transition-colors'>
                  <div className='h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-xs'>📺</div>
                  <span className='text-sm text-white/70'>{d}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
          <div className='mb-3 text-sm font-medium text-white'>External Display</div>
          <div className='text-sm text-white/60'>When connected via AirPlay or HDMI, video plays at the display's native resolution.</div>
          <div className='mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/40'>
            Display: <span className='text-white/60'>{typeof screen !== 'undefined' ? `${screen.width}x${screen.height} @${window.devicePixelRatio || 1}x` : 'N/A'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case 'Widgets': return renderWidgets();
      case 'Dynamic Island': return renderDynamicIsland();
      case 'Siri & Intents': return renderSiri();
      case 'Deep Links': return renderDeepLinks();
      case 'Handoff': return renderHandoff();
      case 'Keyboard & Gamepad': return renderKeyboard();
      case 'iPad': return renderIPad();
      case 'PiP & AirPlay': return renderPiP();
      default: return null;
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-3xl font-semibold tracking-tight'>iOS Features</h2>
        <p className='mt-1 text-white/60'>Widgets, Dynamic Island, Siri, deep links, and more.</p>
      </div>
      <div className='flex gap-1 overflow-x-auto pb-1 no-scrollbar'>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={tab === t ? 'rounded-lg bg-white text-black px-4 py-2 text-sm font-medium whitespace-nowrap' : 'rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors whitespace-nowrap'}>
            {t}
          </button>
        ))}
      </div>
      {renderTab()}
    </div>
  );
}
