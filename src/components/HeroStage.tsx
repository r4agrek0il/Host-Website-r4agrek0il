import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Headphones, Play, Volume2, VolumeX, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CHANNEL_METRICS,
  CHANNEL_PROFILE,
  CHANNEL_VIDEOS,
  type ChannelVideo,
} from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';

interface HeroStageProps {
  onLaunchDrop: (video: ChannelVideo) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

export default function HeroStage({
  onLaunchDrop,
  audioEnabled,
  onToggleAudio,
}: HeroStageProps) {
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const velocityRef = useRef(0.35);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const latestDrop = CHANNEL_VIDEOS[0];

  // Live Canvas Spectrum Visualizer reacting to cursor velocity and ambient audio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let tick = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 56;
      const gap = width / barCount;
      const barWidth = Math.max(3, gap * 0.52);

      // Decay cursor boost gently
      velocityRef.current = Math.max(audioEnabled ? 0.65 : 0.25, velocityRef.current * 0.96);

      for (let i = 0; i < barCount; i++) {
        const wave =
          Math.abs(Math.sin(tick * 0.045 + i * 0.34)) * 0.6 +
          Math.abs(Math.cos(tick * 0.025 - i * 0.19)) * 0.4;
        const amplitude = Math.max(0.12, wave * velocityRef.current);
        const barH = amplitude * (height * 0.85);
        const x = i * gap + (gap - barWidth) / 2;
        const y = height - barH;

        const ratio = i / barCount;
        ctx.fillStyle =
          ratio < 0.42
            ? 'rgba(255, 122, 0, 0.72)'
            : ratio < 0.62
              ? 'rgba(248, 250, 252, 0.55)'
              : 'rgba(0, 240, 255, 0.72)';

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      }

      if (!prefersReduced) {
        tick += audioEnabled ? 1.5 : 0.8;
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [audioEnabled]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rotateX: Number((-ny * 4.5).toFixed(2)),
      rotateY: Number((nx * 5.5).toFixed(2)),
    });
    velocityRef.current = Math.min(1.0, velocityRef.current + 0.12);
  };

  const handlePointerLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <section id="top" className="relative overflow-hidden pt-8 pb-14 sm:pt-10 sm:pb-16">
      {/* Subtle background grid */}
      <div aria-hidden="true" className="cyber-grid-bg pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Interactive Banner Visor with 3D Tilt + Live Canvas Spectrum */}
        <motion.div
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          animate={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          style={{ transformPerspective: 1200 }}
          className="relative overflow-hidden rounded-2xl border border-[#00F0FF]/25 bg-white shadow-[0_0_50px_rgba(0,240,255,0.12)]"
        >
          {!bannerError ? (
            <div className="relative flex w-full items-center justify-center bg-white px-4 pt-5 pb-12 sm:px-10 sm:pt-7 sm:pb-14">
              <img
                src={CHANNEL_PROFILE.bannerImage}
                alt="R4agRek0il official banner — Music, Gaming & Cybernetics"
                referrerPolicy="no-referrer"
                onError={() => setBannerError(true)}
                className="h-auto max-h-[250px] w-full object-contain sm:max-h-[320px]"
              />
            </div>
          ) : (
            <div className="flex h-52 w-full flex-col items-center justify-center bg-[#04071A] px-6 text-center sm:h-64">
              <p className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {CHANNEL_PROFILE.name}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-300">
                {CHANNEL_PROFILE.subheadline}
              </p>
            </div>
          )}

          {/* Live Canvas Spectrum Strip along lower edge of the banner visor */}
          <div className="border-t border-slate-200/80 bg-[#04071A] px-4 py-2 sm:px-6">
            <canvas
              ref={canvasRef}
              width={960}
              height={36}
              aria-hidden="true"
              className="h-7 w-full"
            />
          </div>
        </motion.div>

        {/* 2-Column Balanced Identity & Direct Channel Controls */}
        <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Left Column: Core Copy & Primary CTAs */}
          <div className="chromatic-hover flex flex-col justify-between rounded-2xl border border-white/10 bg-[#04071A]/90 p-6 backdrop-blur-md sm:p-8 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#00F0FF]/30 bg-[#04071A] sm:h-20 sm:w-20">
                    {!avatarError ? (
                      <img
                        src={CHANNEL_PROFILE.avatarImage}
                        alt="R4agRek0il Cyan 4 emblem"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-[#00F0FF]">
                        4
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                      <span className="font-mono text-[#00F0FF]">{CHANNEL_PROFILE.handle}</span>
                      <span aria-hidden="true">·</span>
                      <span>{CHANNEL_PROFILE.subheadline}</span>
                    </div>
                    <p className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {CHANNEL_PROFILE.name}
                    </p>
                  </div>
                </div>

                {/* Ambient Audio Engine Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleAudio();
                    cyberAudio.playUiPulse(720);
                  }}
                  aria-pressed={audioEnabled}
                  className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                    audioEnabled
                      ? 'border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#00F0FF]'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {audioEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                  <span>{audioEnabled ? 'Cyber-Ambience: On' : 'Cyber-Ambience: Off'}</span>
                </button>
              </div>

              <h1 className="mt-6 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-white text-balance sm:text-4xl">
                {CHANNEL_PROFILE.tagline}
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                {CHANNEL_PROFILE.description}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  cyberAudio.playUiPulse(820);
                  onLaunchDrop(latestDrop);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7A00] px-5 py-2.5 text-sm font-semibold text-[#04071A] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Launch Latest Drop</span>
              </button>

              <a
                href="#cinema"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#00F0FF]/35 bg-[#00F0FF]/10 px-4 py-2.5 text-sm font-semibold text-[#00F0FF] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#00F0FF]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                <Zap className="h-4 w-4" />
                <span>Explore Neon Nights</span>
              </a>

              <a
                href={CHANNEL_PROFILE.urls.subscribe}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                <span>Subscribe on YouTube</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Right Column: Emblem Showcase & Channel Links */}
          <div className="chromatic-hover flex flex-col justify-between rounded-2xl border border-white/10 bg-[#04071A]/90 p-6 backdrop-blur-md sm:p-8 lg:col-span-5">
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#000000] p-6">
              {!avatarError ? (
                <img
                  src={CHANNEL_PROFILE.avatarImage}
                  alt="R4agRek0il glowing Cyan 4 with orange headphone coil"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="h-44 w-44 rounded-2xl object-contain sm:h-48 sm:w-48"
                />
              ) : (
                <div className="flex h-44 w-44 items-center justify-center rounded-2xl bg-[#04071A] font-display text-6xl font-bold text-[#00F0FF]">
                  4
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Headphones className="h-3.5 w-3.5 text-[#FF7A00]" />
                  <span>Direct Destinations</span>
                </span>
                <span className="font-mono text-[#00F0FF]">@R4agRek0il</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Featured', url: CHANNEL_PROFILE.urls.featured },
                  { label: 'All Videos', url: CHANNEL_PROFILE.urls.videos },
                  { label: 'Shorts', url: CHANNEL_PROFILE.urls.shorts },
                  { label: 'Instagram', url: CHANNEL_PROFILE.urls.instagram },
                ].map((dest) => (
                  <a
                    key={dest.label}
                    href={dest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[44px] items-center justify-between rounded-lg border border-white/10 bg-[#000000]/70 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors duration-150 hover:border-[#00F0FF]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    <span className="truncate">{dest.label}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#00F0FF]" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Channel Metrics Strip */}
        <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNEL_METRICS.map((item) => (
            <div key={item.label} className="bg-[#04071A] p-5 sm:p-6">
              <p className="font-mono text-xs text-slate-400">{item.label}</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
                {item.value}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
