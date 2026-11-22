import { useId } from 'react';

interface MythicLogoSVGProps {
  isPlaying: boolean;
}

const SPECTRUM_BARS = Array.from({ length: 40 }, (_, i) => {
  const t = i / 39;
  const p1 = Math.exp(-Math.pow((t - 0.2) * 6.2, 2));
  const p2 = Math.exp(-Math.pow((t - 0.68) * 5.6, 2));
  const p3 = Math.exp(-Math.pow((t - 0.89) * 8.5, 2)) * 0.72;
  const baseHeight = 10 + p1 * 56 + p2 * 60 + p3 * 36;
  const color =
    t < 0.42 ? '#FF7B00' : t < 0.58 ? '#E2E8F0' : '#00F0FF';
  return { x: 350 + i * 16.5, baseHeight, color, delay: (i % 8) * 0.14 };
});

export default function MythicLogoSVG({ isPlaying }: MythicLogoSVGProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <div className="relative flex h-full w-full items-center justify-center px-2 py-3 sm:px-6">
      <svg
        viewBox="0 0 1160 330"
        role="img"
        aria-label="R4agRek0il — Music, Gaming & Cybernetics Mythic Logo"
        className="h-full max-h-[300px] w-full select-none sm:max-h-[340px]"
      >
        <defs>
          {/* Metallic Chrome & Solar Armor Gradients */}
          <linearGradient id={`${uid}-metal-face`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="38%" stopColor="#E2E8F0" />
            <stop offset="52%" stopColor="#94A3B8" />
            <stop offset="66%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          <linearGradient id={`${uid}-dual-neon`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="48%" stopColor="#38BDF8" />
            <stop offset="52%" stopColor="#FFB800" />
            <stop offset="100%" stopColor="#FF7B00" />
          </linearGradient>

          <linearGradient id={`${uid}-orange-armor`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB800" />
            <stop offset="50%" stopColor="#FF7B00" />
            <stop offset="100%" stopColor="#C2410C" />
          </linearGradient>

          <linearGradient id={`${uid}-cyan-plasma`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#CFFAFE" />
            <stop offset="45%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id={`${uid}-circuit-line`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF7B00" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#00F0FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#FF7B00" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id={`${uid}-sheen`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#E0FCFF" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1 0"
              to="1.5 0"
              dur="5.5s"
              repeatCount="indefinite"
            />
          </linearGradient>

          {/* Complex Mythic Shader Filter: Obsidian Shield + Dual Neon Bloom + Metallic Specular Depth */}
          <filter
            id={`${uid}-mythic-wordmark`}
            x="-12%"
            y="-25%"
            width="124%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            {/* Outer dark shield silhouette via morphology dilate */}
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="outerAlpha" />
            <feFlood floodColor="#020512" floodOpacity="0.95" result="obsidianFlood" />
            <feComposite in="obsidianFlood" in2="outerAlpha" operator="in" result="obsidianShield" />

            {/* Cyan neon edge glow */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="cyanBlur" />
            <feFlood floodColor="#00F0FF" floodOpacity="0.55" result="cyanFlood" />
            <feComposite in="cyanFlood" in2="cyanBlur" operator="in" result="cyanGlow" />

            {/* Specular lighting for metallic bevel highlight */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="bumpMap" />
            <feSpecularLighting
              in="bumpMap"
              surfaceScale="4.5"
              specularConstant="0.85"
              specularExponent="26"
              lightingColor="#E0FCFF"
              result="specLight"
            >
              <feDistantLight azimuth="225" elevation="52" />
            </feSpecularLighting>
            <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specClip" />

            <feMerge>
              <feMergeNode in="cyanGlow" />
              <feMergeNode in="obsidianShield" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="specClip" />
            </feMerge>
          </filter>

          {/* Dual-Stage Neon Circuitry & Core Glow Filter */}
          <filter id={`${uid}-neon-glow`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle Cyber Scanline Pattern */}
          <pattern id={`${uid}-scan`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="1.5" fill="#00F0FF" fillOpacity="0.06" />
          </pattern>
        </defs>

        {/* Subtle Hero Tech Framing Grid & Glowing Circuitry */}
        <g opacity="0.92">
          <rect
            x="24"
            y="18"
            width="1112"
            height="294"
            rx="16"
            fill={`url(#${uid}-scan)`}
            stroke="#00F0FF"
            strokeOpacity="0.14"
            strokeWidth="1"
          />

          {/* Glowing Circuitry Traces connecting Left Core across the Wordmark to Right Reticle */}
          <g fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M 280 96 L 340 96 L 368 68 L 620 68 L 644 88 L 935 88"
              stroke={`url(#${uid}-circuit-line)`}
              strokeOpacity="0.45"
            />
            <path
              d="M 285 232 L 352 232 L 378 256 L 885 256 L 916 232 L 1030 232"
              stroke={`url(#${uid}-circuit-line)`}
              strokeOpacity="0.45"
            />
            {/* Animated energy data pulses traveling along the PCB traces */}
            <path
              d="M 280 96 L 340 96 L 368 68 L 620 68 L 644 88 L 935 88"
              stroke="#00F0FF"
              strokeWidth="2.2"
              strokeDasharray="36 220"
              filter={`url(#${uid}-neon-glow)`}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="256"
                to="0"
                dur={isPlaying ? '2.4s' : '5s'}
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M 285 232 L 352 232 L 378 256 L 885 256 L 916 232 L 1030 232"
              stroke="#FF7B00"
              strokeWidth="2.2"
              strokeDasharray="32 240"
              filter={`url(#${uid}-neon-glow)`}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="272"
                dur={isPlaying ? '2.8s' : '5.6s'}
                repeatCount="indefinite"
              />
            </path>
          </g>

          {/* Active Circuit Junction Nodes */}
          {[
            { cx: 368, cy: 68, fill: '#00F0FF' },
            { cx: 644, cy: 88, fill: '#FFB800' },
            { cx: 935, cy: 88, fill: '#FF7B00' },
            { cx: 378, cy: 256, fill: '#FF7B00' },
            { cx: 885, cy: 256, fill: '#00F0FF' },
            { cx: 1030, cy: 232, fill: '#00F0FF' },
          ].map((node, idx) => (
            <g key={idx}>
              <circle
                cx={node.cx}
                cy={node.cy}
                r="4"
                fill={node.fill}
                filter={`url(#${uid}-neon-glow)`}
              >
                <animate
                  attributeName="opacity"
                  values="0.55;1;0.55"
                  dur={`${1.6 + idx * 0.25}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </g>

        {/* Left Cybernetic Core Reticle & Glowing Cyan "4" */}
        <g transform="translate(185, 162)">
          {/* Outer Rotating Segmented Solar-Orange Armor Arcs */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur={isPlaying ? '18s' : '38s'}
              repeatCount="indefinite"
            />
            <path
              d="M -112 -46 A 121 121 0 0 1 -18 -120"
              fill="none"
              stroke={`url(#${uid}-orange-armor)`}
              strokeWidth="14"
              strokeLinecap="butt"
            />
            <path
              d="M -116 32 A 121 121 0 0 0 -32 116"
              fill="none"
              stroke={`url(#${uid}-orange-armor)`}
              strokeWidth="12"
              strokeLinecap="butt"
            />
            <path
              d="M 48 -110 A 120 120 0 0 1 114 -38"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="5"
              strokeDasharray="16 8"
            />
            <path
              d="M 106 56 A 120 120 0 0 1 28 116"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="4"
              strokeDasharray="10 10"
            />
          </g>

          {/* Counter-Rotating Tech Ring */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="360 0 0"
              to="0 0 0"
              dur={isPlaying ? '14s' : '28s'}
              repeatCount="indefinite"
            />
            <circle
              cx="0"
              cy="0"
              r="90"
              fill="none"
              stroke="#00F0FF"
              strokeOpacity="0.6"
              strokeWidth="2.5"
              strokeDasharray="42 14 14 14"
            />
            <circle
              cx="0"
              cy="0"
              r="76"
              fill="#030718"
              fillOpacity="0.88"
              stroke="#E2E8F0"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
          </g>

          {/* Neon Orange Capsule Stadium Frame */}
          <rect
            x="-32"
            y="-48"
            width="64"
            height="96"
            rx="28"
            fill="none"
            stroke="#FF7B00"
            strokeWidth="5.5"
            filter={`url(#${uid}-neon-glow)`}
          />

          {/* Glowing Cyan 4 Core */}
          <text
            x="0"
            y="24"
            textAnchor="middle"
            fontFamily="Orbitron, sans-serif"
            fontWeight="900"
            fontSize="68"
            fill={`url(#${uid}-cyan-plasma)`}
            filter={`url(#${uid}-neon-glow)`}
          >
            4
          </text>

          {/* Horizontal Waveform Pulse piercing the 4 */}
          <path
            d="M -66 0 L -40 0 L -30 -16 L -20 18 L -10 -22 L 0 20 L 10 -18 L 20 14 L 30 -8 L 40 0 L 66 0"
            fill="none"
            stroke="#FFB800"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${uid}-neon-glow)`}
          />

          {/* Overlapping Forward Sniper Sight bridging toward R4agRek0il */}
          <g transform="translate(88, 2)">
            <circle
              cx="0"
              cy="0"
              r="60"
              fill="none"
              stroke="#FF7B00"
              strokeWidth="4.5"
              filter={`url(#${uid}-neon-glow)`}
            />
            <circle
              cx="0"
              cy="0"
              r="45"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="3.5"
              strokeDasharray="64 22"
            />
            <line x1="0" y1="-74" x2="0" y2="74" stroke="#FF7B00" strokeWidth="2.8" />
            <line x1="-74" y1="0" x2="74" y2="0" stroke="#00F0FF" strokeWidth="2.8" />
          </g>
        </g>

        {/* Right Concentric Orange Targeting Reticle (aligned behind Rek0il) */}
        <g transform="translate(972, 162)" opacity="0.88">
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur={isPlaying ? '22s' : '44s'}
              repeatCount="indefinite"
            />
            <circle cx="0" cy="0" r="88" fill="none" stroke="#FF7B00" strokeWidth="2" strokeOpacity="0.65" />
            <circle cx="0" cy="0" r="64" fill="none" stroke="#FF7B00" strokeWidth="1.8" strokeDasharray="24 10" />
            <circle cx="0" cy="0" r="40" fill="none" stroke="#00F0FF" strokeWidth="1.5" strokeOpacity="0.65" />
          </g>
          <line x1="0" y1="-104" x2="0" y2="104" stroke="#FF7B00" strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="-104" y1="0" x2="104" y2="0" stroke="#FF7B00" strokeWidth="1.5" strokeOpacity="0.7" />
        </g>

        {/* Upper Dual-Peak Spectrum Skyline synced to playback */}
        <g>
          {SPECTRUM_BARS.map((bar, i) => (
            <rect
              key={i}
              x={bar.x}
              y={114 - bar.baseHeight}
              width="7"
              height={bar.baseHeight}
              rx="2"
              fill={bar.color}
              opacity={isPlaying ? 0.92 : 0.62}
            >
              {isPlaying && (
                <animate
                  attributeName="height"
                  values={`${Math.round(bar.baseHeight * 0.65)};${Math.round(
                    bar.baseHeight * 1.12
                  )};${Math.round(bar.baseHeight * 0.72)}`}
                  dur="0.72s"
                  begin={`${bar.delay}s`}
                  repeatCount="indefinite"
                />
              )}
              {isPlaying && (
                <animate
                  attributeName="y"
                  values={`${Math.round(114 - bar.baseHeight * 0.65)};${Math.round(
                    114 - bar.baseHeight * 1.12
                  )};${Math.round(114 - bar.baseHeight * 0.72)}`}
                  dur="0.72s"
                  begin={`${bar.delay}s`}
                  repeatCount="indefinite"
                />
              )}
            </rect>
          ))}
        </g>

        {/* Razor-Sharp 100%-Aligned "R4agRek0il" Wordmark with Mythic Shader Filter */}
        <g filter={`url(#${uid}-mythic-wordmark)`}>
          {/* Unified Obsidian Bezel Stroke */}
          <text
            x="662"
            y="206"
            textAnchor="middle"
            fontFamily="Orbitron, 'Plus Jakarta Sans', sans-serif"
            fontWeight="900"
            fontSize="94"
            letterSpacing="2"
            fill="none"
            stroke="#020617"
            strokeWidth="16"
            strokeLinejoin="round"
          >
            R4agRek0il
          </text>

          {/* Crisp Aligned Dual-Tone Neon Edge Stroke */}
          <text
            x="662"
            y="206"
            textAnchor="middle"
            fontFamily="Orbitron, 'Plus Jakarta Sans', sans-serif"
            fontWeight="900"
            fontSize="94"
            letterSpacing="2"
            fill="none"
            stroke={`url(#${uid}-dual-neon)`}
            strokeWidth="6.5"
            strokeLinejoin="round"
          >
            R4agRek0il
          </text>

          {/* Brushed Metallic Specular Letter Faces */}
          <text
            x="662"
            y="206"
            textAnchor="middle"
            fontFamily="Orbitron, 'Plus Jakarta Sans', sans-serif"
            fontWeight="900"
            fontSize="94"
            letterSpacing="2"
            fill={`url(#${uid}-metal-face)`}
          >
            R4agRek0il
          </text>

          {/* Animated Holographic Metallic Sheen Sweep */}
          <text
            x="662"
            y="206"
            textAnchor="middle"
            fontFamily="Orbitron, 'Plus Jakarta Sans', sans-serif"
            fontWeight="900"
            fontSize="94"
            letterSpacing="2"
            fill={`url(#${uid}-sheen)`}
          >
            R4agRek0il
          </text>
        </g>

        {/* Bottom Illuminated Tech Plaque */}
        <g transform="translate(662, 272)">
          <rect
            x="-290"
            y="-18"
            width="580"
            height="36"
            rx="6"
            fill="#04081A"
            fillOpacity="0.92"
            stroke={`url(#${uid}-circuit-line)`}
            strokeWidth="1.2"
          />
          <text
            x="0"
            y="5"
            textAnchor="middle"
            fontFamily="Orbitron, 'JetBrains Mono', monospace"
            fontWeight="700"
            fontSize="16"
            letterSpacing="5.5"
            fill="#E0FCFF"
            filter={`url(#${uid}-neon-glow)`}
          >
            MUSIC // GAMING // CYBERNETICS
          </text>
        </g>
      </svg>
    </div>
  );
}
