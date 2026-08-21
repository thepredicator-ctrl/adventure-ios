import { lazy, Suspense } from 'react';
import LaserWindow from './LaserWindow.jsx';

const SECTION_MAP = {
  Player:         lazy(() => import('../sections/Player.jsx')),
  Episodes:       lazy(() => import('../sections/Episodes.jsx')),
  Shows:          lazy(() => import('../sections/Shows.jsx')),
  Stats:          lazy(() => import('../sections/Stats.jsx')),
  Awards:         lazy(() => import('../sections/Awards.jsx')),
  Themes:         lazy(() => import('../sections/Themes.jsx')),
  Settings:       lazy(() => import('../sections/Settings.jsx')),
  Shortcuts:      lazy(() => import('../sections/Shortcuts.jsx')),
  'Adventure Mode': lazy(() => import('../sections/AdventureMode.jsx')),
  'Adventure AI':   lazy(() => import('../sections/AdventureAI.jsx')),
  Developer:      lazy(() => import('../sections/DeveloperMode.jsx')),
  Terminal:       lazy(() => import('../sections/Terminal.jsx')),
};

export default function SectionRenderer({ section }) {
  const Comp = SECTION_MAP[section?.label];
  if (!Comp) {
    return <div className="text-white/60">No content for {section?.label}.</div>;
  }
  return (
    <Suspense
      fallback={
        <LaserWindow>
          <div className="flex h-40 items-center justify-center text-white/40">
            <span className="animate-pulse">Loading...</span>
          </div>
        </LaserWindow>
      }
    >
      <div key={section.label} className="animate-fade-in">
        <LaserWindow>
          <Comp />
        </LaserWindow>
      </div>
    </Suspense>
  );
}