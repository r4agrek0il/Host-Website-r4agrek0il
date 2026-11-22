import { useState } from 'react';
import { Maximize2, SkipForward, X } from 'lucide-react';
import { CHANNEL_PROFILE, type ChannelVideo } from '../data/channel';

interface MiniPlayerDockProps {
  activeVideo: ChannelVideo;
  visible: boolean;
  onExpand: () => void;
  onNext: () => void;
  onDismiss: () => void;
}

export default function MiniPlayerDock({
  activeVideo,
  visible,
  onExpand,
  onNext,
  onDismiss,
}: MiniPlayerDockProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (!visible) return null;

  return (
    <aside
      aria-label="Active track mini-player"
      className="fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-[#00F0FF]/40 bg-[#04071A]/95 p-2.5 pr-3 shadow-[0_12px_40px_rgba(0,0,0,0.75)] backdrop-blur-md"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#000000]">
        {!avatarFailed ? (
          <img
            src={CHANNEL_PROFILE.avatarImage}
            alt="R4agRek0il"
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-[#00F0FF]">
            4
          </div>
        )}
      </div>

      <div className="min-w-0 max-w-[160px] sm:max-w-[200px]">
        <p className="truncate font-display text-xs font-bold text-white">
          {activeVideo.shortTitle}
        </p>
        <p className="truncate font-mono text-[11px] text-[#00F0FF]">
          {activeVideo.categoryLabel} · {activeVideo.duration}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expand Cinema Theater"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF7A00] text-[#04071A] transition-colors hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Play next track"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss mini-player"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
