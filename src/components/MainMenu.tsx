import { useEffect } from 'react';
import { Globe } from 'lucide-react';
import { formatMoney } from '../game/economy';
import { useViewportLayout } from '../game/responsiveLayout';
import { SavedGameSummary } from '../game/saveSystem';
import { GameLanguage } from '../game/types';
import { formatTpl, useI18n } from '../i18n';

interface MainMenuProps {
  savedSummary: SavedGameSummary | null;
  language?: GameLanguage;
  onChangeLanguage?: (lang: GameLanguage) => void;
  onContinueSaved: () => void;
  onPlay: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onOpenBenchmark?: () => void;
  hasActiveModal: boolean;
  isTouchMode: boolean;
}

export function MainMenu({
  savedSummary,
  language,
  onChangeLanguage,
  onContinueSaved,
  onPlay,
  onOpenSettings,
  onOpenCredits,
  onOpenBenchmark,
  hasActiveModal,
  isTouchMode,
}: MainMenuProps) {
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const { lang, dir, rtl, t } = useI18n();
  const activeLanguage = language ?? lang;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (hasActiveModal) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        if (savedSummary) {
          onContinueSaved();
        } else {
          onPlay();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasActiveModal, savedSummary, onContinueSaved, onPlay]);

  return (
    <div
      dir={dir}
      className={`fixed inset-0 z-20 flex flex-col justify-between ${
        rtl ? 'bg-gradient-to-l' : 'bg-gradient-to-r'
      } from-[#090c12]/92 via-[#090c12]/65 to-transparent overflow-y-auto touch-pan-y`}
      style={{
        paddingTop: isCompactLandscape
          ? 'max(14px, env(safe-area-inset-top))'
          : 'max(24px, env(safe-area-inset-top))',
        paddingBottom: isCompactLandscape
          ? 'max(14px, env(safe-area-inset-bottom))'
          : 'max(24px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
      }}
    >
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="text-xs font-medium tracking-wider text-stone-400">
          {t.mainMenu.badge}
        </div>

        {onChangeLanguage && (
          <div
            className="flex items-center gap-1 p-1 rounded-lg bg-[#10151f]/94 border border-stone-700/70 shrink-0"
            role="group"
            aria-label={t.mainMenu.languageLabel}
          >
            <Globe className="w-3.5 h-3.5 text-amber-400 ms-1.5 me-1 shrink-0" aria-hidden="true" />
            <button
              type="button"
              onClick={() => onChangeLanguage('en')}
              className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeLanguage === 'en'
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              {t.settingsModal.languageEnglish}
            </button>
            <button
              type="button"
              onClick={() => onChangeLanguage('ar')}
              className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeLanguage === 'ar'
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              {t.settingsModal.languageArabic}
            </button>
          </div>
        )}
      </div>

      <div
        className={`my-auto ${
          isCompactLandscape
            ? 'w-full max-w-3xl grid grid-cols-[1.15fr_1fr] items-center gap-6 py-2'
            : 'max-w-md py-4'
        }`}
      >
        <div>
          <div className={isCompactLandscape ? 'mb-2.5' : 'mb-4 sm:mb-6'} dir="ltr">
            <svg
              viewBox="0 0 360 112"
              className={`w-full h-auto ${
                isCompactLandscape ? 'max-w-[230px]' : 'max-w-[260px] sm:max-w-[340px]'
              }`}
              role="img"
              aria-label={t.mainMenu.title}
            >
              <rect x="2" y="10" width="44" height="4" rx="2" fill="#f59e0b" />
              <rect x="54" y="10" width="12" height="4" rx="2" fill="#78716c" />
              <text
                x="0"
                y="72"
                fill="#f5f5f4"
                fontFamily="'Barlow Condensed', sans-serif"
                fontWeight="700"
                fontSize="74"
                letterSpacing="4"
              >
                LAST SHOP
              </text>
              <line x1="2" y1="90" x2="296" y2="90" stroke="#44403c" strokeWidth="1.5" />
              <line x1="2" y1="90" x2="94" y2="90" stroke="#f59e0b" strokeWidth="2.5" />
            </svg>
            {rtl && (
              <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1" dir="rtl">
                {t.mainMenu.title}
              </div>
            )}
          </div>

          <p
            className={`text-stone-300 leading-relaxed max-w-sm ${
              isCompactLandscape ? 'text-xs mb-0' : 'text-sm sm:text-base mb-6 sm:mb-8'
            }`}
          >
            {t.mainMenu.subtitle}
          </p>
        </div>

        <nav
          aria-label={t.pauseModal.mainMenuBtn}
          className={`flex flex-col w-full ${
            isCompactLandscape ? 'gap-2 max-w-[280px] justify-self-end' : 'gap-3 max-w-[290px]'
          }`}
        >
          {savedSummary && (
            <button
              type="button"
              onClick={onContinueSaved}
              className={`${
                isCompactLandscape ? 'min-h-[48px] px-4 py-1.5' : 'min-h-[54px] px-5 py-2.5'
              } rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 transition-colors cursor-pointer text-start flex flex-col justify-center shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm sm:text-base tracking-wide">
                  {t.mainMenu.continueGame}
                </span>
                {!isTouchMode && (
                  <bdi dir="ltr" className="text-xs font-mono-tabular opacity-75">
                    {t.mainMenu.keyHintEnter}
                  </bdi>
                )}
              </div>
              <span className="text-[11px] font-mono-tabular text-stone-900/85 truncate w-full mt-0.5">
                {formatTpl(t.mainMenu.continueSubline, {
                  day: savedSummary.day,
                  time: savedSummary.formattedTime,
                  money: formatMoney(savedSummary.money),
                  level: savedSummary.shopLevel,
                })}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onPlay}
            className={`${
              isCompactLandscape ? 'h-11' : 'h-12'
            } px-5 rounded-lg font-semibold text-sm sm:text-base tracking-wide transition-colors cursor-pointer text-start flex items-center justify-between shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
              savedSummary
                ? 'bg-[#141923]/95 hover:bg-[#1c2331] border border-stone-700/80 text-stone-100'
                : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950'
            }`}
          >
            <span>{savedSummary ? t.mainMenu.newGame : t.mainMenu.playGame}</span>
            {!savedSummary && !isTouchMode && (
              <bdi dir="ltr" className="text-xs font-mono-tabular opacity-75">
                {t.mainMenu.keyHintEnter}
              </bdi>
            )}
          </button>

          <div className={isCompactLandscape ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-3'}>
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-11 px-5 rounded-lg bg-[#141923]/95 hover:bg-[#1c2331] border border-stone-700/70 hover:border-stone-500 text-stone-100 font-medium text-sm tracking-wide transition-colors cursor-pointer text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              {t.mainMenu.settings}
            </button>

            <button
              type="button"
              onClick={onOpenCredits}
              className="h-11 px-5 rounded-lg bg-[#141923]/95 hover:bg-[#1c2331] border border-stone-700/70 hover:border-stone-500 text-stone-300 hover:text-stone-100 font-medium text-sm tracking-wide transition-colors cursor-pointer text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              {t.mainMenu.credits}
            </button>
          </div>

          {onOpenBenchmark && (
            <button
              type="button"
              onClick={onOpenBenchmark}
              className="h-10 px-5 rounded-lg bg-[#0f141d]/90 hover:bg-[#19202e] border border-stone-800 hover:border-stone-600 text-stone-400 hover:text-stone-200 font-medium text-xs tracking-wide transition-colors cursor-pointer text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Graphics Benchmark
            </button>
          )}
        </nav>
      </div>

      <div className="text-[11px] sm:text-sm text-stone-400 font-mono-tabular shrink-0">
        {isTouchMode ? t.mainMenu.controlsFooterTouch : t.mainMenu.controlsFooterDesktop}
      </div>
    </div>
  );
}
