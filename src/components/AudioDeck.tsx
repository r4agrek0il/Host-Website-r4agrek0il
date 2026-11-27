import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CHANNEL_PROFILE, LAST_5_TRACKS, type ChannelVideo } from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (vol: number) => void;
  loadVideoById: (videoId: string) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          height?: string;
          width?: string;
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface AudioDeckProps {
  currentTrackIndex: number;
  onTrackIndexChange: (idx: number) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  isMuted: boolean;
  onMutedChange: (muted: boolean) => void;
  onExpandCinema: (track: ChannelVideo) => void;
  externalPlayRequestTick: number;
  /** Deck playlist; defaults to the curated LAST_5_TRACKS. */
  tracks?: ChannelVideo[];
}

export default function AudioDeck({
  currentTrackIndex,
  onTrackIndexChange,
  isPlaying,
  onPlayingChange,
  isMuted,
  onMutedChange,
  onExpandCinema,
  externalPlayRequestTick,
  tracks: tracksProp,
}: AudioDeckProps) {
  const tracks = tracksProp && tracksProp.length > 0 ? tracksProp : LAST_5_TRACKS;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const safeIndex = Math.min(Math.max(currentTrackIndex, 0), tracks.length - 1);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const trackIndexRef = useRef(currentTrackIndex);
  const mutedRef = useRef(isMuted);
  const volumeRef = useRef(70);

  const [volume, setVolume] = useState(70);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showVideoStage, setShowVideoStage] = useState(false);
  const [autoplayMutedHint, setAutoplayMutedHint] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const currentTrack = tracks[safeIndex] ?? tracks[0];

  useEffect(() => {
    trackIndexRef.current = safeIndex;
  }, [safeIndex]);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  // Sync master mute state with YouTube player and Synthwave loop
  useEffect(() => {
    const player = playerRef.current;
    if (player && playerReady) {
      if (isMuted) {
        player.mute();
      } else {
        player.unMute();
        player.setVolume(volumeRef.current);
      }
    }
    cyberAudio.setMasterMuted(isMuted);
    cyberAudio.setDuckForYouTube(isPlaying && !isMuted);
  }, [isMuted, isPlaying, playerReady]);

  // Initialize YouTube IFrame Player API once
  useEffect(() => {
    let mounted = true;
    let fallbackCheckTimer: number | undefined;

    const initPlayer = () => {
      if (!mounted || !playerContainerRef.current || !window.YT?.Player || playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        width: '100%',
        height: '100%',
        videoId: (tracksRef.current[trackIndexRef.current] ?? tracksRef.current[0]).videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: ({ target }) => {
            if (!mounted) return;
            setPlayerReady(true);

            // Attempt unmuted autoplay first; if blocked by browser, fallback to muted autoplay
            try {
              target.unMute();
              target.setVolume(volumeRef.current);
              target.playVideo();

              fallbackCheckTimer = window.setTimeout(() => {
                if (!mounted) return;
                const state = target.getPlayerState();
                // 1 = PLAYING, 3 = BUFFERING
                if (state !== 1 && state !== 3) {
                  target.mute();
                  target.playVideo();
                  onMutedChange(true);
                  setAutoplayMutedHint(true);
                } else {
                  onPlayingChange(true);
                  cyberAudio.setDuckForYouTube(true);
                }
              }, 1100);
            } catch {
              target.mute();
              target.playVideo();
              onMutedChange(true);
              setAutoplayMutedHint(true);
            }
          },
          onStateChange: ({ data, target }) => {
            if (!mounted) return;
            const YTState = window.YT?.PlayerState;
            const PLAYING = YTState?.PLAYING ?? 1;
            const PAUSED = YTState?.PAUSED ?? 2;
            const ENDED = YTState?.ENDED ?? 0;

            if (data === PLAYING) {
              onPlayingChange(true);
              const playerIsMuted = target.isMuted();
              if (playerIsMuted && !mutedRef.current) {
                onMutedChange(true);
                setAutoplayMutedHint(true);
              }
              cyberAudio.setDuckForYouTube(!playerIsMuted);
            } else if (data === PAUSED) {
              onPlayingChange(false);
              cyberAudio.setDuckForYouTube(false);
            } else if (data === ENDED) {
              const nextIdx = (trackIndexRef.current + 1) % tracksRef.current.length;
              onTrackIndexChange(nextIdx);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        initPlayer();
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }
    }

    return () => {
      mounted = false;
      if (fallbackCheckTimer) window.clearTimeout(fallbackCheckTimer);
      try {
        playerRef.current?.destroy();
      } catch {
        // Ignore teardown issues
      }
      playerRef.current = null;
    };
  }, []);

  // Unmute instantly on user's first click, tap, or keypress anywhere on the page
  useEffect(() => {
    if (!autoplayMutedHint) return;

    const handleFirstGesture = () => {
      const player = playerRef.current;
      if (player && playerReady) {
        player.unMute();
        player.setVolume(volumeRef.current);
        player.playVideo();
      }
      cyberAudio.startLoop();
      cyberAudio.setMasterMuted(false);
      cyberAudio.setDuckForYouTube(true);
      onMutedChange(false);
      onPlayingChange(true);
      setAutoplayMutedHint(false);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [autoplayMutedHint, playerReady, onMutedChange, onPlayingChange]);

  // Switch loaded YouTube video whenever the selected track changes
  // (keyed by videoId so a refreshed playlist that keeps the same track doesn't restart it)
  const currentVideoId = currentTrack.videoId;
  const prevVideoIdRef = useRef(currentVideoId);
  useEffect(() => {
    if (prevVideoIdRef.current === currentVideoId) return;
    prevVideoIdRef.current = currentVideoId;
    const player = playerRef.current;
    if (player && playerReady) {
      player.loadVideoById(currentVideoId);
      if (!mutedRef.current) {
        player.unMute();
        player.setVolume(volumeRef.current);
      }
      onPlayingChange(true);
    }
  }, [currentVideoId, playerReady, onPlayingChange]);

  // Respond to Hero Play/Pause toggle button
  const prevTickRef = useRef(externalPlayRequestTick);
  useEffect(() => {
    if (prevTickRef.current === externalPlayRequestTick) return;
    prevTickRef.current = externalPlayRequestTick;
    const player = playerRef.current;
    if (!player || !playerReady) return;

    if (isPlaying) {
      player.pauseVideo();
      onPlayingChange(false);
      cyberAudio.startLoop();
      cyberAudio.setDuckForYouTube(false);
    } else {
      if (isMuted) {
        player.unMute();
        player.setVolume(volumeRef.current);
        onMutedChange(false);
        setAutoplayMutedHint(false);
      }
      player.playVideo();
      onPlayingChange(true);
      cyberAudio.setDuckForYouTube(true);
    }
  }, [
    externalPlayRequestTick,
    playerReady,
    isPlaying,
    isMuted,
    onPlayingChange,
    onMutedChange,
  ]);

  const handlePlayPause = () => {
    const player = playerRef.current;
    if (!player || !playerReady) return;
    if (isPlaying) {
      player.pauseVideo();
      onPlayingChange(false);
      cyberAudio.startLoop();
      cyberAudio.setDuckForYouTube(false);
    } else {
      if (autoplayMutedHint) {
        player.unMute();
        onMutedChange(false);
        setAutoplayMutedHint(false);
      }
      player.playVideo();
      onPlayingChange(true);
      cyberAudio.setDuckForYouTube(!isMuted);
    }
  };

  const handlePrev = () => {
    const prevIdx =
      (safeIndex - 1 + tracks.length) % tracks.length;
    onTrackIndexChange(prevIdx);
  };

  const handleNext = () => {
    const nextIdx = (safeIndex + 1) % tracks.length;
    onTrackIndexChange(nextIdx);
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    volumeRef.current = nextVol;
    const player = playerRef.current;
    if (player && playerReady) {
      player.setVolume(nextVol);
      if (nextVol === 0) {
        player.mute();
        onMutedChange(true);
      } else if (isMuted) {
        player.unMute();
        onMutedChange(false);
        setAutoplayMutedHint(false);
      }
    }
  };

  return (
    <aside
      aria-label="R4agRek0il Audio Deck"
      className="fixed right-4 bottom-4 z-40 flex w-[calc(100vw-2rem)] max-w-[376px] flex-col items-end gap-2.5"
    >
      {/* Muted Autoplay Helper Prompt */}
      {autoplayMutedHint && (
        <button
          type="button"
          onClick={() => {
            const player = playerRef.current;
            if (player && playerReady) {
              player.unMute();
              player.setVolume(volumeRef.current);
              player.playVideo();
            }
            onMutedChange(false);
            setAutoplayMutedHint(false);
          }}
          className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-[#00F0FF]/55 bg-[#03050a]/95 px-3.5 py-1.5 font-mono text-[11px] font-medium text-[#00F0FF] shadow-[0_0_24px_rgba(0,240,255,0.28)] backdrop-blur-md transition-colors hover:bg-[#00F0FF]/15"
        >
          <VolumeX className="h-3.5 w-3.5 text-[#FF7B00]" />
          <span>Sound Muted — Click anywhere to unmute</span>
        </button>
      )}

      {/* Last 5 Releases Switcher Drawer */}
      {drawerOpen && (
        <div className="w-full overflow-hidden rounded-2xl border border-[#00F0FF]/30 bg-[#03050a]/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-mono text-xs font-semibold text-[#00F0FF]">
              Last 5 Releases
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="divide-y divide-white/10">
            {tracks.map((track, idx) => {
              const active = idx === safeIndex;
              return (
                <button
                  key={track.videoId}
                  type="button"
                  onClick={() => {
                    onTrackIndexChange(idx);
                    if (autoplayMutedHint) {
                      setAutoplayMutedHint(false);
                      onMutedChange(false);
                    }
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    active
                      ? 'bg-[#00F0FF]/12 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-xs text-[#FF7B00] tabular-nums">
                      {track.index}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-xs font-bold">
                        {track.shortTitle}
                      </p>
                      <p className="truncate font-mono text-[11px] text-slate-400">
                        {track.genre} · {track.duration}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <span className="flex items-end gap-0.5 shrink-0" aria-hidden="true">
                      <span className="h-3 w-0.5 animate-pulse bg-[#00F0FF]" />
                      <span className="h-4 w-0.5 animate-pulse bg-[#FF7B00]" />
                      <span className="h-2.5 w-0.5 animate-pulse bg-[#00F0FF]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Compact Audio Deck */}
      <div className="w-full overflow-hidden rounded-2xl border border-[#00F0FF]/35 bg-[#04071A]/95 shadow-[0_14px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        {/* YouTube IFrame Player Container (1px hidden when audio-focused, 16:9 when video expanded) */}
        <div
          className={
            showVideoStage
              ? 'aspect-video w-full border-b border-white/10 bg-black'
              : 'pointer-events-none h-px w-px overflow-hidden opacity-0'
          }
        >
          <div ref={playerContainerRef} className="h-full w-full" />
        </div>

        {/* Header Strip: Track Info + Expand & Tracklist */}
        <div className="flex items-center justify-between gap-3 p-3 pb-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#03050a]">
              {!avatarFailed ? (
                <img
                  src={CHANNEL_PROFILE.avatarImage}
                  alt="R4agRek0il"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-base font-bold text-[#00F0FF]">
                  4
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-xs font-bold text-white">
                {currentTrack.shortTitle}
              </p>
              <p className="truncate font-mono text-[11px] text-[#00F0FF] tabular-nums">
                Track {safeIndex + 1}/{tracks.length} · {currentTrack.genre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowVideoStage((prev) => !prev)}
              aria-label={showVideoStage ? 'Collapse mini video' : 'Expand mini video'}
              title={showVideoStage ? 'Audio-only view' : 'Show video preview'}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                showVideoStage
                  ? 'border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF]'
                  : 'border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Video className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onExpandCinema(currentTrack)}
              aria-label="Open in Cinema Modal"
              title="Open full Cinema Theater"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Transport Controls + Volume + Last 5 Drawer Toggle */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous track"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause track' : 'Play track'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF7B00] text-[#04071A] transition-colors hover:bg-[#FFB800]"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next track"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Mute + Slim Volume Slider */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted;
                onMutedChange(nextMuted);
                setAutoplayMutedHint(false);
              }}
              aria-label={isMuted ? 'Unmute audio deck' : 'Mute audio deck'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-[#FF7B00]" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#00F0FF]" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              aria-label="Audio deck volume"
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="h-1 w-16 cursor-pointer accent-[#00F0FF]"
            />
          </div>

          {/* Last 5 Releases Drawer Button */}
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 font-mono text-[11px] font-medium text-slate-200 whitespace-nowrap transition-colors hover:border-[#00F0FF]/50 hover:text-white"
          >
            <ListMusic className="h-3.5 w-3.5 text-[#00F0FF]" />
            <span>5 Tracks</span>
            {drawerOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
