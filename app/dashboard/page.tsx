"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

/* ------------------------------------------------------------------
 * DESIGN TOKENS
 * Enterprise dashboard palette: deep navy chrome, slate surfaces,
 * a single restrained blue accent for data/interactive elements,
 * and status colors reserved strictly for sentiment/delta meaning.
 * ------------------------------------------------------------------
 *  --navy-950:  #0B1220   sidebar / topbar background
 *  --navy-900:  #111A2B   sidebar hover / active surface
 *  --slate-50:  #F7F8FA   page background
 *  --slate-100: #EEF1F5   card border / dividers
 *  --slate-200: #E2E7EE   subtle borders
 *  --slate-400: #8A94A6   muted / secondary text
 *  --slate-600: #4B5565   body text
 *  --slate-900: #16202E   headings, primary text
 *  --accent-500:#2E5EFF   interactive accent (links, active nav, focus)
 *  --accent-050:#EEF2FF   accent tint background
 *  --positive:  #16A34A   positive delta / sentiment
 *  --negative:  #DC2626   negative delta / sentiment
 *  --neutral:   #94A3B8   neutral sentiment
 * ------------------------------------------------------------------ */

type Stats = {
  total: number;
  newThisWeek: number;
  percentNegative: number;
  rangeTotal: number;
  volumeData: { date: string; count: number }[];
  channelData: { channel: string; count: number }[];
  sentimentData: { name: string; value: number }[];
};

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "#16A34A",
  NEUTRAL: "#94A3B8",
  NEGATIVE: "#DC2626",
  Unclassified: "#CBD5E1",
};

const ACCENT = "#2E5EFF";

function defaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

/* ------------------------------------------------------------------
 * Primitive: metric card with delta indicator + micro-interaction.
 * Elevation is expressed as a 1px slate border at rest, promoted to
 * a soft shadow + 1px translateY on hover — depth without visual
 * noise, no color shift.
 * ------------------------------------------------------------------ */
function MetricCard({
  label,
  value,
  suffix,
  delta,
  deltaDirection,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
}) {
  const deltaColor =
    deltaDirection === "up"
      ? "#16A34A"
      : deltaDirection === "down"
      ? "#DC2626"
      : "#8A94A6";

  return (
    <div
      className="group relative rounded-xl border border-[#E2E7EE] bg-white p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(16,32,58,0.18)]"
    >
      <p className="text-[13px] font-medium tracking-wide text-[#8A94A6] uppercase">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold leading-none text-[#16202E] tabular-nums">
          {value}
          {suffix}
        </span>
        {delta && (
          <span
            className="text-[13px] font-medium tabular-nums"
            style={{ color: deltaColor }}
          >
            {deltaDirection === "up" ? "▲" : deltaDirection === "down" ? "▼" : "–"}{" "}
            {delta}
          </span>
        )}
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: ACCENT }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
 * Primitive: chart panel shell — consistent header, padding, and
 * border treatment so every visualization sits in the same frame.
 * ------------------------------------------------------------------ */
function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E2E7EE] bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-[#16202E]">{title}</h2>
        {subtitle && (
          <span className="text-[12px] text-[#8A94A6]">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [dateFrom, setDateFrom] = useState(defaultDateFrom());
  const [dateTo, setDateTo] = useState(today());

  async function loadStats() {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    const res = await fetch(`/api/stats?${params}`);
    const data = await res.json();
    setStats(data);
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  function resetRange() {
    setDateFrom(defaultDateFrom());
    setDateTo(today());
  }

  const isEmpty = !!stats && stats.rangeTotal === 0;

  const navItems = [
    { label: "Dashboard", active: true },
    { label: "Feedback", active: false },
    { label: "Channels", active: false },
    { label: "Reports", active: false },
    { label: "Settings", active: false },
  ];

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-[#16202E] antialiased">
    
      {/* ---------------------------------------------------------
          MAIN COLUMN
      --------------------------------------------------------- */}
      <div className="flex min-h-screen flex-1 flex-col">
       

        <main className="flex-1 px-8 py-7">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold text-[#16202E]">
                Dashboard
              </h1>
              <p className="mt-0.5 text-[13.5px] text-[#8A94A6]">
                Feedback volume, sentiment, and channel activity at a glance.
              </p>
            </div>

            {/* -----------------------------------------------------
                COLLAPSIBLE ADVANCED FILTERS
            ----------------------------------------------------- */}
            <div className="mb-6 rounded-xl border border-[#E2E7EE] bg-white">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left"
              >
                <span className="text-[13.5px] font-semibold text-[#16202E]">
                  Filters
                </span>
                <span
                  className={`text-[#8A94A6] transition-transform duration-200 ${
                    filtersOpen ? "rotate-180" : ""
                  }`}
                >
                  ⌄
                </span>
              </button>

              {filtersOpen && (
                <div className="flex flex-wrap items-end gap-4 border-t border-[#E2E7EE] px-5 py-4">
                  <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-[#4B5565]">
                    From
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="rounded-lg border border-[#E2E7EE] px-3 py-1.5 text-[13px] text-[#16202E] focus:border-[#2E5EFF] focus:outline-none focus:ring-2 focus:ring-[#2E5EFF]/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-[#4B5565]">
                    To
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="rounded-lg border border-[#E2E7EE] px-3 py-1.5 text-[13px] text-[#16202E] focus:border-[#2E5EFF] focus:outline-none focus:ring-2 focus:ring-[#2E5EFF]/20"
                    />
                  </label>
                  <button
                    onClick={resetRange}
                    className="rounded-lg border border-[#E2E7EE] px-3 py-1.5 text-[12.5px] font-medium text-[#4B5565] transition-colors hover:border-[#2E5EFF] hover:text-[#2E5EFF]"
                  >
                    Reset to last 30 days
                  </button>
                  {loading && (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#8A94A6]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2E5EFF]" />
                      Updating
                    </span>
                  )}
                </div>
              )}
            </div>

            {!stats ? (
              <div className="rounded-xl border border-[#E2E7EE] bg-white p-12 text-center text-[13.5px] text-[#8A94A6]">
                {loading ? "Loading dashboard…" : "Couldn't load dashboard data. Try refreshing."}
              </div>
            ) : isEmpty ? (
              <div className="rounded-xl border border-dashed border-[#E2E7EE] bg-white p-14 text-center">
                <p className="text-[14px] font-semibold text-[#16202E]">
                  No feedback in this date range
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-[#8A94A6]">
                  Widen the date range above, or add feedback from the
                  Feedback page to see activity here.
                </p>
              </div>
            ) : (
              <>
                {/* METRIC CARDS */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <MetricCard label="Total feedback (all time)" value={stats.total} />
                  <MetricCard label="New this week" value={stats.newThisWeek} />
                  <MetricCard
                    label="% negative (selected range)"
                    value={stats.percentNegative}
                    suffix="%"
                    deltaDirection={stats.percentNegative > 20 ? "down" : "up"}
                  />
                </div>

                {/* CHARTS */}
                <div className="mb-6 grid grid-cols-2 gap-5">
                  <ChartPanel title="Volume over time" subtitle={`${dateFrom} – ${dateTo}`}>
                    {stats.volumeData.length === 0 ? (
                      <p className="py-10 text-center text-[13px] text-[#8A94A6]">
                        No data yet.
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={stats.volumeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#8A94A6" }}
                            tickFormatter={(d) => d.slice(5)}
                            axisLine={{ stroke: "#E2E7EE" }}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#8A94A6" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: "1px solid #E2E7EE",
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke={ACCENT}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </ChartPanel>

                  <ChartPanel title="Sentiment breakdown">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={stats.sentimentData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={72}
                          paddingAngle={2}
                          label={{ fontSize: 11, fill: "#4B5565" }}
                        >
                          {stats.sentimentData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={SENTIMENT_COLORS[entry.name] || "#CBD5E1"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: "1px solid #E2E7EE",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartPanel>
                </div>

                <ChartPanel title="Feedback by channel">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.channelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                      <XAxis
                        dataKey="channel"
                        tick={{ fontSize: 10, fill: "#8A94A6" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                        axisLine={{ stroke: "#E2E7EE" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#8A94A6" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #E2E7EE",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}