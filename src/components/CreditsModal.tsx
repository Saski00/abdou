import { X } from 'lucide-react';
import { useViewportLayout } from '../game/responsiveLayout';
import { useI18n } from '../i18n';

interface CreditsModalProps {
  onClose: () => void;
}

export function CreditsModal({ onClose }: CreditsModalProps) {
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const { dir, t } = useI18n();

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a0f]/82 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-w-md max-h-[92dvh] overflow-y-auto touch-pan-y bg-[#10151f] border border-stone-700/70 rounded-xl shadow-2xl ${
          isCompactLandscape ? 'p-4' : 'p-6'
        }`}
      >
        <div className={`flex items-center justify-between gap-4 ${isCompactLandscape ? 'mb-3' : 'mb-5'}`}>
          <h2
            id="credits-title"
            className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-stone-100"
          >
            {t.creditsModal.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.creditsModal.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
          <div>
            <div className="font-semibold text-stone-100">{t.creditsModal.gameName}</div>
            <div className="text-xs text-stone-400">{t.creditsModal.tagline}</div>
          </div>

          <div className="pt-3 border-t border-stone-800 space-y-2 text-xs text-stone-400">
            <div className="flex justify-between gap-4">
              <span>{t.creditsModal.rowEngineLabel}</span>
              <span className="text-stone-200 text-end">{t.creditsModal.rowEngineValue}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t.creditsModal.rowAssetLabel}</span>
              <span className="text-stone-200 text-end">{t.creditsModal.rowAssetValue}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t.creditsModal.rowAudioLabel}</span>
              <span className="text-stone-200 text-end">{t.creditsModal.rowAudioValue}</span>
            </div>
          </div>
        </div>

        <div className={`${isCompactLandscape ? 'mt-4' : 'mt-6'} flex justify-end`}>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium text-sm transition-colors cursor-pointer"
          >
            {t.creditsModal.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
