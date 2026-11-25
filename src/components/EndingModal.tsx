import { Award, RadioTower } from 'lucide-react';
import { formatMoney } from '../game/economy';
import { useViewportLayout } from '../game/responsiveLayout';
import { HudSnapshot } from '../game/types';

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

  return (
    <div
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
            <span>148.6 MHz · District 04 Beacon Online</span>
          </div>
          <h2
            id="ending-modal-title"
            className="font-display text-3xl sm:text-4xl font-bold tracking-wider text-stone-100 leading-none"
          >
            THE ASHFALL SIGNAL RESTORED
          </h2>
          <p className="text-sm text-stone-300 mt-2.5 leading-relaxed">
            Your repaired relay cuts across the ash clouds above Main Boulevard. Within minutes,
            survivor outposts along the valley confirm the 148.6 MHz all-clear carrier—marking The
            Last Shop as District 04&apos;s anchor haven for trade, shelter, and rebuilding.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto touch-pan-y px-5 py-4 sm:px-7 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">Days Survived</div>
              <div className="font-mono-tabular text-lg font-bold text-amber-300 mt-0.5">
                Day {hud.day}
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">Shop Level</div>
              <div className="font-mono-tabular text-lg font-bold text-stone-100 mt-0.5">
                Lv {hud.shop.shopLevel}
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">Cash Balance</div>
              <div className="font-mono-tabular text-lg font-bold text-emerald-300 mt-0.5">
                {formatMoney(hud.money)}
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">Total Revenue</div>
              <div className="font-mono-tabular text-lg font-bold text-emerald-300 mt-0.5">
                {formatMoney(hud.shop.totalRevenueEarned)}
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">Shop Staff</div>
              <div className="font-mono-tabular text-lg font-bold text-sky-300 mt-0.5">
                {hud.staff.employees.length} Hired
              </div>
            </div>

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3">
              <div className="text-[11px] text-stone-400">Story Clues</div>
              <div className="font-mono-tabular text-lg font-bold text-amber-300 mt-0.5">
                {hud.missions.clues.length} Logged
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm text-emerald-200">
            <Award className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Main Story Complete ({hud.missions.mainCompletedCount}/{hud.missions.mainTotalCount}).
              District 04 remains open—keep growing your store, finishing side missions, and
              managing staff.
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
            Save &amp; Main Menu
          </button>
          <button
            type="button"
            onClick={onContinuePlaying}
            className="h-11 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold cursor-pointer transition-colors"
          >
            Continue Exploring &amp; Trading
          </button>
        </div>
      </div>
    </div>
  );
}
