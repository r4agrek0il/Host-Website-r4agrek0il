import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { THREE_PILLARS, type ChannelPillar } from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';

export default function PillarsMatrix() {
  const [activeId, setActiveId] = useState<ChannelPillar['id']>('music');
  const activePillar = THREE_PILLARS.find((p) => p.id === activeId) ?? THREE_PILLARS[0];

  const glowColor =
    activePillar.id === 'cybernetics'
      ? 'rgba(0, 240, 255, 0.14)'
      : activePillar.id === 'gaming'
        ? 'rgba(255, 184, 0, 0.14)'
        : 'rgba(255, 122, 0, 0.15)';

  return (
    <section
      id="pillars"
      className="relative overflow-hidden border-t border-white/10 bg-[#000000] py-16 sm:py-20"
    >
      {/* Dynamic Ambient Pillar Lighting */}
      <div
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle at 50% 25%, ${glowColor}, transparent 68%)`,
        }}
        className="pointer-events-none absolute inset-0 transition-all duration-300"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs text-[#00F0FF]">Channel Architecture</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">
              Three Pillars: Music, Gaming &amp; Cybernetics
            </h2>
          </div>
          <p className="max-w-md text-sm text-slate-400">
            Select a pillar to inspect how sound, tactical visual energy, and futuristic world-building shape every drop.
          </p>
        </div>

        {/* Interactive Split Matrix */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Selector Panels */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {THREE_PILLARS.map((pillar) => {
              const isActive = pillar.id === activeId;
              return (
                <button
                  key={pillar.id}
                  type="button"
                  onMouseEnter={() => setActiveId(pillar.id)}
                  onClick={() => {
                    cyberAudio.playUiPulse(690);
                    setActiveId(pillar.id);
                  }}
                  aria-pressed={isActive}
                  className={`flex flex-col rounded-2xl border p-5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                    isActive
                      ? 'border-[#00F0FF]/60 bg-[#04071A]'
                      : 'border-white/10 bg-[#04071A]/50 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs tabular-nums text-slate-400">
                      {pillar.index}.
                    </span>
                    <span
                      style={{ color: pillar.accentColor }}
                      className="font-mono text-xs font-medium"
                    >
                      {pillar.subtitle}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold text-white">
                    {pillar.title}
                  </h3>
                </button>
              );
            })}
          </div>

          {/* Expanded Detail Stage */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-[#04071A] p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span style={{ color: activePillar.accentColor }}>
                  {activePillar.index}. {activePillar.title}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-400">{activePillar.subtitle}</span>
              </div>

              <h3 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
                {activePillar.title} Core
              </h3>

              <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                {activePillar.description}
              </p>

              <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm text-slate-200">
                {activePillar.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      style={{ color: activePillar.accentColor }}
                      className="mt-1 font-mono text-xs"
                    >
                      +
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <a
                href={activePillar.ctaHref}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7A00] px-5 py-2.5 text-sm font-semibold text-[#04071A] whitespace-nowrap transition-colors hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                <span>{activePillar.ctaLabel}</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
