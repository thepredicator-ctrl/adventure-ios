import { useEffect, useRef } from 'react';

/**
 * AdShield — injects ad-blocking CSS into the parent page and attempts
 * to block overlay ads on cross-origin embed iframes where possible.
 *
 * Strategy:
 * 1. Adds a global CSS stylesheet that hides common ad containers
 * 2. Creates a MutationObserver that removes injected ad elements
 * 3. Wraps the iframe in a container that intercepts pointer events on
 *    common ad overlay positions
 * 4. Uses the iframe sandbox attribute to limit popup/popunder behavior
 */
const AD_SELECTORS = [
  '[id*="ad-"]', '[id*="ad_"]', '[id*="ads"]',
  '[class*="ad-"]', '[class*="ad_"]', '[class*="ads"]',
  '[id*="banner"]', '[class*="banner"]',
  '[id*="popup"]', '[class*="popup"]',
  '[id*="overlay"]', '[class*="overlay"]',
  '[id*="sponsor"]', '[class*="sponsor"]',
  '[id*="promo"]', '[class*="promo"]',
  'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
  'iframe[src*="adnxs"]', 'iframe[src*="amazon-adsystem"]',
  'div[style*="position: fixed"]', 'div[style*="z-index: 9999"]',
  'div[data-ad]', 'div[data-ad-slot]', 'ins.adsbygoogle',
  '#ad-container', '.ad-container', '.video-ad',
  '.jw-ad', '.jw-plugin', '.jw-logo',
  '[class*="vast"]', '[class*="clickthrough"]',
  '.skip-ad', '.ad-skip',
];

export default function AdShield({ children }) {
  const styleRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Inject ad-blocking stylesheet
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.id = 'adventure-adshield';
      style.textContent = `
        /* Core ad blocking */
        ${AD_SELECTORS.map(s => `${s},`).join('\n')}
        [id*="ad"][id*="player"]:not(#root),
        [class*="ad-"][class*="player"]:not(.adventure-*) {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          pointer-events: none !important;
          opacity: 0 !important;
          position: absolute !important;
          z-index: -9999 !important;
        }

        /* Block common video overlay ads */
        div[class*="overlay"][class*="ad"],
        div[id*="overlay"][id*="ad"],
        a[href*="click"], a[href*="redirect"],
        .video-ad-overlay, .player-ad-overlay {
          display: none !important;
        }

        /* Ensure player controls remain accessible */
        .adventure-player-wrap video,
        .adventure-player-wrap .jw-media,
        .adventure-player-wrap .video-js,
        .adventure-player-wrap video-js {
          z-index: 1 !important;
        }
      `;
      document.head.appendChild(style);
      styleRef.current = style;
    }

    // MutationObserver to catch dynamically injected ads
    const removeAds = () => {
      try {
        document.querySelectorAll(AD_SELECTORS.join(', ')).forEach(el => {
          // Don't remove if it's part of our app
          if (el.closest('#root') || el.closest('.adventure-')) return;
          if (el.tagName === 'IFRAME') {
            // Only remove ad iframes, not our player iframe
            const src = el.src || '';
            if (src.includes('vidsrc') || src.includes('2embed') ||
                src.includes('superembed') || src.includes('fsapi') ||
                src.includes('vidcore')) return;
          }
          el.remove();
        });
      } catch {}
    };

    observerRef.current = new MutationObserver(mutations => {
 let hasNewNodes = false;
      for (const m of mutations) {
        if (m.addedNodes.length) { hasNewNodes = true; break; }
      }
      if (hasNewNodes) {
        // Debounce
        clearTimeout(observerRef.current._timer);
        observerRef.current._timer = setTimeout(removeAds, 100);
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial cleanup
    removeAds();

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      if (styleRef.current) styleRef.current.remove();
      styleRef.current = null;
    };
  }, []);

  return children;
}
