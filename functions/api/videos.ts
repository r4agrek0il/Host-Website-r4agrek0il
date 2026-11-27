import { parseFeed, type FeedEntry } from '../../src/utils/parseFeed';
import {
  addSnapshot,
  computePopular,
  computeSpotlight,
  type Popular,
  type Snapshot,
  type Spotlight,
} from '../../src/utils/spotlight';

interface KVLike {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
}

interface Env {
  /** Optional KV namespace for hourly view snapshots (enables "trending"). */
  VIDEO_STATS?: KVLike;
  /** Optional video id to pin as Spotlight. */
  SPOTLIGHT_VIDEO_ID?: string;
}

interface CloudflarePagesContext {
  request: Request;
  env?: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const SNAPSHOT_KEY = 'snapshots';

async function readSnapshots(kv: KVLike | undefined): Promise<Snapshot[] | null> {
  if (!kv) return null;
  try {
    const data = await kv.get(SNAPSHOT_KEY, 'json');
    return Array.isArray(data) ? (data as Snapshot[]) : [];
  } catch {
    return []; // damaged value: start a fresh list so it gets overwritten
  }
}

async function recordSnapshot(kv: KVLike | undefined, existing: Snapshot[] | null, videos: FeedEntry[]) {
  if (!kv || existing === null) return;
  try {
    const next = addSnapshot(existing, videos, Date.now());
    if (next) await kv.put(SNAPSHOT_KEY, JSON.stringify(next));
  } catch {
    // KV is best-effort
  }
}

async function withPicks(data: VideosResult, env: Env | undefined, snapshots?: Snapshot[] | null): Promise<VideosResult> {
  try {
    const snaps = snapshots !== undefined ? snapshots : await readSnapshots(env?.VIDEO_STATS);
    return {
      ...data,
      spotlight: computeSpotlight(data.videos, snaps, Date.now(), env?.SPOTLIGHT_VIDEO_ID),
      popular: computePopular(data.videos),
    };
  } catch {
    return { ...data, spotlight: null, popular: { topVideoId: null, topShortId: null } };
  }
}

interface VideosResult {
  ok: boolean;
  fetchedAt: string | null;
  videos: FeedEntry[];
  stale?: boolean;
  spotlight?: Spotlight | null;
  popular?: Popular;
}

const CHANNEL_ID = 'UCdyybiezt4xZHtGVdx_nzYQ';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const FRESH_KEY = 'https://r4agrek0il-site.pages.dev/__cache/videos-fresh';
const STALE_KEY = 'https://r4agrek0il-site.pages.dev/__cache/videos-stale';
const FRESH_TTL_S = 15 * 60;
const STALE_TTL_S = 30 * 24 * 60 * 60;

function getCache(): Cache | null {
  try {
    const c = (globalThis as unknown as { caches?: { default?: Cache } }).caches;
    return c?.default ?? null;
  } catch {
    return null;
  }
}

function jsonResponse(data: VideosResult): Response {
  return Response.json(data, {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}

async function readCached(cache: Cache | null, key: string): Promise<VideosResult | null> {
  if (!cache) return null;
  try {
    const hit = await cache.match(key);
    return hit ? ((await hit.json()) as VideosResult) : null;
  } catch {
    return null;
  }
}

async function writeCached(cache: Cache | null, key: string, data: VideosResult, ttl: number) {
  if (!cache) return;
  try {
    await cache.put(
      key,
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
      })
    );
  } catch {
    // ignore cache write failures
  }
}

/**
 * Titles don't always carry #Shorts, so ask YouTube directly:
 * /shorts/<id> answers 200 for a Short and redirects (303) for a regular video.
 * Runs only on a feed refresh (at most every 15 min); on any error the title-based guess stays.
 */
async function detectShorts(videos: FeedEntry[]): Promise<void> {
  await Promise.all(
    videos.map(async (v) => {
      if (v.isShort) return;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const r = await fetch(`https://www.youtube.com/shorts/${v.videoId}`, {
          method: 'HEAD',
          redirect: 'manual',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (r.status === 200) v.isShort = true;
      } catch {
        // keep title-based guess
      }
    })
  );
}

export async function onRequestGet(context: CloudflarePagesContext): Promise<Response> {
  const cache = getCache();
  const env = context.env;

  const fresh = await readCached(cache, FRESH_KEY);
  if (fresh?.ok) return jsonResponse(await withPicks(fresh, env));

  try {
    const res = await fetch(FEED_URL, { headers: { Accept: 'application/atom+xml' } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const videos = parseFeed(await res.text());
    if (videos.length === 0) throw new Error('empty feed');
    await detectShorts(videos);
    const result: VideosResult = { ok: true, fetchedAt: new Date().toISOString(), videos };
    const snapshots = await readSnapshots(env?.VIDEO_STATS);
    const writes = Promise.all([
      writeCached(cache, FRESH_KEY, result, FRESH_TTL_S),
      writeCached(cache, STALE_KEY, result, STALE_TTL_S),
      recordSnapshot(env?.VIDEO_STATS, snapshots, videos),
    ]);
    if (context.waitUntil) context.waitUntil(writes);
    else await writes;
    return jsonResponse(await withPicks(result, env, snapshots));
  } catch {
    const stale = await readCached(cache, STALE_KEY);
    if (stale?.ok) return jsonResponse(await withPicks({ ...stale, stale: true }, env));
    return jsonResponse({ ok: false, fetchedAt: null, videos: [] });
  }
}
