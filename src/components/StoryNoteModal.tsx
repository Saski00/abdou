import { AlertTriangle, FileText, Package, Radio, RadioTower, X } from 'lucide-react';
import { useViewportLayout } from '../game/responsiveLayout';
import { RESOURCE_DEFINITIONS, RESOURCE_ORDER } from '../game/resources';
import { InventoryState, StoryObjectInspectionData } from '../game/types';

interface StoryNoteModalProps {
  data: StoryObjectInspectionData;
  inventory: InventoryState;
  isTouchMode: boolean;
  onPerformAction: (objectId: string) => void;
  onClose: () => void;
}

export function StoryNoteModal({
  data,
  inventory,
  isTouchMode,
  onPerformAction,
  onClose,
}: StoryNoteModalProps) {
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

  return (
    <div
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
            aria-label="Close inspection"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-4 sm:px-6 space-y-4">
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
                    <span className="text-stone-200 font-medium">
                      {RESOURCE_DEFINITIONS[resId].name}
                    </span>
                    <span
                      className={`font-mono-tabular font-bold ${
                        met ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      Need {req} (Have {have})
                    </span>
                  </div>
                );
              })}
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
            {isTouchMode ? 'Tap Close when ready' : 'Esc to close'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Close
            </button>
            {data.actionLabel && (
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
