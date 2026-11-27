import { useEffect, useState } from 'react';
import {
  CHANNEL_VIDEOS,
  LAST_5_TRACKS,
  applyLatestDropNote,
  applyNewBadges,
  mergeVideos,
  pickLatestDrop,
  type ChannelVideo,
  type RssVideoEntry,
} from '../data/channel';
import type { Popular, Spotlight, SpotlightReason } from './spotlight';

export interface ApiPicks {
  spotlight?: Spotlight | null;
  popular?: Popular | null;
}

export interface SpotlightPick {
  video: ChannelVideo;
  reason: SpotlightReason;
  gained?: number;
  windowHours?: number;
}

export interface ChannelVideosState {
  /** Every release, newest first (full videos + Shorts). */
  videos: ChannelVideo[];
  /** Newest 5 full videos (no Shorts), newest first. */
  tracks: ChannelVideo[];
  /** Shorts only, newest first. */
  shorts: ChannelVideo[];
  /** Newest full video by published date. */
  latestDrop: ChannelVideo;
  isLive: boolean;
  /** Automatic Spotlight (live data only). */
  spotlight: SpotlightPick | null;
  /** Most viewed full video / Short (live data only). */
  topVideo: ChannelVideo | null;
  topShort: ChannelVideo | null;
}

export function buildChannelState(
  rss: RssVideoEntry[] | null,
  now = Date.now(),
  picks: ApiPicks = {}
): ChannelVideosState {
  const live = Boolean(rss && rss.length > 0);
  const merged = live ? mergeVideos(rss as RssVideoEntry[], CHANNEL_VIDEOS) : CHANNEL_VIDEOS;
  const latestId = pickLatestDrop(merged)?.videoId;
  const videos = applyNewBadges(applyLatestDropNote(merged, latestId), now);
  const full = videos.filter((v) => !v.isShort);
  const tracks = live
    ? full.slice(0, 5)
    : LAST_5_TRACKS.map((t) => full.find((v) => v.videoId === t.videoId) ?? t);
  const shorts = videos.filter((v) => v.isShort);
  const byId = (id: string | null | undefined) => (live && id ? videos.find((v) => v.videoId === id) ?? null : null);
  const sp = picks.spotlight;
  const spVideo = byId(sp?.videoId);
  const spotlight: SpotlightPick | null =
    sp && spVideo ? { video: spVideo, reason: sp.reason, gained: sp.gained, windowHours: sp.windowHours } : null;
  return {
    videos,
    tracks,
    shorts,
    latestDrop: tracks[0] ?? full[0] ?? videos[0],
    isLive: live,
    spotlight,
    topVideo: byId(picks.popular?.topVideoId),
    topShort: byId(picks.popular?.topShortId),
  };
}

const FALLBACK = buildChannelState(null);

export function useChannelVideos(): ChannelVideosState {
  const [state, setState] = useState<ChannelVideosState>(FALLBACK);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    (async () => {
      try {
        const res = await fetch('/api/videos', { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; videos?: RssVideoEntry[] } & ApiPicks;
        if (!data?.ok || !Array.isArray(data.videos) || data.videos.length === 0) return;
        setState(buildChannelState(data.videos, Date.now(), { spotlight: data.spotlight, popular: data.popular }));
      } catch {
        // keep curated fallback
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return state;
}
