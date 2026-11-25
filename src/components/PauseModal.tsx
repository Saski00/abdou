import { useState } from 'react';
import { useViewportLayout } from '../game/responsiveLayout';
import { HudSnapshot } from '../game/types';

interface PauseModalProps {
  hud: HudSnapshot;
  isTouchMode: boolean;
  hasSaveData: boolean;
  onResume: () => void;
  onSaveGame: () => boolean;
  onLoadGame: () => void;
  onOpenSettings: () => void;
  onReturnToMenu: () => void;
}

export function PauseModal({
  hud,
  isTouchMode,
  hasSaveData,
  onResume,
  onSaveGame,
  onLoadGame,
  onOpenSettings,
  onReturnToMenu,
}: PauseModalProps) {
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSave = () => {
    const ok = onSaveGame();
    setSaveNotice(ok ? `Saved (Day ${hud.day} · ${hud.formattedTime})` : 'Save unavailable');
    window.setTimeout(() => setSaveNotice(null), 2600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/78 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-h-[92dvh] overflow-y-auto touch-pan-y bg-[#10151f] border border-stone-700/70 rounded-xl shadow-2xl ${
          isCompactLandscape ? 'max-w-md p-4' : 'max-w-sm p-6'
        }`}
      >
        <h2
          id="pause-title"
          className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-stone-100 mb-1"
        >
          PAUSED
        </h2>
        <p className={`text-xs text-stone-400 font-mono-tabular ${isCompactLandscape ? 'mb-3' : 'mb-5'}`}>
          Day {hud.day} · {hud.formattedTime} · {hud.weatherLabel}
        </p>

        <div className={isCompactLandscape ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-3'}>
          <button
            type="button"
            onClick={onResume}
            className={`h-11 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 ${
              isCompactLandscape ? 'col-span-2' : ''
            }`}
          >
            Resume
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="h-11 px-4 rounded-lg bg-[#171d2a] hover:bg-[#1f2738] border border-emerald-600/50 text-emerald-200 font-semibold text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 truncate"
          >
            {saveNotice ?? 'Save Game'}
          </button>

          {(hasSaveData || hud.missions.hasSaveData) && (
            <button
              type="button"
              onClick={onLoadGame}
              className="h-11 px-4 rounded-lg bg-[#171d2a] hover:bg-[#1f2738] border border-stone-700/80 text-stone-100 font-medium text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              Load Last Save
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="h-11 px-4 rounded-lg bg-[#171d2a] hover:bg-[#1f2738] border border-stone-700/80 text-stone-100 font-medium text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Settings
          </button>

          <button
            type="button"
            onClick={onReturnToMenu}
            className={`h-11 px-4 rounded-lg bg-transparent hover:bg-stone-800/70 border border-stone-700/60 text-stone-300 hover:text-stone-100 font-medium text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
              isCompactLandscape && !(hasSaveData || hud.missions.hasSaveData) ? '' : ''
            }`}
          >
            Main Menu
          </button>
        </div>

        <div
          className={`border-t border-stone-800 text-xs text-stone-400 font-mono-tabular text-center ${
            isCompactLandscape ? 'mt-3 pt-2.5' : 'mt-5 pt-4'
          }`}
        >
          {isTouchMode ? 'Tap Resume to continue' : 'Press Esc to resume'}
        </div>
      </div>
    </div>
  );
}
