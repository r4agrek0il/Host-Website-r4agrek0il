export type ReleaseCategory = 'all' | 'animated-mv' | 'lyric-video' | 'neon-nights' | 'shorts';

export interface ChannelVideo {
  id: string;
  videoId: string;
  index: string;
  title: string;
  shortTitle: string;
  category: Exclude<ReleaseCategory, 'all'>;
  categoryLabel: string;
  genre: string;
  moodTags: string[];
  duration: string;
  releaseNote: string;
  storyNote: string;
  isShort?: boolean;
  isBreakout?: boolean;
  inNeonNights?: boolean;
  accentTone: 'cyan' | 'orange' | 'dual';
  waveformSeed: number;
}

export interface ChannelPillar {
  id: 'music' | 'gaming' | 'cybernetics';
  index: string;
  title: string;
  subtitle: string;
  accentColor: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
}

export const CHANNEL_PROFILE = {
  name: 'R4agRek0il',
  handle: '@R4agRek0il',
  channelId: 'UCdyybiezt4xZHtGVdx_nzYQ',
  tagline: 'Where music, imagination, and technology collide.',
  subheadline: 'Music · Gaming · Cybernetics',
  description:
    'Official audiovisual command hub for R4agRek0il — original animated music videos, epic EDM lyric visuals, Neon Nights synthwave mixes, and high-impact Shorts.',
  bannerImage: '/assets/aistudio/Logo_R4agRek0il_f73e43e3.png',
  avatarImage: '/assets/aistudio/Cyan_4_with_orange_headphone_coil_05909869.png',
  urls: {
    featured: 'https://www.youtube.com/@R4agRek0il/featured',
    videos: 'https://www.youtube.com/@R4agRek0il/videos',
    shorts: 'https://www.youtube.com/@R4agRek0il/shorts',
    playlists: 'https://www.youtube.com/@R4agRek0il/playlists',
    subscribe: 'https://www.youtube.com/@R4agRek0il?sub_confirmation=1',
    instagram: 'https://www.instagram.com/r4agrek0il/',
  },
} as const;

export const CHANNEL_METRICS = [
  {
    label: 'Subscribers',
    value: '204+',
    detail: 'Growing community across YouTube & Instagram',
  },
  {
    label: 'Published Drops',
    value: '27+',
    detail: 'Animated music videos, lyric visuals & Shorts',
  },
  {
    label: 'Flagship Playlist',
    value: 'Neon Nights',
    detail: 'Cinematic EDM, synthwave & electronic mixes',
  },
  {
    label: 'Creative Pillars',
    value: '3 Cores',
    detail: 'Music, Gaming & Cybernetic world-building',
  },
] as const;

export const CHANNEL_VIDEOS: ChannelVideo[] = [
  {
    id: 'not-dancing',
    videoId: 'SoZfGOnwQXA',
    index: '01',
    title: 'Not Dancing – R4agRek0il | Official Animated Music Video',
    shortTitle: 'Not Dancing',
    category: 'animated-mv',
    categoryLabel: 'Animated MV',
    genre: 'Electronic Pop',
    moodTags: ['Kinetic Rhythm', 'Nightlife Pulse', 'Animated Storytelling'],
    duration: '03:18',
    releaseNote: 'Latest Featured Drop',
    storyNote:
      'Pairs kinetic rhythm cuts with expressive animated motion and nocturnal lighting, anchoring the flagship R4agRek0il visual style.',
    inNeonNights: true,
    accentTone: 'dual',
    waveformSeed: 14,
  },
  {
    id: 'lost-the-count',
    videoId: 'h20rZi9OxbM',
    index: '02',
    title: 'Lost the Count | Official Animated Music Video — R4agRek0il',
    shortTitle: 'Lost the Count',
    category: 'animated-mv',
    categoryLabel: 'Animated MV',
    genre: 'Synthwave Electronic',
    moodTags: ['Breakout Release', 'Driving Bass', '970+ Views'],
    duration: '03:42',
    releaseNote: 'Breakout Performer',
    storyNote:
      'Channel breakout release fusing relentless synth momentum and gaming-paced editing with emotional vocal hooks.',
    isBreakout: true,
    inNeonNights: true,
    accentTone: 'orange',
    waveformSeed: 73,
  },
  {
    id: 'wake-the-night',
    videoId: '_8D1_KcdVDU',
    index: '03',
    title: 'WAKE THE NIGHT ⚡ | From Darkness to Light | Epic EDM Lyric Video',
    shortTitle: 'Wake the Night',
    category: 'lyric-video',
    categoryLabel: 'Lyric Video',
    genre: 'Epic Cinematic EDM',
    moodTags: ['Neon Nights', 'Uplifting Drop', 'From Darkness to Light'],
    duration: '03:54',
    releaseNote: 'Neon Nights Anthem',
    storyNote:
      'High-contrast lyric choreography backed by wide cinematic pads and an explosive melodic EDM drop.',
    inNeonNights: true,
    accentTone: 'cyan',
    waveformSeed: 27,
  },
  {
    id: 'make-it-hard-to-leave',
    videoId: 'Nrp7AcQIkWU',
    index: '04',
    title: 'Make It Hard to Leave — R4agRek0il | Official Music Video',
    shortTitle: 'Make It Hard to Leave',
    category: 'animated-mv',
    categoryLabel: 'Animated MV',
    genre: 'Melodic Synthwave',
    moodTags: ['Emotional Vocals', 'Cybernetic City', 'Late Night'],
    duration: '03:31',
    releaseNote: 'Visual Storytelling',
    storyNote:
      'Builds gradual harmonic tension across atmospheric verses before opening into wide stereo choruses over futuristic cityscapes.',
    inNeonNights: true,
    accentTone: 'cyan',
    waveformSeed: 41,
  },
  {
    id: 'what-if-i-dont',
    videoId: 'sm_sXx6Ek2E',
    index: '05',
    title: "What If I Don't? | Official Animated Music Video — R4agRek0il",
    shortTitle: "What If I Don't?",
    category: 'animated-mv',
    categoryLabel: 'Animated MV',
    genre: 'Experimental Electronic',
    moodTags: ['Introspective', 'Layered Synths', 'Surreal Visuals'],
    duration: '03:12',
    releaseNote: 'Experimental Cut',
    storyNote:
      'An open-ended sonic question blending sparse ambient textures, crisp sub-bass accents, and reactive animated pacing.',
    accentTone: 'dual',
    waveformSeed: 58,
  },
  {
    id: 'wake-the-night-short',
    videoId: 'QIV-N_7nPcE',
    index: '06',
    title: 'Wake the Night | Bring the Light ✨ | Original Song #Shorts',
    shortTitle: 'Wake the Night #Shorts',
    category: 'shorts',
    categoryLabel: 'YouTube Shorts',
    genre: 'Vertical EDM Teaser',
    moodTags: ['9:16 Vertical', 'Instant Hook', 'Shorts Feed'],
    duration: '00:48',
    releaseNote: 'Vertical Transmission',
    storyNote:
      'Vertical 9:16 visual burst engineered for rapid replay and instant sonic lift from Darkness to Light.',
    isShort: true,
    inNeonNights: true,
    accentTone: 'orange',
    waveformSeed: 89,
  },
];

export const NEON_NIGHTS_PLAYLIST = {
  title: 'NEON NIGHTS ⚡ | Cinematic EDM, Synthwave & Electronic Music',
  tagline: 'Where Music Meets the Future.',
  description:
    'Curated nocturnal listening experience uniting original R4agRek0il tracks, atmospheric synthwave, and high-energy cinematic drops for gaming marathons and late-night creation.',
  url: 'https://www.youtube.com/@R4agRek0il/playlists',
};

export const THREE_PILLARS: ChannelPillar[] = [
  {
    id: 'music',
    index: '01',
    title: 'Music',
    subtitle: 'Heart of the Channel',
    accentColor: '#FF7A00',
    description:
      'Emotional storytelling wrapped in cinematic EDM, melodic synthwave, and multilingual experimental production. Anchored by animated music videos and the Neon Nights playlist.',
    highlights: [
      'Original animated music videos & lyric visuals',
      'Neon Nights cinematic EDM & synthwave mixes',
      'AI-assisted sound design paired with melodic hooks',
    ],
    ctaLabel: 'Browse Video Vault',
    ctaHref: '#cinema',
  },
  {
    id: 'gaming',
    index: '02',
    title: 'Gaming',
    subtitle: 'Tactical Rhythm & Energy',
    accentColor: '#FFB800',
    description:
      'Inspired by HUD targeting reticles, high-speed reflex pacing, and immersive digital arenas—captured right inside the R4agRek0il name and crosshair emblem.',
    highlights: [
      'High-tempo tracks built for ranked sessions & focus',
      'HUD-inspired motion editing and visual framing',
      'Shorts teasers with fast, adrenaline-driven cuts',
    ],
    ctaLabel: 'Explore Shorts Feed',
    ctaHref: '#shorts',
  },
  {
    id: 'cybernetics',
    index: '03',
    title: 'Cybernetics',
    subtitle: 'Future Visual Craft',
    accentColor: '#00F0FF',
    description:
      'Where imagination and technology collide. Every release fuses futuristic interfaces, neon light-play, and next-generation creative tooling into cohesive worlds.',
    highlights: [
      'Sci-fi visual storytelling & animated worlds',
      'Acoustic telemetry & custom frequency art',
      'Interactive R4-AI mood matching on this hub',
    ],
    ctaLabel: 'Launch R4-AI Concierge',
    ctaHref: '#concierge',
  },
];

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeWatchUrl(videoId: string, isShort?: boolean): string {
  return isShort
    ? `https://www.youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
}
