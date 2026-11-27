import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { getYouTubeThumbnailUrl, getYouTubeWatchUrl, type ChannelVideo } from '../data/channel';
import type { SpotlightPick } from '../utils/useChannelVideos';
import ReleaseArtwork from './ReleaseArtwork';
import SubscribeButton from './SubscribeButton';

interface SpotlightPopularProps {
  isLive: boolean;
  spotlight: SpotlightPick | null;
  topVideo: ChannelVideo | null;
  topShort: ChannelVideo | null;
  onPlay: (video: ChannelVideo) => void;
}

function formatViews(n: number | null | undefined): string | null {
  return typeof n === 'number' ? `${n.toLocaleString()} views` : null;
}

function Thumb({ video }: { video: ChannelVideo }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black aspect-video`}>
      {!failed ? (
        <img
          src={getYouTubeThumbnailUrl(video.videoId)}
          width={480}
          height={360}
          loading="lazy"
          decoding="async"
          alt={video.title}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0">
          <ReleaseArtwork title={video.title} accentTone={video.accentTone} waveformSeed={video.waveformSeed} />
        </div>
      )}
    </div>
  );
}

function Actions({ video, onPlay }: { video: ChannelVideo; onPlay: (v: ChannelVideo) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onPlay(video)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#00F0FF]/60 bg-[#00F0FF]/10 px-3.5 py-2 text-xs font-semibold text-[#00F0FF] transition-colors hover:bg-[#00F0FF]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
      >
        <Play className="h-3.5 w-3.5" /> Play
      </button>
      <SubscribeButton size="sm" />
      <a
        href={getYouTubeWatchUrl(video.videoId, video.isShort)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
      >
        <ExternalLink className="h-3.5 w-3.5" /> YouTube
      </a>
    </div>
  );
}

function PopularCard({ label, video, onPlay }: { label: string; video: ChannelVideo; onPlay: (v: ChannelVideo) => void }) {
  const views = formatViews(video.views);
  return (
    <div className="group rounded-2xl border border-white/10 bg-[#04071A]/70 p-4">
      <p className="mb-3 font-mono text-xs text-[#FFB800]">
        <span aria-hidden="true">⭐</span> {label}
      </p>
      <Thumb video={video} />
      <h3 className="mt-3 line-clamp-2 font-display text-base font-bold text-white">{video.title}</h3>
      {views && <p className="mt-1 font-mono text-xs text-white/60">{views}</p>}
      <Actions video={video} onPlay={onPlay} />
    </div>
  );
}

export default function SpotlightPopular({ isLive, spotlight, topVideo, topShort, onPlay }: SpotlightPopularProps) {
  if (!isLive || (!spotlight && !topVideo && !topShort)) return null;
  const sv = spotlight?.video;
  const badge =
    spotlight?.reason === 'pinned' ? 'Spotlight' : spotlight?.reason === 'trending' ? 'Trending now' : 'Rising fast';
  const badgeIcon = spotlight?.reason === 'rising' ? '🚀' : '🔥';
  const svViews = formatViews(sv?.views);
  const gainLine =
    spotlight?.reason === 'trending' && spotlight.gained && spotlight.windowHours
      ? `+${spotlight.gained.toLocaleString()} views in last ${spotlight.windowHours}h`
      : null;

  return (
    <section id="spotlight" aria-labelledby="spotlight-heading" className="border-t border-white/10 bg-[#04071A]/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs text-[#FF7A00]">Signal Boost</p>
        <h2 id="spotlight-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">
          Spotlight &amp; Most Popular
        </h2>
        <div className={`mt-8 grid gap-6 ${sv ? 'lg:grid-cols-[1.4fr_1fr]' : ''}`}>
          {sv && (
            <div className="group self-start rounded-2xl border border-[#FF7B00]/40 bg-[#04071A]/80 p-5 shadow-[0_0_40px_-12px_rgba(255,123,0,0.5)]">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#FF7B00]/60 bg-[#FF7B00]/15 px-3 py-1 font-mono text-xs font-semibold text-[#FFB800]">
                  <span aria-hidden="true">{badgeIcon}</span> {badge}
                </span>
                {gainLine && <span className="font-mono text-xs text-[#00F0FF]">{gainLine}</span>}
              </div>
              <Thumb video={sv} />
              <h3 className="mt-4 font-display text-xl font-bold text-white sm:text-2xl">{sv.title}</h3>
              {svViews && <p className="mt-1 font-mono text-xs text-white/60">{svViews}</p>}
              <Actions video={sv} onPlay={onPlay} />
            </div>
          )}
          <div className={`grid gap-6 ${sv ? '' : 'sm:grid-cols-2'}`}>
            {topVideo && <PopularCard label="Most Popular Song" video={topVideo} onPlay={onPlay} />}
            {topShort && <PopularCard label="Top Short" video={topShort} onPlay={onPlay} />}
          </div>
        </div>
      </div>
    </section>
  );
}
