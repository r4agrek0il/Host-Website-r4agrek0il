import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AudioDeck from './components/AudioDeck';
import BootSequence from './components/BootSequence';
import MobileSubscribePill from './components/MobileSubscribePill';
import ChannelMarquee from './components/ChannelMarquee';
import CinemaModal from './components/CinemaModal';
import CinemaVault from './components/CinemaVault';
import CommunityNexus from './components/CommunityNexus';
import CyberBackdrop from './components/CyberBackdrop';
import CyberSonicStage3D from './components/CyberSonicStage3D';
import EngagementAnalytics from './components/EngagementAnalytics';
import Footer from './components/Footer';
import HeroStage from './components/HeroStage';
import Navbar from './components/Navbar';
import PillarsMatrix from './components/PillarsMatrix';
import ShortsFeed from './components/ShortsFeed';
import { type ChannelVideo } from './data/channel';
import { useChannelVideos } from './utils/useChannelVideos';
import { cyberAudio } from './utils/audioEngine';
import {
  getInitialSnapshot,
  pollChannelTelemetry,
  type LiveChannelSnapshot,
} from './utils/telemetryPoller';

const BOOT_SEEN_KEY = 'r4ag-boot-seen';

// Skip the boot intro for campaign/referral traffic, repeat views this session, and reduced-motion users.
function shouldSkipBoot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('src') || params.has('utm_source')) return true;
  } catch {
    /* ignore */
  }
  try {
    if (window.sessionStorage.getItem(BOOT_SEEN_KEY)) return true;
  } catch {
    /* storage unavailable */
  }
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export default function App() {
  const [bootComplete, setBootComplete] = useState(shouldSkipBoot);

  // Live YouTube uploads (RSS via /api/videos) merged with curated metadata
  const { videos: channelVideos, tracks: deckTracks, shorts: liveShorts } = useChannelVideos();
  const deckTracksRef = useRef(deckTracks);

  // Synced Audio Deck (Last 5 Tracks) + Synthwave Background Loop State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isDeckPlaying, setIsDeckPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [externalPlayTick, setExternalPlayTick] = useState(0);

  // Cinema Vault & Modal State
  const [activeVaultVideo, setActiveVaultVideo] = useState<ChannelVideo>(deckTracks[0]);
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const [modalVideo, setModalVideo] = useState<ChannelVideo | null>(null);

  // Synced Live Views & Subscribers Telemetry State
  const [liveMode, setLiveMode] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveChannelSnapshot>(getInitialSnapshot);
  const snapshotRef = useRef<LiveChannelSnapshot>(liveSnapshot);

  useEffect(() => {
    snapshotRef.current = liveSnapshot;
  }, [liveSnapshot]);

  useEffect(() => {
    if (!liveMode) return;

    let cancelled = false;
    const runPoll = async () => {
      setIsPolling(true);
      const next = await pollChannelTelemetry(snapshotRef.current);
      if (!cancelled) {
        setLiveSnapshot(next);
        setIsPolling(false);
      }
    };

    void runPoll();
    const intervalId = window.setInterval(() => {
      void runPoll();
    }, 3500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [liveMode]);

  const handleToggleLiveMode = useCallback(() => {
    setLiveMode((prev) => !prev);
  }, []);

  // Keep the selected deck track stable (by videoId) when the playlist refreshes; clamp otherwise.
  useEffect(() => {
    const prevTracks = deckTracksRef.current;
    deckTracksRef.current = deckTracks;
    if (prevTracks === deckTracks) return;
    setCurrentTrackIndex((idx) => {
      const prevId = prevTracks[idx]?.videoId;
      const found = prevId ? deckTracks.findIndex((t) => t.videoId === prevId) : -1;
      if (found !== -1) return found;
      return Math.min(Math.max(idx, 0), deckTracks.length - 1);
    });
    setActiveVaultVideo((prev) => channelVideos.find((v) => v.videoId === prev.videoId) ?? prev);
  }, [deckTracks, channelVideos]);

  const currentDeckTrack = deckTracks[currentTrackIndex] ?? deckTracks[0];
  const marqueeTitles = useMemo(
    () => channelVideos.filter((v) => v.isNew).slice(0, 4).map((v) => v.shortTitle),
    [channelVideos]
  );
  const anyPlaybackActive = isDeckPlaying || isPlayingInline || modalVideo !== null;

  const handleBootComplete = useCallback(() => {
    try {
      window.sessionStorage.setItem(BOOT_SEEN_KEY, '1');
    } catch {
      /* storage unavailable */
    }
    setBootComplete(true);
  }, []);

  // Initialize continuous low-volume synthwave background loop on first interaction
  // (automatically ducks whenever unmuted YouTube Audio Deck plays)
  useEffect(() => {
    const startAmbienceOnGesture = () => {
      cyberAudio.startLoop();
      cyberAudio.setMasterMuted(isAudioMuted);
      cyberAudio.setDuckForYouTube(isDeckPlaying && !isMutedRef);
    };

    const isMutedRef = isAudioMuted;
    window.addEventListener('pointerdown', startAmbienceOnGesture, { once: true });
    window.addEventListener('keydown', startAmbienceOnGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', startAmbienceOnGesture);
      window.removeEventListener('keydown', startAmbienceOnGesture);
      cyberAudio.stopLoop();
    };
  }, []);

  const handleToggleMasterMute = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      cyberAudio.startLoop();
      cyberAudio.setMasterMuted(next);
      cyberAudio.setDuckForYouTube(isDeckPlaying && !next);
      return next;
    });
  }, [isDeckPlaying]);

  const handleToggleDeckPlay = useCallback(() => {
    cyberAudio.startLoop();
    setExternalPlayTick((t) => t + 1);
  }, []);

  const handleTrackIndexChange = useCallback((idx: number) => {
    setCurrentTrackIndex(idx);
    const list = deckTracksRef.current;
    setActiveVaultVideo(list[idx] ?? list[0]);
  }, []);

  const handleSelectInlineVideo = (video: ChannelVideo, autoPlay = true) => {
    setActiveVaultVideo(video);
    setIsPlayingInline(autoPlay);
    const matchingDeckIdx = deckTracks.findIndex((t) => t.videoId === video.videoId);
    if (matchingDeckIdx !== -1) {
      setCurrentTrackIndex(matchingDeckIdx);
    }
    if (autoPlay && isDeckPlaying) {
      // Pause background deck while inline Cinema Visor plays to prevent conflicting audio
      setExternalPlayTick((t) => t + 1);
    }
  };

  const handleOpenModal = (video: ChannelVideo) => {
    setActiveVaultVideo(video);
    setIsPlayingInline(false);
    setModalVideo(video);
    const matchingDeckIdx = deckTracks.findIndex((t) => t.videoId === video.videoId);
    if (matchingDeckIdx !== -1) {
      setCurrentTrackIndex(matchingDeckIdx);
    }
    if (isDeckPlaying) {
      setExternalPlayTick((t) => t + 1);
    }
  };

  const handleNextModalTrack = () => {
    const currentIndex = channelVideos.findIndex(
      (v) => v.videoId === (modalVideo?.videoId ?? activeVaultVideo.videoId)
    );
    const nextIndex = (currentIndex + 1) % channelVideos.length;
    const nextVideo = channelVideos[nextIndex];
    setActiveVaultVideo(nextVideo);
    setModalVideo(nextVideo);
  };

  return (
    <div className="relative min-h-screen bg-[#03050a] text-[#F8FAFC]">
      <CyberBackdrop isPlaying={anyPlaybackActive} />

      {!bootComplete && <BootSequence onComplete={handleBootComplete} />}
      <MobileSubscribePill />

      <Navbar
        isAudioMuted={isAudioMuted}
        onToggleMasterMute={handleToggleMasterMute}
      />

      <main className="relative z-10">
        <HeroStage
          currentDeckTrack={currentDeckTrack}
          isDeckPlaying={isDeckPlaying}
          isPlaybackActive={anyPlaybackActive}
          isAudioMuted={isAudioMuted}
          liveMode={liveMode}
          isPolling={isPolling}
          liveSnapshot={liveSnapshot}
          onToggleLiveMode={handleToggleLiveMode}
          onToggleDeckPlay={handleToggleDeckPlay}
          onToggleMasterMute={handleToggleMasterMute}
          onOpenCinemaModal={handleOpenModal}
        />

        <ChannelMarquee titles={marqueeTitles} />

        <CinemaVault
          activeVideo={activeVaultVideo}
          isPlayingInline={isPlayingInline}
          onSelectInlineVideo={handleSelectInlineVideo}
          onOpenModal={handleOpenModal}
          videos={channelVideos}
        />

        <EngagementAnalytics
          liveMode={liveMode}
          isPolling={isPolling}
          liveSnapshot={liveSnapshot}
          onToggleLiveMode={handleToggleLiveMode}
        />

        <CyberSonicStage3D isPlaying={anyPlaybackActive} />

        <ShortsFeed onOpenShort={handleOpenModal} shorts={liveShorts} />

        <PillarsMatrix />

        <CommunityNexus />
      </main>

      <div className="relative z-10">
        <Footer />
      </div>

      <CinemaModal
        video={modalVideo}
        onClose={() => setModalVideo(null)}
        onNext={handleNextModalTrack}
      />

      <AudioDeck
        currentTrackIndex={currentTrackIndex}
        onTrackIndexChange={handleTrackIndexChange}
        isPlaying={isDeckPlaying}
        onPlayingChange={setIsDeckPlaying}
        isMuted={isAudioMuted}
        onMutedChange={setIsAudioMuted}
        onExpandCinema={handleOpenModal}
        externalPlayRequestTick={externalPlayTick}
        tracks={deckTracks}
      />
    </div>
  );
}
