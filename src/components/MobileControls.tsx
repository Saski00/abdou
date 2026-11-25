import { ArrowUp, Flashlight, Hand, Sword } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ViewportLayout } from '../game/responsiveLayout';
import { InteractionPrompt } from '../game/types';
import { useI18n } from '../i18n';

interface MobileControlsProps {
  flashlightOn: boolean;
  interactionPrompt: InteractionPrompt | null;
  viewport: ViewportLayout;
  onMove: (x: number, y: number, sprint: boolean) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onJump: () => void;
  onInteract: () => void;
  onAttack: () => void;
  onToggleFlashlight: () => void;
}

export function MobileControls({
  flashlightOn,
  interactionPrompt,
  viewport,
  onMove,
  onLookDelta,
  onJump,
  onInteract,
  onAttack,
  onToggleFlashlight,
}: MobileControlsProps) {
  const { t } = useI18n();
  const isCompactLandscape = viewport.isCompactLandscape;
  const maxRadius = isCompactLandscape ? 38 : 44;

  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const joyPointerIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const maxRadiusRef = useRef(maxRadius);
  maxRadiusRef.current = maxRadius;

  const lookPointerIdRef = useRef<number | null>(null);
  const lookLastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isSprintingStick, setIsSprintingStick] = useState(false);

  const setKnobOffset = useCallback((dx: number, dy: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  }, []);

  const resetAllTouchInputs = useCallback(() => {
    joyPointerIdRef.current = null;
    lookPointerIdRef.current = null;
    setKnobOffset(0, 0);
    setIsSprintingStick(false);
    onMove(0, 0, false);
  }, [onMove, setKnobOffset]);

  // Reset active pointers cleanly on unmount, orientation changes, resize reflow, or app backgrounding
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        resetAllTouchInputs();
      }
    };

    window.addEventListener('orientationchange', resetAllTouchInputs);
    window.addEventListener('resize', resetAllTouchInputs);
    window.addEventListener('blur', resetAllTouchInputs);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('orientationchange', resetAllTouchInputs);
      window.removeEventListener('resize', resetAllTouchInputs);
      window.removeEventListener('blur', resetAllTouchInputs);
      document.removeEventListener('visibilitychange', handleVisibility);
      onMove(0, 0, false);
    };
  }, [onMove, resetAllTouchInputs]);

  const resetJoystick = () => {
    joyPointerIdRef.current = null;
    setKnobOffset(0, 0);
    setIsSprintingStick(false);
    onMove(0, 0, false);
  };

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const radius = maxRadiusRef.current;
    const dx = clientX - joyOriginRef.current.x;
    const dy = clientY - joyOriginRef.current.y;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, radius);
    const angle = dist > 0.001 ? Math.atan2(dy, dx) : 0;
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobOffset(kx, ky);

    const normMag = clampedDist / radius;
    if (normMag < 0.08) {
      setIsSprintingStick(false);
      onMove(0, 0, false);
      return;
    }

    const normX = kx / radius;
    const normY = -ky / radius; // Screen up (-dy) -> forward (+1)
    const sprint = normMag > 0.88;
    setIsSprintingStick(sprint);
    onMove(normX, normY, sprint);
  };

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerIdRef.current !== null) return;

    const pad = padRef.current;
    if (!pad) return;

    joyPointerIdRef.current = e.pointerId;
    const rect = pad.getBoundingClientRect();
    joyOriginRef.current = {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };

    try {
      pad.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable
    }

    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleJoyPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    resetJoystick();
  };

  // Right-side Look Touch Pad
  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    if (lookPointerIdRef.current !== null) return;

    lookPointerIdRef.current = e.pointerId;
    lookLastRef.current = { x: e.clientX, y: e.clientY };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleLookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lookLastRef.current.x;
    const dy = e.clientY - lookLastRef.current.y;
    lookLastRef.current = { x: e.clientX, y: e.clientY };
    onLookDelta(dx, dy);
  };

  const handleLookPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== e.pointerId) return;
    lookPointerIdRef.current = null;
  };

  const lookLeftClass = viewport.orientation === 'landscape' ? 'left-[32%]' : 'left-[42%]';

  return (
    // Keep touch sticks physically left-to-right (movement left, look & actions right) regardless of UI language
    <div dir="ltr" className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Camera Look Touch Surface (wider in landscape, leaves left thumb zone dedicated to movement stick) */}
      <div
        aria-label={t.mobileControls.lookAreaAria}
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerEnd}
        onPointerCancel={handleLookPointerEnd}
        onLostPointerCapture={handleLookPointerEnd}
        className={`absolute top-0 right-0 bottom-0 ${lookLeftClass} pointer-events-auto touch-none`}
      />

      {/* Bottom-Left Virtual Movement Joystick */}
      <div
        className="absolute bottom-0 left-0 pointer-events-auto touch-none"
        style={{
          paddingLeft: isCompactLandscape
            ? 'max(14px, env(safe-area-inset-left))'
            : 'max(18px, env(safe-area-inset-left))',
          paddingBottom: isCompactLandscape
            ? 'max(12px, env(safe-area-inset-bottom))'
            : 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          ref={padRef}
          role="application"
          aria-label={t.mobileControls.joystickAria}
          onPointerDown={handleJoyPointerDown}
          onPointerMove={handleJoyPointerMove}
          onPointerUp={handleJoyPointerEnd}
          onPointerCancel={handleJoyPointerEnd}
          onLostPointerCapture={handleJoyPointerEnd}
          className={`relative rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompactLandscape ? 'w-28 h-28' : 'w-32 h-32'
          } ${
            isSprintingStick
              ? 'bg-[#0e121a]/65 border-amber-400/80'
              : 'bg-[#0e121a]/55 border-stone-500/55'
          }`}
        >
          {/* Crosshair guide ticks */}
          <div
            className={`rounded-full border border-stone-600/35 pointer-events-none ${
              isCompactLandscape ? 'w-14 h-14' : 'w-16 h-16'
            }`}
          />

          {/* Movable thumb knob */}
          <div
            ref={knobRef}
            className={`absolute rounded-full border shadow-lg pointer-events-none flex items-center justify-center ${
              isCompactLandscape ? 'w-12 h-12' : 'w-14 h-14'
            } ${
              isSprintingStick
                ? 'bg-amber-500/85 border-amber-200'
                : 'bg-stone-200/80 border-white/60'
            }`}
            style={{ transform: 'translate3d(0px, 0px, 0)' }}
          >
            <div className="w-4 h-4 rounded-full bg-stone-900/40" />
          </div>
        </div>
      </div>

      {/* Bottom-Right Action Cluster (Interact + Flashlight above Attack + Jump) */}
      <div
        className={`absolute bottom-0 right-0 flex flex-col items-end pointer-events-none touch-none z-20 ${
          isCompactLandscape ? 'gap-2' : 'gap-2.5'
        }`}
        style={{
          paddingRight: isCompactLandscape
            ? 'max(14px, env(safe-area-inset-right))'
            : 'max(14px, env(safe-area-inset-right))',
          paddingBottom: isCompactLandscape
            ? 'max(12px, env(safe-area-inset-bottom))'
            : 'max(18px, env(safe-area-inset-bottom))',
        }}
      >
        <div className={`flex items-center ${isCompactLandscape ? 'gap-2' : 'gap-2.5'}`}>
          {interactionPrompt && (
            <button
              type="button"
              aria-label={`${interactionPrompt.actionLabel} ${interactionPrompt.name}`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInteract();
              }}
              onClick={(e) => {
                if (e.detail === 0) onInteract();
              }}
              className={`h-11 ${
                isCompactLandscape ? 'px-3' : 'px-3.5'
              } rounded-full border-2 flex items-center gap-1.5 shadow-xl transition-transform touch-none pointer-events-auto bg-amber-500 active:bg-amber-400 border-amber-200 text-stone-950 font-semibold active:scale-95`}
            >
              <Hand className="w-4 h-4 stroke-[2.2]" />
              <span className="text-xs font-bold tracking-wide whitespace-nowrap">
                {interactionPrompt.actionLabel}
              </span>
            </button>
          )}

          <button
            type="button"
            aria-label={
              flashlightOn ? t.mobileControls.flashlightOnAria : t.mobileControls.flashlightOffAria
            }
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFlashlight();
            }}
            onClick={(e) => {
              if (e.detail === 0) onToggleFlashlight();
            }}
            className={`${
              isCompactLandscape ? 'w-11 h-11' : 'w-12 h-12'
            } rounded-full border-2 flex items-center justify-center shadow-lg active:scale-95 transition-transform pointer-events-auto touch-none ${
              flashlightOn
                ? 'bg-amber-500/90 border-amber-300 text-stone-950'
                : 'bg-[#0e121a]/82 border-stone-600/80 text-stone-200'
            }`}
          >
            <Flashlight className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex items-end pointer-events-auto ${isCompactLandscape ? 'gap-2.5' : 'gap-3'}`}>
          <button
            type="button"
            aria-label={t.mobileControls.meleeAttackAria}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAttack();
            }}
            onClick={(e) => {
              if (e.detail === 0) onAttack();
            }}
            className={`${
              isCompactLandscape ? 'w-14 h-14' : 'w-16 h-16'
            } rounded-full bg-[#2a1216]/90 active:bg-rose-600 border-2 border-rose-400/80 active:border-rose-200 text-rose-100 active:text-white flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform touch-none`}
          >
            <Sword className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold tracking-wide leading-none mt-0.5">
              {t.mobileControls.attackLabel}
            </span>
          </button>

          <button
            type="button"
            aria-label={t.mobileControls.jumpAria}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJump();
            }}
            onClick={(e) => {
              if (e.detail === 0) onJump();
            }}
            className={`${
              isCompactLandscape ? 'w-14 h-14' : 'w-16 h-16'
            } rounded-full bg-[#0e121a]/85 active:bg-amber-500 border-2 border-stone-400/75 active:border-amber-200 text-stone-100 active:text-stone-950 flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform touch-none`}
          >
            <ArrowUp className="w-5 h-5 stroke-[2.4]" />
            <span className="text-[10px] font-semibold tracking-wide leading-none mt-0.5">
              {t.mobileControls.jumpLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
