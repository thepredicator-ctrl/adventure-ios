// Local implementation of the magicui Terminal / TypingAnimation / AnimatedSpan
// components, matching the public API used in the magicui registry demo.
//
// Usage:
//   <Terminal>
//     <TypingAnimation>&gt; some command</TypingAnimation>
//     <AnimatedSpan className="text-green-500">✔ Done.</AnimatedSpan>
//   </Terminal>
//
// Each line reveals on its own schedule using the `delay` prop (ms).
// No external dependencies — pure React + Tailwind.

import { useEffect, useState, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/* Terminal — styled container with traffic-light title bar           */
/* ------------------------------------------------------------------ */
export function Terminal({ children, className = '', title = 'adventure — bash' }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-white/15 bg-black/80 shadow-2xl backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-red-500/80" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
        <div className="h-3 w-3 rounded-full bg-green-500/80" />
        <span className="ml-2 font-mono text-xs text-white/40">{title}</span>
      </div>
      <div className="space-y-1 p-4 font-mono text-sm leading-relaxed text-white/90">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TypingAnimation — types out a string children char by char          */
/* ------------------------------------------------------------------ */
export function TypingAnimation({
  children,
  duration = 45,
  delay = 0,
  className = '',
  showCursor = true,
  onComplete
}) {
  const text = typeof children === 'string' ? children : '';
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  const completedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (!completedRef.current && onComplete) {
      completedRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;
    setDisplayed('');
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay, text]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      handleComplete();
      return;
    }
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, duration);
    return () => clearTimeout(t);
  }, [started, displayed, text, duration, handleComplete]);

  if (typeof children !== 'string') {
    return (
      <div className={className} style={{ animationDelay: `${delay}ms` }}>
        {children}
      </div>
    );
  }

  return (
    <div className={className}>
      {displayed}
      {showCursor && displayed.length < text.length && (
        <span className="ml-0.5 inline-block w-2 animate-pulse bg-white/70">&nbsp;</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AnimatedSpan — fades + slides in after a delay                     */
/* ------------------------------------------------------------------ */
export function AnimatedSpan({
  children,
  delay = 0,
  duration = 500,
  className = '',
  onComplete
}) {
  const [visible, setVisible] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      if (!completedRef.current && onComplete) {
        completedRef.current = true;
        onComplete();
      }
    }, delay);
    return () => clearTimeout(t);
  }, [delay, onComplete]);

  return (
    <div
      className={`transition-all ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
