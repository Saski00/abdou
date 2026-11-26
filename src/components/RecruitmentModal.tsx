import { useState } from 'react';
import {
  Briefcase,
  Coins,
  HeartHandshake,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { formatMoney } from '../game/economy';
import { useViewportLayout } from '../game/responsiveLayout';
import { RESOURCE_ORDER } from '../game/resources';
import {
  PROFESSION_CONFIGS,
  PROFESSION_ORDER,
  canRecruitSurvivor,
} from '../game/staffSystem';
import {
  CharacterDossierSummary,
  EmployeeProfession,
  EmployeeSummary,
  HudSnapshot,
  WorldSurvivorSummary,
} from '../game/types';
import { formatTpl, tProfession, tResource, tSurvivor, tTrustTierLabel, useI18n } from '../i18n';

interface RecruitmentModalProps {
  hud: HudSnapshot;
  survivor: WorldSurvivorSummary;
  employee?: EmployeeSummary | null;
  dossier?: CharacterDossierSummary | null;
  isTouchMode: boolean;
  onDialogueChoice?: (survivorId: string, topicId: string, optionId: string) => void;
  onOpenStaffManagement?: () => void;
  onRecruit: (survivorId: string, profession: EmployeeProfession) => void;
  onClose: () => void;
}

export function RecruitmentModal({
  hud,
  survivor,
  employee = null,
  dossier = null,
  isTouchMode,
  onDialogueChoice,
  onOpenStaffManagement,
  onRecruit,
  onClose,
}: RecruitmentModalProps) {
  const { dir, t } = useI18n();
  const recCopy = t.recruitmentModal;
  const narCopy = t.narrative;
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const [selectedProfession, setSelectedProfession] = useState<EmployeeProfession>(
    survivor.preferredProfession
  );

  const survLoc = tSurvivor(survivor.id);
  const displayName = survLoc?.name ?? survivor.name;
  const displayLocation = survLoc?.locationLabel ?? survivor.locationLabel;
  const displayDialogue = survLoc?.dialogue ?? survivor.dialogue;
  const displayNeed = survLoc?.needDescription ?? survivor.needDescription;

  const { staff, inventory, money } = hud;
  const isRecruited = survivor.recruited || Boolean(employee);
  const trust = dossier?.trust ?? 0;
  const trustTierLabel = dossier?.trustTierLabel ?? tTrustTierLabel(trust);
  const bio = dossier?.bio ?? narCopy.survivorBios[survivor.id] ?? '';
  const activeTopic = dossier?.activeTopic ?? null;
  const storyRemark = dossier?.currentStatusNote || survivor.storyRemark;

  const validation = canRecruitSurvivor(
    survivor,
    selectedProfession,
    money,
    inventory,
    staff.employees.length,
    staff.employeeCapacity,
    staff.activeGuardCount,
    staff.maxGuards
  );

  const requiredResources = RESOURCE_ORDER.filter(
    (id) => (survivor.costResources[id] ?? 0) > 0
  );

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruit-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/82 px-3 py-3 sm:px-4 sm:py-4"
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
            <div className="flex items-center gap-2 flex-wrap">
              {isRecruited ? (
                <Users className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <UserPlus className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />
              )}
              <h2
                id="recruit-modal-title"
                className="font-display text-2xl font-bold tracking-wider text-stone-100 leading-none truncate"
              >
                {displayName.toUpperCase()}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-200 font-mono-tabular">
                <HeartHandshake className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{trustTierLabel}</span>
                <bdi dir="ltr" className="opacity-80">
                  ({trust}/3)
                </bdi>
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 truncate">
              {employee
                ? `${tProfession(employee.profession).label} · ${employee.statusLabel}`
                : formatTpl(recCopy.preferredSubtitle, {
                    loc: displayLocation,
                    role: tProfession(survivor.preferredProfession).label,
                  })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={recCopy.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-4 sm:px-6 space-y-4">
          {/* Character Overview & Story Dialogue */}
          <div className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 space-y-2.5">
            {bio && <p className="text-xs text-stone-400 leading-relaxed">{bio}</p>}
            <p className="text-sm text-stone-100 leading-relaxed">&ldquo;{displayDialogue}&rdquo;</p>
            {storyRemark && (
              <p className="text-xs text-sky-200/90 leading-relaxed border-t border-stone-800/80 pt-2">
                {storyRemark}
              </p>
            )}
            {!isRecruited && (
              <p className="text-xs text-amber-300 font-medium">{displayNeed}</p>
            )}
          </div>

          {/* Interactive Story Conversation */}
          <div className="rounded-lg border border-amber-500/35 bg-[#121925] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{narCopy.dialogueHeading}</span>
              </div>
              {dossier && (
                <bdi dir="ltr" className="text-[11px] font-mono-tabular text-stone-400">
                  {dossier.topicsCompleted}/{dossier.totalTopics}
                </bdi>
              )}
            </div>

            {activeTopic ? (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-sky-200">{activeTopic.stageTitle}</div>
                <p className="text-xs sm:text-sm text-stone-100 leading-relaxed bg-[#0b0e15] border border-stone-800 rounded-lg p-3">
                  &ldquo;{activeTopic.speakerLine}&rdquo;
                </p>
                <div className="space-y-2">
                  {activeTopic.choices.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={!ch.affordable || !onDialogueChoice}
                      onClick={() =>
                        onDialogueChoice?.(survivor.id, activeTopic.topicId, ch.id)
                      }
                      className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-start transition-colors ${
                        ch.affordable
                          ? 'bg-[#172030] border-amber-500/55 hover:border-amber-400 hover:bg-[#1c283c] text-stone-100 cursor-pointer'
                          : 'bg-[#0b0e15] border-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-semibold">{ch.label}</span>
                        {ch.disabledReason && (
                          <span className="text-[11px] font-mono-tabular text-rose-300 shrink-0">
                            {ch.disabledReason}
                          </span>
                        )}
                      </div>
                      {ch.hint && (
                        <p className="text-[11px] text-amber-300/90 mt-1 leading-snug">
                          {ch.hint}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400 leading-relaxed">{narCopy.allTopicsCaughtUp}</p>
            )}
          </div>

          {isRecruited && employee ? (
            <div className="rounded-lg border border-emerald-500/35 bg-[#0e1a18] p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-300">
                  {formatTpl(narCopy.recruitedAsBadge, {
                    role: tProfession(employee.profession).label,
                  })}
                </span>
                <bdi dir="ltr" className="text-xs font-mono-tabular text-stone-300">
                  {employee.health}/{employee.maxHealth} HP
                </bdi>
              </div>
              <p className="text-xs text-stone-300">{employee.taskLabel}</p>
            </div>
          ) : (
            <>
              {/* Requirements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-stone-300">
                    {recCopy.termsHeading}
                  </span>
                  <span className="font-mono-tabular text-stone-400">
                    {formatTpl(recCopy.staffCountLabel, {
                      count: staff.employees.length,
                      cap: staff.employeeCapacity,
                    })}
                  </span>
                </div>

                <div className="rounded-lg border border-stone-700/80 bg-[#141b27] divide-y divide-stone-800">
                  {survivor.costMoney > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm">
                      <span className="flex items-center gap-2 text-stone-200 font-medium">
                        <Coins className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                        {recCopy.advancePayLabel}
                      </span>
                      <span
                        className={`font-mono-tabular font-bold ${
                          money >= survivor.costMoney ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {formatTpl(recCopy.costHaveAmount, {
                          cost: formatMoney(survivor.costMoney),
                          have: formatMoney(money),
                        })}
                      </span>
                    </div>
                  )}

                  {requiredResources.map((resId) => {
                    const req = survivor.costResources[resId] ?? 0;
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
                          {formatTpl(recCopy.needHaveQty, { req, have })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Role Assignment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    {recCopy.assignProfessionHeading}
                  </span>
                  <span className="font-mono-tabular text-stone-400">
                    {formatTpl(recCopy.guardsCountLabel, {
                      count: staff.activeGuardCount,
                      max: staff.maxGuards,
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROFESSION_ORDER.map((profId) => {
                    const cfg = PROFESSION_CONFIGS[profId];
                    const pLoc = tProfession(profId);
                    const isSelected = selectedProfession === profId;
                    const guardLocked =
                      profId === 'guard' && staff.activeGuardCount >= staff.maxGuards;
                    return (
                      <button
                        key={profId}
                        type="button"
                        disabled={guardLocked}
                        onClick={() => setSelectedProfession(profId)}
                        className={`rounded-lg border p-3 text-start transition-colors ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-stone-100 cursor-pointer'
                            : guardLocked
                              ? 'bg-[#0b0e15] border-stone-800 text-stone-500 cursor-not-allowed'
                              : 'bg-[#141b27] border-stone-700/80 text-stone-200 hover:border-stone-500 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold">
                            {pLoc.label}
                            {profId === survivor.preferredProfession ? ' ★' : ''}
                          </span>
                          <span className="font-mono-tabular text-xs font-semibold text-amber-300 shrink-0">
                            {formatTpl(recCopy.salaryPerCycle, { salary: formatMoney(cfg.salary) })}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                          {guardLocked
                            ? formatTpl(recCopy.guardCapReachedDesc, { max: staff.maxGuards })
                            : pLoc.shortDesc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!validation.ok && validation.reason && (
                <div className="rounded-lg border border-rose-500/50 bg-[#261116] px-3.5 py-2.5 flex items-center gap-2 text-xs text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>{validation.reason}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`border-t border-stone-800 flex items-center justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <span className="text-xs text-stone-400 font-mono-tabular truncate">
            {isTouchMode ? recCopy.footerTouch : recCopy.footerDesktop}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {recCopy.laterBtn}
            </button>
            {isRecruited ? (
              onOpenStaffManagement && (
                <button
                  type="button"
                  onClick={onOpenStaffManagement}
                  className="h-11 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" aria-hidden="true" />
                  <span>{narCopy.manageStaffBtn}</span>
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={!validation.ok}
                onClick={() => onRecruit(survivor.id, selectedProfession)}
                className={`h-11 px-4 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors ${
                  validation.ok
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer'
                    : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                }`}
              >
                <UserCheck className="w-4 h-4" aria-hidden="true" />
                <span>{recCopy.recruitBtn}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
