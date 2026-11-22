interface CloudflarePagesContext {
  request: Request;
  env: {
    GEMINI_API_KEY?: string;
  };
}

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

export async function onRequestPost(context: CloudflarePagesContext): Promise<Response> {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          'GEMINI_API_KEY is not configured in Cloudflare Pages environment variables.',
      },
      { status: 503 }
    );
  }

  let body: { prompt?: string; mode?: 'mood' | 'qa' };
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 600) : '';
  if (!prompt) {
    return Response.json(
      { error: 'Please enter a mood, vibe, or question.' },
      { status: 400 }
    );
  }

  const activeMode = body.mode === 'qa' ? 'qa' : 'mood';

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent`;

  const payload =
    activeMode === 'mood'
      ? {
          systemInstruction: {
            parts: [
              {
                text: `${CHANNEL_CATALOG_CONTEXT}

Task: Match the visitor's mood or scene to the single best-fitting verified R4agRek0il track from the list above.
Keep the reasoning concise (2 sentences max) and craft one evocative, futuristic lore line that fits R4agRek0il's Music, Gaming & Cybernetics universe.
You MUST pick one of these exact video IDs: SoZfGOnwQXA, h20rZi9OxbM, _8D1_KcdVDU, Nrp7AcQIkWU, sm_sXx6Ek2E, QIV-N_7nPcE.`,
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Visitor mood or scene request: "${prompt}"` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                recommendedVideoId: { type: 'STRING' },
                trackTitle: { type: 'STRING' },
                reasoning: { type: 'STRING' },
                loreQuote: { type: 'STRING' },
              },
              required: ['recommendedVideoId', 'trackTitle', 'reasoning', 'loreQuote'],
            },
          },
        }
      : {
          systemInstruction: {
            parts: [
              {
                text: `${CHANNEL_CATALOG_CONTEXT}

Task: Answer the visitor's question about R4agRek0il, its tracks, Neon Nights playlist, or creative direction in a sharp, helpful, grounded tone (3-4 sentences max).`,
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        };

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = (await upstream.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (!upstream.ok) {
      return Response.json(
        { error: data.error?.message ?? 'Upstream Gemini API error.' },
        { status: upstream.status }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (activeMode === 'mood') {
      return Response.json({ mode: 'mood', result: JSON.parse(text.trim() || '{}') });
    }
    return Response.json({ mode: 'qa', answer: text.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return Response.json({ error: message }, { status: 502 });
  }
}
