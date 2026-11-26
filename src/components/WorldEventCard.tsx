import { MapPin, Radio, ShieldAlert, Store, Timer, Users, X } from 'lucide-react';
import { WorldEventBannerSummary, WorldEventCategory } from '../game/types';
import { formatTpl, useI18n } from '../i18n';

interface WorldEventCardProps {
  banner: WorldEventBannerSummary;
  goodwill: number;
  isTouchMode: boolean;
  onSelectChoice: (choiceId: string) => void;
  onDismiss: () => void;
  onClose: () => void;
}

function renderCategoryIcon(category: WorldEventCategory) {
  switch (category) {
    case 'shop':
      return <Store className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />;
    case 'survivor':
      return <Users className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />;
    case 'zombie_activity':
      return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />;
    case 'atmosphere':
      return <Radio className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />;
    case 'exploration':
    default:
      return <MapPin className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />;
  }
}

export function WorldEventCard({
  banner,
  goodwill,
  isTouchMode,
  onSelectChoice,
  onDismiss,
  onClose,
}: WorldEventCardProps) {
  const { dir, t } = useI18n();
  const ui = t.worldEvents.ui;
  const catLabel = t.worldEvents.categories[banner.category];

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-event-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/82 px-3 py-4 sm:px-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div className="w-full max-w-lg max-h-[90dvh] flex flex-col bg-[#0e141f] border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-300">
                {renderCategoryIcon(banner.category)}
                <span>{catLabel}</span>
              </span>
              <span className="text-stone-600" aria-hidden="true">
                ·
              </span>
              <span className="truncate text-stone-300">{banner.locationLabel}</span>
              {banner.secondsRemaining !== null && banner.secondsRemaining !== undefined && (
                <>
                  <span className="text-stone-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-sky-300">
                    <Timer className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <bdi dir="ltr">
                      {formatTpl(ui.secondsLeft, { sec: Math.ceil(banner.secondsRemaining) })}
                    </bdi>
                  </span>
                </>
              )}
              {goodwill > 0 && (
                <>
                  <span className="text-stone-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono-tabular text-emerald-300">
                    {formatTpl(ui.goodwillBadge, { level: goodwill })}
                  </span>
                </>
              )}
            </div>

            <h2
              id="world-event-title"
              className="font-display text-xl sm:text-2xl font-bold tracking-wide text-stone-100 mt-1.5 leading-tight"
            >
              {banner.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={ui.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body & Choices */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y px-4 py-4 sm:px-5 space-y-4">
          <p className="text-sm text-stone-200 leading-relaxed">{banner.description}</p>

          {banner.choices.length > 0 && (
            <div className="space-y-2.5">
              {banner.choices.map((choice) => {
                const isRisk = choice.tone === 'risk';
                const isPrimary = choice.tone === 'primary';
                const toneClasses = !choice.affordable
                  ? 'bg-[#111723] border-stone-800 text-stone-500 cursor-not-allowed'
                  : isPrimary
                    ? 'bg-amber-500/12 border-amber-500/60 hover:border-amber-400 hover:bg-amber-500/18 text-stone-100 cursor-pointer'
                    : isRisk
                      ? 'bg-rose-500/10 border-rose-500/50 hover:border-rose-400 hover:bg-rose-500/18 text-stone-100 cursor-pointer'
                      : 'bg-[#141c2a] border-stone-700/80 hover:border-stone-500 hover:bg-[#192334] text-stone-100 cursor-pointer';

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={!choice.affordable}
                    onClick={() => onSelectChoice(choice.id)}
                    className={`w-full min-h-[48px] px-4 py-3 rounded-lg border text-start transition-colors flex flex-col gap-0.5 focus-visible:outline-2 focus-visible:outline-amber-400 ${toneClasses}`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-sm font-semibold">{choice.label}</span>
                      {!choice.affordable && choice.disabledReason && (
                        <span className="text-[11px] font-mono-tabular text-rose-300/90 shrink-0">
                          {choice.disabledReason}
                        </span>
                      )}
                    </div>
                    {choice.hint && (
                      <span
                        className={`text-xs leading-snug ${
                          choice.affordable ? 'text-stone-400' : 'text-stone-500'
                        }`}
                      >
                        {choice.hint}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-5 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0 bg-[#0b1019]">
          <p className="text-[11px] text-stone-400 leading-snug">
            {isTouchMode ? ui.cardHint : ui.cardHint}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-stone-700 bg-[#141c2a] hover:bg-stone-800 text-stone-200 text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {ui.dismissBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
