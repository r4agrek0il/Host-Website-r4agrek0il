import { useCallback, useEffect, useState } from 'react';
import BootSequence from './components/BootSequence';
import ChannelMarquee from './components/ChannelMarquee';
import CinemaModal from './components/CinemaModal';
import CinemaVault from './components/CinemaVault';
import CommunityNexus from './components/CommunityNexus';
import ConciergeTerminal from './components/ConciergeTerminal';
import Footer from './components/Footer';
import HeroStage from './components/HeroStage';
import MiniPlayerDock from './components/MiniPlayerDock';
import Navbar from './components/Navbar';
import PillarsMatrix from './components/PillarsMatrix';
import ShortsFeed from './components/ShortsFeed';
import { CHANNEL_VIDEOS, type ChannelVideo } from './data/channel';
import { cyberAudio } from './utils/audioEngine';

export default function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const [activeVideo, setActiveVideo] = useState<ChannelVideo>(CHANNEL_VIDEOS[0]);
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const [modalVideo, setModalVideo] = useState<ChannelVideo | null>(null);
  const [showMiniDock, setShowMiniDock] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBootComplete(true);
  }, []);

  const handleToggleAudio = () => {
    const next = cyberAudio.toggle();
    setAudioEnabled(next);
  };

  useEffect(() => {
    return () => {
      cyberAudio.stopAmbience();
    };
  }, []);

  const handleSelectInlineVideo = (video: ChannelVideo, autoPlay = true) => {
    setActiveVideo(video);
    setIsPlayingInline(autoPlay);
    if (autoPlay) {
      setShowMiniDock(true);
    }
  };

  const handleOpenModal = (video: ChannelVideo) => {
    setActiveVideo(video);
    setIsPlayingInline(false);
    setModalVideo(video);
    setShowMiniDock(true);
  };

  const handleNextTrack = () => {
    const currentIndex = CHANNEL_VIDEOS.findIndex(
      (v) => v.videoId === activeVideo.videoId
    );
    const nextIndex = (currentIndex + 1) % CHANNEL_VIDEOS.length;
    const nextVideo = CHANNEL_VIDEOS[nextIndex];
    setActiveVideo(nextVideo);
    if (modalVideo) {
      setModalVideo(nextVideo);
    } else {
      setIsPlayingInline(true);
    }
    setShowMiniDock(true);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#F8FAFC]">
      {!bootComplete && <BootSequence onComplete={handleBootComplete} />}

      <Navbar />

      <main>
        <HeroStage
          onLaunchDrop={handleOpenModal}
          audioEnabled={audioEnabled}
          onToggleAudio={handleToggleAudio}
        />

        <ChannelMarquee />

        <CinemaVault
          activeVideo={activeVideo}
          isPlayingInline={isPlayingInline}
          onSelectInlineVideo={handleSelectInlineVideo}
          onOpenModal={handleOpenModal}
        />

        <ShortsFeed onOpenShort={handleOpenModal} />

        <PillarsMatrix />

        <ConciergeTerminal onPlayTrack={handleOpenModal} />

        <CommunityNexus />
      </main>

      <Footer />

      <CinemaModal
        video={modalVideo}
        onClose={() => setModalVideo(null)}
        onNext={handleNextTrack}
      />

      <MiniPlayerDock
        activeVideo={activeVideo}
        visible={showMiniDock && modalVideo === null}
        onExpand={() => setModalVideo(activeVideo)}
        onNext={handleNextTrack}
        onDismiss={() => {
          setShowMiniDock(false);
          setIsPlayingInline(false);
        }}
      />
    </div>
  );
}
