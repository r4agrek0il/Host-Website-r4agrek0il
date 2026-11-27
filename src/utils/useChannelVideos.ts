import { useEffect, useState } from 'react';
import {
  CHANNEL_VIDEOS,
  FEATURED_VIDEO_ID,
  LAST_5_TRACKS,
  isRecentlyPublished,
  mergeVideos,
  type ChannelVideo,
  type RssVideoEntry,
} from '../data/channel';

export interface ChannelVideosState {
  videos: ChannelVideo[];
  tracks: ChannelVideo[];
  shorts: ChannelVideo[];
  isLive: boolean;
}

function featuredFirst(list: ChannelVideo[]): ChannelVideo[] {
  const idx = list.findIndex((v) => v.videoId === FEATURED_VIDEO_ID);
  if (idx <= 0) return list;
  return [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)];
}

export function buildChannelState(rss: RssVideoEntry[] | null, now = Date.now()): ChannelVideosState {
  if (!rss || rss.length === 0) {
    return {
      videos: CHANNEL_VIDEOS,
      tracks: featuredFirst(LAST_5_TRACKS),
      shorts: CHANNEL_VIDEOS.filter((v) => v.isShort),
      isLive: false,
    };
  }
  const videos = mergeVideos(rss, CHANNEL_VIDEOS).map((v) =>
    isRecentlyPublished(v.publishedAt, now) ? { ...v, isNew: true } : v
  );
  const tracks = featuredFirst(videos.filter((v) => !v.isShort)).slice(0, 5);
  const shorts = videos.filter((v) => v.isShort);
  return { videos, tracks, shorts, isLive: true };
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
        const data = (await res.json()) as { ok?: boolean; videos?: RssVideoEntry[] };
        if (!data?.ok || !Array.isArray(data.videos) || data.videos.length === 0) return;
        setState(buildChannelState(data.videos));
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
