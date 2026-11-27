import { useMemo, useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import {
  CHANNEL_PROFILE,
  CHANNEL_VIDEOS,
  getYouTubeThumbnailUrl,
  type ChannelVideo,
} from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';
import ReleaseArtwork from './ReleaseArtwork';
import SubscribeButton from './SubscribeButton';

interface ShortsFeedProps {
  onOpenShort: (video: ChannelVideo) => void;
  /** Live shorts list (newest first); slots fall back to curated highlights. */
  shorts?: ChannelVideo[];
}

interface ShortsSlot {
  video: ChannelVideo;
  hook: string;
  format: string;
}

const SHORTS_HIGHLIGHTS: ShortsSlot[] = [
  {
    video: CHANNEL_VIDEOS.find((v) => v.videoId === 'QIV-N_7nPcE') ?? CHANNEL_VIDEOS[5],
    hook: 'Bring the Light — Vertical EDM Hook',
    format: '9:16 Vertical Drop',
  },
  {
    video: CHANNEL_VIDEOS[0],
    hook: 'Not Dancing — Kinetic Cut Highlight',
    format: 'Animation Loop',
  },
  {
    video: CHANNEL_VIDEOS[1],
    hook: 'Lost the Count — Synth Pulse Cut',
    format: 'Breakout Teaser',
  },
];

// Newest Shorts first. The curated highlight slots (Wake the Night short pinned first)
// are used only when there are no Shorts at all, or to fill remaining slots.
function buildSlots(shorts: ChannelVideo[] | undefined): ShortsSlot[] {
  if (!shorts || shorts.length === 0) return SHORTS_HIGHLIGHTS;
  const slots = shorts.slice(0, SHORTS_HIGHLIGHTS.length).map<ShortsSlot>((v) => {
    const curated = SHORTS_HIGHLIGHTS.find((h) => h.video.videoId === v.videoId);
    return curated
      ? { ...curated, video: v }
      : { video: v, hook: v.shortTitle, format: v.isNew ? 'New Vertical Drop' : '9:16 Vertical Drop' };
  });
  for (const fallback of SHORTS_HIGHLIGHTS) {
    if (slots.length >= SHORTS_HIGHLIGHTS.length) break;
    if (!slots.some((s) => s.video.videoId === fallback.video.videoId)) slots.push(fallback);
  }
  return slots;
}

export default function ShortsFeed({ onOpenShort, shorts }: ShortsFeedProps) {
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});
  const slots = useMemo(() => buildSlots(shorts), [shorts]);

  return (
    <section id="shorts" className="border-t border-white/10 bg-[#04071A]/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs text-[#FF7A00]">Vertical Cyber-Feed</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">
              YouTube Shorts &amp; Rapid Drops
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Bite-sized vertical music hooks, visual previews, and kinetic lyric cuts from @R4agRek0il.
            </p>
          </div>

          <a
            href={CHANNEL_PROFILE.urls.shorts}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#00F0FF] whitespace-nowrap shrink-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            <span>Open All Shorts</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <SubscribeButton size="sm" className="shrink-0" />
        </div>

        {/* Horizontal 9:16 Showcase Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {slots.map((item, idx) => {
            const thumbKey = `${item.video.videoId}-${idx}`;
            return (
              <button
                key={thumbKey}
                type="button"
                onClick={() => {
                  cyberAudio.playUiPulse(840);
                  onOpenShort(item.video);
                }}
                className="chromatic-hover group relative flex aspect-[9/14] w-full flex-col justify-end overflow-hidden rounded-2xl border border-white/15 bg-[#000000] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                {!failedThumbs[thumbKey] ? (
                  <img
                    src={getYouTubeThumbnailUrl(item.video.videoId)}
                    width={480}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    alt={item.hook}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedThumbs((prev) => ({ ...prev, [thumbKey]: true }))
                    }
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0">
                    <ReleaseArtwork
                      title={item.hook}
                      accentTone={item.video.accentTone}
                      waveformSeed={item.video.waveformSeed + idx}
                    />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/15" />

                <div className="relative z-10 p-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FF7A00] text-[#04071A] shadow-lg transition-transform duration-150 group-hover:scale-105">
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </span>
                  <p className="mt-4 font-mono text-xs text-[#00F0FF]">{item.format}</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">
                    {item.hook}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
