import { useState } from 'react';
import { Loader2, MessageSquare, Play, Send, Sparkles } from 'lucide-react';
import { CHANNEL_VIDEOS, type ChannelVideo } from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';

interface ConciergeTerminalProps {
  onPlayTrack: (video: ChannelVideo) => void;
}

interface MoodMatchResult {
  recommendedVideoId: string;
  trackTitle: string;
  reasoning: string;
  loreQuote: string;
}

const MOOD_PRESETS = [
  'Driving through neon rain at 2 AM, emotional yet energetic',
  'High-focus gaming session with heavy synth momentum',
  'Uplifting epic EDM anthem from darkness to light',
  'Introspective late-night chill with futuristic textures',
];

const QA_PRESETS = [
  'What is the Neon Nights playlist about?',
  'Which R4agRek0il track is the breakout release?',
  'How do Music, Gaming, and Cybernetics connect on this channel?',
];

export default function ConciergeTerminal({ onPlayTrack }: ConciergeTerminalProps) {
  const [mode, setMode] = useState<'mood' | 'qa'>('mood');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moodResult, setMoodResult] = useState<MoodMatchResult | null>(null);
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);

  const submitQuery = async (text: string, activeMode = mode) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Enter a mood description or channel question first.');
      return;
    }

    setLoading(true);
    setError(null);
    cyberAudio.playUiPulse(760);

    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, mode: activeMode }),
      });

      const data = (await response.json()) as {
        error?: string;
        result?: MoodMatchResult;
        answer?: string;
      };

      if (!response.ok) {
        setError(data.error ?? 'Unable to reach R4-AI Concierge right now.');
        return;
      }

      if (activeMode === 'mood' && data.result) {
        setMoodResult(data.result);
        setQaAnswer(null);
      } else if (data.answer) {
        setQaAnswer(data.answer);
        setMoodResult(null);
      }
    } catch {
      setError('Network error while connecting to R4-AI Concierge.');
    } finally {
      setLoading(false);
    }
  };

  const matchedVideo = moodResult
    ? CHANNEL_VIDEOS.find((v) => v.videoId === moodResult.recommendedVideoId) ??
      CHANNEL_VIDEOS[0]
    : null;

  return (
    <section id="concierge" className="border-t border-white/10 bg-[#04071A]/60 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Explanation & Mode Switch */}
          <div className="lg:col-span-5">
            <p className="font-mono text-xs text-[#00F0FF]">R4-AI Concierge</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">
              Mood-to-Track Matcher &amp; Channel Terminal
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Describe your scene, gaming session, or late-night mood—or ask anything about R4agRek0il and the Neon Nights collection.
            </p>

            {/* Mode Segmented Toggle */}
            <div
              role="tablist"
              aria-label="Concierge mode"
              className="mt-6 inline-flex rounded-xl border border-white/10 bg-[#000000] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'mood'}
                onClick={() => {
                  setMode('mood');
                  setError(null);
                }}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  mode === 'mood'
                    ? 'bg-[#FF7A00] text-[#04071A]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Mood Matcher</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'qa'}
                onClick={() => {
                  setMode('qa');
                  setError(null);
                }}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  mode === 'qa'
                    ? 'bg-[#00F0FF] text-[#04071A]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Channel Q&amp;A</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-6">
              <p className="font-mono text-xs text-slate-400">
                {mode === 'mood' ? 'Sample Vibe Prompts' : 'Sample Questions'}
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {(mode === 'mood' ? MOOD_PRESETS : QA_PRESETS).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setInput(preset);
                      void submitQuery(preset, mode);
                    }}
                    className="rounded-lg border border-white/10 bg-[#000000]/70 px-3.5 py-2.5 text-left text-xs text-slate-300 transition-colors hover:border-[#00F0FF]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Terminal Interface */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#00F0FF]/25 bg-[#000000] p-6 sm:p-8 lg:col-span-7">
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitQuery(input, mode);
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <label htmlFor="concierge-input" className="sr-only">
                  {mode === 'mood'
                    ? 'Describe your mood or scene'
                    : 'Ask a question about R4agRek0il'}
                </label>
                <input
                  id="concierge-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === 'mood'
                      ? 'e.g., Late-night coding in a neon city...'
                      : 'e.g., Which track should I listen to first?'
                  }
                  className="h-11 flex-1 rounded-lg border border-white/15 bg-[#04071A] px-4 text-sm text-white placeholder:text-slate-500 focus:border-[#00F0FF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#FF7A00] px-5 py-2.5 text-sm font-semibold text-[#04071A] whitespace-nowrap shrink-0 transition-colors hover:bg-[#FFB800] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Matching</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{mode === 'mood' ? 'Match Track' : 'Ask Terminal'}</span>
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-[#FF7A00]/40 bg-[#FF7A00]/10 p-4 text-xs leading-relaxed text-[#FFB800]"
                >
                  {error}
                </div>
              )}

              {/* Mood Match Result Card */}
              {moodResult && matchedVideo && !error && (
                <div className="mt-6 rounded-xl border border-[#00F0FF]/35 bg-[#04071A] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#00F0FF]">
                    <span>Recommended Match</span>
                    <span>{matchedVideo.genre}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold text-white">
                    {moodResult.trackTitle || matchedVideo.shortTitle}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {moodResult.reasoning}
                  </p>
                  <p className="mt-3 font-mono text-xs italic text-[#FFB800]">
                    “{moodResult.loreQuote}”
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        cyberAudio.playUiPulse(860);
                        onPlayTrack(matchedVideo);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-[#04071A] whitespace-nowrap transition-colors hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Play Recommended Track</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Q&A Result Card */}
              {qaAnswer && !error && (
                <div className="mt-6 rounded-xl border border-[#00F0FF]/35 bg-[#04071A] p-5 sm:p-6">
                  <p className="font-mono text-xs text-[#00F0FF]">R4-AI Response</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-200">
                    {qaAnswer}
                  </p>
                </div>
              )}

              {/* Initial Idle Prompt */}
              {!moodResult && !qaAnswer && !error && !loading && (
                <div className="mt-6 rounded-xl border border-white/10 bg-[#04071A]/60 p-6">
                  <p className="font-mono text-xs text-slate-400">
                    Ready for input. Choose a sample preset on the left or describe your vibe above to launch a matched track directly into the Cinema Theater.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
