import { useEffect } from 'react';

/**
 * Freezes the page behind an overlay (web). Without it, a touch drag on a sheet also scrolls or
 * rubber-bands the document underneath, so the screen behind seems to move with the finger.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;
    const html = document.documentElement;
    const { body } = document;
    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
    };
  }, [locked]);
}
