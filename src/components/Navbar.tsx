import { useState } from 'react';
import { Menu, Volume2, VolumeX, X } from 'lucide-react';
import { motion, useScroll, useSpring } from 'motion/react';
import { CHANNEL_PROFILE } from '../data/channel';

interface NavbarProps {
  isAudioMuted: boolean;
  onToggleMasterMute: () => void;
}

const NAV_LINKS = [
  { label: 'Cinema', href: '#cinema' },
  { label: 'Analytics', href: '#analytics' },
  { label: '3D Core', href: '#sonic-stage' },
  { label: 'Shorts', href: '#shorts' },
  { label: 'Pillars', href: '#pillars' },
];

export default function Navbar({ isAudioMuted, onToggleMasterMute }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03050a]/90 backdrop-blur-md">
      {/* Scroll Laser Progress Gauge */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX, transformOrigin: 'left' }}
        className="h-[2px] w-full bg-gradient-to-r from-[#00F0FF] via-[#FFB800] to-[#FF7B00]"
      />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap max-md:inline-flex max-md:min-h-10 max-md:items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] rounded-sm"
        >
          {CHANNEL_PROFILE.name}
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-white after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#00F0FF] after:transition-all after:duration-150 hover:after:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] rounded-sm"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Master Audio Mute Toggle + Subscribe CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleMasterMute}
            aria-label={isAudioMuted ? 'Unmute background audio' : 'Mute background audio'}
            aria-pressed={!isAudioMuted}
            className="inline-flex h-9 max-md:h-10 max-md:min-w-10 justify-center items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 font-mono text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-[#00F0FF]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            {isAudioMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-[#FF7B00]" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-[#00F0FF]" />
            )}
            <span className="hidden sm:inline">{isAudioMuted ? 'Muted' : 'Audio'}</span>
          </button>

          <a
            href={CHANNEL_PROFILE.urls.subscribe}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-sm:min-h-[40px] max-sm:px-3 items-center justify-center rounded-lg bg-[#FF7B00] px-4 py-2 text-xs font-semibold text-[#04071A] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            Subscribe
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-slate-200 transition-colors hover:bg-white/5 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#04071A] px-4 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <a
              href={CHANNEL_PROFILE.urls.subscribe}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex min-h-[44px] items-center justify-center rounded-lg bg-[#FF7B00] px-4 py-2.5 text-sm font-semibold text-[#04071A] transition-colors hover:bg-[#FFB800]"
            >
              Subscribe on YouTube
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
