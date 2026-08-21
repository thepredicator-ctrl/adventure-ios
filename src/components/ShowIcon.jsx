// ShowIcon — monochrome treatment for the B&W theme.
// Ignores show.color in favor of a neutral white-on-black badge.
export default function ShowIcon({ show, size = 40 }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-white/20 font-bold text-white"
      style={{
        width: size,
        height: size,
        background: '#000000',
        fontSize: size * 0.36,
        boxShadow: '0 0 10px rgba(255,255,255,0.12)'
      }}
    >
      {show.icon}
    </div>
  );
}
