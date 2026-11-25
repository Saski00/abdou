import { ArrowUp, Flashlight, Hand, Sword } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InteractionPrompt } from '../game/types';

interface MobileControlsProps {
  flashlightOn: boolean;
  interactionPrompt: InteractionPrompt | null;
  onMove: (x: number, y: number, sprint: boolean) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onJump: () => void;
  onInteract: () => void;
  onAttack: () => void;
  onToggleFlashlight: () => void;
}

const MAX_RADIUS = 44;

export function MobileControls({
  flashlightOn,
  interactionPrompt,
  onMove,
  onLookDelta,
  onJump,
  onInteract,
  onAttack,
  onToggleFlashlight,
}: MobileControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const joyPointerIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const lookPointerIdRef = useRef<number | null>(null);
  const lookLastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isSprintingStick, setIsSprintingStick] = useState(false);

  // Ensure movement resets cleanly if controls unmount (e.g. pausing)
  useEffect(() => {
    return () => {
      onMove(0, 0, false);
    };
  }, [onMove]);

  const setKnobOffset = (dx: number, dy: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  };

  const resetJoystick = () => {
    joyPointerIdRef.current = null;
    setKnobOffset(0, 0);
    setIsSprintingStick(false);
    onMove(0, 0, false);
  };

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const dx = clientX - joyOriginRef.current.x;
    const dy = clientY - joyOriginRef.current.y;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, MAX_RADIUS);
    const angle = dist > 0.001 ? Math.atan2(dy, dx) : 0;
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobOffset(kx, ky);

    const normMag = clampedDist / MAX_RADIUS;
    if (normMag < 0.08) {
      setIsSprintingStick(false);
      onMove(0, 0, false);
      return;
    }

    const normX = kx / MAX_RADIUS;
    const normY = -ky / MAX_RADIUS; // Screen up (-dy) -> forward (+1)
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

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Right-Side Camera Look Touch Surface (leaves left area dedicated to movement joystick) */}
      <div
        aria-label="Touch camera look area"
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerEnd}
        onPointerCancel={handleLookPointerEnd}
        onLostPointerCapture={handleLookPointerEnd}
        className="absolute top-0 right-0 bottom-0 left-[46%] sm:left-[42%] pointer-events-auto touch-none"
      />

      {/* Bottom-Left Virtual Movement Joystick */}
      <div
        className="absolute bottom-0 left-0 pointer-events-auto touch-none"
        style={{
          paddingLeft: 'max(18px, env(safe-area-inset-left))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          ref={padRef}
          role="application"
          aria-label="Movement joystick"
          onPointerDown={handleJoyPointerDown}
          onPointerMove={handleJoyPointerMove}
          onPointerUp={handleJoyPointerEnd}
          onPointerCancel={handleJoyPointerEnd}
          onLostPointerCapture={handleJoyPointerEnd}
          className={`relative w-32 h-32 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSprintingStick
              ? 'bg-[#0e121a]/65 border-amber-400/80'
              : 'bg-[#0e121a]/55 border-stone-500/55'
          }`}
        >
          {/* Crosshair guide ticks */}
          <div className="w-16 h-16 rounded-full border border-stone-600/35 pointer-events-none" />

          {/* Movable thumb knob */}
          <div
            ref={knobRef}
            className={`absolute w-14 h-14 rounded-full border shadow-lg pointer-events-none flex items-center justify-center ${
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
        className="absolute bottom-0 right-0 flex flex-col items-end gap-2.5 pointer-events-none touch-none z-20"
        style={{
          paddingRight: 'max(14px, env(safe-area-inset-right))',
          paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={!interactionPrompt}
            aria-label={
              interactionPrompt
                ? `${interactionPrompt.actionLabel} ${interactionPrompt.name}`
                : 'Interact unavailable'
            }
            onPointerDown={(e) => {
              if (!interactionPrompt) return;
              e.preventDefault();
              e.stopPropagation();
              onInteract();
            }}
            onClick={(e) => {
              if (e.detail === 0 && interactionPrompt) onInteract();
            }}
            className={`h-11 px-3.5 rounded-full border-2 flex items-center gap-1.5 shadow-xl transition-all touch-none ${
              interactionPrompt
                ? 'pointer-events-auto bg-amber-500 active:bg-amber-400 border-amber-200 text-stone-950 font-semibold active:scale-95 opacity-100'
                : 'pointer-events-none bg-[#0e121a]/70 border-stone-700/60 text-stone-400 opacity-30'
            }`}
          >
            <Hand className="w-4 h-4 stroke-[2.2]" />
            <span className="text-xs font-bold tracking-wide whitespace-nowrap">
              {interactionPrompt ? interactionPrompt.actionLabel : 'Interact'}
            </span>
          </button>

          <button
            type="button"
            aria-label={flashlightOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFlashlight();
            }}
            onClick={(e) => {
              if (e.detail === 0) onToggleFlashlight();
            }}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg active:scale-95 transition-transform pointer-events-auto touch-none ${
              flashlightOn
                ? 'bg-amber-500/90 border-amber-300 text-stone-950'
                : 'bg-[#0e121a]/82 border-stone-600/80 text-stone-200'
            }`}
          >
            <Flashlight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-end gap-3 pointer-events-auto">
          <button
            type="button"
            aria-label="Melee attack"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAttack();
            }}
            onClick={(e) => {
              if (e.detail === 0) onAttack();
            }}
            className="w-16 h-16 rounded-full bg-[#2a1216]/90 active:bg-rose-600 border-2 border-rose-400/80 active:border-rose-200 text-rose-100 active:text-white flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform touch-none"
          >
            <Sword className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold tracking-wide leading-none mt-0.5">
              Attack
            </span>
          </button>

          <button
            type="button"
            aria-label="Jump"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJump();
            }}
            onClick={(e) => {
              if (e.detail === 0) onJump();
            }}
            className="w-16 h-16 rounded-full bg-[#0e121a]/85 active:bg-amber-500 border-2 border-stone-400/75 active:border-amber-200 text-stone-100 active:text-stone-950 flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform touch-none"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.4]" />
            <span className="text-[10px] font-semibold tracking-wide leading-none mt-0.5">
              Jump
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
