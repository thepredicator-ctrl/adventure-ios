import { useRef, useEffect } from 'react';

export default function VideoBackground({ url, opacity = 0.35 }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !url) return;
    v.load();
    const play = () => v.play().catch(() => {});
    v.addEventListener('canplay', play, { once: true });
    // If already loaded
    if (v.readyState >= 3) play();
    return () => v.removeEventListener('canplay', play);
  }, [url]);

  if (!url) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity }}
    >
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
        style={{ filter: 'brightness(0.5) saturate(1.2)' }}
      >
        <source src={url} />
      </video>
      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
