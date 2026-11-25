import { useState } from 'react';
import { X } from 'lucide-react';
import {
  OrientationLockApplyResult,
  applyScreenOrientationPreference,
  useViewportLayout,
} from '../game/responsiveLayout';
import { GameSettings, ScreenOrientationMode, TouchControlsMode } from '../game/types';

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
  const [orientationHint, setOrientationHint] = useState<string | null>(null);

  const touchModes: { id: TouchControlsMode; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'on', label: 'On' },
    { id: 'off', label: 'Off' },
  ];

  const orientationModes: { id: ScreenOrientationMode; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'portrait', label: 'Portrait' },
    { id: 'landscape', label: 'Landscape' },
  ];

  const dayLengthOptions = [
    { seconds: 900, label: '15m' },
    { seconds: 300, label: '5m' },
    { seconds: 120, label: '2m' },
  ];

  const handleOrientationSelect = async (mode: ScreenOrientationMode) => {
    onChange({ ...settings, screenOrientation: mode });
    const res: OrientationLockApplyResult = await applyScreenOrientationPreference(mode);
    if (mode === 'auto') {
      setOrientationHint('Auto-rotate enabled — rotates freely with your device.');
    } else if (res === 'locked') {
      setOrientationHint(`Screen locked to ${mode} mode.`);
    } else {
      setOrientationHint(
        'Saved. Browsers or non-fullscreen windows may keep rotating freely until fullscreen.'
      );
    }
  };

  return (
    <div
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
              SETTINGS
            </h2>
            <p className="text-[11px] font-mono-tabular text-stone-400 mt-1">
              View: {viewport.orientation === 'landscape' ? 'Landscape' : 'Portrait'} ({viewport.width}×{viewport.height})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
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
          {/* Audio Volume */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <label htmlFor="master-volume" className="font-medium text-stone-200">
                Master Volume
              </label>
              <span className="font-mono-tabular text-xs text-stone-400">
                {settings.muted ? 'Muted' : `${Math.round(settings.masterVolume * 100)}%`}
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

          {/* Look Sensitivity */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <label htmlFor="mouse-sens" className="font-medium text-stone-200">
                Look Sensitivity
              </label>
              <span className="font-mono-tabular text-xs text-stone-400">
                {settings.mouseSensitivity.toFixed(1)}x
              </span>
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
                <div className="text-sm font-medium text-stone-200">Screen Orientation</div>
                <div className="text-xs text-stone-400">
                  Auto rotates seamlessly; lock if supported
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
            {orientationHint && (
              <p className="text-[11px] text-amber-300/90 mt-1 leading-snug">{orientationHint}</p>
            )}
          </div>

          {/* Touch Controls Mode */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">Touch Controls</div>
              <div className="text-xs text-stone-400">Virtual stick &amp; camera drag</div>
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
              <div className="text-sm font-medium text-stone-200">Audio Effects &amp; Wind</div>
              <div className="text-xs text-stone-400">Procedural footsteps and ambience</div>
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
              {settings.muted ? 'Muted' : 'Enabled'}
            </button>
          </div>

          {/* Dynamic Shadows Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">Sun Shadows</div>
              <div className="text-xs text-stone-400">Disable on weak GPUs for higher FPS</div>
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
              {settings.shadowsEnabled ? 'On' : 'Off'}
            </button>
          </div>

          {/* Atmosphere Fog Density */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">Fog &amp; Atmosphere</div>
              <div className="text-xs text-stone-400">Distance fog visibility</div>
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
                Atmospheric
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
                Performance
              </button>
            </div>
          </div>

          {/* Configurable Day Length */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-200">Day Length</div>
              <div className="text-xs text-stone-400">Real minutes per in-game day</div>
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
                  {opt.label}
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
              {isTouchMode ? 'Touch Controls' : 'Controls'}
            </div>
            {isTouchMode ? (
              <div
                className={`grid gap-y-1.5 text-xs text-stone-400 ${
                  isCompactLandscape ? 'grid-cols-4 gap-x-4' : 'grid-cols-2'
                }`}
              >
                <span>Move / Sprint</span>
                <span className="font-mono-tabular text-stone-200 text-right">Left Joystick</span>
                <span>Look Around</span>
                <span className="font-mono-tabular text-stone-200 text-right">Drag Right Side</span>
                <span>Attack (Melee)</span>
                <span className="font-mono-tabular text-stone-200 text-right">Attack Button</span>
                <span>Collect / Open</span>
                <span className="font-mono-tabular text-stone-200 text-right">Interact Button</span>
                <span>Inventory Pack</span>
                <span className="font-mono-tabular text-stone-200 text-right">Top Bag Button</span>
                <span>Eat / Drink / Med / Rest</span>
                <span className="font-mono-tabular text-stone-200 text-right">Top-Left Quick Bar</span>
                <span>Jump</span>
                <span className="font-mono-tabular text-stone-200 text-right">Jump Button</span>
                <span>Flashlight</span>
                <span className="font-mono-tabular text-stone-200 text-right">Light Button</span>
              </div>
            ) : (
              <div
                className={`grid gap-y-1.5 text-xs text-stone-400 ${
                  isCompactLandscape ? 'grid-cols-4 gap-x-4' : 'grid-cols-2'
                }`}
              >
                <span>Move</span>
                <span className="font-mono-tabular text-stone-200 text-right">WASD / Arrows</span>
                <span>Look Around</span>
                <span className="font-mono-tabular text-stone-200 text-right">Mouse (Click Lock)</span>
                <span>Attack (Melee)</span>
                <span className="font-mono-tabular text-stone-200 text-right">Left-Click / Q</span>
                <span>Collect / Interact</span>
                <span className="font-mono-tabular text-stone-200 text-right">E</span>
                <span>Inventory Pack</span>
                <span className="font-mono-tabular text-stone-200 text-right">I</span>
                <span>Eat / Drink / Med</span>
                <span className="font-mono-tabular text-stone-200 text-right">1 / 2 / 3</span>
                <span>Rest (Recover Energy)</span>
                <span className="font-mono-tabular text-stone-200 text-right">R</span>
                <span>Sprint</span>
                <span className="font-mono-tabular text-stone-200 text-right">Hold Shift</span>
                <span>Jump</span>
                <span className="font-mono-tabular text-stone-200 text-right">Space</span>
                <span>Flashlight</span>
                <span className="font-mono-tabular text-stone-200 text-right">F</span>
                <span>Pause</span>
                <span className="font-mono-tabular text-stone-200 text-right">Esc</span>
              </div>
            )}
          </div>
        </div>

        <div className={`${isCompactLandscape ? 'mt-4' : 'mt-6'} flex justify-end`}>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
