import { describe, expect, it } from 'vitest';
import { addSnapshot, computePopular, computeSpotlight, pickBaseline, type Snapshot, type StatVideo } from '../spotlight';
import { buildChannelState } from '../useChannelVideos';

const H = 3600_000;
const now = Date.parse('2026-11-27T12:00:00Z');
const videos: StatVideo[] = [
  { videoId: 'prettyCirc1', published: '2026-11-27T08:00:00Z', views: 5 },
  { videoId: 'hisHeelSh01', published: '2026-11-23T08:00:00Z', views: 132, isShort: true },
  { videoId: 'notDancing1', published: '2026-11-22T08:00:00Z', views: 31 },
  { videoId: 'whatIfIDont', published: '2026-11-14T08:00:00Z', views: 127 },
  { videoId: 'bigShort001', published: '2026-11-11T08:00:00Z', views: 2083, isShort: true },
  { videoId: 'lostTheCoun', published: '2026-11-09T08:00:00Z', views: 978 },
];

describe('computeSpotlight', () => {
  it('pins SPOTLIGHT_VIDEO_ID when it is in the feed', () => {
    expect(computeSpotlight(videos, null, now, 'notDancing1')).toEqual({ videoId: 'notDancing1', reason: 'pinned' });
  });
  it('ignores a pinned id not in the feed', () => {
    expect(computeSpotlight(videos, null, now, 'missing0000')?.reason).toBe('rising');
  });
  it('trending: biggest gainer vs the snapshot closest to 48h ago', () => {
    const snaps: Snapshot[] = [
      { t: now - 72 * H, views: { notDancing1: 0, whatIfIDont: 0 } },
      { t: now - 47 * H, views: { notDancing1: 1, whatIfIDont: 100, lostTheCoun: 970, hisHeelSh01: 90 } },
      { t: now - 2 * H, views: { notDancing1: 30 } },
    ];
    expect(computeSpotlight(videos, snaps, now)).toEqual({
      videoId: 'hisHeelSh01',
      reason: 'trending',
      gained: 42,
      windowHours: 47,
    });
  });
  it('falls back to rising when gains < 20 or snapshots too young', () => {
    const small = [{ t: now - 30 * H, views: { notDancing1: 25, whatIfIDont: 120 } }];
    expect(computeSpotlight(videos, small, now)?.reason).toBe('rising');
    const young = [{ t: now - 2 * H, views: { notDancing1: 0 } }];
    expect(computeSpotlight(videos, young, now)?.reason).toBe('rising');
  });
  it('no KV: rising = best views/day in last 14 days with >= 10 views', () => {
    expect(computeSpotlight(videos, null, now)).toEqual({ videoId: 'hisHeelSh01', reason: 'rising' });
  });
  it('returns null when nothing qualifies', () => {
    expect(computeSpotlight([{ videoId: 'a', published: '2025-01-01T00:00:00Z', views: 3 }], null, now)).toBeNull();
  });
});

describe('snapshots', () => {
  it('adds at most one per hour, keeps 7 days, caps length', () => {
    expect(addSnapshot([{ t: now - 30 * 60_000, views: {} }], videos, now)).toBeNull();
    const old = [
      { t: now - 8 * 24 * H, views: { a: 1 } },
      { t: now - 2 * H, views: { a: 2 } },
    ];
    const next = addSnapshot(old, videos, now)!;
    expect(next.map((s) => s.t)).toEqual([now - 2 * H, now]);
    expect(next[1].views.lostTheCoun).toBe(978);
    const many = Array.from({ length: 200 }, (_, i) => ({ t: now - H - i * H * 0.8, views: { a: i } }));
    expect(addSnapshot(many, videos, now)!.length).toBe(170);
  });
  it('baseline requires >= 6h age', () => {
    expect(pickBaseline([{ t: now - 5 * H, views: {} }], now)).toBeNull();
  });
});

describe('computePopular', () => {
  it('top full video and top short by views', () => {
    expect(computePopular(videos)).toEqual({ topVideoId: 'lostTheCoun', topShortId: 'bigShort001' });
  });
});

describe('buildChannelState picks', () => {
  it('hides picks without live data', () => {
    const s = buildChannelState(null, now, { spotlight: { videoId: 'x', reason: 'rising' } });
    expect(s.spotlight).toBeNull();
    expect(s.topVideo).toBeNull();
    expect(s.topShort).toBeNull();
  });
});
