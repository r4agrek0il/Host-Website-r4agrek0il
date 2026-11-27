import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decodeXmlEntities, isShortTitle, parseFeed } from '../../utils/parseFeed';
import {
  CHANNEL_VIDEOS,
  LAST_5_TRACKS,
  NEW_BADGE_MAX,
  applyNewBadges,
  isRecentlyPublished,
  mergeVideos,
  rssToChannelVideo,
  type RssVideoEntry,
} from '../channel';
import { buildChannelState } from '../../utils/useChannelVideos';

const xml = readFileSync(fileURLToPath(new URL('./fixtures/feed.xml', import.meta.url)), 'utf8');
const entries = parseFeed(xml);

describe('parseFeed', () => {
  it('parses all entries from the real feed fixture', () => {
    expect(entries.length).toBe(15);
    for (const e of entries) {
      expect(e.videoId).toMatch(/^[\w-]{11}$/);
      expect(e.title.length).toBeGreaterThan(0);
      expect(Number.isFinite(Date.parse(e.published))).toBe(true);
    }
  });

  it('extracts title, views, description first line and decodes entities', () => {
    const first = entries[0];
    expect(first.videoId).toBe('fxQiWP4OFiM');
    expect(first.title).toContain('Pretty Circles');
    expect(first.views).toBe(4);
    expect(first.description.startsWith("He's back on Monday")).toBe(true);
    expect(first.description).not.toContain('\n');
    const quoted = entries.find((e) => e.title.includes('almosts'));
    expect(quoted?.title.startsWith('"')).toBe(true);
  });

  it('detects shorts by title', () => {
    expect(entries.find((e) => e.videoId === 'sm_sXx6Ek2E')?.isShort).toBe(false);
    expect(entries.filter((e) => e.isShort).length).toBeGreaterThanOrEqual(8);
    expect(isShortTitle('Hook (Short)')).toBe(true);
    expect(isShortTitle('x #SHORTS')).toBe(true);
    expect(isShortTitle('Shortcut song')).toBe(false);
  });

  it('handles empty / garbage input', () => {
    expect(parseFeed('')).toEqual([]);
    expect(parseFeed('<feed><entry><title>x</title></entry></feed>')).toEqual([]);
    expect(decodeXmlEntities('&amp;&#39;&#x41;')).toBe("&'A");
  });
});

const sample: RssVideoEntry = {
  videoId: 'abcdefghijk',
  title: 'Brand New Song | Official Video — R4agRek0il',
  published: '2026-11-20T00:00:00+00:00',
  views: 10,
  description: 'First line',
  isShort: false,
};

describe('rssToChannelVideo', () => {
  it('produces a valid ChannelVideo with defaults', () => {
    const v = rssToChannelVideo(sample, 0);
    expect(v.videoId).toBe(sample.videoId);
    expect(v.category).toBe('animated-mv');
    expect(v.shortTitle).toBe('Brand New Song');
    expect(v.duration).toBe('');
    expect(v.storyNote).toBe('First line');
    expect(['cyan', 'orange', 'dual']).toContain(v.accentTone);
    expect(v.waveformSeed).toBe(rssToChannelVideo(sample, 5).waveformSeed);
    expect(v.publishedAt).toBe(sample.published);
  });

  it('maps shorts and cycles accent tones', () => {
    const s = rssToChannelVideo({ ...sample, isShort: true, title: 'Hook #Shorts' }, 1);
    expect(s.category).toBe('shorts');
    expect(s.isShort).toBe(true);
    expect(s.shortTitle).toBe('Hook');
    const tones = [0, 1, 2].map((i) => rssToChannelVideo(sample, i).accentTone);
    expect(new Set(tones).size).toBe(3);
  });
});

describe('mergeVideos', () => {
  it('returns curated list when rss is empty', () => {
    expect(mergeVideos([], CHANNEL_VIDEOS).map((v) => v.videoId)).toEqual(
      CHANNEL_VIDEOS.map((v) => v.videoId)
    );
  });

  it('curated metadata wins; everything sorted newest-first; undated curated last; deduped', () => {
    const older = { ...sample, videoId: 'olderolder1', published: '2026-11-01T00:00:00Z' };
    const curatedEcho = { ...sample, videoId: 'SoZfGOnwQXA', title: 'RSS title', published: '2026-11-10T00:00:00Z' };
    // strip curated dates so this exercises the undated-curated path
    const undated = CHANNEL_VIDEOS.map((v) => ({ ...v, publishedAt: undefined }));
    const merged = mergeVideos([older, sample, curatedEcho, sample], undated);
    expect(merged.slice(0, 3).map((v) => v.videoId)).toEqual([sample.videoId, 'SoZfGOnwQXA', 'olderolder1']);
    expect(merged.slice(3).map((v) => v.videoId)).toEqual(
      CHANNEL_VIDEOS.filter((v) => v.videoId !== 'SoZfGOnwQXA').map((v) => v.videoId)
    );
    const curated = merged.find((v) => v.videoId === 'SoZfGOnwQXA');
    expect(curated?.title).toBe(CHANNEL_VIDEOS.find((v) => v.videoId === 'SoZfGOnwQXA')?.title);
    expect(curated?.publishedAt).toBe(curatedEcho.published);
    expect(new Set(merged.map((v) => v.videoId)).size).toBe(merged.length);
  });

  it('merges the real fixture', () => {
    const merged = mergeVideos(entries, CHANNEL_VIDEOS);
    expect(merged.length).toBe(new Set([...entries.map((e) => e.videoId), ...CHANNEL_VIDEOS.map((v) => v.videoId)]).size);
    expect(merged[0].videoId).toBe('fxQiWP4OFiM');
    // Wake the Night items are older than the feed window: they come last.
    expect(merged.slice(-2).map((v) => v.videoId)).toEqual(['_8D1_KcdVDU', 'QIV-N_7nPcE']);
  });
});

// Real channel classification (Shorts flagged as the /shorts/ probe does in production).
const REAL_SHORT_IDS = new Set(
  ['9B8bf_xElm8', 'GrGcSpx8XaY', 'K-3REFr9wtY', 'OG3DzCJheJQ', 'QUxCB7vZQHY', 'QaS_F9Xjj2g', 'R5_xFTHSKjc', 'hn15ps5fA6E', 'NV0YD4CB5eM', 'a4oHsCW4_bA']
);
const realEntries = entries.map((e) => ({ ...e, isShort: REAL_SHORT_IDS.has(e.videoId) }));

describe('buildChannelState', () => {
  const now = Date.parse('2026-11-27T18:00:00Z');

  it('fallback: newest curated full video first, unchanged curated behaviour', () => {
    const s = buildChannelState(null);
    expect(s.isLive).toBe(false);
    expect(s.latestDrop.videoId).toBe('fxQiWP4OFiM');
    expect(s.tracks.map((v) => v.videoId)).toEqual(LAST_5_TRACKS.slice(0, 5).map((v) => v.videoId));
    expect(s.tracks[0].releaseNote).toBe('Latest Drop');
    expect(s.shorts.map((v) => v.videoId)).toEqual(['QIV-N_7nPcE']);
  });

  it('latest drop = Pretty Circles for the real fixture; only it is labelled Latest Drop', () => {
    const s = buildChannelState(realEntries, now);
    expect(s.isLive).toBe(true);
    expect(s.latestDrop.videoId).toBe('fxQiWP4OFiM');
    expect(s.tracks[0].videoId).toBe('fxQiWP4OFiM');
    const labelled = s.videos.filter((v) => v.releaseNote === 'Latest Drop').map((v) => v.videoId);
    expect(labelled).toEqual(['fxQiWP4OFiM']);
    expect(s.videos.find((v) => v.videoId === 'SoZfGOnwQXA')?.releaseNote).toBe('Official Release');
  });

  it('deck = newest 5 full videos by date', () => {
    const s = buildChannelState(realEntries, now);
    expect(s.tracks.map((v) => v.videoId)).toEqual([
      'fxQiWP4OFiM', 'SoZfGOnwQXA', 'Nrp7AcQIkWU', 'sm_sXx6Ek2E', 'h20rZi9OxbM',
    ]);
  });

  it('shorts excluded from full releases; shorts newest-first', () => {
    const s = buildChannelState(realEntries, now);
    const full = s.videos.filter((v) => !v.isShort);
    expect(full.some((v) => REAL_SHORT_IDS.has(v.videoId))).toBe(false);
    expect(s.shorts.every((v) => v.isShort)).toBe(true);
    expect(s.shorts[0].videoId).toBe('9B8bf_xElm8');
    expect(s.shorts.at(-1)?.videoId).toBe('QIV-N_7nPcE');
    const times = s.videos.map((v) => Date.parse(v.publishedAt ?? '')).filter(Number.isFinite);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('NEW badge: within 7 days, max 2 full + max 2 shorts', () => {
    const s = buildChannelState(realEntries, now);
    expect(s.videos.filter((v) => v.isNew && !v.isShort).map((v) => v.videoId)).toEqual(['fxQiWP4OFiM', 'SoZfGOnwQXA']);
    expect(s.videos.filter((v) => v.isNew && v.isShort).map((v) => v.videoId)).toEqual(['9B8bf_xElm8', 'GrGcSpx8XaY']);
    expect(NEW_BADGE_MAX).toBe(2);
    const later = applyNewBadges(s.videos, Date.parse('2026-12-30T00:00:00Z'));
    expect(later.some((v) => v.isNew)).toBe(false);
    expect(isRecentlyPublished('2026-11-15T00:00:00Z', now)).toBe(false);
  });

  it('full-video index is chronological (oldest = 01) and stable', () => {
    const s = buildChannelState(realEntries, now);
    const full = s.videos.filter((v) => !v.isShort);
    expect(full[0].index).toBe(String(full.length).padStart(2, '0'));
    expect(full.at(-1)?.index).toBe('01');
  });
});
