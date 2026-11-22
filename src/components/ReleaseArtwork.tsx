interface ReleaseArtworkProps {
  title: string;
  accentTone: 'cyan' | 'orange' | 'dual';
  waveformSeed: number;
  featured?: boolean;
}

export default function ReleaseArtwork({
  title,
  accentTone,
  waveformSeed,
  featured = false,
}: ReleaseArtworkProps) {
  const barCount = featured ? 28 : 18;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const wave =
      Math.abs(Math.sin((i + 1) * 0.48 + waveformSeed) * 0.65) +
      Math.abs(Math.cos((i + 2) * 0.31 + waveformSeed * 0.5) * 0.35);
    return Math.max(16, Math.min(92, Math.round(wave * 85)));
  });

  const primaryStroke = accentTone === 'orange' ? '#FF7A00' : '#00D8F6';
  const secondaryStroke = accentTone === 'cyan' ? '#00D8F6' : '#FF7A00';

  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#06091B]"
    >
      {/* Subtle coordinate grid */}
      <svg
        className="h-full w-full"
        viewBox={featured ? '0 0 640 320' : '0 0 400 220'}
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`glow-${waveformSeed}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={primaryStroke} stopOpacity="0.22" />
            <stop offset="55%" stopColor={secondaryStroke} stopOpacity="0.08" />
            <stop offset="100%" stopColor="#06091B" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect
          width={featured ? 640 : 400}
          height={featured ? 320 : 220}
          fill={`url(#glow-${waveformSeed})`}
        />

        {/* Hairline reticle rings inspired by the R4agRek0il banner */}
        <g opacity="0.55">
          <circle
            cx={featured ? 150 : 105}
            cy={featured ? 160 : 110}
            r={featured ? 86 : 56}
            stroke={secondaryStroke}
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <circle
            cx={featured ? 150 : 105}
            cy={featured ? 160 : 110}
            r={featured ? 58 : 38}
            stroke={primaryStroke}
            strokeWidth="2"
          />
          <line
            x1={featured ? 150 : 105}
            y1={featured ? 54 : 40}
            x2={featured ? 150 : 105}
            y2={featured ? 266 : 180}
            stroke={secondaryStroke}
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <line
            x1={featured ? 44 : 35}
            y1={featured ? 160 : 110}
            x2={featured ? 256 : 175}
            y2={featured ? 160 : 110}
            stroke={secondaryStroke}
            strokeOpacity="0.45"
            strokeWidth="1"
          />
        </g>

        {/* Numeric 4 center glyph */}
        <text
          x={featured ? 150 : 105}
          y={featured ? 174 : 121}
          textAnchor="middle"
          fill="#00D8F6"
          fontFamily="Outfit, sans-serif"
          fontWeight="700"
          fontSize={featured ? 42 : 28}
        >
          4
        </text>

        {/* Frequency equalizer bars */}
        <g>
          {bars.map((height, idx) => {
            const startX = featured ? 280 : 196;
            const gap = featured ? 11 : 9;
            const barWidth = featured ? 5 : 4;
            const centerY = featured ? 160 : 110;
            const barH = (height / 100) * (featured ? 140 : 96);
            const isOrange =
              accentTone === 'orange' || (accentTone === 'dual' && idx % 3 === 0);
            return (
              <rect
                key={`${title}-${idx}`}
                x={startX + idx * gap}
                y={centerY - barH / 2}
                width={barWidth}
                height={barH}
                rx={barWidth / 2}
                fill={isOrange ? '#FF7A00' : '#00D8F6'}
                fillOpacity={0.85}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
