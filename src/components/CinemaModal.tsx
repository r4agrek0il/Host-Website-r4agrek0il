import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, SkipForward, X } from 'lucide-react';
import SubscribeButton from './SubscribeButton';
import { getYouTubeWatchUrl, type ChannelVideo } from '../data/channel';

interface CinemaModalProps {
  video: ChannelVideo | null;
  onClose: () => void;
  onNext: () => void;
}

export default function CinemaModal({ video, onClose, onNext }: CinemaModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!video) return;
    setCopied(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [video, onClose]);

  if (!video) return null;

  const watchUrl = getYouTubeWatchUrl(video.videoId, video.isShort);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cinema-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#00F0FF]/35 bg-[#04071A] shadow-[0_0_60px_rgba(0,240,255,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400 tabular-nums">
            <span className="text-[#00F0FF]">{video.index}</span>
            <span aria-hidden="true">·</span>
            <span>{video.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{video.duration}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cinema modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Widescreen / Vertical YouTube Privacy-Enhanced Embed */}
        <div
          className={`mx-auto bg-[#000000] ${
            video.isShort ? 'aspect-[9/16] max-h-[62vh]' : 'aspect-video w-full'
          }`}
        >
          <iframe
            key={video.videoId}
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Dossier Details & Queue Actions */}
        <div className="border-t border-white/10 p-6 sm:p-8">
          <p className="font-mono text-xs text-[#FF7A00]">
            {video.releaseNote} · {video.genre}
          </p>
          <h3
            id="cinema-modal-title"
            className="mt-1.5 font-display text-xl font-bold text-white sm:text-2xl"
          >
            {video.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{video.storyNote}</p>
          <p className="mt-3 font-mono text-xs text-slate-400">
            {video.moodTags.join(' · ')}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2.5 text-sm font-semibold text-[#04071A] whitespace-nowrap transition-colors hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            >
              <SkipForward className="h-4 w-4" />
              <span>Play Next Track</span>
            </button>

            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            >
              <span>Open on YouTube</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <SubscribeButton />

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#00F0FF]" />
                  <span>Copied Link</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-300" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
