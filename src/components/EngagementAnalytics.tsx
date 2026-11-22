import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, RefreshCw, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ENGAGEMENT_30_DAYS, type DailyEngagementPoint } from '../data/channel';
import type { LiveChannelSnapshot } from '../utils/telemetryPoller';

type TimeWindow = 30 | 14 | 7;
type MetricView = 'both' | 'views' | 'watchTime';

interface EngagementAnalyticsProps {
  liveMode: boolean;
  isPolling: boolean;
  liveSnapshot: LiveChannelSnapshot;
  onToggleLiveMode: () => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    dataKey?: string;
    payload?: DailyEngagementPoint;
  }>;
}

function EngagementTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-[#00F0FF]/55 bg-[#03050a]/95 px-4 py-3 shadow-[0_10px_30px_rgba(0,240,255,0.18)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs font-semibold text-white">{point.dateLabel}</p>
        <span className="font-mono text-[11px] text-slate-400">{point.day}</span>
      </div>
      {point.milestone && (
        <p className="mt-1 font-mono text-[11px] font-medium text-[#FFB800]">
          {point.milestone}
        </p>
      )}
      <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2 font-mono text-xs tabular-nums">
        <p className="flex items-center justify-between gap-5 text-[#00F0FF]">
          <span>Views</span>
          <span className="font-semibold">{point.views.toLocaleString()}</span>
        </p>
        <p className="flex items-center justify-between gap-5 text-[#FF7B00]">
          <span>Watch Time</span>
          <span className="font-semibold">{point.watchTimeHours.toFixed(1)} hrs</span>
        </p>
      </div>
    </div>
  );
}

export default function EngagementAnalytics({
  liveMode,
  isPolling,
  liveSnapshot,
  onToggleLiveMode,
}: EngagementAnalyticsProps) {
  const [windowDays, setWindowDays] = useState<TimeWindow>(30);
  const [metricView, setMetricView] = useState<MetricView>('both');
  const [hoveredPoint, setHoveredPoint] = useState<DailyEngagementPoint | null>(null);

  // Update the latest day's point when Live Data is active
  const visibleData = useMemo(() => {
    const base = ENGAGEMENT_30_DAYS.slice(-windowDays).map((pt) => ({ ...pt }));
    if (liveMode && base.length > 0) {
      const last = base[base.length - 1];
      base[base.length - 1] = {
        ...last,
        views: liveSnapshot.todayViews,
        watchTimeHours: liveSnapshot.todayWatchHours,
        milestone: last.milestone ?? 'Live Session',
      };
    }
    return base;
  }, [windowDays, liveMode, liveSnapshot]);

  const summary = useMemo(() => {
    const totalViews = visibleData.reduce((acc, p) => acc + p.views, 0);
    const totalHours = visibleData.reduce((acc, p) => acc + p.watchTimeHours, 0);
    const peakPoint = visibleData.reduce(
      (best, p) => (p.views > best.views ? p : best),
      visibleData[0]
    );
    const avgRetentionMins =
      totalViews > 0 ? ((totalHours * 60) / totalViews).toFixed(2) : '0.00';

    return {
      totalViews,
      totalHours: totalHours.toFixed(1),
      peakDay: peakPoint?.dateLabel ?? 'Day 30',
      peakViews: peakPoint?.views ?? 0,
      avgRetentionMins,
    };
  }, [visibleData]);

  const activePoint = hoveredPoint ?? visibleData[visibleData.length - 1];

  return (
    <section
      id="analytics"
      className="relative border-t border-white/10 bg-[#03050a]/90 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header & Interactive Controls */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs text-[#00F0FF]">Channel Engagement Telemetry</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">
              Views &amp; Watch Time Trends (Last 30 Days)
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Daily audience momentum across @R4agRek0il releases. Hover any point on the chart to inspect exact daily view and watch-time peaks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Data Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={liveMode}
              onClick={onToggleLiveMode}
              className={`inline-flex min-h-[40px] items-center gap-2.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                liveMode
                  ? 'border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#00F0FF]'
                  : 'border-white/15 bg-[#04071A] text-slate-300 hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Live Data</span>
              <span
                aria-hidden="true"
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  liveMode ? 'bg-[#00F0FF]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-[#03050a] transition-transform ${
                    liveMode ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>

            {/* Metric Focus Tabs */}
            <div
              role="tablist"
              aria-label="Chart metric view"
              className="inline-flex rounded-xl border border-white/10 bg-[#04071A] p-1"
            >
              {(
                [
                  { id: 'both', label: 'Combined' },
                  { id: 'views', label: 'Views' },
                  { id: 'watchTime', label: 'Watch Time' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={metricView === tab.id}
                  onClick={() => setMetricView(tab.id)}
                  className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    metricView === tab.id
                      ? 'bg-[#00F0FF] text-[#04071A]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Timeframe Switcher */}
            <div
              role="tablist"
              aria-label="Engagement time window"
              className="inline-flex rounded-xl border border-white/10 bg-[#04071A] p-1"
            >
              {([30, 14, 7] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  role="tab"
                  aria-selected={windowDays === days}
                  onClick={() => setWindowDays(days)}
                  className={`min-h-[38px] rounded-lg px-3 py-1.5 font-mono text-xs font-semibold whitespace-nowrap tabular-nums transition-colors ${
                    windowDays === days
                      ? 'bg-[#FF7B00] text-[#04071A]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary KPI Row (Includes Live Subscriber & Total View Polling Readout) */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#04071A] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-xs text-slate-400">Subscribers</p>
              {liveMode && (
                <span className="font-mono text-[11px] text-[#00F0FF]">
                  {isPolling ? 'Syncing' : liveSnapshot.lastUpdated}
                </span>
              )}
            </div>
            <p className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
              {liveSnapshot.subscribers.toLocaleString()}
              {liveMode && liveSnapshot.deltaSubs > 0 && (
                <span className="ml-2 font-mono text-xs font-medium text-[#00F0FF]">
                  +{liveSnapshot.deltaSubs}
                </span>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#04071A] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-xs text-slate-400">
                {liveMode ? 'Channel Total Views' : `${windowDays}-Day Views`}
              </p>
              {liveMode && (
                <RefreshCw
                  className={`h-3.5 w-3.5 text-[#00F0FF] ${isPolling ? 'animate-spin' : ''}`}
                />
              )}
            </div>
            <p className="mt-1.5 font-display text-2xl font-bold text-[#00F0FF] tabular-nums">
              {(liveMode ? liveSnapshot.totalViews : summary.totalViews).toLocaleString()}
              {liveMode && liveSnapshot.deltaViews > 0 && (
                <span className="ml-2 font-mono text-xs font-medium text-[#FFB800]">
                  +{liveSnapshot.deltaViews}
                </span>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#04071A] p-5">
            <p className="font-mono text-xs text-slate-400">
              {windowDays}-Day Watch Time
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-[#FF7B00] tabular-nums">
              {summary.totalHours} hrs
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#04071A] p-5">
            <p className="font-mono text-xs text-slate-400">Peak Daily Views</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
              {summary.peakViews.toLocaleString()}{' '}
              <span className="font-mono text-xs font-normal text-slate-400">
                ({summary.peakDay})
              </span>
            </p>
          </div>
        </div>

        {/* Recharts Area Chart Container with Smooth Fade-In Animation */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 rounded-2xl border border-[#00F0FF]/25 bg-[#04071A] p-4 sm:p-6"
        >
          {/* Hover Inspector Strip */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-5 font-mono">
              {(metricView === 'both' || metricView === 'views') && (
                <span className="inline-flex items-center gap-2 text-[#00F0FF]">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#00F0FF]" />
                  <span>Daily Views</span>
                </span>
              )}
              {(metricView === 'both' || metricView === 'watchTime') && (
                <span className="inline-flex items-center gap-2 text-[#FF7B00]">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#FF7B00]" />
                  <span>Watch Time (Hours)</span>
                </span>
              )}
            </div>

            {activePoint && (
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums">
                <TrendingUp className="h-3.5 w-3.5 text-[#00F0FF]" />
                <span className="text-slate-400">
                  {hoveredPoint ? 'Inspecting' : 'Latest'}:
                </span>
                <span className="font-semibold text-white">{activePoint.dateLabel}</span>
                <span className="text-[#00F0FF]">
                  {activePoint.views.toLocaleString()} views
                </span>
                <span className="text-[#FF7B00]">
                  {activePoint.watchTimeHours.toFixed(1)} hrs
                </span>
              </div>
            )}
          </div>

          <div className="h-[330px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={visibleData}
                margin={{ top: 12, right: 14, left: -10, bottom: 0 }}
                onMouseMove={(state) => {
                  const payloadItem = (
                    state as unknown as {
                      activePayload?: Array<{ payload?: DailyEngagementPoint }>;
                    }
                  )?.activePayload?.[0]?.payload;
                  if (payloadItem) {
                    setHoveredPoint(payloadItem);
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="watchFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF7B00" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#FF7B00" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                />

                {(metricView === 'both' || metricView === 'views') && (
                  <YAxis
                    yAxisId="views"
                    stroke="#00F0FF"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={false}
                  />
                )}

                {(metricView === 'both' || metricView === 'watchTime') && (
                  <YAxis
                    yAxisId="watch"
                    orientation={metricView === 'both' ? 'right' : 'left'}
                    stroke="#FF7B00"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={false}
                  />
                )}

                <Tooltip
                  cursor={{
                    stroke: '#00F0FF',
                    strokeWidth: 1.5,
                    strokeDasharray: '4 4',
                  }}
                  content={<EngagementTooltip />}
                />

                {(metricView === 'both' || metricView === 'views') && (
                  <Area
                    yAxisId="views"
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="#00F0FF"
                    strokeWidth={2.2}
                    fill="url(#viewsFill)"
                    isAnimationActive
                    animationDuration={850}
                    animationEasing="ease-out"
                    activeDot={{
                      r: 6,
                      fill: '#00F0FF',
                      stroke: '#03050a',
                      strokeWidth: 2.5,
                    }}
                  />
                )}

                {(metricView === 'both' || metricView === 'watchTime') && (
                  <Area
                    yAxisId="watch"
                    type="monotone"
                    dataKey="watchTimeHours"
                    name="Watch Time (hrs)"
                    stroke="#FF7B00"
                    strokeWidth={2.2}
                    fill="url(#watchFill)"
                    isAnimationActive
                    animationDuration={950}
                    animationEasing="ease-out"
                    activeDot={{
                      r: 6,
                      fill: '#FF7B00',
                      stroke: '#03050a',
                      strokeWidth: 2.5,
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
