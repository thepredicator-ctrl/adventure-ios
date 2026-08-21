import LineSidebar from '../src/components/LineSidebar.jsx';
import Topography from '../src/components/Topography.jsx';

export default function CustomTheme() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div className="absolute inset-0">
        <Topography
          lowColor="#0c2d4a"
          midColor="#22d3ee"
          highColor="#a5f3fc"
          speed={0.4}
          bands={3}
          thickness={0.008}
          glow={0.8}
          colorMode="elevation"
          contrast={3}
          brightness={1}
        />
      </div>
      <div className="relative z-10 flex h-full items-center">
        <LineSidebar
          items={['Intro', 'Story', 'Gallery', 'Credits']}
          accentColor="#22d3ee"
          textColor="#cbd5e1"
          markerColor="#475569"
          falloff="sharp"
          maxShift={20}
          smoothing={80}
        />
      </div>
    </div>
  );
}
