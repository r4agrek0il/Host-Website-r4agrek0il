// Pure, dependency-free parser for the YouTube channel Atom feed
// (https://www.youtube.com/feeds/videos.xml?channel_id=...).
// Shared by the Cloudflare Pages Function (functions/api/videos.ts) and tests.

export interface FeedEntry {
  videoId: string;
  title: string;
  published: string;
  views: number | null;
  description: string;
  isShort: boolean;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export function decodeXmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const num =
        code[1] === 'x' || code[1] === 'X'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function pick(block: string, pattern: RegExp): string {
  const m = block.match(pattern);
  return m?.[1] ? decodeXmlEntities(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim() : '';
}

export function isShortTitle(title: string): boolean {
  return /#shorts?\b/i.test(title) || /\(short\)/i.test(title);
}

export function parseFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const videoId = pick(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoId) continue;
    const title = pick(block, /<title>([\s\S]*?)<\/title>/);
    const published = pick(block, /<published>([^<]+)<\/published>/);
    const viewsRaw = block.match(/<media:statistics[^>]*\bviews="(\d+)"/);
    const descriptionFull = pick(block, /<media:description>([\s\S]*?)<\/media:description>/);
    const description =
      descriptionFull.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? '';
    entries.push({
      videoId,
      title,
      published,
      views: viewsRaw ? Number.parseInt(viewsRaw[1], 10) : null,
      description,
      isShort: isShortTitle(title),
    });
  }
  return entries;
}
