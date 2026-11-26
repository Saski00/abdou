import { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Compass,
  GitBranch,
  HeartHandshake,
  Lock,
  MessageSquare,
  ScrollText,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import { formatMoney } from '../game/economy';
import { useViewportLayout } from '../game/responsiveLayout';
import { RESOURCE_ORDER } from '../game/resources';
import { HudSnapshot, MissionSummary, StoryActId } from '../game/types';
import { LOCATION_BY_ID, getLocalizedBearingLabel, getLocalizedLocation } from '../game/worldLocations';
import { formatTpl, tClue, tMission, tResourceName, tStoryAct, useI18n } from '../i18n';

interface MissionModalProps {
  hud: HudSnapshot;
  isTouchMode: boolean;
  onTrackMission: (missionId: string | null) => void;
  onTalkToSurvivor?: (survivorId: string) => void;
  onClose: () => void;
}

type MissionTab = 'main' | 'side' | 'clues' | 'crew';

const STORY_ACT_ORDER: StoryActId[] = [
  'act1_shelter',
  'act2_investigation',
  'act3_convergence',
];

export function MissionModal({
  hud,
  isTouchMode,
  onTrackMission,
  onTalkToSurvivor,
  onClose,
}: MissionModalProps) {
  const { dir, t } = useI18n();
  const misCopy = t.missionModal;
  const narCopy = t.narrative;
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const [tab, setTab] = useState<MissionTab>('main');
  const { missions } = hud;

  const formatRewardLine = (mission: MissionSummary): string[] => {
    const parts: string[] = [];
    const mLoc = tMission(mission.id);
    if (mission.rewards.money && mission.rewards.money > 0) {
      parts.push(`+${formatMoney(mission.rewards.money)}`);
    }
    if (mission.rewards.resources) {
      for (const id of RESOURCE_ORDER) {
        const qty = mission.rewards.resources[id] ?? 0;
        if (qty > 0) {
          parts.push(`+${qty} ${tResourceName(id, qty)}`);
        }
      }
    }
    if (mission.rewards.clueId) {
      const cLoc = tClue(mission.rewards.clueId);
      const clueTitle = cLoc?.title ?? mission.rewards.clueTitle;
      if (clueTitle) {
        parts.push(formatTpl(misCopy.clueRewardPrefix, { title: clueTitle }));
      }
    } else if (mission.rewards.clueTitle) {
      parts.push(formatTpl(misCopy.clueRewardPrefix, { title: mission.rewards.clueTitle }));
    }
    const unlockText = mLoc?.unlockText ?? mission.rewards.unlockText;
    if (unlockText) {
      parts.push(unlockText);
    }
    return parts;
  };

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

  const actStats = useMemo(() => {
    return STORY_ACT_ORDER.map((actId) => {
      const items = mainMissions.filter((m) => m.actId === actId);
      const done = items.filter((m) => m.status === 'completed').length;
      const active = items.some((m) => m.status === 'active' || m.status === 'available');
      return {
        actId,
        done,
        total: items.length,
        completed: items.length > 0 && done >= items.length,
        active,
      };
    });
  }, [mainMissions]);

  const characters = missions.characters ?? [];
  const recordedChoices = missions.recordedChoices ?? [];
  const visibleMissions = tab === 'main' ? mainMissions : sideMissions;

  return (
    <div
      dir={dir}
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
                className={`font-display font-bold tracking-wider text-stone-100 leading-none truncate uppercase ${
                  isCompactLandscape ? 'text-xl' : 'text-2xl sm:text-3xl'
                }`}
              >
                {misCopy.headerTitle}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 font-mono-tabular">
              {formatTpl(misCopy.headerSummary, {
                mainDone: missions.mainCompletedCount,
                mainTotal: missions.mainTotalCount,
                sideDone: missions.sideCompletedCount,
                sideTotal: missions.sideTotalCount,
                clues: missions.clues.length,
              })}
              {missions.endingCompleted ? misCopy.beaconOnlineSuffix : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={misCopy.closeAria}
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
            <span>{misCopy.tabMainStory}</span>
            <bdi dir="ltr" className="font-mono-tabular text-[11px] opacity-80">
              {missions.mainCompletedCount}/{missions.mainTotalCount}
            </bdi>
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
            <span>{misCopy.tabSideMissions}</span>
            <bdi dir="ltr" className="font-mono-tabular text-[11px] opacity-80">
              {missions.sideCompletedCount}/{missions.sideTotalCount}
            </bdi>
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
            <span>{misCopy.tabStoryClues}</span>
            <bdi dir="ltr" className="font-mono-tabular text-[11px] opacity-80">
              {missions.clues.length}
            </bdi>
          </button>

          <button
            type="button"
            onClick={() => setTab('crew')}
            className={`h-11 px-3.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              tab === 'crew'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'bg-[#141b27] text-stone-300 hover:text-stone-100 border border-stone-700/70'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{narCopy.tabJournalCrew}</span>
            <bdi dir="ltr" className="font-mono-tabular text-[11px] opacity-80">
              {recordedChoices.length}
            </bdi>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-4 sm:px-6 space-y-3">
          {tab === 'crew' ? (
            <div className="space-y-4">
              {/* Story Acts Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  {narCopy.actsHeading}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {actStats.map((act) => {
                    const actLoc = tStoryAct(act.actId);
                    return (
                      <div
                        key={act.actId}
                        className={`rounded-lg border p-3 ${
                          act.completed
                            ? 'bg-[#0e1915] border-emerald-600/50'
                            : act.active
                              ? 'bg-[#161e2c] border-amber-500/60'
                              : 'bg-[#0b0e15] border-stone-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-stone-100 truncate">
                            {actLoc.title}
                          </span>
                          <bdi
                            dir="ltr"
                            className={`font-mono-tabular text-[11px] font-bold shrink-0 ${
                              act.completed
                                ? 'text-emerald-300'
                                : act.active
                                  ? 'text-amber-300'
                                  : 'text-stone-500'
                            }`}
                          >
                            {act.done}/{act.total}
                          </bdi>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                          {actLoc.subtitle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ending Summary if completed */}
              {missions.endingSummary && (
                <div className="rounded-lg border border-amber-500/55 bg-[#191610] p-3.5 space-y-1">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-300">
                    {narCopy.endingStatusHeading} · {missions.endingSummary.badge}
                  </div>
                  <div className="text-sm font-bold text-stone-100">
                    {missions.endingSummary.title}
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {missions.endingSummary.epilogueLines[0]}
                  </p>
                </div>
              )}

              {/* District Survivors & Crew Dossiers */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  {narCopy.crewDossiersHeading}
                </h3>
                <div className="space-y-2.5">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      className={`rounded-lg border p-3.5 space-y-2 ${
                        char.recruited
                          ? 'bg-[#111c24] border-emerald-500/40'
                          : 'bg-[#141b27] border-stone-700/75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-stone-100">{char.name}</span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                char.recruited
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                  : 'bg-stone-800 border-stone-700 text-stone-300'
                              }`}
                            >
                              {char.recruited
                                ? formatTpl(narCopy.recruitedAsBadge, {
                                    role: char.professionLabel ?? '',
                                  })
                                  : formatTpl(narCopy.inDistrictBadge, {
                                      loc: char.locationLabel,
                                    })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-mono-tabular text-sky-300">
                            <span className="inline-flex items-center gap-1">
                              <HeartHandshake className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span>{char.trustTierLabel}</span>
                              <bdi dir="ltr">({char.trust}/3)</bdi>
                            </span>
                            <span className="text-stone-400">
                              {formatTpl(narCopy.topicsProgress, {
                                done: char.topicsCompleted,
                                total: char.totalTopics,
                              })}
                            </span>
                          </div>
                        </div>

                        {char.recruited && onTalkToSurvivor && (
                          <button
                            type="button"
                            onClick={() => onTalkToSurvivor(char.id)}
                            className={`h-11 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                              char.activeTopic
                                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
                                : 'bg-[#0b0e15] border border-stone-600 text-stone-200 hover:border-amber-400'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{narCopy.talkBtn}</span>
                          </button>
                        )}
                      </div>

                      {char.bio && (
                        <p className="text-xs text-stone-300 leading-relaxed">{char.bio}</p>
                      )}
                      {char.currentStatusNote && (
                        <p className="text-[11px] text-sky-200/90 border-t border-stone-800/80 pt-1.5 leading-snug">
                          {char.currentStatusNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recorded Decisions & Consequences */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>{narCopy.recordedChoicesHeading}</span>
                </h3>
                {recordedChoices.length === 0 ? (
                  <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-4 text-center">
                    <p className="text-xs sm:text-sm text-stone-300 font-medium">
                      {narCopy.noChoicesYetTitle}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">{narCopy.noChoicesYetDesc}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recordedChoices.map((ch) => (
                      <div
                        key={ch.choiceId}
                        className="rounded-lg border border-stone-700/70 bg-[#141b27] p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-300">{ch.title}</span>
                          <span className="font-mono-tabular text-[11px] text-stone-400 shrink-0">
                            {formatTpl(narCopy.dayBadge, { day: ch.day })}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-stone-100">
                          {ch.optionLabel}
                        </div>
                        {ch.consequenceSummary && (
                          <p className="text-xs text-stone-400 leading-snug">
                            {ch.consequenceSummary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'clues' ? (
            missions.clues.length === 0 ? (
              <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-6 text-center">
                <p className="text-sm text-stone-300 font-medium">{misCopy.noCluesTitle}</p>
                <p className="text-xs text-stone-400 mt-1">{misCopy.noCluesDesc}</p>
              </div>
            ) : (
              missions.clues.map((clue) => {
                const cLoc = tClue(clue.id);
                return (
                  <div
                    key={clue.id}
                    className="rounded-lg border border-stone-700/70 bg-[#141b27] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-amber-300">
                        {cLoc?.title ?? clue.title}
                      </h3>
                      <span className="font-mono-tabular text-[11px] text-stone-400 shrink-0">
                        {formatTpl(t.common.dayLabel, { day: clue.discoveredDay })}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 font-medium">
                      {cLoc?.source ?? clue.source}
                    </p>
                    <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                      {cLoc?.body ?? clue.body}
                    </p>
                  </div>
                );
              })
            )
          ) : (
            visibleMissions.map((mission) => {
              const isLocked = mission.status === 'locked';
              const isCompleted = mission.status === 'completed';
              const isTracked = mission.tracked;
              const canTrack = mission.status === 'active' || mission.status === 'available';
              const rewardLines = formatRewardLine(mission);
              const mLoc = tMission(mission.id);
              const actLoc = mission.actId ? tStoryAct(mission.actId) : null;

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
                      <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-stone-400 flex-wrap">
                        {actLoc && (
                          <>
                            <span className="text-stone-400">{actLoc.title}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span className="text-amber-300/90 font-semibold">
                          {mLoc?.chapterLabel ?? mission.chapterLabel}
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
                            ? misCopy.completedBadge
                            : isLocked
                              ? misCopy.lockedBadge
                              : isTracked
                                ? misCopy.trackedBadge
                                : misCopy.activeBadge}
                        </span>
                        {!isLocked && mission.targetZoneId && LOCATION_BY_ID[mission.targetZoneId] && (() => {
                          const z =
                            getLocalizedLocation(mission.targetZoneId!) ??
                            LOCATION_BY_ID[mission.targetZoneId!];
                          const isKnown = hud.discoveredLocationIds.includes(z.id);
                          const dx = z.x - hud.playerX;
                          const dz = z.z - hud.playerZ;
                          const bearing = getLocalizedBearingLabel(dx, dz);
                          const dist = Math.round(Math.hypot(dx, dz));
                          return (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-stone-400 truncate">
                                {isKnown
                                  ? formatTpl(misCopy.knownBearingDist, {
                                      name: z.shortName,
                                      bearing,
                                      dist,
                                    })
                                  : formatTpl(misCopy.signalBearingDist, { bearing, dist })}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-stone-100 mt-0.5">
                        {isLocked ? misCopy.lockedChapterTitle : (mLoc?.title ?? mission.title)}
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
                        <span>{isTracked ? misCopy.trackingBtn : misCopy.trackBtn}</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="h-9 px-2.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{misCopy.doneBadge}</span>
                      </span>
                    )}

                    {isLocked && (
                      <span className="h-9 px-2.5 rounded-md bg-stone-900 border border-stone-800 text-stone-500 text-xs font-medium flex items-center gap-1 shrink-0">
                        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{misCopy.lockedBadge}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-stone-300 mt-1.5 leading-relaxed">
                    {isLocked
                      ? misCopy.lockedChapterDesc
                      : (mLoc?.description ?? mission.description)}
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
                              {obj.optional ? misCopy.optionalPrefix : ''}
                              {mLoc?.objectiveLabels[obj.id] ?? obj.description}
                            </span>
                          </div>
                          <bdi
                            dir="ltr"
                            className={`font-mono-tabular font-semibold shrink-0 ${
                              obj.completed ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {Math.min(obj.current, obj.target)}/{obj.target}
                          </bdi>
                        </div>
                      ))}

                      {rewardLines.length > 0 && (
                        <div className="pt-1.5 text-[11px] text-stone-400 font-mono-tabular">
                          {misCopy.rewardsPrefix}{' '}
                          <span className="text-emerald-300">{rewardLines.join(' · ')}</span>
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
          <span className="text-xs text-stone-400 font-mono-tabular truncate">
            {isTouchMode ? misCopy.footerTouch : misCopy.footerDesktop}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs sm:text-sm cursor-pointer transition-colors shrink-0"
          >
            {misCopy.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
