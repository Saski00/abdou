import { useState } from 'react';
import { Globe, X } from 'lucide-react';
import {
  OrientationLockApplyResult,
  applyScreenOrientationPreference,
  useViewportLayout,
} from '../game/responsiveLayout';
import {
  GameLanguage,
  GameSettings,
  GraphicsQuality,
  HorrorAudioLevel,
  ScreenOrientationMode,
  TouchControlsMode,
} from '../game/types';
import { formatTpl, useI18n } from '../i18n';

interface SettingsModalProps {
  settings: GameSettings;
  isTouchMode: boolean;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  isTouchMode,
  onChange,
  onClose,
}: SettingsModalProps) {
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const { dir, t } = useI18n();
  const [orientationHintKey, setOrientationHintKey] = useState<{
    type: 'auto' | 'locked' | 'saved';
    modeLabel?: string;
  } | null>(null);

  const languageOptions: { id: GameLanguage; label: string }[] = [
    { id: 'en', label: t.settingsModal.languageEnglish },
    { id: 'ar', label: t.settingsModal.languageArabic },
  ];

  const touchModes: { id: TouchControlsMode; label: string }[] = [
    { id: 'auto', label: t.settingsModal.touchAuto },
    { id: 'on', label: t.settingsModal.touchOn },
    { id: 'off', label: t.settingsModal.touchOff },
  ];

  const orientationModes: { id: ScreenOrientationMode; label: string }[] = [
    { id: 'auto', label: t.settingsModal.orientationAuto },
    { id: 'portrait', label: t.settingsModal.orientationPortrait },
    { id: 'landscape', label: t.settingsModal.orientationLandscape },
  ];

  const horrorAudioModes: { id: HorrorAudioLevel; label: string }[] = [
    { id: 'full', label: t.settingsModal.horrorFull },
    { id: 'reduced', label: t.settingsModal.horrorReduced },
    { id: 'off', label: t.settingsModal.horrorOff },
  ];

  const graphicsModes: { id: GraphicsQuality; label: string }[] = [
    { id: 'low', label: t.settingsModal.graphicsLow },
    { id: 'medium', label: t.settingsModal.graphicsMedium },
    { id: 'high', label: t.settingsModal.graphicsHigh },
  ];

  const handleGraphicsQualitySelect = (q: GraphicsQuality) => {
    onChange({
      ...settings,
      graphicsQuality: q,
      shadowsEnabled: q !== 'low',
      lightingQuality: q === 'low' ? 'performance' : 'atmospheric',
    });
  };

  const dayLengthOptions = [
    { seconds: 900, min: 15 },
    { seconds: 300, min: 5 },
    { seconds: 120, min: 2 },
  ];

  const handleOrientationSelect = async (mode: ScreenOrientationMode) => {
    onChange({ ...settings, screenOrientation: mode });
    const res: OrientationLockApplyResult = await applyScreenOrientationPreference(mode);
    if (mode === 'auto') {
      setOrientationHintKey({ type: 'auto' });
    } else if (res === 'locked') {
      const modeLabel =
        mode === 'landscape'
          ? t.settingsModal.orientationLandscape
          : t.settingsModal.orientationPortrait;
      setOrientationHintKey({ type: 'locked', modeLabel });
    } else {
      setOrientationHintKey({ type: 'saved' });
    }
  };

  const orientationHintText = orientationHintKey
    ? orientationHintKey.type === 'auto'
      ? t.settingsModal.orientationHintAuto
      : orientationHintKey.type === 'locked'
        ? formatTpl(t.settingsModal.orientationHintLocked, {
            mode: orientationHintKey.modeLabel ?? '',
          })
        : t.settingsModal.orientationHintSaved
    : null;

  const controlRows = isTouchMode
    ? t.settingsModal.touchControlRows
    : t.settingsModal.desktopControlRows;

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a0f]/82 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-h-[92dvh] overflow-y-auto touch-pan-y bg-[#10151f] border border-stone-700/70 rounded-xl shadow-2xl ${
          isCompactLandscape ? 'max-w-2xl p-4' : 'max-w-md p-5 sm:p-6'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-4 ${
            isCompactLandscape ? 'mb-3' : 'mb-5'
          }`}
        >
          <div>
            <h2
              id="settings-title"
              className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-stone-100 leading-none"
            >
              {t.settingsModal.title}
            </h2>
            <p className="text-[11px] font-mono-tabular text-stone-400 mt-1">
              {formatTpl(t.settingsModal.viewMeta, {
                orientation:
                  viewport.orientation === 'landscape'
                    ? t.settingsModal.orientationLandscape
                    : t.settingsModal.orientationPortrait,
                w: viewport.width,
                h: viewport.height,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.settingsModal.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={
            isCompactLandscape
              ? 'grid grid-cols-2 gap-x-5 gap-y-3 items-start'
              : 'space-y-4'
          }
        >
          {/* Language Selection */}
          <div
            className={`p-3 rounded-lg bg-[#141b27] border border-amber-500/35 ${
              isCompactLandscape ? 'col-span-2' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-sm font-semibold text-stone-100">
                    {t.settingsModal.languageSectionTitle}
                  </div>
                  <div className="text-xs text-stone-400">
                    {t.settingsModal.languageSectionDesc}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
                {languageOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...settings, language: opt.id })}
                    className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      settings.language === opt.id
                        ? 'bg-amber-500 text-stone-950 font-semibold'
                        : 'text-stone-300 hover:text-stone-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Volume */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <label htmlFor="master-volume" className="font-medium text-stone-200">
                {t.settingsModal.masterVolumeLabel}
              </label>
              <span className="font-mono-tabular text-xs text-stone-400">
                {settings.muted ? (
                  t.settingsModal.mutedLabel
                ) : (
                  <bdi dir="ltr">{Math.round(settings.masterVolume * 100)}%</bdi>
                )}
              </span>
            </div>
            <input
              id="master-volume"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.masterVolume * 100)}
              onChange={(e) =>
                onChange({
                  ...settings,
                  masterVolume: Number(e.target.value) / 100,
                  muted: Number(e.target.value) === 0,
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Per-channel Audio Sliders */}
          <div
            className={`grid grid-cols-2 gap-x-4 gap-y-2.5 p-3 rounded-lg bg-[#141b27]/80 border border-stone-800/80 ${
              isCompactLandscape ? 'col-span-2' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="ambient-volume" className="text-stone-300">
                  {t.settingsModal.ambientVolumeLabel}
                </label>
                <bdi dir="ltr" className="font-mono-tabular text-[11px] text-stone-400">
                  {Math.round(settings.ambientVolume * 100)}%
                </bdi>
              </div>
              <input
                id="ambient-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.ambientVolume * 100)}
                onChange={(e) =>
                  onChange({ ...settings, ambientVolume: Number(e.target.value) / 100 })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="sfx-volume" className="text-stone-300">
                  {t.settingsModal.sfxVolumeLabel}
                </label>
                <bdi dir="ltr" className="font-mono-tabular text-[11px] text-stone-400">
                  {Math.round(settings.sfxVolume * 100)}%
                </bdi>
              </div>
              <input
                id="sfx-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(e) =>
                  onChange({ ...settings, sfxVolume: Number(e.target.value) / 100 })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="music-volume" className="text-stone-300">
                  {t.settingsModal.musicVolumeLabel}
                </label>
                <bdi dir="ltr" className="font-mono-tabular text-[11px] text-stone-400">
                  {Math.round(settings.musicVolume * 100)}%
                </bdi>
              </div>
              <input
                id="music-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(e) =>
                  onChange({ ...settings, musicVolume: Number(e.target.value) / 100 })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="dialogue-volume" className="text-stone-300">
                  {t.settingsModal.dialogueVolumeLabel}
                </label>
                <bdi dir="ltr" className="font-mono-tabular text-[11px] text-stone-400">
                  {Math.round(settings.dialogueVolume * 100)}%
                </bdi>
              </div>
              <input
                id="dialogue-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.dialogueVolume * 100)}
                onChange={(e) =>
                  onChange({ ...settings, dialogueVolume: Number(e.target.value) / 100 })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Horror & Tension Audio Intensity */}
          <div className={`flex flex-wrap items-center justify-between gap-2 ${isCompactLandscape ? 'col-span-2' : ''}`}>
            <div>
              <div className="text-sm font-medium text-stone-200">
                {t.settingsModal.horrorAudioLabel}
              </div>
              <div className="text-xs text-stone-400">{t.settingsModal.horrorAudioDesc}</div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
              {horrorAudioModes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ ...settings, horrorAudioLevel: m.id })}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    settings.horrorAudioLevel === m.id
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Look Sensitivity */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <label htmlFor="mouse-sens" className="font-medium text-stone-200">
                {t.settingsModal.lookSensLabel}
              </label>
              <bdi dir="ltr" className="font-mono-tabular text-xs text-stone-400">
                {settings.mouseSensitivity.toFixed(1)}x
              </bdi>
            </div>
            <input
              id="mouse-sens"
              type="range"
              min={4}
              max={22}
              value={Math.round(settings.mouseSensitivity * 10)}
              onChange={(e) =>
                onChange({
                  ...settings,
                  mouseSensitivity: Number(e.target.value) / 10,
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Screen Orientation Preference */}
          <div className={isCompactLandscape ? 'col-span-2' : ''}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-stone-200">
                  {t.settingsModal.screenOrientationLabel}
                </div>
                <div className="text-xs text-stone-400">
                  {t.settingsModal.screenOrientationDesc}
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
                {orientationModes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void handleOrientationSelect(m.id)}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      settings.screenOrientation === m.id
                        ? 'bg-amber-500 text-stone-950 font-semibold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {orientationHintText && (
              <p className="text-[11px] text-amber-300/90 mt-1 leading-snug">
                {orientationHintText}
              </p>
            )}
          </div>

          {/* Touch Controls Mode */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">
                {t.settingsModal.touchControlsLabel}
              </div>
              <div className="text-xs text-stone-400">{t.settingsModal.touchControlsDesc}</div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
              {touchModes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ ...settings, touchControls: m.id })}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    settings.touchControls === m.id
                      ? 'bg-stone-700 text-white'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mute Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">
                {t.settingsModal.audioEffectsLabel}
              </div>
              <div className="text-xs text-stone-400">{t.settingsModal.audioEffectsDesc}</div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...settings, muted: !settings.muted })}
              className={`h-10 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                !settings.muted
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300 border border-stone-700'
              }`}
            >
              {settings.muted ? t.settingsModal.mutedLabel : t.settingsModal.enabledLabel}
            </button>
          </div>

          {/* Graphics Quality Preset */}
          <div className={`flex flex-wrap items-center justify-between gap-2 ${isCompactLandscape ? 'col-span-2' : ''}`}>
            <div>
              <div className="text-sm font-medium text-stone-200">
                {t.settingsModal.graphicsQualityLabel}
              </div>
              <div className="text-xs text-stone-400">{t.settingsModal.graphicsQualityDesc}</div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
              {graphicsModes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleGraphicsQualitySelect(m.id)}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    settings.graphicsQuality === m.id
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Shadows Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">
                {t.settingsModal.shadowsLabel}
              </div>
              <div className="text-xs text-stone-400">{t.settingsModal.shadowsDesc}</div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...settings, shadowsEnabled: !settings.shadowsEnabled })}
              className={`h-10 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                settings.shadowsEnabled
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300 border border-stone-700'
              }`}
            >
              {settings.shadowsEnabled ? t.settingsModal.onLabel : t.settingsModal.offLabel}
            </button>
          </div>

          {/* Atmosphere Fog Density */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">{t.settingsModal.fogLabel}</div>
              <div className="text-xs text-stone-400">{t.settingsModal.fogDesc}</div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
              <button
                type="button"
                onClick={() => onChange({ ...settings, lightingQuality: 'atmospheric' })}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  settings.lightingQuality === 'atmospheric'
                    ? 'bg-stone-700 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t.settingsModal.fogAtmospheric}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...settings, lightingQuality: 'performance' })}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  settings.lightingQuality === 'performance'
                    ? 'bg-stone-700 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t.settingsModal.fogPerformance}
              </button>
            </div>
          </div>

          {/* Configurable Day Length */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">
                {t.settingsModal.dayLengthLabel}
              </div>
              <div className="text-xs text-stone-400">{t.settingsModal.dayLengthDesc}</div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
              {dayLengthOptions.map((opt) => (
                <button
                  key={opt.seconds}
                  type="button"
                  onClick={() => onChange({ ...settings, dayLengthSeconds: opt.seconds })}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium font-mono-tabular transition-colors cursor-pointer whitespace-nowrap ${
                    settings.dayLengthSeconds === opt.seconds
                      ? 'bg-stone-700 text-white'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {formatTpl(t.settingsModal.dayMinutesShort, { min: opt.min })}
                </button>
              ))}
            </div>
          </div>

          {/* Controls Quick Reference */}
          <div
            className={`pt-3 border-t border-stone-800 ${
              isCompactLandscape ? 'col-span-2' : ''
            }`}
          >
            <div className="text-xs font-semibold text-stone-300 mb-2">
              {isTouchMode ? t.settingsModal.controlsHeadingTouch : t.settingsModal.controlsHeadingDesktop}
            </div>
            <div
              className={`grid gap-y-1.5 text-xs text-stone-400 ${
                isCompactLandscape ? 'grid-cols-2 gap-x-6' : 'grid-cols-1'
              }`}
            >
              {controlRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span>{row.label}</span>
                  <bdi dir="ltr" className="font-mono-tabular text-stone-200 text-end">
                    {row.value}
                  </bdi>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${isCompactLandscape ? 'mt-4' : 'mt-6'} flex justify-end`}>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            {t.settingsModal.doneBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
