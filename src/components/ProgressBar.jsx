export default function ProgressBar({ value, max = 100, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-white/70 to-white transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
