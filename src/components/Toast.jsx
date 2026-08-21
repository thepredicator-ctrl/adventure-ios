import { usePlayer } from '../context/PlayerContext.jsx';

export default function Toast() {
  const { toast } = usePlayer();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className={`animate-fade-in rounded-md border px-4 py-2 text-sm font-medium backdrop-blur-xl ${
        toast.tone === 'achv'
          ? 'border-white/40 bg-white/15 text-white'
          : 'border-white/15 bg-black/70 text-white'
      }`}>
        {toast.msg}
      </div>
    </div>
  );
}
