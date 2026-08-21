import LineSidebar from '../src/components/LineSidebar.jsx';

export default function FullConfig() {
  return (
    <LineSidebar
      items={['Overview', 'Components', 'Animations', 'Backgrounds', 'Showcase']}
      accentColor="#A855F7"
      textColor="#c4c4c4"
      markerColor="#6c6c6c"
      showIndex
      showMarker
      proximityRadius={100}
      maxShift={30}
      falloff="smooth"
      markerLength={60}
      markerGap={0}
      tickScale={0.5}
      scaleTick
      itemGap={20}
      fontSize={1.1}
      smoothing={100}
      defaultActive={0}
      onItemClick={(index, label) => console.log(index, label)}
    />
  );
}
