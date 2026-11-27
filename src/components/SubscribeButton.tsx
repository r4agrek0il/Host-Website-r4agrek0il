import { Youtube } from 'lucide-react';
import { SUBSCRIBE_URL } from '../data/channel';

interface SubscribeButtonProps {
  size?: 'sm' | 'md';
  className?: string;
}

export default function SubscribeButton({ size = 'md', className = '' }: SubscribeButtonProps) {
  const sizing =
    size === 'sm' ? 'min-h-[40px] px-3.5 py-2 text-xs gap-1.5' : 'min-h-[44px] px-4 py-2.5 text-sm gap-2';
  return (
    <a
      href={SUBSCRIBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center rounded-lg bg-[#FF7B00] font-semibold text-[#04071A] whitespace-nowrap transition-colors hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${sizing} ${className}`}
    >
      <Youtube className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      <span>Subscribe</span>
    </a>
  );
}
