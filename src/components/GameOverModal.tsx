import { useViewportLayout } from '../game/responsiveLayout';
import { HudSnapshot } from '../game/types';
import { formatTpl, useI18n } from '../i18n';

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
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const { dir, t } = useI18n();

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#070507]/88 px-4 py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(14px, env(safe-area-inset-left))',
        paddingRight: 'max(14px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-h-[92dvh] overflow-y-auto touch-pan-y bg-[#120d11] border border-rose-500/60 rounded-xl shadow-2xl ${
          isCompactLandscape ? 'max-w-lg p-4' : 'max-w-md p-6'
        }`}
      >
        <h2
          id="gameover-title"
          className={`font-display font-bold tracking-wider text-rose-400 leading-none ${
            isCompactLandscape ? 'text-3xl' : 'text-4xl'
          }`}
        >
          {t.gameOverModal.title}
        </h2>
        <p className={`text-sm text-stone-300 mt-1.5 ${isCompactLandscape ? 'mb-3' : 'mb-5'}`}>
          {reason || t.gameOverModal.fallbackReason}
        </p>

        <div
          className={`grid gap-3 p-3 rounded-lg bg-[#0b090c] border border-stone-800 ${
            isCompactLandscape ? 'grid-cols-4 mb-3' : 'grid-cols-2 mb-6 p-3.5'
          }`}
        >
          <div>
            <div className="text-[11px] text-stone-400">{t.gameOverModal.survivedLabel}</div>
            <div className="font-mono-tabular text-base font-bold text-stone-100">
              {formatTpl(t.gameOverModal.survivedValue, {
                day: hud.day,
                time: hud.formattedTime,
              })}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">
              {t.gameOverModal.infectedDefeatedLabel}
            </div>
            <div className="font-mono-tabular text-base font-bold text-amber-300">
              <bdi dir="ltr">{hud.zombiesDefeated}</bdi>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">
              {t.gameOverModal.suppliesCarriedLabel}
            </div>
            <div className="font-mono-tabular text-base font-bold text-stone-100">
              {formatTpl(t.gameOverModal.suppliesCarriedValue, {
                count: hud.totalInventoryItems,
              })}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">{t.gameOverModal.weatherLabel}</div>
            <div className="text-base font-semibold text-stone-200">{hud.weatherLabel}</div>
          </div>
        </div>

        <div className={isCompactLandscape ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
          <button
            type="button"
            onClick={onRestart}
            className="h-12 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-semibold text-sm tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            {t.gameOverModal.restartBtn}
          </button>

          <button
            type="button"
            onClick={onReturnToMenu}
            className="h-11 px-5 rounded-lg bg-transparent hover:bg-stone-800/70 border border-stone-700/70 text-stone-300 hover:text-stone-100 font-medium text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {t.gameOverModal.mainMenuBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
