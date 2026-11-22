import { CHANNEL_PROFILE } from '../data/channel';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#000000] py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-base font-bold text-white">
            {CHANNEL_PROFILE.name}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            © {currentYear} {CHANNEL_PROFILE.name} · {CHANNEL_PROFILE.subheadline}
          </p>
        </div>

        <nav
          aria-label="Channel links"
          className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-300"
        >
          <a
            href={CHANNEL_PROFILE.urls.featured}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap transition-colors hover:text-[#00F0FF]"
          >
            YouTube
          </a>
          <a
            href={CHANNEL_PROFILE.urls.videos}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap transition-colors hover:text-[#00F0FF]"
          >
            Videos
          </a>
          <a
            href={CHANNEL_PROFILE.urls.shorts}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap transition-colors hover:text-[#00F0FF]"
          >
            Shorts
          </a>
          <a
            href={CHANNEL_PROFILE.urls.playlists}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap transition-colors hover:text-[#00F0FF]"
          >
            Playlists
          </a>
          <a
            href={CHANNEL_PROFILE.urls.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap transition-colors hover:text-[#FF7A00]"
          >
            Instagram
          </a>
        </nav>
      </div>
    </footer>
  );
}
