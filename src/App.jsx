import { useState, useCallback, useEffect, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import SidebarLayout from './components/SidebarLayout.jsx';
import SectionRenderer from './components/SectionRenderer.jsx';
import Topography from './components/Topography.jsx';
import Toast from './components/Toast.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import OfflineDownloadScreen from './components/OfflineDownloadScreen.jsx';
import VideoBackground from './components/VideoBackground.jsx';
import AdShield from './components/AdShield.jsx';
import DailyTransmission from './components/DailyTransmission.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { SECTIONS } from './data/sections.js';
import { THEMES } from './data/themes.js';

function AppShell() {
  const [active, setActive] = useState(0);
  const [booted, setBooted] = useState(false);
  const [offlineDone, setOfflineDone] = useState(false);
  const [showTransmission, setShowTransmission] = useState(false);
  const [transmissionDone, setTransmissionDone] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { global } = usePlayer();
  const theme = THEMES.find(t => t.id === global.theme) ?? THEMES[0];
  const s = global.settings;
  const hasVideoBg = s.videoBg && s.videoBgUrl;
  const animIntensity = s.animationIntensity ?? 1.0;
  const contourIntensity = s.contourIntensity ?? 0.6;
  const reducedMotion = s.reducedMotion ?? false;

  const handleItemClick = useCallback(index => setActive(index), []);
  const handleNavigate = useCallback(index => { setActive(index); }, []);
  const label = SECTIONS[active]?.label ?? 'Player';

  useEffect(() => {
    document.documentElement.dataset.theme = theme.id;
  }, [theme.id]);

  // Apply reduced motion globally
  useEffect(() => {
    if (reducedMotion) document.documentElement.style.setProperty('--anim-duration', '0s');
    else document.documentElement.style.removeProperty('--anim-duration');
  }, [reducedMotion]);

  // Show Daily Transmission after boot if enabled
  useEffect(() => {
    if (booted && offlineDone && !transmissionDone) {
      if (s.dailyTransmission !== false) {
        setShowTransmission(true);
      } else {
        setTransmissionDone(true);
      }
    }
  }, [booted, offlineDone, transmissionDone, s.dailyTransmission]);

  // Command Palette keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen]);

  const handleTransmissionComplete = useCallback(() => {
    setShowTransmission(false);
    setTransmissionDone(true);
  }, []);

  return (
    <AdShield>
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {!booted && <LoadingScreen onComplete={() => setBooted(true)} />}
      {booted && !offlineDone && (
        <OfflineDownloadScreen onComplete={() => setOfflineDone(true)} />
      )}

      {/* Daily Transmission overlay */}
      {showTransmission && !transmissionDone && (
        <DailyTransmission onComplete={handleTransmissionComplete} />
      )}

      {hasVideoBg && (
        <VideoBackground url={s.videoBgUrl} opacity={s.videoBgOpacity ?? 0.35} />
      )}

      <div className={`pointer-events-none fixed inset-0 z-0 ${hasVideoBg ? 'opacity-20' : 'opacity-60'}`}>
        <Topography
          key={theme.id}
          lowColor={theme.topography.lowColor}
          midColor={theme.topography.midColor}
          highColor={theme.topography.highColor}
          speed={0.25 * animIntensity}
          morphAmount={3.0}
          bands={2.4}
          thickness={0.012}
          glow={0.6 * contourIntensity}
          colorMode="elevation"
          contrast={2.6}
          brightness={0.9}
          opacity={0.85 * contourIntensity}
          grain
          grainIntensity={0.04}
          mouseInteraction={false}
        />
      </div>

      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(900px 600px at 80% -10%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(700px 600px at 0% 110%, rgba(255,255,255,0.05), transparent 60%), linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.85))'
        }}
      />

      {s.crtEffect && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            opacity: s.scanlineIntensity ?? 0.08,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)'
          }}
        />
      )}

      <div className="relative z-10">
        <Header activeLabel={label} />
        <SidebarLayout activeIndex={active} onItemClick={handleItemClick}>
          <SectionRenderer section={SECTIONS[active]} />
        </SidebarLayout>
        <Footer />
      </div>

      <Toast />

      {/* Command Palette overlay */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
    </AdShield>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}
