import { useRef, useEffect, useState, useCallback } from 'react';

export default function VideoBackground({ url, opacity = 0.35 }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !url) return;
    const play = () => {
      v.play().then(() => setReady(true)).catch(() => {});
    };
    if (v.readyState >= 3) {
      play();
    } else {
      v.addEventListener('canplaythrough', play, { once: true });
      v.load();
    }
  }, [url]);

  useEffect(() => {
    if (!url) { setReady(false); setError(false); return; }
    setReady(false);
    setError(false);
    tryPlay();
  }, [url, tryPlay]);

  const handleError = useCallback(() => {
    setError(true);
    setReady(false);
  }, []);

  if (!url) return null;
  if (error) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: ready ? opacity : 0, transition: 'opacity 0.8s ease' }}
    >
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        crossOrigin="anonymous"
        className="h-full w-full object-cover"
        style={{ filter: 'brightness(0.5) saturate(1.2)' }}
        onError={handleError}
      >
        <source src={url} />
      </video>
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}