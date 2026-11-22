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

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

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
