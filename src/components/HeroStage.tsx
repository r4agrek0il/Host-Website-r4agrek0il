import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Headphones, Pause, Play, Volume2, VolumeX, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CHANNEL_METRICS,
  CHANNEL_PROFILE,
  type ChannelVideo,
} from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';

interface HeroStageProps {
  currentDeckTrack: ChannelVideo;
  isDeckPlaying: boolean;
  isAudioMuted: boolean;
  onToggleDeckPlay: () => void;
  onToggleMasterMute: () => void;
  onOpenCinemaModal: (video: ChannelVideo) => void;
}

export default function HeroStage({
  currentDeckTrack,
  isDeckPlaying,
  isAudioMuted,
  onToggleDeckPlay,
  onToggleMasterMute,
  onOpenCinemaModal,
}: HeroStageProps) {
  const [bannerError, setBannerError] = useState(false);
  const [processedBannerUrl, setProcessedBannerUrl] = useState<string>(
    CHANNEL_PROFILE.bannerImage
  );
  const [avatarError, setAvatarError] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerBoostRef = useRef(0);

  // Automatically remove any outer solid white backdrop from the uploaded banner PNG
  // while keeping the interior white "R4agRek0il" wordmark crisp and bright.
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = CHANNEL_PROFILE.bannerImage;

    img.onload = () => {
      if (cancelled) return;
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return;

        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const isCornerWhite = (idx: number) =>
          data[idx + 3] > 235 &&
          data[idx] > 238 &&
          data[idx + 1] > 238 &&
          data[idx + 2] > 238;

        // Only run outer flood-fill cutout if the image corners are opaque white
        if (!isCornerWhite(0) && !isCornerWhite((w - 1) * 4)) {
          return;
        }

        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const enqueue = (px: number, py: number) => {
          const p = py * w + px;
          if (visited[p]) return;
          const idx = p * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          // Near-white outer background pixels (high luminance, low saturation)
          if (minC > 224 && maxC - minC < 26) {
            visited[p] = 1;
            queue[tail++] = p;
          }
        };

        for (let x = 0; x < w; x++) {
          enqueue(x, 0);
          enqueue(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          enqueue(0, y);
          enqueue(w - 1, y);
        }

        while (head < tail) {
          const p = queue[head++];
          const idx = p * 4;
          const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          // Smooth anti-aliased edge feathering near dark outline borders
          data[idx + 3] = lum > 244 ? 0 : Math.round(((255 - lum) / 31) * 180);

          const x = p % w;
          const y = (p - x) / w;
          if (x > 0) enqueue(x - 1, y);
          if (x < w - 1) enqueue(x + 1, y);
          if (y > 0) enqueue(x, y - 1);
          if (y < h - 1) enqueue(x, y + 1);
        }

        ctx.putImageData(imageData, 0, 0);
        setProcessedBannerUrl(offscreen.toDataURL('image/png'));
      } catch {
        // Fallback safely to original image URL
      }
    };

    return () => {
      cancelled = true;
    };
  }, []);

  // Animated equalizer bar at the bottom of the hero card synced to playback state
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

      const barCount = 64;
      const gap = width / barCount;
      const barWidth = Math.max(3, gap * 0.52);

      pointerBoostRef.current = Math.max(0, pointerBoostRef.current * 0.94);

      const activeEnergy = isDeckPlaying && !isAudioMuted ? 0.88 : isDeckPlaying ? 0.55 : 0.2;

      for (let i = 0; i < barCount; i++) {
        const wave =
          Math.abs(Math.sin(tick * 0.065 + i * 0.36)) * 0.62 +
          Math.abs(Math.cos(tick * 0.038 - i * 0.21)) * 0.38;

        const amplitude = Math.max(
          0.1,
          wave * (activeEnergy + pointerBoostRef.current * 0.25)
        );
        const barH = Math.min(height * 0.92, amplitude * (height * 0.88));
        const x = i * gap + (gap - barWidth) / 2;
        const y = height - barH;

        const ratio = i / barCount;
        ctx.fillStyle =
          ratio < 0.42
            ? isDeckPlaying
              ? 'rgba(255, 123, 0, 0.86)'
              : 'rgba(255, 123, 0, 0.38)'
            : ratio < 0.6
              ? isDeckPlaying
                ? 'rgba(248, 250, 252, 0.7)'
                : 'rgba(248, 250, 252, 0.28)'
              : isDeckPlaying
                ? 'rgba(0, 240, 255, 0.86)'
                : 'rgba(0, 240, 255, 0.38)';

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      }

      if (!prefersReduced) {
        tick += isDeckPlaying ? 1.45 : 0.35;
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isDeckPlaying, isAudioMuted]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rotateX: Number((-ny * 3.5).toFixed(2)),
      rotateY: Number((nx * 4.5).toFixed(2)),
    });
    pointerBoostRef.current = Math.min(1, pointerBoostRef.current + 0.14);
  };

  const handlePointerLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <section id="top" className="relative overflow-hidden pt-8 pb-14 sm:pt-10 sm:pb-16">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Upgrade 1 & 2: Deep Obsidian Void Hero Banner Card (#03050a) with Radial Spotlight & Screen Blend */}
        <motion.div
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          animate={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          style={{
            transformPerspective: 1200,
            border: '1px solid rgba(0, 240, 255, 0.25)',
          }}
          className="relative overflow-hidden rounded-2xl bg-[#03050a] shadow-[0_0_55px_rgba(0,240,255,0.14)]"
        >
          {/* Drifting dual-tone nebula/aurora glow inside hero container */}
          <motion.div
            aria-hidden="true"
            animate={{
              opacity: isDeckPlaying ? [0.11, 0.16, 0.11] : [0.08, 0.12, 0.08],
              scale: [1, 1.06, 1],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#00F0FF] blur-[110px]"
          />
          <motion.div
            aria-hidden="true"
            animate={{
              opacity: isDeckPlaying ? [0.1, 0.15, 0.1] : [0.07, 0.11, 0.07],
              scale: [1.04, 0.98, 1.04],
            }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -right-24 -bottom-20 h-80 w-80 rounded-full bg-[#FF7B00] blur-[110px]"
          />

          {/* Subtle radial spotlight directly behind center of logo */}
          <div
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 62% 56% at 50% 48%, rgba(0, 240, 255, 0.14) 0%, rgba(255, 123, 0, 0.09) 42%, rgba(3, 5, 10, 0) 78%)',
            }}
            className="pointer-events-none absolute inset-0"
          />

          {!bannerError ? (
            <div className="relative flex w-full items-center justify-center px-4 pt-6 pb-8 sm:px-10 sm:pt-8 sm:pb-10">
              <img
                src={processedBannerUrl}
                alt="R4agRek0il — Music, Gaming & Cybernetics"
                referrerPolicy="no-referrer"
                onError={() => setBannerError(true)}
                style={{
                  mixBlendMode: 'screen',
                  filter:
                    'contrast(1.15) saturate(1.22) drop-shadow(0 0 22px rgba(0, 240, 255, 0.35))',
                }}
                className="h-auto max-h-[250px] w-full object-contain sm:max-h-[320px]"
              />
            </div>
          ) : (
            <div className="relative flex h-52 w-full flex-col items-center justify-center px-6 text-center sm:h-64">
              <p className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {CHANNEL_PROFILE.name}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-300">
                {CHANNEL_PROFILE.subheadline}
              </p>
            </div>
          )}

          {/* Playback-synced Equalizer Bar Strip */}
          <div className="relative border-t border-[#00F0FF]/15 bg-[#03050a]/90 px-4 py-2.5 sm:px-6">
            <canvas
              ref={canvasRef}
              width={960}
              height={36}
              aria-hidden="true"
              className="h-7 w-full"
            />
          </div>
        </motion.div>

        {/* 2-Column Balanced Identity & Synced Audio Controls */}
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

                {/* Synced Audio Deck & Cyber-Ambience Status Control */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.playUiPulse(720);
                      onToggleDeckPlay();
                    }}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                      isDeckPlaying
                        ? 'border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#00F0FF]'
                        : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {isDeckPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    )}
                    <span className="max-w-[165px] truncate">
                      {isDeckPlaying
                        ? `Playing: ${currentDeckTrack.shortTitle}`
                        : 'Synthwave Loop'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleMasterMute}
                    aria-label={isAudioMuted ? 'Unmute audio' : 'Mute audio'}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                      isAudioMuted
                        ? 'border-[#FF7B00]/50 bg-[#FF7B00]/15 text-[#FF7B00]'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:text-white'
                    }`}
                  >
                    {isAudioMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
                  onOpenCinemaModal(currentDeckTrack);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7B00] px-5 py-2.5 text-sm font-semibold text-[#04071A] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
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
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#03050a] p-6">
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
                  <Headphones className="h-3.5 w-3.5 text-[#FF7B00]" />
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
                    className="group flex min-h-[44px] items-center justify-between rounded-lg border border-white/10 bg-[#03050a]/80 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors duration-150 hover:border-[#00F0FF]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
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
            <div key={item.label} className="bg-[#04071A]/95 p-5 sm:p-6">
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
