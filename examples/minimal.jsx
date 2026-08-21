import LineSidebar from '../src/components/LineSidebar.jsx';

export default function Minimal() {
  return (
    <LineSidebar
      items={['Home', 'About', 'Contact']}
      accentColor="#A855F7"
    />
  );
}
