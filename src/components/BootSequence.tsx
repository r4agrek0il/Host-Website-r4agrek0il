import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CHANNEL_PROFILE } from '../data/channel';

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visible, setVisible] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setVisible(false);
      onComplete();
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 1250);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const handleSkip = () => {
    setVisible(false);
    onComplete();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] px-6"
          aria-label="Channel initialization"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[#00F0FF]/35 bg-[#04071A] shadow-[0_0_40px_rgba(0,240,255,0.2)] sm:h-32 sm:w-32"
            >
              {!imgFailed ? (
                <img
                  src={CHANNEL_PROFILE.avatarImage}
                  alt="R4agRek0il emblem"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-5xl font-bold text-[#00F0FF]">4</span>
              )}
            </motion.div>

            <p className="mt-6 font-display text-xl font-bold tracking-wider text-white sm:text-2xl">
              {CHANNEL_PROFILE.name}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Syncing audio core and visual vault
            </p>

            {/* Sweep progress bar */}
            <div className="mt-5 h-1 w-56 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left' }}
                className="h-full w-full bg-gradient-to-r from-[#00F0FF] via-white to-[#FF7A00]"
              />
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="mt-6 min-h-[40px] rounded-lg border border-white/15 px-4 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-[#00F0FF]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            >
              Skip Intro
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
