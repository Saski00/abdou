import { HudSnapshot } from '../game/types';

interface GameOverModalProps {
  hud: HudSnapshot;
  reason: string;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export function GameOverModal({
  hud,
  reason,
  onRestart,
  onReturnToMenu,
}: GameOverModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#070507]/88 px-4 py-4"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
      }}
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto touch-pan-y bg-[#120d11] border border-rose-500/60 rounded-xl p-6 shadow-2xl">
        <h2
          id="gameover-title"
          className="font-display text-4xl font-bold tracking-wider text-rose-400 leading-none"
        >
          YOU DIED
        </h2>
        <p className="text-sm text-stone-300 mt-2 mb-5">{reason}</p>

        <div className="grid grid-cols-2 gap-3 mb-6 p-3.5 rounded-lg bg-[#0b090c] border border-stone-800">
          <div>
            <div className="text-[11px] text-stone-400">Survived</div>
            <div className="font-mono-tabular text-base font-bold text-stone-100">
              Day {hud.day} · {hud.formattedTime}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">Infected Defeated</div>
            <div className="font-mono-tabular text-base font-bold text-amber-300">
              {hud.zombiesDefeated}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">Supplies Carried</div>
            <div className="font-mono-tabular text-base font-bold text-stone-100">
              {hud.totalInventoryItems} items
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">Weather</div>
            <div className="text-base font-semibold text-stone-200">
              {hud.weatherLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="h-12 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-semibold text-sm tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            Restart Survival
          </button>

          <button
            type="button"
            onClick={onReturnToMenu}
            className="h-11 px-5 rounded-lg bg-transparent hover:bg-stone-800/70 border border-stone-700/70 text-stone-300 hover:text-stone-100 font-medium text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
