import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Layers, RotateCcw } from 'lucide-react';
import {
  mountSonicRelicScene,
  type CameraPreset,
  type RelicFinish,
  type SonicSceneController,
} from './three/SonicRelicScene';

interface CyberSonicStage3DProps {
  isPlaying: boolean;
}

export default function CyberSonicStage3D({ isPlaying }: CyberSonicStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SonicSceneController | null>(null);

  const [explode, setExplode] = useState(0);
  const [finish, setFinish] = useState<RelicFinish>('orange');
  const [preset, setPreset] = useState<CameraPreset>('front');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = mountSonicRelicScene({
      container,
      onContextLost: () => setContextLost(true),
      onContextRestored: () => setContextLost(false),
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setPlaying(isPlaying);
  }, [isPlaying]);

  const handleExplode = (val: number) => {
    setExplode(val);
    controllerRef.current?.setExplodeFactor(val);
  };

  const handleFinish = (next: RelicFinish) => {
    setFinish(next);
    controllerRef.current?.setFinish(next);
  };

  const handlePreset = (next: CameraPreset) => {
    setPreset(next);
    controllerRef.current?.setCameraPreset(next);
  };

  return (
    <section
      id="sonic-stage"
      aria-label="Interactive 3D Sonic Relic Stage"
      className="relative h-[86vh] min-h-[560px] w-full overflow-hidden border-t border-white/10 bg-[#03050a]"
    >
      {/* Isolated WebGL Mount Container (never contains React overlays) */}
      <div ref={mountRef} className="h-full w-full" />

      {/* Minimal Top-Left Spec Header (solid rgba surface, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-5 left-4 z-10 max-w-sm rounded-xl border border-[#00F0FF]/25 bg-[rgba(3,5,10,0.86)] px-4 py-3 sm:left-8">
        <p className="font-mono text-[11px] text-[#00F0FF]">Interactive 3D Sonic Relic</p>
        <h2 className="mt-1 font-display text-lg font-bold text-white">
          R4agRek0il Cybernetic Core
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          Drag to orbit · Scroll to zoom · Synced to audio playback
        </p>
      </div>

      {/* WebGL Context Lost Graceful Fallback */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#03050a]/95 p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-[#00F0FF]/30 bg-[#04071A] p-6">
            <p className="font-display text-lg font-bold text-white">
              3D Viewport Paused
            </p>
            <p className="mt-2 text-xs text-slate-300">
              WebGL context was interrupted by your browser. Scroll or reload to restore hardware rendering.
            </p>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (solid rgba, zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-5 left-1/2 z-10 flex w-[min(780px,94vw)] -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-t-xl border border-b-0 border-[#00F0FF]/30 bg-[rgba(4,7,26,0.94)] px-3.5 py-1 font-mono text-[11px] font-medium text-slate-200 transition-colors hover:text-[#00F0FF]"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show 3D Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#00F0FF]/30 bg-[rgba(4,7,26,0.94)] px-4 py-3 shadow-2xl">
            {/* Exploded View Slider */}
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-[#00F0FF]" />
              <label
                htmlFor="relic-explode"
                className="font-mono text-xs text-slate-300 whitespace-nowrap"
              >
                Explode
              </label>
              <input
                id="relic-explode"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explode}
                onChange={(e) => handleExplode(Number(e.target.value))}
                className="h-1.5 w-24 cursor-pointer accent-[#00F0FF]"
              />
            </div>

            {/* Finish Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 font-mono text-xs text-slate-400">Finish</span>
              {(
                [
                  { id: 'orange', label: 'Orange', swatch: '#FF7B00' },
                  { id: 'cyan', label: 'Cyan', swatch: '#00F0FF' },
                  { id: 'titanium', label: 'Titanium', swatch: '#CBD5E1' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleFinish(item.id)}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                    finish === item.id
                      ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-white'
                      : 'border-white/10 bg-black/40 text-slate-300 hover:text-white'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: item.swatch }}
                    className="h-2.5 w-2.5 rounded-full"
                  />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Camera Presets */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'front', label: 'Relic' },
                  { id: 'coil', label: 'Coil' },
                  { id: 'overhead', label: 'Reticle' },
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => handlePreset(cam.id)}
                  className={`min-h-[34px] rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                    preset === cam.id
                      ? 'border-[#FF7B00] bg-[#FF7B00] text-[#04071A]'
                      : 'border-white/10 bg-black/40 text-slate-300 hover:text-white'
                  }`}
                >
                  {cam.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  handleExplode(0);
                  handlePreset('front');
                }}
                aria-label="Reset 3D view"
                className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-white/10 bg-black/40 text-slate-300 transition-colors hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
