import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decodeXmlEntities, isShortTitle, parseFeed } from '../../utils/parseFeed';
import {
  CHANNEL_VIDEOS,
  FEATURED_VIDEO_ID,
  LAST_5_TRACKS,
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

  it('curated metadata wins; new uploads first newest-first; deduped', () => {
    const older = { ...sample, videoId: 'olderolder1', published: '2026-11-01T00:00:00Z' };
    const curatedEcho = { ...sample, videoId: 'SoZfGOnwQXA', title: 'RSS title', published: '2026-10-01T00:00:00Z' };
    const merged = mergeVideos([older, sample, curatedEcho, sample], CHANNEL_VIDEOS);
    expect(merged[0].videoId).toBe(sample.videoId);
    expect(merged[1].videoId).toBe('olderolder1');
    expect(merged.slice(2).map((v) => v.videoId)).toEqual(CHANNEL_VIDEOS.map((v) => v.videoId));
    const curated = merged.find((v) => v.videoId === 'SoZfGOnwQXA');
    expect(curated?.title).toBe(LAST_5_TRACKS[0].title);
    expect(curated?.publishedAt).toBe(curatedEcho.published);
    expect(new Set(merged.map((v) => v.videoId)).size).toBe(merged.length);
  });

  it('merges the real fixture', () => {
    const merged = mergeVideos(entries, CHANNEL_VIDEOS);
    expect(merged.length).toBe(new Set([...entries.map((e) => e.videoId), ...CHANNEL_VIDEOS.map((v) => v.videoId)]).size);
    expect(merged[0].videoId).toBe('fxQiWP4OFiM');
  });
});

describe('buildChannelState', () => {
  it('falls back to curated with featured first', () => {
    const s = buildChannelState(null);
    expect(s.isLive).toBe(false);
    expect(s.tracks[0].videoId).toBe(FEATURED_VIDEO_ID);
    expect(s.tracks).toHaveLength(LAST_5_TRACKS.length);
    expect(s.shorts.every((v) => v.isShort)).toBe(true);
  });

  it('splits live tracks/shorts and marks isNew within 14 days', () => {
    const now = Date.parse('2026-11-28T00:00:00Z');
    const s = buildChannelState(entries, now);
    expect(s.isLive).toBe(true);
    expect(s.tracks[0].videoId).toBe(FEATURED_VIDEO_ID);
    expect(s.tracks.some((v) => v.isShort)).toBe(false);
    expect(s.shorts.length).toBeGreaterThan(0);
    expect(s.videos.find((v) => v.videoId === 'fxQiWP4OFiM')?.isNew).toBe(true);
    expect(isRecentlyPublished('2026-01-01T00:00:00Z', now)).toBe(false);
  });
});
