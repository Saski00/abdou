import { useEffect, useState } from 'react';
import { TouchControlsMode } from './types';

function detectInitialTouch(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (coarse) return true;
  const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
  return hasTouch && !fine;
}

export function useTouchDevice(mode: TouchControlsMode): boolean {
  const [detectedTouch, setDetectedTouch] = useState<boolean>(detectInitialTouch);

  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)');
    const updateFromMedia = () => {
      setDetectedTouch((prev) => prev || detectInitialTouch());
    };

    const onFirstTouch = () => {
      setDetectedTouch(true);
    };

    mq?.addEventListener?.('change', updateFromMedia);
    window.addEventListener('touchstart', onFirstTouch, { passive: true, once: true });

    return () => {
      mq?.removeEventListener?.('change', updateFromMedia);
      window.removeEventListener('touchstart', onFirstTouch);
    };
  }, []);

  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return detectedTouch;
}
