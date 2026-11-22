import { useCallback, useEffect, useState } from 'react';
import AudioDeck from './components/AudioDeck';
import BootSequence from './components/BootSequence';
import ChannelMarquee from './components/ChannelMarquee';
import CinemaModal from './components/CinemaModal';
import CinemaVault from './components/CinemaVault';
import CommunityNexus from './components/CommunityNexus';
import ConciergeTerminal from './components/ConciergeTerminal';
import CyberBackdrop from './components/CyberBackdrop';
import CyberSonicStage3D from './components/CyberSonicStage3D';
import EngagementAnalytics from './components/EngagementAnalytics';
import Footer from './components/Footer';
import HeroStage from './components/HeroStage';
import Navbar from './components/Navbar';
import PillarsMatrix from './components/PillarsMatrix';
import ShortsFeed from './components/ShortsFeed';
import { CHANNEL_VIDEOS, LAST_5_TRACKS, type ChannelVideo } from './data/channel';
import { cyberAudio } from './utils/audioEngine';

export default function App() {
  const [bootComplete, setBootComplete] = useState(false);

  // Synced Audio Deck (Last 5 Tracks) + Synthwave Background Loop State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isDeckPlaying, setIsDeckPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [externalPlayTick, setExternalPlayTick] = useState(0);

  // Cinema Vault & Modal State
  const [activeVaultVideo, setActiveVaultVideo] = useState<ChannelVideo>(LAST_5_TRACKS[0]);
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const [modalVideo, setModalVideo] = useState<ChannelVideo | null>(null);

  const currentDeckTrack = LAST_5_TRACKS[currentTrackIndex] ?? LAST_5_TRACKS[0];
  const anyPlaybackActive = isDeckPlaying || isPlayingInline || modalVideo !== null;

  const handleBootComplete = useCallback(() => {
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
    setActiveVaultVideo(LAST_5_TRACKS[idx] ?? LAST_5_TRACKS[0]);
  }, []);

  const handleSelectInlineVideo = (video: ChannelVideo, autoPlay = true) => {
    setActiveVaultVideo(video);
    setIsPlayingInline(autoPlay);
    const matchingDeckIdx = LAST_5_TRACKS.findIndex((t) => t.videoId === video.videoId);
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
    const matchingDeckIdx = LAST_5_TRACKS.findIndex((t) => t.videoId === video.videoId);
    if (matchingDeckIdx !== -1) {
      setCurrentTrackIndex(matchingDeckIdx);
    }
    if (isDeckPlaying) {
      setExternalPlayTick((t) => t + 1);
    }
  };

  const handleNextModalTrack = () => {
    const currentIndex = CHANNEL_VIDEOS.findIndex(
      (v) => v.videoId === (modalVideo?.videoId ?? activeVaultVideo.videoId)
    );
    const nextIndex = (currentIndex + 1) % CHANNEL_VIDEOS.length;
    const nextVideo = CHANNEL_VIDEOS[nextIndex];
    setActiveVaultVideo(nextVideo);
    setModalVideo(nextVideo);
  };

  return (
    <div className="relative min-h-screen bg-[#03050a] text-[#F8FAFC]">
      <CyberBackdrop isPlaying={anyPlaybackActive} />

      {!bootComplete && <BootSequence onComplete={handleBootComplete} />}

      <Navbar
        isAudioMuted={isAudioMuted}
        onToggleMasterMute={handleToggleMasterMute}
      />

      <main className="relative z-10">
        <HeroStage
          currentDeckTrack={currentDeckTrack}
          isDeckPlaying={isDeckPlaying}
          isAudioMuted={isAudioMuted}
          onToggleDeckPlay={handleToggleDeckPlay}
          onToggleMasterMute={handleToggleMasterMute}
          onOpenCinemaModal={handleOpenModal}
        />

        <ChannelMarquee />

        <CinemaVault
          activeVideo={activeVaultVideo}
          isPlayingInline={isPlayingInline}
          onSelectInlineVideo={handleSelectInlineVideo}
          onOpenModal={handleOpenModal}
        />

        <EngagementAnalytics />

        <CyberSonicStage3D isPlaying={anyPlaybackActive} />

        <ShortsFeed onOpenShort={handleOpenModal} />

        <PillarsMatrix />

        <ConciergeTerminal onPlayTrack={handleOpenModal} />

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
      />
    </div>
  );
}
