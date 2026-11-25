import { X } from 'lucide-react';

interface CreditsModalProps {
  onClose: () => void;
}

export function CreditsModal({ onClose }: CreditsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a0f]/82 px-4 py-4"
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto touch-pan-y bg-[#10151f] border border-stone-700/70 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2
            id="credits-title"
            className="font-display text-3xl font-bold tracking-wider text-stone-100"
          >
            CREDITS
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close credits"
            className="h-10 w-10 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
          <div>
            <div className="font-semibold text-stone-100">Last Shop</div>
            <div className="text-xs text-stone-400">
              First-person 3D post-apocalyptic survival &amp; shop exploration prototype
            </div>
          </div>

          <div className="pt-3 border-t border-stone-800 space-y-2 text-xs text-stone-400">
            <div className="flex justify-between gap-4">
              <span>3D WebGL Engine</span>
              <span className="text-stone-200">Three.js + PBR Materials</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Asset Architecture</span>
              <span className="text-stone-200">GLB / GLTF + Procedural Fallbacks</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Audio Synthesis</span>
              <span className="text-stone-200">Web Audio API</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium text-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
