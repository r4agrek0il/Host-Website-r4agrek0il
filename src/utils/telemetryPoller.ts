export interface LiveChannelSnapshot {
  subscribers: number;
  totalViews: number;
  todayViews: number;
  todayWatchHours: number;
  lastUpdated: string;
  deltaSubs: number;
  deltaViews: number;
}

const BASE_SUBSCRIBERS = 204;
const BASE_TOTAL_VIEWS = 5480;
const BASE_TODAY_VIEWS = 326;
const BASE_TODAY_WATCH_HOURS = 15.6;

/**
 * Simulated real-time YouTube telemetry poller.
 * Emits incremental subscriber, total view, and active-day engagement ticks.
 */
export function pollChannelTelemetry(
  previous: LiveChannelSnapshot | null
): Promise<LiveChannelSnapshot> {
  return new Promise((resolve) => {
    const delay = 220 + Math.floor(Math.random() * 180);
    window.setTimeout(() => {
      const subBump = Math.random() > 0.62 ? 1 : 0;
      const viewBump = 1 + Math.floor(Math.random() * 5);
      const watchBump = Number((viewBump * 0.048).toFixed(2));

      const prevSubs = previous?.subscribers ?? BASE_SUBSCRIBERS;
      const prevTotal = previous?.totalViews ?? BASE_TOTAL_VIEWS;
      const prevToday = previous?.todayViews ?? BASE_TODAY_VIEWS;
      const prevHours = previous?.todayWatchHours ?? BASE_TODAY_WATCH_HOURS;

      const now = new Date();
      const timestamp = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      resolve({
        subscribers: prevSubs + subBump,
        totalViews: prevTotal + viewBump,
        todayViews: prevToday + viewBump,
        todayWatchHours: Number((prevHours + watchBump).toFixed(1)),
        lastUpdated: timestamp,
        deltaSubs: subBump,
        deltaViews: viewBump,
      });
    }, delay);
  });
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
  };
}
