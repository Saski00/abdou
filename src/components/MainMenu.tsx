import { useEffect } from 'react';
import { formatMoney } from '../game/economy';
import { SavedGameSummary } from '../game/saveSystem';

interface MainMenuProps {
  savedSummary: SavedGameSummary | null;
  onContinueSaved: () => void;
  onPlay: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  hasActiveModal: boolean;
  isTouchMode: boolean;
}

export function MainMenu({
  savedSummary,
  onContinueSaved,
  onPlay,
  onOpenSettings,
  onOpenCredits,
  hasActiveModal,
  isTouchMode,
}: MainMenuProps) {
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
      className="fixed inset-0 z-20 flex flex-col justify-between bg-gradient-to-r from-[#090c12]/92 via-[#090c12]/65 to-transparent overflow-y-auto touch-pan-y"
      style={{
        paddingTop: 'max(24px, env(safe-area-inset-top))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
      }}
    >
      <div className="text-xs font-medium tracking-wider text-stone-400">
        District 04 · 3D Survival &amp; Story Mode
      </div>

      <div className="max-w-md my-auto py-4">
        <div className="mb-4 sm:mb-6">
          <svg
            viewBox="0 0 360 112"
            className="w-full max-w-[260px] sm:max-w-[340px] h-auto"
            role="img"
            aria-label="LAST SHOP"
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
            <line
              x1="2"
              y1="90"
              x2="296"
              y2="90"
              stroke="#44403c"
              strokeWidth="1.5"
            />
            <line
              x1="2"
              y1="90"
              x2="94"
              y2="90"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <p className="text-sm sm:text-base text-stone-300 leading-relaxed mb-6 sm:mb-8 max-w-sm">
          Rebuild The Last Shop, uncover what silenced District 04, and bring the North Roadblock beacon back online.
        </p>

        <nav aria-label="Main menu" className="flex flex-col gap-3 w-full max-w-[290px]">
          {savedSummary && (
            <button
              type="button"
              onClick={onContinueSaved}
              className="min-h-[54px] px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 transition-colors cursor-pointer text-left flex flex-col justify-center shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-base tracking-wide">Continue Saved Game</span>
                {!isTouchMode && (
                  <span className="text-xs font-mono-tabular opacity-75">Enter</span>
                )}
              </div>
              <span className="text-[11px] font-mono-tabular text-stone-900/85 truncate w-full mt-0.5">
                Day {savedSummary.day} · {savedSummary.formattedTime} · {formatMoney(savedSummary.money)} · Lv {savedSummary.shopLevel}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onPlay}
            className={`h-12 px-6 rounded-lg font-semibold text-base tracking-wide transition-colors cursor-pointer text-left flex items-center justify-between shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
              savedSummary
                ? 'bg-[#141923]/95 hover:bg-[#1c2331] border border-stone-700/80 text-stone-100'
                : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950'
            }`}
          >
            <span>{savedSummary ? 'New Game' : 'Play'}</span>
            {!savedSummary && !isTouchMode && (
              <span className="text-xs font-mono-tabular opacity-75">Enter</span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="h-11 px-6 rounded-lg bg-[#141923]/95 hover:bg-[#1c2331] border border-stone-700/70 hover:border-stone-500 text-stone-100 font-medium text-sm tracking-wide transition-colors cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Settings
          </button>

          <button
            type="button"
            onClick={onOpenCredits}
            className="h-11 px-6 rounded-lg bg-[#141923]/95 hover:bg-[#1c2331] border border-stone-700/70 hover:border-stone-500 text-stone-300 hover:text-stone-100 font-medium text-sm tracking-wide transition-colors cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Credits
          </button>
        </nav>
      </div>

      <div className="text-xs sm:text-sm text-stone-400 font-mono-tabular">
        {isTouchMode
          ? 'Left Stick Move · Drag Right Side Look · Interact, Missions & Bag'
          : 'WASD Move · Mouse Look · E Interact · M Missions · I Pack · F Light'}
      </div>
    </div>
  );
}
