/**
 * Automatic Spotlight + Most Popular picks. Pure functions, shared by
 * functions/api/videos.ts (server) and tests. No "latest" semantics here:
 * these are popularity picks, never release-order picks.
 */
export interface StatVideo {
  videoId: string;
  published: string;
  views: number | null;
  isShort?: boolean;
}

export interface Snapshot {
  t: number;
  views: Record<string, number>;
}

export type SpotlightReason = 'pinned' | 'trending' | 'rising';

export interface Spotlight {
  videoId: string;
  reason: SpotlightReason;
  gained?: number;
  windowHours?: number;
}

export interface Popular {
  topVideoId: string | null;
  topShortId: string | null;
}

const HOUR = 3600_000;
export const SNAPSHOT_INTERVAL_MS = HOUR;
export const SNAPSHOT_MAX = 170;
export const SNAPSHOT_KEEP_MS = 7 * 24 * HOUR;
export const TRENDING_MIN_GAIN = 20;
export const RISING_MIN_VIEWS = 10;
const TARGET_AGE_MS = 48 * HOUR;
const MIN_AGE_MS = 6 * HOUR;
const RISING_WINDOW_MS = 14 * 24 * HOUR;

/** Append a snapshot if the newest is >= 1h old; drop entries older than 7 days and cap length. Returns null when no write is needed. */
export function addSnapshot(existing: Snapshot[], videos: StatVideo[], now: number): Snapshot[] | null {
  const list = Array.isArray(existing) ? existing.filter((s) => s && typeof s.t === 'number') : [];
  const last = list.reduce((m, s) => Math.max(m, s.t), 0);
  if (last && now - last < SNAPSHOT_INTERVAL_MS) return null;
  const views: Record<string, number> = {};
  for (const v of videos) if (typeof v.views === 'number') views[v.videoId] = v.views;
  if (Object.keys(views).length === 0) return null;
  const next = [...list.filter((s) => now - s.t <= SNAPSHOT_KEEP_MS), { t: now, views }];
  next.sort((a, b) => a.t - b.t);
  return next.slice(-SNAPSHOT_MAX);
}

/** Snapshot closest to 48h ago that is at least 6h old. */
export function pickBaseline(snapshots: Snapshot[], now: number): Snapshot | null {
  let best: Snapshot | null = null;
  for (const s of snapshots ?? []) {
    if (!s || typeof s.t !== 'number' || now - s.t < MIN_AGE_MS) continue;
    if (!best || Math.abs(now - s.t - TARGET_AGE_MS) < Math.abs(now - best.t - TARGET_AGE_MS)) best = s;
  }
  return best;
}

export function computeSpotlight(
  videos: StatVideo[],
  snapshots: Snapshot[] | null,
  now: number,
  pinnedId?: string | null
): Spotlight | null {
  const pinned = pinnedId?.trim();
  if (pinned && videos.some((v) => v.videoId === pinned)) return { videoId: pinned, reason: 'pinned' };

  const base = snapshots ? pickBaseline(snapshots, now) : null;
  if (base) {
    let top: { id: string; gained: number } | null = null;
    for (const v of videos) {
      const before = base.views[v.videoId];
      if (typeof v.views !== 'number' || typeof before !== 'number') continue;
      const gained = v.views - before;
      if (!top || gained > top.gained) top = { id: v.videoId, gained };
    }
    if (top && top.gained >= TRENDING_MIN_GAIN) {
      return {
        videoId: top.id,
        reason: 'trending',
        gained: top.gained,
        windowHours: Math.max(1, Math.round((now - base.t) / HOUR)),
      };
    }
  }

  let rising: { id: string; rate: number } | null = null;
  for (const v of videos) {
    const pub = Date.parse(v.published);
    if (!Number.isFinite(pub) || typeof v.views !== 'number' || v.views < RISING_MIN_VIEWS) continue;
    const age = now - pub;
    if (age < 0 || age > RISING_WINDOW_MS) continue;
    const rate = v.views / Math.max(age / (24 * HOUR), 1);
    if (!rising || rate > rising.rate) rising = { id: v.videoId, rate };
  }
  return rising ? { videoId: rising.id, reason: 'rising' } : null;
}

export function computePopular(videos: StatVideo[]): Popular {
  const top = (list: StatVideo[]) =>
    list
      .filter((v) => typeof v.views === 'number')
      .reduce<StatVideo | null>((m, v) => (!m || (v.views as number) > (m.views as number) ? v : m), null)
      ?.videoId ?? null;
  return { topVideoId: top(videos.filter((v) => !v.isShort)), topShortId: top(videos.filter((v) => v.isShort)) };
}
