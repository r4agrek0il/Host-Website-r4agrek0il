import { parseFeed, type FeedEntry } from '../../src/utils/parseFeed';

interface CloudflarePagesContext {
  request: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
}

interface VideosResult {
  ok: boolean;
  fetchedAt: string | null;
  videos: FeedEntry[];
  stale?: boolean;
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

export async function onRequestGet(context: CloudflarePagesContext): Promise<Response> {
  const cache = getCache();

  const fresh = await readCached(cache, FRESH_KEY);
  if (fresh?.ok) return jsonResponse(fresh);

  try {
    const res = await fetch(FEED_URL, { headers: { Accept: 'application/atom+xml' } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const videos = parseFeed(await res.text());
    if (videos.length === 0) throw new Error('empty feed');
    const result: VideosResult = { ok: true, fetchedAt: new Date().toISOString(), videos };
    const writes = Promise.all([
      writeCached(cache, FRESH_KEY, result, FRESH_TTL_S),
      writeCached(cache, STALE_KEY, result, STALE_TTL_S),
    ]);
    if (context.waitUntil) context.waitUntil(writes);
    else await writes;
    return jsonResponse(result);
  } catch {
    const stale = await readCached(cache, STALE_KEY);
    if (stale?.ok) return jsonResponse({ ...stale, stale: true });
    return jsonResponse({ ok: false, fetchedAt: null, videos: [] });
  }
}
