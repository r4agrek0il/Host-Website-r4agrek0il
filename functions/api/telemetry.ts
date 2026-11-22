interface CloudflarePagesContext {
  request: Request;
  env: {
    YOUTUBE_API_KEY?: string;
  };
}

interface TelemetryResult {
  ok: boolean;
  source: 'youtube-api' | 'youtube-public' | 'unavailable';
  subscribers: number | null;
  totalViews: number | null;
  fetchedAt: string;
}

const CHANNEL_ID = 'UCdyybiezt4xZHtGVdx_nzYQ';
const CACHE_TTL_MS = 12_000;

let cachedResult: { data: TelemetryResult; expiresAt: number } | null = null;

function parseCompactCount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);
  if (!match) return null;

  const num = Number.parseFloat(match[1]);
  if (!Number.isFinite(num)) return null;

  const suffix = (match[2] ?? '').toUpperCase();
  const multiplier =
    suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1;

  return Math.round(num * multiplier);
}

function extractYouTubeStatsFromHtml(html: string): {
  subscribers: number | null;
  totalViews: number | null;
} {
  let subscribers: number | null = null;
  let totalViews: number | null = null;

  const subPatterns = [
    /"subscriberCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/i,
    /"subscriberCountText"\s*:\s*"([^"]+)"/i,
    /"content"\s*:\s*"([\d,.]+\s*[KMB]?\s*subscribers?)"/i,
    /([\d,.]+\s*[KMB]?)\s+subscribers\b/i,
  ];

  for (const pattern of subPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const parsed = parseCompactCount(match[1]);
      if (parsed !== null && parsed >= 0) {
        subscribers = parsed;
        break;
      }
    }
  }

  const viewPatterns = [
    /"viewCountText"\s*:\s*"([^"]+)"/i,
    /"viewCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/i,
    /"content"\s*:\s*"([\d,.]+\s*[KMB]?\s*views?)"/i,
  ];

  for (const pattern of viewPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const parsed = parseCompactCount(match[1]);
      if (parsed !== null && parsed >= 0) {
        totalViews = parsed;
        break;
      }
    }
  }

  return { subscribers, totalViews };
}

async function fetchLiveYouTubeStats(apiKey?: string): Promise<TelemetryResult> {
  const now = Date.now();
  if (cachedResult && cachedResult.expiresAt > now) {
    return cachedResult.data;
  }

  const fetchedAt = new Date().toISOString();

  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${encodeURIComponent(apiKey)}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const json = (await apiRes.json()) as {
          items?: Array<{
            statistics?: { subscriberCount?: string; viewCount?: string };
          }>;
        };
        const stats = json.items?.[0]?.statistics;
        if (stats) {
          const subscribers = stats.subscriberCount
            ? Number.parseInt(stats.subscriberCount, 10)
            : null;
          const totalViews = stats.viewCount
            ? Number.parseInt(stats.viewCount, 10)
            : null;

          if (subscribers !== null || totalViews !== null) {
            const result: TelemetryResult = {
              ok: true,
              source: 'youtube-api',
              subscribers: Number.isFinite(subscribers) ? subscribers : null,
              totalViews: Number.isFinite(totalViews) ? totalViews : null,
              fetchedAt,
            };
            cachedResult = { data: result, expiresAt: now + CACHE_TTL_MS };
            return result;
          }
        }
      }
    } catch {
      // Fall through to public channel fetch
    }
  }

  for (const pageUrl of [
    `https://www.youtube.com/channel/${CHANNEL_ID}/about`,
    `https://www.youtube.com/channel/${CHANNEL_ID}`,
  ]) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: 'SOCS=CAI',
        },
      });
      if (!res.ok) continue;

      const html = await res.text();
      const parsed = extractYouTubeStatsFromHtml(html);
      if (parsed.subscribers !== null || parsed.totalViews !== null) {
        const result: TelemetryResult = {
          ok: true,
          source: 'youtube-public',
          subscribers: parsed.subscribers,
          totalViews: parsed.totalViews,
          fetchedAt,
        };
        cachedResult = { data: result, expiresAt: now + CACHE_TTL_MS };
        return result;
      }
    } catch {
      // Try next URL
    }
  }

  return {
    ok: false,
    source: 'unavailable',
    subscribers: null,
    totalViews: null,
    fetchedAt,
  };
}

export async function onRequestGet(context: CloudflarePagesContext): Promise<Response> {
  const result = await fetchLiveYouTubeStats(context.env.YOUTUBE_API_KEY);
  return Response.json(result, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
