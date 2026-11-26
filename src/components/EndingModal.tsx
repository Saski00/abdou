import { Award, CheckCircle2, RadioTower } from 'lucide-react';
import { formatMoney } from '../game/economy';
import { useViewportLayout } from '../game/responsiveLayout';
import { HudSnapshot } from '../game/types';
import { formatTpl, useI18n } from '../i18n';

interface EndingModalProps {
  hud: HudSnapshot;
  onContinuePlaying: () => void;
  onReturnToMenu: () => void;
}

export function EndingModal({
  hud,
  onContinuePlaying,
  onReturnToMenu,
}: EndingModalProps) {
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const { dir, t } = useI18n();
  const endingSummary = hud.missions.endingSummary;

  const badgeText = endingSummary?.badge ?? t.endingModal.badge;
  const titleText = endingSummary?.title ?? t.endingModal.title;
  const bodyText = endingSummary?.body ?? t.endingModal.body;
  const epilogueLines = endingSummary?.epilogueLines ?? [];

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ending-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/88 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-h-[92dvh] flex flex-col bg-[#10151f] border border-amber-500/70 rounded-xl shadow-2xl overflow-hidden ${
          isCompactLandscape ? 'max-w-2xl' : 'max-w-xl'
        }`}
      >
        <div
          className={`border-b border-stone-800 bg-[#141b27] shrink-0 ${
            isCompactLandscape ? 'px-4 py-3' : 'px-5 py-5 sm:px-7'
          }`}
        >
          <div className="flex items-center gap-2.5 text-amber-400 text-xs font-mono-tabular uppercase tracking-widest mb-1.5">
            <RadioTower className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{badgeText}</span>
          </div>
          <h2
            id="ending-modal-title"
            className="font-display text-3xl sm:text-4xl font-bold tracking-wider text-stone-100 leading-none"
          >
            {titleText}
          </h2>
          <p className="text-sm text-stone-300 mt-2.5 leading-relaxed">{bodyText}</p>
        </div>

        <div className="flex-1 overflow-y-auto touch-pan-y px-5 py-4 sm:px-7 space-y-4">
          {epilogueLines.length > 0 && (
            <div className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                {t.narrative.epilogueHeading}
              </div>
              <ul className="space-y-1.5">
                {epilogueLines.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-xs sm:text-sm text-stone-200 leading-relaxed"
                  >
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">{t.endingModal.statDaysSurvived}</div>
              <div className="font-mono-tabular text-lg font-bold text-amber-300 mt-0.5">
                {formatTpl(t.endingModal.statDayValue, { day: hud.day })}
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">{t.endingModal.statShopLevel}</div>
              <div className="font-mono-tabular text-lg font-bold text-stone-100 mt-0.5">
                {formatTpl(t.endingModal.statLvValue, { level: hud.shop.shopLevel })}
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">{t.endingModal.statCashBalance}</div>
              <div className="font-mono-tabular text-lg font-bold text-emerald-300 mt-0.5">
                <bdi dir="ltr">{formatMoney(hud.money)}</bdi>
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">{t.endingModal.statTotalRevenue}</div>
              <div className="font-mono-tabular text-lg font-bold text-emerald-300 mt-0.5">
                <bdi dir="ltr">{formatMoney(hud.shop.totalRevenueEarned)}</bdi>
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">{t.endingModal.statShopStaff}</div>
              <div className="font-mono-tabular text-lg font-bold text-sky-300 mt-0.5">
                {formatTpl(t.endingModal.statHiredValue, { count: hud.staff.employees.length })}
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">{t.endingModal.statStoryClues}</div>
              <div className="font-mono-tabular text-lg font-bold text-amber-300 mt-0.5">
                {formatTpl(t.endingModal.statLoggedValue, { count: hud.missions.clues.length })}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm text-emerald-200">
            <Award className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {formatTpl(t.endingModal.mainStoryCompleteBanner, {
                done: hud.missions.mainCompletedCount,
                total: hud.missions.mainTotalCount,
              })}
            </span>
          </div>
        </div>

        <div
          className={`border-t border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2.5' : 'px-5 py-4 sm:px-7'
          }`}
        >
          <button
            type="button"
            onClick={onReturnToMenu}
            className="h-11 px-5 rounded-lg border border-stone-700 bg-[#141b27] hover:bg-[#1c2536] text-stone-200 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
          >
            {t.endingModal.saveAndMenuBtn}
          </button>
          <button
            type="button"
            onClick={onContinuePlaying}
            className="h-11 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold cursor-pointer transition-colors"
          >
            {t.endingModal.continueExploringBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
