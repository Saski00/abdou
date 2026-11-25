import { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Compass,
  Lock,
  ScrollText,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { formatMoney } from '../game/economy';
import { useViewportLayout } from '../game/responsiveLayout';
import { RESOURCE_DEFINITIONS, RESOURCE_ORDER } from '../game/resources';
import { HudSnapshot, MissionSummary } from '../game/types';
import { LOCATION_BY_ID, getBearingLabel } from '../game/worldLocations';

interface MissionModalProps {
  hud: HudSnapshot;
  isTouchMode: boolean;
  onTrackMission: (missionId: string | null) => void;
  onClose: () => void;
}

type MissionTab = 'main' | 'side' | 'clues';

function formatRewardLine(mission: MissionSummary): string[] {
  const parts: string[] = [];
  if (mission.rewards.money && mission.rewards.money > 0) {
    parts.push(`+${formatMoney(mission.rewards.money)}`);
  }
  if (mission.rewards.resources) {
    for (const id of RESOURCE_ORDER) {
      const qty = mission.rewards.resources[id] ?? 0;
      if (qty > 0) {
        parts.push(`+${qty} ${RESOURCE_DEFINITIONS[id].name}`);
      }
    }
  }
  if (mission.rewards.clueTitle) {
    parts.push(`Clue: ${mission.rewards.clueTitle}`);
  }
  if (mission.rewards.unlockText) {
    parts.push(mission.rewards.unlockText);
  }
  return parts;
}

export function MissionModal({
  hud,
  isTouchMode,
  onTrackMission,
  onClose,
}: MissionModalProps) {
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const [tab, setTab] = useState<MissionTab>('main');
  const { missions } = hud;

  const mainMissions = useMemo(
    () =>
      missions.missions
        .filter((m) => m.category === 'main')
        .sort((a, b) => a.order - b.order),
    [missions.missions]
  );

  const sideMissions = useMemo(
    () =>
      missions.missions
        .filter((m) => m.category === 'side')
        .sort((a, b) => a.order - b.order),
    [missions.missions]
  );

  const visibleMissions = tab === 'main' ? mainMissions : sideMissions;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-modal-title"
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
          isCompactLandscape ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Header */}
        <div
          className={`border-b border-stone-800 flex items-start justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3.5 sm:px-6 sm:py-4'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="mission-modal-title"
                className={`font-display font-bold tracking-wider text-stone-100 leading-none truncate ${
                  isCompactLandscape ? 'text-xl' : 'text-2xl sm:text-3xl'
                }`}
              >
                THE ASHFALL SIGNAL
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 font-mono-tabular">
              Story {missions.mainCompletedCount}/{missions.mainTotalCount} · Side{' '}
              {missions.sideCompletedCount}/{missions.sideTotalCount} · Clues{' '}
              {missions.clues.length}
              {missions.endingCompleted ? ' · Beacon Online' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close missions log"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`border-b border-stone-800/80 flex items-center gap-2 shrink-0 overflow-x-auto ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 sm:px-6 pt-3 pb-2'
          }`}
        >
          <button
            type="button"
            onClick={() => setTab('main')}
            className={`h-11 px-3.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              tab === 'main'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'bg-[#141b27] text-stone-300 hover:text-stone-100 border border-stone-700/70'
            }`}
          >
            <ScrollText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Main Story</span>
            <span className="font-mono-tabular text-[11px] opacity-80">
              {missions.mainCompletedCount}/{missions.mainTotalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('side')}
            className={`h-11 px-3.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              tab === 'side'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'bg-[#141b27] text-stone-300 hover:text-stone-100 border border-stone-700/70'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Side Missions</span>
            <span className="font-mono-tabular text-[11px] opacity-80">
              {missions.sideCompletedCount}/{missions.sideTotalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('clues')}
            className={`h-11 px-3.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              tab === 'clues'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'bg-[#141b27] text-stone-300 hover:text-stone-100 border border-stone-700/70'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Story Clues</span>
            <span className="font-mono-tabular text-[11px] opacity-80">
              {missions.clues.length}
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-4 sm:px-6 space-y-3">
          {tab === 'clues' ? (
            missions.clues.length === 0 ? (
              <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-6 text-center">
                <p className="text-sm text-stone-300 font-medium">No story clues recovered yet.</p>
                <p className="text-xs text-stone-400 mt-1">
                  Inspect radios, ledgers, and journals around District 04 to piece together what happened.
                </p>
              </div>
            ) : (
              missions.clues.map((clue) => (
                <div
                  key={clue.id}
                  className="rounded-lg border border-stone-700/70 bg-[#141b27] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-amber-300">{clue.title}</h3>
                    <span className="font-mono-tabular text-[11px] text-stone-400 shrink-0">
                      Day {clue.discoveredDay}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium">{clue.source}</p>
                  <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">{clue.body}</p>
                </div>
              ))
            )
          ) : (
            visibleMissions.map((mission) => {
              const isLocked = mission.status === 'locked';
              const isCompleted = mission.status === 'completed';
              const isTracked = mission.tracked;
              const canTrack = mission.status === 'active' || mission.status === 'available';
              const rewardLines = formatRewardLine(mission);

              return (
                <div
                  key={mission.id}
                  className={`rounded-lg border p-3.5 sm:p-4 transition-colors ${
                    isTracked
                      ? 'bg-[#161e2c] border-amber-500/75'
                      : isCompleted
                        ? 'bg-[#0e141b] border-emerald-700/45'
                        : isLocked
                          ? 'bg-[#0b0e14] border-stone-800/90 opacity-75'
                          : 'bg-[#141b27] border-stone-700/75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-stone-400">
                        <span className="text-amber-300/90 font-semibold">
                          {mission.chapterLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isCompleted
                              ? 'text-emerald-300 font-semibold'
                              : isLocked
                                ? 'text-stone-500'
                                : isTracked
                                  ? 'text-amber-300 font-semibold'
                                  : 'text-sky-300 font-semibold'
                          }
                        >
                          {isCompleted
                            ? 'Completed'
                            : isLocked
                              ? 'Locked'
                              : isTracked
                                ? 'Tracked'
                                : 'Active'}
                        </span>
                        {!isLocked && mission.targetZoneId && LOCATION_BY_ID[mission.targetZoneId] && (() => {
                          const z = LOCATION_BY_ID[mission.targetZoneId!];
                          const isKnown = hud.discoveredLocationIds.includes(z.id);
                          const dx = z.x - hud.playerX;
                          const dz = z.z - hud.playerZ;
                          const bearing = getBearingLabel(dx, dz);
                          const dist = Math.round(Math.hypot(dx, dz));
                          return (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-stone-400 truncate">
                                {isKnown ? `${z.shortName} (${bearing} ${dist}m)` : `Signal ${bearing} · ${dist}m`}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-stone-100 mt-0.5">
                        {isLocked ? 'Locked Story Chapter' : mission.title}
                      </h3>
                    </div>

                    {canTrack && (
                      <button
                        type="button"
                        onClick={() => onTrackMission(isTracked ? null : mission.id)}
                        className={`h-11 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                          isTracked
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'bg-[#0e121a] border border-stone-600/80 text-stone-200 hover:border-amber-400'
                        }`}
                      >
                        <Target className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{isTracked ? 'Tracking' : 'Track'}</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="h-9 px-2.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Done</span>
                      </span>
                    )}

                    {isLocked && (
                      <span className="h-9 px-2.5 rounded-md bg-stone-900 border border-stone-800 text-stone-500 text-xs font-medium flex items-center gap-1 shrink-0">
                        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-stone-300 mt-1.5 leading-relaxed">
                    {isLocked
                      ? 'Complete earlier story chapters to unlock this mission.'
                      : mission.description}
                  </p>

                  {!isLocked && (
                    <div className="mt-3 space-y-1.5 border-t border-stone-800/80 pt-2.5">
                      {mission.objectives.map((obj) => (
                        <div
                          key={obj.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {obj.completed ? (
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <Circle
                                className="w-3.5 h-3.5 text-amber-400/80 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className={`truncate ${
                                obj.completed ? 'text-stone-400 line-through' : 'text-stone-200'
                              }`}
                            >
                              {obj.optional ? 'Optional: ' : ''}
                              {obj.description}
                            </span>
                          </div>
                          <span
                            className={`font-mono-tabular font-semibold shrink-0 ${
                              obj.completed ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {Math.min(obj.current, obj.target)}/{obj.target}
                          </span>
                        </div>
                      ))}

                      {rewardLines.length > 0 && (
                        <div className="pt-1.5 text-[11px] text-stone-400 font-mono-tabular">
                          Rewards: <span className="text-emerald-300">{rewardLines.join(' · ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`border-t border-stone-800 flex items-center justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <span className="text-xs text-stone-400 font-mono-tabular">
            {isTouchMode ? 'Tap Track to pin on HUD' : 'M or Esc to close'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
