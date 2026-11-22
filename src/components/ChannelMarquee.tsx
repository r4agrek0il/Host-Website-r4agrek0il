const MARQUEE_ITEMS = [
  'Music, Gaming & Cybernetics',
  'Not Dancing',
  'Lost the Count',
  'Wake the Night',
  'Make It Hard to Leave',
  "What If I Don't?",
  'Neon Nights Playlist',
  '@R4agRek0il',
];

export default function ChannelMarquee() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-y border-white/10 bg-[#04071A] py-3.5 select-none"
    >
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap font-mono text-xs tracking-wide text-slate-400">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
          <span key={`${item}-${idx}`} className="inline-flex items-center gap-8">
            <span>{item}</span>
            <span className="text-[#00F0FF]">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
