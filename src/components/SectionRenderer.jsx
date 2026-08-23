import { lazy, Suspense } from 'react';
import LaserWindow from './LaserWindow.jsx';

const SECTION_MAP = {
  'Mission Control':      lazy(() => import('../sections/MissionControl.jsx')),
  Player:                 lazy(() => import('../sections/Player.jsx')),
  Episodes:               lazy(() => import('../sections/Episodes.jsx')),
  'Episode Intel':        lazy(() => import('../sections/EpisodeIntel.jsx')),
  'Previously On':        lazy(() => import('../sections/PreviouslyOn.jsx')),
  'Finish Tonight':       lazy(() => import('../sections/FinishTonight.jsx')),
  Shows:                  lazy(() => import('../sections/Shows.jsx')),
  'Smart Library':        lazy(() => import('../sections/SmartLibrary.jsx')),
  'Show Analysis':        lazy(() => import('../sections/ShowAnalysis.jsx')),
  'Show Timeline':        lazy(() => import('../sections/ShowTimeline.jsx')),
  'Smart Rewatch':        lazy(() => import('../sections/SmartRewatch.jsx')),
  Stats:                  lazy(() => import('../sections/Stats.jsx')),
  Awards:                 lazy(() => import('../sections/Awards.jsx')),
  'Rewatch Heatmap':      lazy(() => import('../sections/RewatchHeatmap.jsx')),
  'Time Capsule':         lazy(() => import('../sections/TimeCapsule.jsx')),
  'AI Assistant':         lazy(() => import('../sections/AIAssistant.jsx')),
  'Adventure AI':         lazy(() => import('../sections/AdventureAI.jsx')),
  'Adventure Mode':       lazy(() => import('../sections/AdventureMode.jsx')),
  'AI Model Lab':         lazy(() => import('../sections/AIModelLab.jsx')),
  'Adventure Radio':      lazy(() => import('../sections/AdventureRadio.jsx')),
  'Watch Together':       lazy(() => import('../sections/WatchTogether.jsx')),
  'Performance Monitor':  lazy(() => import('../sections/PerformanceMonitor.jsx')),
  'Provider Health':      lazy(() => import('../sections/ProviderHealth.jsx')),
  Terminal:               lazy(() => import('../sections/Terminal.jsx')),
  'iOS Features':         lazy(() => import('../sections/iOSFeatures.jsx')),
  'Privacy & Security':   lazy(() => import('../sections/PrivacySecurity.jsx')),
  Themes:                 lazy(() => import('../sections/Themes.jsx')),
  Settings:               lazy(() => import('../sections/Settings.jsx')),
  Shortcuts:              lazy(() => import('../sections/Shortcuts.jsx')),
  Developer:              lazy(() => import('../sections/DeveloperMode.jsx')),
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
