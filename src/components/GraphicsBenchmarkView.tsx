import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, Layers, SlidersHorizontal, X } from 'lucide-react';
import {
  BenchmarkCameraPreset,
  BenchmarkLightingMode,
  BenchmarkQualityMode,
  BenchmarkScene,
  BenchmarkState,
  BenchmarkSubjectMode,
  BenchmarkTelemetry,
} from '../benchmark/BenchmarkScene';

interface GraphicsBenchmarkViewProps {
  onExit: () => void;
}

const SUBJECT_OPTIONS: { id: BenchmarkSubjectMode; label: string }[] = [
  { id: 'both', label: 'Human + Zombie' },
  { id: 'human', label: 'Human' },
  { id: 'zombie', label: 'Zombie' },
  { id: 'materials', label: 'Materials' },
  { id: 'compare_ingame', label: 'vs In-Game' },
];

const LIGHTING_OPTIONS: { id: BenchmarkLightingMode; label: string }[] = [
  { id: 'horror', label: 'Horror' },
  { id: 'neutral', label: 'Neutral' },
];

const CAMERA_OPTIONS: { id: BenchmarkCameraPreset; label: string }[] = [
  { id: 'turnaround', label: 'Turnaround' },
  { id: 'closeup_face', label: 'Face Close-Up' },
  { id: 'closeup_body', label: 'Body & Hands' },
  { id: 'gameplay', label: 'Gameplay Cam' },
];

const QUALITY_OPTIONS: { id: BenchmarkQualityMode; label: string }[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'mobile', label: 'Mobile Sim' },
];

export function GraphicsBenchmarkView({ onExit }: GraphicsBenchmarkViewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BenchmarkScene | null>(null);

  const [state, setState] = useState<BenchmarkState>({
    lighting: 'horror',
    camera: 'turnaround',
    quality: 'desktop',
    subject: 'both',
    wireframe: false,
  });
  const [telemetry, setTelemetry] = useState<BenchmarkTelemetry | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const benchmark = new BenchmarkScene(
      container,
      (t) => setTelemetry(t),
      (lost) => setContextLost(lost)
    );
    sceneRef.current = benchmark;

    return () => {
      benchmark.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit]);

  const patchState = (partial: Partial<BenchmarkState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      sceneRef.current?.updateState(partial);
      return next;
    });
  };

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#0b0e13] text-stone-100 select-none">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Graphics capability benchmark viewport"
      />

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b0e13]/95 p-6 text-center">
          <div className="max-w-sm space-y-3 border border-stone-700/80 bg-[#12161e] p-5 rounded-lg">
            <h2 className="text-base font-semibold text-stone-100">WebGL Context Lost</h2>
            <p className="text-xs text-stone-400">
              The graphics driver reset the 3D viewport. Return to the main menu or reload to continue.
            </p>
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 text-xs font-medium bg-amber-500 text-stone-950 rounded-md cursor-pointer"
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}

      {/* Top Controls Bar — compact single row on mobile (<15% cap), full bar on desktop */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col gap-2 p-2.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 min-h-[36px] px-2.5 sm:px-3 rounded-lg bg-[#10141c]/94 hover:bg-[#19202c] border border-stone-700/80 text-xs font-medium text-stone-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Menu</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#10141c]/90 border border-stone-800/80 text-xs text-stone-300 whitespace-nowrap">
              <span className="font-semibold text-stone-100">Graphics Benchmark</span>
              <span aria-hidden="true" className="text-stone-600">·</span>
              <span className="text-stone-400">Drag to Orbit · Scroll to Zoom</span>
            </div>
          </div>

          {/* Mobile compact toggle buttons */}
          <div className="pointer-events-auto flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMobileControlsOpen((v) => !v);
                setDrawerOpen(false);
              }}
              className={`flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                mobileControlsOpen
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                  : 'bg-[#10141c]/94 text-stone-200 border-stone-700/80'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Controls</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen((v) => !v);
                setMobileControlsOpen(false);
              }}
              className={`flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                drawerOpen
                  ? 'bg-stone-200 text-stone-950 border-stone-100 font-semibold'
                  : 'bg-[#10141c]/94 text-stone-200 border-stone-700/80'
              }`}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Audit</span>
            </button>
          </div>

          {/* Desktop toolbar */}
          <div className="pointer-events-auto hidden sm:flex flex-wrap items-center justify-end gap-1.5">
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#10141c]/92 border border-stone-700/75">
              {SUBJECT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ subject: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    state.subject === opt.id
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : 'text-stone-300 hover:text-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#10141c]/92 border border-stone-700/75">
              {LIGHTING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ lighting: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    state.lighting === opt.id
                      ? 'bg-stone-200 text-stone-950 font-semibold'
                      : 'text-stone-300 hover:text-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#10141c]/92 border border-stone-700/75">
              {CAMERA_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ camera: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    state.camera === opt.id
                      ? 'bg-stone-200 text-stone-950 font-semibold'
                      : 'text-stone-300 hover:text-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#10141c]/92 border border-stone-700/75">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ quality: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    state.quality === opt.id
                      ? 'bg-stone-200 text-stone-950 font-semibold'
                      : 'text-stone-300 hover:text-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => patchState({ wireframe: !state.wireframe })}
              className={`flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                state.wireframe
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                  : 'bg-[#10141c]/92 text-stone-200 border-stone-700/80 hover:bg-[#19202c]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Wireframe</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              className={`flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                drawerOpen
                  ? 'bg-stone-200 text-stone-950 border-stone-100 font-semibold'
                  : 'bg-[#10141c]/92 text-stone-200 border-stone-700/80 hover:bg-[#19202c]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Audit Data</span>
            </button>
          </div>
        </div>

        {/* Mobile collapsible controls drawer */}
        {mobileControlsOpen && (
          <div className="pointer-events-auto sm:hidden flex flex-col gap-2 p-2.5 rounded-lg bg-[#10141c]/95 border border-stone-700/80">
            <div className="flex flex-wrap gap-1">
              {SUBJECT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ subject: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                    state.subject === opt.id
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : 'bg-[#171c26] text-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {CAMERA_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ camera: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                    state.camera === opt.id
                      ? 'bg-stone-200 text-stone-950 font-semibold'
                      : 'bg-[#171c26] text-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {LIGHTING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ lighting: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                    state.lighting === opt.id
                      ? 'bg-stone-200 text-stone-950 font-semibold'
                      : 'bg-[#171c26] text-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchState({ quality: opt.id })}
                  className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                    state.quality === opt.id
                      ? 'bg-stone-200 text-stone-950 font-semibold'
                      : 'bg-[#171c26] text-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => patchState({ wireframe: !state.wireframe })}
                className={`min-h-[30px] px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                  state.wireframe
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'bg-[#171c26] text-stone-300'
                }`}
              >
                Wireframe
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Bottom Live Performance Readout */}
      {telemetry && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-20 max-w-[calc(100vw-24px)] rounded-lg bg-[#0d1118]/92 border border-stone-700/75 px-3 py-2 text-[11px] sm:text-xs font-mono tabular-nums text-stone-200">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <span className="text-stone-400">FPS </span>
              <span className="font-semibold text-amber-400">{telemetry.fps}</span>
              <span className="text-stone-500"> ({telemetry.frameTimeMs}ms)</span>
            </span>
            <span aria-hidden="true" className="text-stone-700">|</span>
            <span>
              <span className="text-stone-400">Tris </span>
              <span className="font-semibold">{telemetry.triangles.toLocaleString()}</span>
            </span>
            <span>
              <span className="text-stone-400">Calls </span>
              <span className="font-semibold">{telemetry.drawCalls}</span>
            </span>
            <span>
              <span className="text-stone-400">Mats </span>
              <span className="font-semibold">{telemetry.materialCount}</span>
            </span>
            <span>
              <span className="text-stone-400">Tex </span>
              <span className="font-semibold">{telemetry.textures}</span>
            </span>
            <span>
              <span className="text-stone-400">VRAM~ </span>
              <span className="font-semibold">{telemetry.estimatedGpuMb} MB</span>
            </span>
            <span className="hidden sm:inline text-stone-400">
              {telemetry.viewportWidth}×{telemetry.viewportHeight} · DPR {telemetry.pixelRatio} ·{' '}
              {telemetry.shadowMapRes > 0 ? `Shadows ${telemetry.shadowMapRes}px` : 'Shadows Off'}
            </span>
          </div>
        </div>
      )}

      {/* Optional Subject Legend when viewing Comparison or Materials */}
      {state.subject === 'compare_ingame' && (
        <div className="pointer-events-none fixed bottom-14 left-3 z-20 rounded-lg bg-[#0d1118]/88 border border-stone-800 px-3 py-1.5 text-[11px] text-stone-300">
          Left-to-Right: Skinned Ceiling Human · Current In-Game Human · Skinned Ceiling Zombie · Current In-Game Zombie
        </div>
      )}
      {state.subject === 'materials' && (
        <div className="pointer-events-none fixed bottom-14 left-3 z-20 rounded-lg bg-[#0d1118]/88 border border-stone-800 px-3 py-1.5 text-[11px] text-stone-300">
          Left-to-Right: Skin · Dirty Cloth · Leather · Metal · Blood-Stained (512px Albedo / Normal / Roughness / AO)
        </div>
      )}

      {/* Collapsible Verified Capabilities Drawer */}
      {drawerOpen && telemetry && (
        <aside className="fixed right-3 top-20 sm:top-16 bottom-14 z-20 w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-lg bg-[#0d1118]/95 border border-stone-700/80 p-4 text-xs text-stone-200 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h2 className="font-semibold text-sm text-stone-100">Verified Engine Audit</h2>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close audit panel"
              className="p-1 text-stone-400 hover:text-stone-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-stone-100">Model & Skinning Telemetry</h3>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono tabular-nums text-stone-300">
              <div>Human Tris: {telemetry.geometryStats.humanTriangles.toLocaleString()}</div>
              <div>Zombie Tris: {telemetry.geometryStats.zombieTriangles.toLocaleString()}</div>
              <div>Bones / Rig: {telemetry.geometryStats.boneCount}</div>
              <div>Skinned Meshes: {telemetry.geometryStats.skinnedMeshCount}</div>
              <div>Geometries: {telemetry.geometries}</div>
              <div>JS Heap: {telemetry.jsHeapMb ? `${telemetry.jsHeapMb} MB` : 'N/A'}</div>
            </div>
            <div className="text-[11px] text-stone-400 truncate">
              GPU: {telemetry.rendererLabel}
            </div>
          </section>

          <section className="space-y-1.5 border-t border-stone-800 pt-3">
            <h3 className="font-semibold text-stone-100">Geometry Capabilities (Test 3)</h3>
            <ul className="space-y-1 text-[11px] text-stone-300">
              <li>Custom Meshes &amp; Ring Lofting: Supported</li>
              <li>Vertex Manipulation &amp; Sculpting: Supported</li>
              <li>Laplacian Smoothing: Supported (Indexed Mesh)</li>
              <li>Custom Cylindrical / Triplanar UVs: Supported</li>
              <li>Skeletal Mesh &amp; Skinning: Supported ({telemetry.geometryStats.boneCount}-Bone SkinnedMesh)</li>
              <li>Baked Normal / Roughness / AO Maps: Supported</li>
              <li className="text-amber-300/90">
                Catmull-Clark Subdivision / Facial Blendshapes: Procedural Approximation Only (No ZBrush-grade topology)
              </li>
            </ul>
          </section>

          <section className="space-y-1.5 border-t border-stone-800 pt-3">
            <h3 className="font-semibold text-stone-100">PBR Material Pipeline (Test 4)</h3>
            <ul className="space-y-1 text-[11px] text-stone-300">
              <li>ACES Filmic + sRGB + PMREM IBL: Active</li>
              <li>MeshPhysicalMaterial (Sheen / Clearcoat): {telemetry.geometryStats.hasPhysicalPbr ? 'Active' : 'Off'}</li>
              <li>Normal Maps (Sobel Tangent-Space): {telemetry.geometryStats.hasNormalMaps ? 'Active' : 'Off'}</li>
              <li>Roughness &amp; Metalness Maps: {telemetry.geometryStats.hasRoughnessMaps && telemetry.geometryStats.hasMetalnessMaps ? 'Active' : 'Off'}</li>
              <li>AO Maps + Vertex AO: {telemetry.geometryStats.hasAoMaps && telemetry.geometryStats.hasVertexAO ? 'Active' : 'Off'}</li>
              <li>PCFSoft Shadows: {telemetry.shadowMapRes > 0 ? `Active (${telemetry.shadowMapRes}px)` : 'Off (SW GL)'}</li>
              <li className="text-amber-300/90">
                True Subsurface Scattering (SSS) &amp; Strand Hair Shaders: Not native in WebGL2 Three.js PBR
              </li>
            </ul>
          </section>
        </aside>
      )}
    </div>
  );
}
