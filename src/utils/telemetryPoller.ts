export interface LiveChannelSnapshot {
  subscribers: number;
  totalViews: number;
  todayViews: number;
  todayWatchHours: number;
  lastUpdated: string;
  deltaSubs: number;
  deltaViews: number;
  isLiveSynced?: boolean;
}

interface TelemetryApiResponse {
  ok?: boolean;
  source?: string;
  subscribers?: number | null;
  totalViews?: number | null;
  fetchedAt?: string;
}

const BASE_SUBSCRIBERS = 206;
const BASE_TOTAL_VIEWS = 8128;
const BASE_TODAY_VIEWS = 326;
const BASE_TODAY_WATCH_HOURS = 15.6;

/**
 * Real YouTube telemetry poller.
 * Queries /api/telemetry for actual channel subscriber and total view counts
 * and NEVER fabricates random subscriber or view increments when counts are unchanged.
 */
export async function pollChannelTelemetry(
  previous: LiveChannelSnapshot | null
): Promise<LiveChannelSnapshot> {
  const prev = previous ?? getInitialSnapshot();
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  try {
    const res = await fetch('/api/telemetry', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('application/json')) {
      return {
        ...prev,
        deltaSubs: 0,
        deltaViews: 0,
        lastUpdated: prev.isLiveSynced ? timestamp : 'Last known',
      };
    }

    const data = (await res.json()) as TelemetryApiResponse;
    if (!data.ok) {
      return {
        ...prev,
        deltaSubs: 0,
        deltaViews: 0,
        lastUpdated: prev.isLiveSynced ? timestamp : 'Last known',
      };
    }

    const nextSubs =
      typeof data.subscribers === 'number' && Number.isFinite(data.subscribers)
        ? data.subscribers
        : prev.subscribers;

    const nextTotalViews =
      typeof data.totalViews === 'number' && Number.isFinite(data.totalViews)
        ? data.totalViews
        : prev.totalViews;

    // Only report incremental deltas after initial live sync, never from static baseline
    const deltaSubs =
      prev.isLiveSynced && nextSubs > prev.subscribers ? nextSubs - prev.subscribers : 0;
    const deltaViews =
      prev.isLiveSynced && nextTotalViews > prev.totalViews
        ? nextTotalViews - prev.totalViews
        : 0;

    const nextTodayViews = prev.todayViews + deltaViews;
    const nextTodayHours =
      deltaViews > 0
        ? Number((prev.todayWatchHours + deltaViews * 0.048).toFixed(1))
        : prev.todayWatchHours;

    return {
      subscribers: nextSubs,
      totalViews: nextTotalViews,
      todayViews: nextTodayViews,
      todayWatchHours: nextTodayHours,
      lastUpdated: timestamp,
      deltaSubs,
      deltaViews,
      isLiveSynced: true,
    };
  } catch {
    return {
      ...prev,
      deltaSubs: 0,
      deltaViews: 0,
      lastUpdated: prev.isLiveSynced ? timestamp : 'Last known',
    };
  }
}

/** Minimum client poll interval; the edge caches telemetry for 5 minutes. */
export const TELEMETRY_POLL_INTERVAL_MS = 60_000;

/** Next subscriber milestone: 250, 500, 1000, 2500, 5000, 10000, ... */
export function nextSubscriberMilestone(subs: number): number {
  const steps = [2.5, 5, 10];
  let base = 100;
  for (;;) {
    for (const m of steps) {
      const target = base * m;
      if (target > subs) return target;
    }
    base *= 10;
  }
}

export function getInitialSnapshot(): LiveChannelSnapshot {
  return {
    subscribers: BASE_SUBSCRIBERS,
    totalViews: BASE_TOTAL_VIEWS,
    todayViews: BASE_TODAY_VIEWS,
    todayWatchHours: BASE_TODAY_WATCH_HOURS,
    lastUpdated: 'Snapshot',
    deltaSubs: 0,
    deltaViews: 0,
    isLiveSynced: false,
  };
}
