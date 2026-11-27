import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Headphones,
  Image as ImageIcon,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CHANNEL_PROFILE,
  type ChannelVideo,
} from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';
import type { LiveChannelSnapshot } from '../utils/telemetryPoller';
import MythicLogoSVG from './MythicLogoSVG';
import { SUBSCRIBE_URL } from '../data/channel';

interface HeroStageProps {
  currentDeckTrack: ChannelVideo;
  isDeckPlaying: boolean;
  isPlaybackActive?: boolean;
  isAudioMuted: boolean;
  liveMode: boolean;
  isPolling: boolean;
  liveSnapshot: LiveChannelSnapshot;
  onToggleLiveMode: () => void;
  onToggleDeckPlay: () => void;
  onToggleMasterMute: () => void;
  onOpenCinemaModal: (video: ChannelVideo) => void;
}

export default function HeroStage({
  currentDeckTrack,
  isDeckPlaying,
  isPlaybackActive = false,
  isAudioMuted,
  liveMode,
  isPolling,
  liveSnapshot,
  onToggleLiveMode,
  onToggleDeckPlay,
  onToggleMasterMute,
  onOpenCinemaModal,
}: HeroStageProps) {
  const [bannerError, setBannerError] = useState(false);
  const [processedBannerUrl, setProcessedBannerUrl] = useState<string>(
    CHANNEL_PROFILE.bannerImageWebp
  );
  const [avatarError, setAvatarError] = useState(false);
  const [bannerMode, setBannerMode] = useState<'mythic' | 'original'>('mythic');
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerBoostRef = useRef(0);

  const eqActive = isDeckPlaying || isPlaybackActive;

  // Automatically remove any outer solid white backdrop from the uploaded banner PNG
  // for crisp 2D / fallback rendering while keeping the white wordmark intact.
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    // Prefer the light WebP; fall back to the original PNG if it fails.
    img.onerror = () => {
      if (cancelled || img.src.endsWith('.png')) return;
      setProcessedBannerUrl(CHANNEL_PROFILE.bannerImage);
      img.src = CHANNEL_PROFILE.bannerImage;
    };
    img.src = CHANNEL_PROFILE.bannerImageWebp;

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

      const activeEnergy = eqActive && !isAudioMuted ? 0.88 : eqActive ? 0.55 : 0.2;

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
            ? eqActive
              ? 'rgba(255, 123, 0, 0.86)'
              : 'rgba(255, 123, 0, 0.38)'
            : ratio < 0.6
              ? eqActive
                ? 'rgba(248, 250, 252, 0.7)'
                : 'rgba(248, 250, 252, 0.28)'
              : eqActive
                ? 'rgba(0, 240, 255, 0.86)'
                : 'rgba(0, 240, 255, 0.38)';

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      }

      if (!prefersReduced) {
        tick += eqActive ? 1.45 : 0.35;
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [eqActive, isAudioMuted]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    pointerBoostRef.current = Math.min(1, pointerBoostRef.current + 0.14);
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rotateX: Number((-ny * 3.0).toFixed(2)),
      rotateY: Number((nx * 3.8).toFixed(2)),
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <section id="top" className="relative overflow-hidden pt-8 pb-14 sm:pt-10 sm:pb-16">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Deep Obsidian Void Hero Banner Card (#03050a) housing the Mythic Shader R4agRek0il SVG Logo */}
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
              opacity: eqActive ? [0.11, 0.16, 0.11] : [0.08, 0.12, 0.08],
              scale: [1, 1.06, 1],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#00F0FF] blur-[110px]"
          />
          <motion.div
            aria-hidden="true"
            animate={{
              opacity: eqActive ? [0.1, 0.15, 0.1] : [0.07, 0.11, 0.07],
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

          {/* Hero Logo Stage (Mythic SVG Shader Logo default + Original Art switcher) */}
          <div className="relative flex min-h-[260px] w-full items-center justify-center sm:min-h-[320px] lg:min-h-[350px]">
            {bannerMode === 'mythic' ? (
              <MythicLogoSVG isPlaying={eqActive} />
            ) : !bannerError ? (
              <div className="flex h-full w-full items-center justify-center px-4 py-6 sm:px-10">
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
                  className="h-auto max-h-[240px] w-full object-contain sm:max-h-[300px]"
                />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                <p className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  {CHANNEL_PROFILE.name}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-300">
                  {CHANNEL_PROFILE.subheadline}
                </p>
              </div>
            )}

            {/* Top-Right View Toggle */}
            <div className="absolute top-3 right-3 z-20 inline-flex items-center rounded-lg border border-white/15 bg-[#04071A]/90 p-0.5 sm:top-4 sm:right-4">
              <button
                type="button"
                onClick={() => setBannerMode('mythic')}
                className={`inline-flex min-h-[28px] items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                  bannerMode === 'mythic'
                    ? 'bg-[#00F0FF] text-[#04071A]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Mythic</span>
              </button>
              <button
                type="button"
                onClick={() => setBannerMode('original')}
                className={`inline-flex min-h-[28px] items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                  bannerMode === 'original'
                    ? 'bg-[#FF7B00] text-[#04071A]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ImageIcon className="h-3 w-3" />
                <span>Original</span>
              </button>
            </div>
          </div>

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
                      <picture className="contents">
                        <source srcSet={CHANNEL_PROFILE.avatarImageWebp} type="image/webp" />
                      <img
                        src={CHANNEL_PROFILE.avatarImage}
                        alt="R4agRek0il Cyan 4 emblem"
                        referrerPolicy="no-referrer"
                        decoding="async"
                        onError={() => setAvatarError(true)}
                        className="h-full w-full object-cover"
                      />
                      </picture>
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
              <a
                href={SUBSCRIBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7B00] px-5 py-2.5 text-sm font-semibold text-[#04071A] whitespace-nowrap shrink-0 shadow-[0_0_24px_rgba(255,123,0,0.35)] transition-colors duration-150 hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                <span>Subscribe on YouTube</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  cyberAudio.playUiPulse(820);
                  onOpenCinemaModal(currentDeckTrack);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#FF7B00]/45 bg-[#FF7B00]/10 px-4 py-2.5 text-sm font-semibold text-[#FF7B00] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#FF7B00]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
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

            </div>
          </div>

          {/* Right Column: Futuristic CoD:M Mythic Hardware '4' Avatar Showcase & Channel Links */}
          <div className="chromatic-hover flex flex-col justify-between rounded-2xl border border-white/10 bg-[#04071A]/90 p-6 backdrop-blur-md sm:p-8 lg:col-span-5">
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-[#00F0FF]/25 bg-[#030718] p-6">
              {/* Rotating Mythic HUD Scanner Rings & Active Energy Nodes */}
              <svg
                aria-hidden="true"
                viewBox="0 0 260 260"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <g transform="translate(130, 130)">
                  <circle
                    r="112"
                    fill="none"
                    stroke="#00F0FF"
                    strokeOpacity="0.24"
                    strokeWidth="1.5"
                    strokeDasharray="34 14 10 14"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 0 0"
                      to="360 0 0"
                      dur="20s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    r="98"
                    fill="none"
                    stroke="#FF7B00"
                    strokeOpacity="0.32"
                    strokeWidth="1.5"
                    strokeDasharray="22 18"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="360 0 0"
                      to="0 0 0"
                      dur="14s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>

                {/* Active Corner Hardware Nodes */}
                {[
                  { x: 16, y: 16, c: '#00F0FF' },
                  { x: 244, y: 16, c: '#FF7B00' },
                  { x: 16, y: 244, c: '#FF7B00' },
                  { x: 244, y: 244, c: '#00F0FF' },
                ].map((pt, idx) => (
                  <circle key={idx} cx={pt.x} cy={pt.y} r="3" fill={pt.c}>
                    <animate
                      attributeName="opacity"
                      values="0.4;1;0.4"
                      dur={`${1.4 + idx * 0.3}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}
              </svg>

              {/* Subtle Vertical Scan-Line Sweep */}
              <motion.div
                aria-hidden="true"
                animate={{ y: ['-110%', '130%'] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
                className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-[#00F0FF]/18 to-transparent"
              />

              {!avatarError ? (
                <picture className="contents">
                  <source srcSet={CHANNEL_PROFILE.avatarImageWebp} type="image/webp" />
                <img
                  src={CHANNEL_PROFILE.avatarImage}
                  alt="R4agRek0il glowing Cyan 4 with orange headphone coil"
                  referrerPolicy="no-referrer"
                  decoding="async"
                  onError={() => setAvatarError(true)}
                  style={{
                    filter: 'drop-shadow(0 0 18px rgba(0, 240, 255, 0.25))',
                  }}
                  className="relative z-10 h-44 w-44 rounded-2xl object-contain sm:h-48 sm:w-48"
                />
                </picture>
              ) : (
                <div className="relative z-10 flex h-44 w-44 items-center justify-center rounded-2xl bg-[#04071A] font-display text-6xl font-bold text-[#00F0FF]">
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

        {/* Channel Telemetry Bar + 4-Column Metrics Strip with Live Views & Subs Toggle */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#04071A]/95">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#03050a]/70 px-5 py-3 sm:px-6">
            <div className="flex items-center gap-2.5 font-mono text-xs">
              <span className="text-[#00F0FF]">Channel Telemetry</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">
                {liveMode
                  ? isPolling
                    ? 'Polling live stream…'
                    : `Live Feed (${liveSnapshot.lastUpdated})`
                  : 'Channel Baseline'}
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={liveMode}
              onClick={onToggleLiveMode}
              className={`inline-flex min-h-[34px] items-center gap-2 rounded-lg border px-3 py-1 font-mono text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                liveMode
                  ? 'border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#00F0FF]'
                  : 'border-white/15 bg-[#04071A] text-slate-300 hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Live Views &amp; Subs</span>
              <span
                aria-hidden="true"
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  liveMode ? 'bg-[#00F0FF]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-[#03050a] transition-transform ${
                    liveMode ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-[#04071A]/95 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs text-slate-400">Subscribers</p>
                {liveMode && (
                  <RefreshCw
                    className={`h-3 w-3 text-[#00F0FF] ${isPolling ? 'animate-spin' : ''}`}
                  />
                )}
              </div>
              <p className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
                {liveMode ? liveSnapshot.subscribers.toLocaleString() : '204+'}
                {liveMode && liveSnapshot.deltaSubs > 0 && (
                  <span className="ml-2 font-mono text-xs font-medium text-[#00F0FF]">
                    +{liveSnapshot.deltaSubs}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Growing community across YouTube &amp; Instagram
              </p>
            </div>

            <div className="bg-[#04071A]/95 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs text-slate-400">
                  {liveMode ? 'Live Views' : 'Channel Views'}
                </p>
                {liveMode && (
                  <span className="font-mono text-[10px] font-semibold text-[#FFB800]">
                    LIVE
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-display text-2xl font-bold text-[#00F0FF] tabular-nums">
                {liveMode
                  ? liveSnapshot.totalViews.toLocaleString()
                  : `${liveSnapshot.totalViews.toLocaleString()}+`}
                {liveMode && liveSnapshot.deltaViews > 0 && (
                  <span className="ml-2 font-mono text-xs font-medium text-[#FFB800]">
                    +{liveSnapshot.deltaViews}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Cumulative playback across MVs, lyrics &amp; Shorts
              </p>
            </div>

            <div className="bg-[#04071A]/95 p-5 sm:p-6">
              <p className="font-mono text-xs text-slate-400">Published Drops</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
                27+
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Animated music videos, lyric visuals &amp; Shorts
              </p>
            </div>

            <div className="bg-[#04071A]/95 p-5 sm:p-6">
              <p className="font-mono text-xs text-slate-400">Flagship Playlist</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
                Neon Nights
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Cinematic EDM, synthwave &amp; electronic mixes
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
