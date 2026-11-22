import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANNEL_CATALOG_CONTEXT = `
You are the R4-AI Cybernetic Concierge for the YouTube channel R4agRek0il (@R4agRek0il, Channel ID: UCdyybiezt4xZHtGVdx_nzYQ).
Brand Identity: "MUSIC // GAMING // CYBERNETICS — Where music, imagination, and technology collide."
Instagram: @r4agrek0il

Verified Tracks & Videos:
1. id: "SoZfGOnwQXA" | title: "Not Dancing – R4agRek0il | Official Animated Music Video" | category: "ANIMATED MV" | mood: "Kinetic, late-night rhythm, expressive character animation, electronic pop pulse"
2. id: "h20rZi9OxbM" | title: "Lost the Count | Official Animated Music Video — R4agRek0il" | category: "ANIMATED MV" | mood: "Breakout track, relentless synth drive, emotional momentum, gaming-paced storytelling"
3. id: "_8D1_KcdVDU" | title: "WAKE THE NIGHT ⚡ | From Darkness to Light | Epic EDM Lyric Video" | category: "LYRIC VIDEO" | mood: "Epic cinematic EDM, Neon Nights anthem, uplifting drop, darkness to light energy"
4. id: "Nrp7AcQIkWU" | title: "Make It Hard to Leave — R4agRek0il | Official Music Video" | category: "ANIMATED MV" | mood: "Atmospheric, emotional vocal hook, melancholic yet futuristic cybernetic city vibe"
5. id: "sm_sXx6Ek2E" | title: "What If I Don't? | Official Animated Music Video — R4agRek0il" | category: "ANIMATED MV" | mood: "Introspective, experimental electronic textures, late-night contemplation"
6. id: "QIV-N_7nPcE" | title: "Wake the Night | Bring the Light ✨ | Original Song #Shorts" | category: "SHORTS" | mood: "High-impact vertical teaser, quick adrenaline rush, instant hook"

Featured Playlist:
- NEON NIGHTS ⚡ | Cinematic EDM, Synthwave & Electronic Music ("Where Music Meets the Future.")
`.trim();

const YOUTUBE_CHANNEL_ID = 'UCdyybiezt4xZHtGVdx_nzYQ';
const TELEMETRY_CACHE_TTL_MS = 12_000;

interface ServerTelemetryResult {
  ok: boolean;
  source: 'youtube-api' | 'youtube-public' | 'unavailable';
  subscribers: number | null;
  totalViews: number | null;
  fetchedAt: string;
}

let telemetryCache: { data: ServerTelemetryResult; expiresAt: number } | null = null;

function parseCompactYouTubeCount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);
  if (!match) return null;
  const num = Number.parseFloat(match[1]);
  if (!Number.isFinite(num)) return null;
  const suffix = (match[2] ?? '').toUpperCase();
  const mult =
    suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1;
  return Math.round(num * mult);
}

function extractStatsFromYouTubeHtml(html: string): {
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
  for (const p of subPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const val = parseCompactYouTubeCount(m[1]);
      if (val !== null && val >= 0) {
        subscribers = val;
        break;
      }
    }
  }

  const viewPatterns = [
    /"viewCountText"\s*:\s*"([^"]+)"/i,
    /"viewCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/i,
    /"content"\s*:\s*"([\d,.]+\s*[KMB]?\s*views?)"/i,
  ];
  for (const p of viewPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const val = parseCompactYouTubeCount(m[1]);
      if (val !== null && val >= 0) {
        totalViews = val;
        break;
      }
    }
  }

  return { subscribers, totalViews };
}

async function getLiveYouTubeTelemetry(): Promise<ServerTelemetryResult> {
  const now = Date.now();
  if (telemetryCache && telemetryCache.expiresAt > now) {
    return telemetryCache.data;
  }

  const fetchedAt = new Date().toISOString();
  const ytKey = process.env.YOUTUBE_API_KEY;

  if (ytKey) {
    try {
      const apiRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${encodeURIComponent(ytKey)}`
      );
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
          const totalViews = stats.viewCount ? Number.parseInt(stats.viewCount, 10) : null;
          if (subscribers !== null || totalViews !== null) {
            const result: ServerTelemetryResult = {
              ok: true,
              source: 'youtube-api',
              subscribers: Number.isFinite(subscribers) ? subscribers : null,
              totalViews: Number.isFinite(totalViews) ? totalViews : null,
              fetchedAt,
            };
            telemetryCache = { data: result, expiresAt: now + TELEMETRY_CACHE_TTL_MS };
            return result;
          }
        }
      }
    } catch {
      // Fall back to public channel page
    }
  }

  for (const url of [
    `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}/about`,
    `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`,
  ]) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: 'SOCS=CAI',
        },
      });
      if (!res.ok) continue;

      const html = await res.text();
      const parsed = extractStatsFromYouTubeHtml(html);
      if (parsed.subscribers !== null || parsed.totalViews !== null) {
        const result: ServerTelemetryResult = {
          ok: true,
          source: 'youtube-public',
          subscribers: parsed.subscribers,
          totalViews: parsed.totalViews,
          fetchedAt,
        };
        telemetryCache = { data: result, expiresAt: now + TELEMETRY_CACHE_TTL_MS };
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

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/telemetry', async (_req, res) => {
    const result = await getLiveYouTubeTelemetry();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json(result);
  });

  app.post('/api/concierge', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured in the server environment. Set it in Settings > Secrets to activate R4-AI Concierge.',
      });
      return;
    }

    const { prompt, mode } = req.body as {
      prompt?: string;
      mode?: 'mood' | 'qa';
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Please enter a mood, vibe, or question.' });
      return;
    }

    const cleanPrompt = prompt.trim().slice(0, 600);
    const activeMode = mode === 'qa' ? 'qa' : 'mood';

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      if (activeMode === 'mood') {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Visitor mood or scene request: "${cleanPrompt}"`,
          config: {
            systemInstruction: `${CHANNEL_CATALOG_CONTEXT}

Task: Match the visitor's mood or scene to the single best-fitting verified R4agRek0il track from the list above.
Keep the reasoning concise (2 sentences max) and craft one evocative, futuristic lore line that fits R4agRek0il's Music, Gaming & Cybernetics universe.
You MUST pick one of these exact video IDs: SoZfGOnwQXA, h20rZi9OxbM, _8D1_KcdVDU, Nrp7AcQIkWU, sm_sXx6Ek2E, QIV-N_7nPcE.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendedVideoId: {
                  type: Type.STRING,
                  description:
                    'Exact YouTube video ID from the verified list: SoZfGOnwQXA, h20rZi9OxbM, _8D1_KcdVDU, Nrp7AcQIkWU, sm_sXx6Ek2E, or QIV-N_7nPcE.',
                },
                trackTitle: {
                  type: Type.STRING,
                  description: 'The clean title of the matched track.',
                },
                reasoning: {
                  type: Type.STRING,
                  description: 'Concise 1-2 sentence explanation of why this track fits the mood.',
                },
                loreQuote: {
                  type: Type.STRING,
                  description: 'A short atmospheric cybernetic line matching the track.',
                },
              },
              required: ['recommendedVideoId', 'trackTitle', 'reasoning', 'loreQuote'],
            },
          },
        });

        const raw = (response.text ?? '{}').trim();
        const parsed = JSON.parse(raw);
        res.json({ mode: 'mood', result: parsed });
        return;
      }

      const qaResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: cleanPrompt,
        config: {
          systemInstruction: `${CHANNEL_CATALOG_CONTEXT}

Task: Answer the visitor's question about R4agRek0il, its tracks, Neon Nights playlist, or creative direction in a sharp, helpful, grounded tone (3-4 sentences max). Only state facts grounded in the channel catalog above or clearly say when a creative detail is open to exploration on @R4agRek0il.`,
        },
      });

      res.json({
        mode: 'qa',
        answer: (qaResponse.text ?? 'Unable to generate a response right now.').trim(),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Upstream Gemini service error.';
      console.error('Gemini concierge error:', message);
      res.status(502).json({
        error: `R4-AI Concierge encountered an upstream error: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`R4agRek0il server listening on http://0.0.0.0:${port}`);
  });
}

createServer();
