import {
  AlertTriangle,
  BookOpen,
  FileText,
  Lock,
  Package,
  Radio,
  RadioTower,
  X,
} from 'lucide-react';
import { useViewportLayout } from '../game/responsiveLayout';
import { RESOURCE_ORDER } from '../game/resources';
import { InventoryState, StoryEndingId, StoryObjectInspectionData } from '../game/types';
import { formatTpl, tResource, useI18n } from '../i18n';

interface StoryNoteModalProps {
  data: StoryObjectInspectionData;
  inventory: InventoryState;
  isTouchMode: boolean;
  onPerformAction: (objectId: string, endingChoiceId?: StoryEndingId) => void;
  onClose: () => void;
}

export function StoryNoteModal({
  data,
  inventory,
  isTouchMode,
  onPerformAction,
  onClose,
}: StoryNoteModalProps) {
  const { dir, t } = useI18n();
  const noteCopy = t.storyNoteModal;
  const narCopy = t.narrative;
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const Icon =
    data.category === 'radio'
      ? Radio
      : data.category === 'relay'
        ? RadioTower
        : data.category === 'cache'
          ? Package
          : FileText;

  const requiredEntries = data.requiresResources
    ? RESOURCE_ORDER.filter((id) => (data.requiresResources?.[id] ?? 0) > 0)
    : [];
  const hasBroadcastChoices = Boolean(data.broadcastChoices && data.broadcastChoices.length > 0);

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-note-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/84 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-h-[92dvh] flex flex-col bg-[#10151f] border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden ${
          isCompactLandscape ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        {/* Header */}
        <div
          className={`border-b border-stone-800 flex items-start justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2.5' : 'px-4 py-3.5 sm:px-6 sm:py-4'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="story-note-title"
                className="font-display text-2xl font-bold tracking-wider text-stone-100 leading-none truncate"
              >
                {data.title.toUpperCase()}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 truncate">{data.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={noteCopy.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-4 sm:px-6 space-y-4">
          {data.loggedClueTitle && (
            <div className="rounded-lg border border-emerald-500/45 bg-emerald-500/10 px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-200">
              <BookOpen className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
              <span>{formatTpl(narCopy.clueLoggedBadge, { title: data.loggedClueTitle })}</span>
            </div>
          )}

          <div className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-4">
            <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-line">
              {data.body}
            </p>
          </div>

          {requiredEntries.length > 0 && !data.alreadyActivated && (
            <div className="rounded-lg border border-stone-700/80 bg-[#141b27] divide-y divide-stone-800">
              {requiredEntries.map((resId) => {
                const req = data.requiresResources?.[resId] ?? 0;
                const have = inventory[resId] ?? 0;
                const met = have >= req;
                return (
                  <div
                    key={resId}
                    className="px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <span className="text-stone-200 font-medium">{tResource(resId).name}</span>
                    <span
                      className={`font-mono-tabular font-bold ${
                        met ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {formatTpl(noteCopy.needHaveQty, { req, have })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {hasBroadcastChoices && data.broadcastChoices && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <RadioTower className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{narCopy.relayChoiceHeading}</span>
              </div>
              <div className="space-y-2">
                {data.broadcastChoices.map((choice) => {
                  const accentClass =
                    choice.tone === 'truth'
                      ? 'border-sky-500/55 hover:border-sky-400 bg-[#111c2b]'
                      : choice.tone === 'fortress'
                        ? 'border-rose-500/55 hover:border-rose-400 bg-[#20141a]'
                        : 'border-amber-500/60 hover:border-amber-400 bg-[#191712]';
                  return (
                    <button
                      key={choice.endingId}
                      type="button"
                      disabled={!choice.unlocked}
                      onClick={() => onPerformAction(data.id, choice.endingId)}
                      className={`w-full rounded-lg border p-3.5 text-start transition-colors ${
                        choice.unlocked
                          ? `${accentClass} cursor-pointer`
                          : 'bg-[#0b0e15] border-stone-800 opacity-75 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-stone-100">{choice.title}</span>
                        {!choice.unlocked && (
                          <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-amber-300/90 mt-0.5">
                        {choice.subtitle}
                      </div>
                      <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                        {choice.description}
                      </p>
                      {!choice.unlocked && choice.lockedReason && (
                        <p className="text-[11px] text-rose-300/90 mt-1.5 font-medium">
                          {choice.lockedReason}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {data.actionDisabledReason && (
            <div className="rounded-lg border border-amber-500/45 bg-[#1b1710] px-3.5 py-2.5 flex items-center gap-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{data.actionDisabledReason}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`border-t border-stone-800 flex items-center justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <span className="text-xs text-stone-400 font-mono-tabular">
            {isTouchMode ? noteCopy.footerTouch : noteCopy.footerDesktop}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {noteCopy.closeBtn}
            </button>
            {data.actionLabel && !hasBroadcastChoices && (
              <button
                type="button"
                disabled={Boolean(data.actionDisabledReason)}
                onClick={() => onPerformAction(data.id)}
                className={`h-11 px-4 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                  data.actionDisabledReason
                    ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                }`}
              >
                {data.actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
