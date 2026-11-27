import { useEffect, useState } from 'react';
import { Youtube } from 'lucide-react';
import { SUBSCRIBE_URL } from '../data/channel';

/** Mobile-only sticky Subscribe pill, shown after scrolling past the hero. Sits above the bottom audio deck. */
export default function MobileSubscribePill() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <a
      href={SUBSCRIBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed left-4 bottom-28 z-30 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#FF7B00] px-3.5 py-1.5 text-xs font-semibold text-[#04071A] shadow-[0_0_20px_rgba(255,123,0,0.45)] hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] md:hidden"
    >
      <Youtube className="h-3.5 w-3.5" />
      <span>Subscribe</span>
    </a>
  );
}
