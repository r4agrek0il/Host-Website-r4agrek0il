import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Send } from 'lucide-react';
import { CHANNEL_PROFILE, NEON_NIGHTS_PLAYLIST } from '../data/channel';
import { cyberAudio } from '../utils/audioEngine';

export default function CommunityNexus() {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('Music Collaboration');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyChannel = async () => {
    try {
      await navigator.clipboard.writeText(CHANNEL_PROFILE.urls.featured);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setFormError('Please enter your name or handle along with your message.');
      return;
    }
    setFormError(null);
    setSubmitted(true);
    cyberAudio.playUiPulse(820);
  };

  return (
    <section id="connect" className="border-t border-white/10 bg-[#000000] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Social Nodes */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#04071A] p-6 sm:p-8 lg:col-span-5">
            <div>
              <p className="font-mono text-xs text-[#00F0FF]">Community Nexus</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                Connect with {CHANNEL_PROFILE.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Follow new animated music video premieres, Shorts previews, and behind-the-scenes updates across official channels.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    label: 'YouTube Channel',
                    handle: '@R4agRek0il',
                    url: CHANNEL_PROFILE.urls.featured,
                  },
                  {
                    label: 'Instagram',
                    handle: '@r4agrek0il',
                    url: CHANNEL_PROFILE.urls.instagram,
                  },
                  {
                    label: 'Neon Nights Playlist',
                    handle: 'Cinematic EDM & Synthwave',
                    url: NEON_NIGHTS_PLAYLIST.url,
                  },
                ].map((node) => (
                  <a
                    key={node.label}
                    href={node.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[52px] items-center justify-between rounded-xl border border-white/10 bg-[#000000]/70 px-4 py-3 transition-colors hover:border-[#00F0FF]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{node.label}</p>
                      <p className="font-mono text-xs text-slate-400">{node.handle}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#00F0FF]" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={handleCopyChannel}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-4 w-4 text-[#00F0FF]" />
                    <span>Channel Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-300" />
                    <span>Copy YouTube Channel Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Collab & Fan Transmission Form */}
          <div className="rounded-2xl border border-white/10 bg-[#04071A] p-6 sm:p-8 lg:col-span-7">
            <p className="font-mono text-xs text-[#FF7A00]">Creator &amp; Community Desk</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-white">
              Send a Collaboration or Fan Note
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Producers, animators, gamers, and listeners can compose a collaboration pitch or feedback message here.
            </p>

            {submitted ? (
              <div className="mt-6 rounded-xl border border-[#00F0FF]/40 bg-[#000000] p-6">
                <p className="font-display text-lg font-bold text-[#00F0FF]">
                  Message Prepared
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Thanks, <span className="font-semibold text-white">{name}</span>. Your{' '}
                  <span className="text-[#FFB800]">{topic}</span> note is ready. You can also reach out directly via YouTube or Instagram DM on{' '}
                  <span className="font-mono text-white">@r4agrek0il</span>.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={CHANNEL_PROFILE.urls.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#FF7A00] px-4 py-2 text-xs font-semibold text-[#04071A] hover:bg-[#FFB800]"
                  >
                    <span>Message on Instagram</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setMessage('');
                    }}
                    className="min-h-[40px] rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
                  >
                    Write Another Note
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="collab-name" className="block text-xs font-medium text-slate-300">
                      Your Name or Handle
                    </label>
                    <input
                      id="collab-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="@yourhandle"
                      className="mt-1.5 h-11 w-full rounded-lg border border-white/15 bg-[#000000] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00F0FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="collab-topic" className="block text-xs font-medium text-slate-300">
                      Inquiry Type
                    </label>
                    <select
                      id="collab-topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-lg border border-white/15 bg-[#000000] px-3.5 text-sm text-white focus:border-[#00F0FF] focus:outline-none"
                    >
                      <option value="Music Collaboration">Music Collaboration</option>
                      <option value="Animation & Visuals">Animation &amp; Visuals</option>
                      <option value="Gaming & Esports">Gaming &amp; Esports</option>
                      <option value="Fan Feedback">Fan Feedback</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="collab-msg" className="block text-xs font-medium text-slate-300">
                    Message
                  </label>
                  <textarea
                    id="collab-msg"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share your idea, track link, or feedback..."
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#000000] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                {formError && (
                  <p role="alert" className="text-xs text-[#FF7A00]">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF7A00] px-5 py-2.5 text-sm font-semibold text-[#04071A] transition-colors hover:bg-[#FFB800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
