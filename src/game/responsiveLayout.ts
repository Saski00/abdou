import { useEffect, useState } from 'react';
import { clamp } from './collision';
import { ScreenOrientationMode } from './types';

export type DeviceOrientationKind = 'portrait' | 'landscape';

export interface ViewportLayout {
  width: number;
  height: number;
  orientation: DeviceOrientationKind;
  isNarrowPortrait: boolean;
  isCompactLandscape: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function getViewportLayout(width: number, height: number): ViewportLayout {
  const safeW = Math.max(1, Math.round(width));
  const safeH = Math.max(1, Math.round(height));
  const orientation: DeviceOrientationKind = safeW > safeH ? 'landscape' : 'portrait';
  return {
    width: safeW,
    height: safeH,
    orientation,
    isNarrowPortrait: orientation === 'portrait' && safeW < 430,
    isCompactLandscape: orientation === 'landscape' && safeH <= 520,
  };
}

/**
 * Keeps landscape at a natural 72deg vertical FOV while widening vertical FOV smoothly
 * in portrait aspects so peripheral streets, doorways, and zombies are not tunnel-cropped.
 */
export function computeResponsiveCameraFov(
  width: number,
  height: number,
  baseFovDeg = 72
): number {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const aspect = clamp(safeW / safeH, 0.42, 3.2);
  if (aspect >= 1.15) {
    return baseFovDeg;
  }
  const halfBaseTan = Math.tan((baseFovDeg * 0.5) * DEG_TO_RAD);
  const boost = clamp(Math.pow(1.15 / aspect, 0.42), 1, 1.36);
  const expanded = 2 * Math.atan(halfBaseTan * boost) * RAD_TO_DEG;
  return clamp(expanded, baseFovDeg, 90);
}

/**
 * Scales touch-look angular speed by the viewport's shorter edge so swiping across a phone
 * produces consistent camera rotation speed in both Portrait and Landscape orientations.
 */
export function computeTouchLookRadiansPerPx(
  width: number,
  height: number,
  sensitivity: number
): number {
  const shortEdge = Math.max(320, Math.min(Math.max(1, width), Math.max(1, height)));
  const normalizedBase = clamp(0.0042 * (390 / shortEdge), 0.0022, 0.0062);
  return normalizedBase * clamp(sensitivity, 0.3, 2.5);
}

/**
 * Filters abrupt single-event coordinate jumps that can happen mid-rotation on mobile browsers.
 */
export function clampTouchLookDelta(dx: number, dy: number): { dx: number; dy: number } {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    return { dx: 0, dy: 0 };
  }
  if (Math.abs(dx) > 140 || Math.abs(dy) > 140) {
    return { dx: 0, dy: 0 };
  }
  return {
    dx: clamp(dx, -96, 96),
    dy: clamp(dy, -96, 96),
  };
}

export type OrientationLockApplyResult = 'unlocked' | 'locked' | 'unsupported';

export async function applyScreenOrientationPreference(
  mode: ScreenOrientationMode
): Promise<OrientationLockApplyResult> {
  if (typeof window === 'undefined' || typeof screen === 'undefined') {
    return 'unsupported';
  }
  const orientationApi = (
    screen as Screen & {
      orientation?: ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
        unlock?: () => void;
      };
    }
  ).orientation;

  if (!orientationApi) {
    return 'unsupported';
  }

  if (mode === 'auto') {
    try {
      if (typeof orientationApi.unlock === 'function') {
        orientationApi.unlock();
        return 'unlocked';
      }
    } catch {
      return 'unsupported';
    }
    return 'unsupported';
  }

  try {
    if (typeof orientationApi.lock === 'function') {
      await orientationApi.lock(mode === 'portrait' ? 'portrait' : 'landscape');
      return 'locked';
    }
  } catch {
    return 'unsupported';
  }
  return 'unsupported';
}

function readWindowSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }
  const vv = window.visualViewport;
  const width = Math.round(vv?.width ?? window.innerWidth ?? document.documentElement.clientWidth ?? 1280);
  const height = Math.round(vv?.height ?? window.innerHeight ?? document.documentElement.clientHeight ?? 720);
  return { width, height };
}

export function useViewportLayout(): ViewportLayout {
  const [layout, setLayout] = useState<ViewportLayout>(() => {
    const { width, height } = readWindowSize();
    return getViewportLayout(width, height);
  });

  useEffect(() => {
    let rafId = 0;

    const sync = () => {
      const { width, height } = readWindowSize();
      setLayout((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return getViewportLayout(width, height);
      });
    };

    const handleOrientation = () => {
      sync();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(sync);
    };

    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', handleOrientation);
    window.visualViewport?.addEventListener('resize', sync);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', handleOrientation);
      window.visualViewport?.removeEventListener('resize', sync);
    };
  }, []);

  return layout;
}
