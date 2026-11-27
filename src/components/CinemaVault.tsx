import { useMemo, useState } from 'react';
import { ArrowUpRight, Maximize2, Play, Search, Share2, Sparkles, X } from 'lucide-react';
import SubscribeButton from './SubscribeButton';
import { shareLink } from '../utils/share';
import {
  SUBSCRIBE_URL,
  CHANNEL_VIDEOS,
  getYouTubeThumbnailUrl,
  getYouTubeWatchUrl,
  NEON_NIGHTS_PLAYLIST,
  type ChannelVideo,
  type ReleaseCategory,
} from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';
import ReleaseArtwork from './ReleaseArtwork';

interface CinemaVaultProps {
  activeVideo: ChannelVideo;
  isPlayingInline: boolean;
  onSelectInlineVideo: (video: ChannelVideo, autoPlay?: boolean) => void;
  onOpenModal: (video: ChannelVideo) => void;
  /** Vault catalogue; defaults to curated CHANNEL_VIDEOS. */
  videos?: ChannelVideo[];
}

const FILTER_TABS: { id: ReleaseCategory; label: string }[] = [
  { id: 'all', label: 'All Releases' },
  { id: 'animated-mv', label: 'Animated MV' },
  { id: 'lyric-video', label: 'Lyric Video' },
  { id: 'neon-nights', label: 'Neon Nights' },
  { id: 'shorts', label: 'Shorts' },
];

export default function CinemaVault({
  activeVideo,
  isPlayingInline,
  onSelectInlineVideo,
  onOpenModal,
  videos = CHANNEL_VIDEOS,
}: CinemaVaultProps) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ReleaseCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return videos.filter((video) => {
      const matchesCategory =
        activeCategory === 'all'
          ? true
          : activeCategory === 'neon-nights'
            ? Boolean(video.inNeonNights)
            : video.category === activeCategory;
      const matchesQuery =
        q.length === 0 ||
        video.title.toLowerCase().includes(q) ||
        video.genre.toLowerCase().includes(q) ||
        video.moodTags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery, videos]);

  const markThumbFailed = (videoId: string) => {
    setFailedThumbs((prev) => ({ ...prev, [videoId]: true }));
  };

  return (
    <section id="cinema" className="border-t border-white/10 bg-[#000000] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs text-[#00F0FF]">Music Core</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">
              Cinema Theater &amp; Discography Vault
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playUiPulse(580);
              setAmbientGlow((prev) => !prev);
            }}
            aria-pressed={ambientGlow}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
              ambientGlow
                ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-[#FFB800]'
                : 'border-white/15 bg-[#04071A] text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{ambientGlow ? 'Ambient Glow: On' : 'Ambient Glow: Off'}</span>
          </button>
        </div>

        {/* Featured Widescreen Cinema Visor */}
        <div className="relative mt-8">
          {ambientGlow && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-r from-[#00F0FF]/20 via-transparent to-[#FF7A00]/20 blur-2xl"
            />
          )}

          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#04071A]">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* 16:9 Stage (lazy-mounts iframe only on user click) */}
              <div className="relative aspect-video w-full bg-[#000000] lg:col-span-8">
                {isPlayingInline ? (
                  <iframe
                    key={activeVideo.videoId}
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&rel=0`}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.playUiPulse(860);
                      onSelectInlineVideo(activeVideo, true);
                    }}
                    className="group relative flex h-full w-full items-center justify-center overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    {!failedThumbs[activeVideo.videoId] ? (
                      <img
                        src={getYouTubeThumbnailUrl(activeVideo.videoId)}
                        alt={activeVideo.title}
                        referrerPolicy="no-referrer"
                        onError={() => markThumbFailed(activeVideo.videoId)}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <ReleaseArtwork
                        title={activeVideo.shortTitle}
                        accentTone={activeVideo.accentTone}
                        waveformSeed={activeVideo.waveformSeed}
                        featured
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                    <div className="relative z-10 flex flex-col items-center gap-3 px-4 text-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF7A00] text-[#04071A] shadow-lg transition-transform duration-150 group-hover:scale-105 group-hover:bg-[#FFB800]">
                        <Play className="ml-0.5 h-7 w-7 fill-current" />
                      </span>
                      <span className="font-mono text-xs font-medium text-white">
                        Play in Cinema Visor
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Active Track Dossier Panel */}
              <div className="flex flex-col justify-between border-t border-white/10 p-6 lg:col-span-4 lg:border-t-0 lg:border-l">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400 tabular-nums">
                    <span className="text-[#00F0FF]">{activeVideo.index}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeVideo.categoryLabel}</span>
                    {activeVideo.duration && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activeVideo.duration}</span>
                      </>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-xl font-bold leading-snug text-white">
                    {activeVideo.shortTitle}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[#FF7A00]">
                    {activeVideo.releaseNote} · {activeVideo.genre}
                  </p>

                  <p className="mt-4 text-sm leading-relaxed text-slate-300">
                    {activeVideo.storyNote}
                  </p>

                  <p className="mt-4 font-mono text-xs text-slate-400">
                    {activeVideo.moodTags.join(' · ')}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.playUiPulse(740);
                      onOpenModal(activeVideo);
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3.5 py-2 text-xs font-semibold text-[#00F0FF] whitespace-nowrap transition-colors hover:bg-[#00F0FF]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Expand Theater</span>
                  </button>

                  <a
                    href={getYouTubeWatchUrl(activeVideo.videoId, activeVideo.isShort)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white whitespace-nowrap transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    <span>YouTube</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={async () => {
                      const result = await shareLink(
                        getYouTubeWatchUrl(activeVideo.videoId, activeVideo.isShort),
                        activeVideo.title
                      );
                      setShareStatus(result === 'copied' ? 'Link copied' : result === 'shared' ? 'Shared' : null);
                      window.setTimeout(() => setShareStatus(null), 2000);
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white whitespace-nowrap transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{shareStatus ?? 'Share'}</span>
                  </button>

                  <SubscribeButton size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs + Search Row */}
        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Filter discography vault"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#04071A] p-1"
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    cyberAudio.playUiPulse(660);
                    setActiveCategory(tab.id);
                  }}
                  className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                    isActive
                      ? 'bg-[#FF7A00] text-[#04071A]'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search track, mood, or genre"
              aria-label="Search tracks by title, mood, or genre"
              className="h-10 w-full rounded-lg border border-white/15 bg-[#04071A] pr-8 pl-9 text-sm text-white placeholder:text-slate-400 focus:border-[#00F0FF] focus:outline-none sm:w-64"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Track Grid */}
        {filteredVideos.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#04071A] p-10 text-center">
            <p className="font-display text-lg font-semibold text-white">
              No tracks match your filter
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Reset the category tab or clear the search input to view all verified uploads.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="mt-5 min-h-[40px] rounded-lg bg-[#FF7A00] px-4 py-2 text-xs font-semibold text-[#04071A]"
            >
              Show All Releases
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => {
              const isSelected = activeVideo.videoId === video.videoId;
              return (
                <article
                  key={video.videoId}
                  className={`chromatic-hover group flex flex-col overflow-hidden rounded-2xl border bg-[#04071A] transition-colors ${
                    isSelected ? 'border-[#00F0FF]/70' : 'border-white/10 hover:border-[#00F0FF]/40'
                  }`}
                >
                  {/* Thumbnail Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.playUiPulse(800);
                      onSelectInlineVideo(video, true);
                    }}
                    className="relative aspect-video w-full overflow-hidden border-b border-white/10 bg-[#000000] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    {!failedThumbs[video.videoId] ? (
                      <img
                        src={getYouTubeThumbnailUrl(video.videoId)}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        onError={() => markThumbFailed(video.videoId)}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <ReleaseArtwork
                        title={video.shortTitle}
                        accentTone={video.accentTone}
                        waveformSeed={video.waveformSeed}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <span className="absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A00] text-[#04071A] shadow-md transition-transform duration-150 group-hover:scale-105">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                    {video.duration && (
                      <span className="absolute bottom-3 left-3 font-mono text-xs font-medium text-white tabular-nums">
                        {video.duration}
                      </span>
                    )}
                    {video.isNew && (
                      <span className="absolute top-3 left-3 inline-flex items-center rounded-full border border-[#FF7A00]/60 bg-[#04071A]/85 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#FF7A00] shadow-[0_0_12px_rgba(255,122,0,0.45)]">
                        NEW
                      </span>
                    )}
                  </button>

                  {/* Metadata & Actions */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400 tabular-nums">
                        <span className="text-[#00F0FF]">{video.index}</span>
                        <span aria-hidden="true">·</span>
                        <span>{video.categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{video.genre}</span>
                      </div>

                      <h3 className="mt-2 font-display text-lg font-bold text-white">
                        {video.shortTitle}
                      </h3>

                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        {video.storyNote}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          cyberAudio.playUiPulse(720);
                          onOpenModal(video);
                        }}
                        className="font-semibold text-[#00F0FF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                      >
                        Open Theater
                      </button>

                      <a
                        href={getYouTubeWatchUrl(video.videoId, video.isShort)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-slate-300 hover:text-[#FF7A00]"
                      >
                        <span>YouTube</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>

                      <a
                        href={SUBSCRIBE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#FF7A00] hover:underline"
                      >
                        Subscribe
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Featured Neon Nights Playlist Banner */}
        <div className="mt-10 flex flex-col justify-between gap-6 rounded-2xl border border-[#00F0FF]/25 bg-gradient-to-r from-[#04071A] via-[#091233] to-[#04071A] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="font-mono text-xs text-[#00F0FF]">Featured Playlist</p>
            <h3 className="mt-1.5 font-display text-xl font-bold text-white">
              {NEON_NIGHTS_PLAYLIST.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {NEON_NIGHTS_PLAYLIST.tagline} {NEON_NIGHTS_PLAYLIST.description}
            </p>
          </div>
          <a
            href={NEON_NIGHTS_PLAYLIST.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7A00] px-5 py-2.5 text-sm font-semibold text-[#04071A] whitespace-nowrap shrink-0 transition-colors hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            <span>Open Playlist</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
