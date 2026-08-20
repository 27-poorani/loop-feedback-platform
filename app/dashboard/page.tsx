"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Download,
  MessageCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type ChannelSentiment = {
  channel: string;
  count: number;
  negativePct: number;
  positivePct: number;
};

type RecentItem = {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  status: string;
  createdAt: string;
};

type Stats = {
  total: number;
  newThisWeek: number;
  weekOverWeek: number;
  percentNegative: number;
  prevPercentNegative: number | null;
  rangeTotal: number;
  prevRangeTotal: number;
  volumeChange: number;
  volumeData: { date: string; count: number }[];
  channelData: { channel: string; count: number }[];
  sentimentData: { name: string; value: number }[];
  highestNegative: ChannelSentiment | null;
  highestPositive: ChannelSentiment | null;
  recent: RecentItem[];
};

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "#12B76A",
  NEUTRAL: "#98A2B3",
  NEGATIVE: "#F04438",
  Unclassified: "#D0D5DD",
};

const ACCENT = "#635BFF";

function defaultDateFrom(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatTick(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function statusStyle(status: string) {
  if (status === "REVIEWED") return "bg-[#EFF6FF] text-[#2563EB]";
  if (status === "ACTIONED") return "bg-[#ECFDF3] text-[#067647]";
  return "bg-[#FFFAEB] text-[#B54708]";
}

function statusLabel(status: string) {
  if (status === "NEW") return "Open";
  if (status === "REVIEWED") return "Reviewed";
  if (status === "ACTIONED") return "Actioned";
  return status;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("30");
  const [dateFrom, setDateFrom] = useState(defaultDateFrom(30));
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

  function applyPreset(days: string) {
    setPreset(days);
    if (days === "custom") return;
    setDateFrom(defaultDateFrom(Number(days)));
    setDateTo(today());
  }

  function exportCsv() {
    if (!stats) return;
    const rows = [
      ["metric", "value"],
      ["total", String(stats.total)],
      ["newThisWeek", String(stats.newThisWeek)],
      ["percentNegative", String(stats.percentNegative)],
      ["rangeTotal", String(stats.rangeTotal)],
      [],
      ["date", "volume"],
      ...stats.volumeData.map((d) => [d.date, String(d.count)]),
      [],
      ["channel", "count"],
      ...stats.channelData.map((d) => [d.channel, String(d.count)]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loop-dashboard-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sentimentTotal = useMemo(
    () => (stats?.sentimentData ?? []).reduce((sum, s) => sum + s.value, 0),
    [stats]
  );

  const negDelta =
    stats?.prevPercentNegative === null || stats?.prevPercentNegative === undefined
      ? null
      : Math.round((stats.percentNegative - stats.prevPercentNegative) * 10) / 10;

  const isEmpty = !!stats && stats.rangeTotal === 0;

  return (
    <div className="loop-page px-5 pb-12 pt-7 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#0A2540]">
            Dashboard
          </h1>
          <p className="mt-1.5 text-[14px] text-[#697386]">
            Monitor feedback volume, sentiment and channel performance from one
            place.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#E3E8EE] bg-white px-4 py-3">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#8A94A6]">
              Filters
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-[12px] text-[#697386]">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setPreset("custom");
                    setDateFrom(e.target.value);
                  }}
                  className="mt-1 block rounded-lg border border-[#E3E8EE] px-3 py-2 text-[13px] text-[#0A2540]"
                />
              </label>
              <label className="text-[12px] text-[#697386]">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setPreset("custom");
                    setDateTo(e.target.value);
                  }}
                  className="mt-1 block rounded-lg border border-[#E3E8EE] px-3 py-2 text-[13px] text-[#0A2540]"
                />
              </label>
              <select
                value={preset}
                onChange={(e) => applyPreset(e.target.value)}
                className="rounded-lg border border-[#E3E8EE] px-3 py-2 text-[13px] text-[#425466]"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8EE] px-3 py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!stats}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#635BFF] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#524AE0] disabled:opacity-50"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {!stats ? (
          <div className="rounded-xl border border-[#E3E8EE] bg-white p-12 text-center text-[13.5px] text-[#697386]">
            {loading ? "Loading dashboard…" : "Couldn't load dashboard data. Try refreshing."}
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-dashed border-[#E3E8EE] bg-white p-14 text-center">
            <p className="text-[14px] font-semibold text-[#0A2540]">
              No feedback in this date range
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-[#697386]">
              Widen the date range above, or add feedback from the Feedback page
              to see activity here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#635BFF]">
                  <MessageCircle size={18} />
                </div>
                <p className="text-[13px] text-[#697386]">Total feedback</p>
                <p className="mt-1 text-[28px] font-bold leading-none text-[#0A2540]">
                  {stats.total}
                </p>
                <p className="mt-2 text-[12.5px] text-[#8A94A6]">All time</p>
              </div>

              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#12B76A]">
                  <TrendingUp size={18} />
                </div>
                <p className="text-[13px] text-[#697386]">New this week</p>
                <p className="mt-1 text-[28px] font-bold leading-none text-[#0A2540]">
                  {stats.newThisWeek}
                </p>
                <p
                  className={`mt-2 inline-flex items-center gap-1 text-[12.5px] ${
                    stats.weekOverWeek >= 0 ? "text-[#067647]" : "text-[#B42318]"
                  }`}
                >
                  {stats.weekOverWeek >= 0 ? "↑" : "↓"} {Math.abs(stats.weekOverWeek)}% vs
                  previous week
                </p>
              </div>

              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF3F2] text-[#F04438]">
                  <TrendingDown size={18} />
                </div>
                <p className="text-[13px] text-[#697386]">Negative feedback</p>
                <p className="mt-1 text-[28px] font-bold leading-none text-[#0A2540]">
                  {stats.percentNegative}%
                </p>
                {negDelta !== null ? (
                  <p
                    className={`mt-2 text-[12.5px] ${
                      negDelta <= 0 ? "text-[#067647]" : "text-[#B42318]"
                    }`}
                  >
                    {negDelta <= 0 ? "↓" : "↑"} {Math.abs(negDelta)}% vs previous
                    period
                  </p>
                ) : (
                  <p className="mt-2 text-[12.5px] text-[#8A94A6]">
                    Selected range
                  </p>
                )}
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <h2 className="mb-3 text-[14px] font-semibold text-[#0A2540]">
                  Feedback volume
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={stats.volumeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#EEF2F6" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatTick}
                      tick={{ fontSize: 11, fill: "#8A94A6" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#8A94A6" }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      labelFormatter={(v) => formatTick(String(v))}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #E3E8EE",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={ACCENT}
                      strokeWidth={2}
                      fill="url(#volFill)"
                      dot={{ r: 3, fill: ACCENT, stroke: "#fff", strokeWidth: 1 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <h2 className="mb-1 text-[14px] font-semibold text-[#0A2540]">
                  Sentiment distribution
                </h2>
                <p className="mb-2 text-[12px] text-[#8A94A6]">
                  {sentimentTotal} items in range
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={stats.sentimentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {stats.sentimentData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={SENTIMENT_COLORS[entry.name] || "#D0D5DD"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #E3E8EE",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-1 space-y-1.5">
                  {stats.sentimentData.map((s) => {
                    const pct =
                      sentimentTotal > 0
                        ? Math.round((s.value / sentimentTotal) * 100)
                        : 0;
                    return (
                      <div
                        key={s.name}
                        className="flex items-center justify-between text-[12.5px]"
                      >
                        <span className="flex items-center gap-2 text-[#425466]">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              background: SENTIMENT_COLORS[s.name] || "#D0D5DD",
                            }}
                          />
                          {s.name.charAt(0) + s.name.slice(1).toLowerCase()}
                        </span>
                        <span className="tabular-nums text-[#0A2540]">
                          {pct}% ({s.value})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <h2 className="mb-3 text-[14px] font-semibold text-[#0A2540]">
                  Feedback by channel
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={stats.channelData}
                    layout="vertical"
                    margin={{ top: 0, right: 12, left: 8, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="channel"
                      width={110}
                      tick={{ fontSize: 11, fill: "#425466" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #E3E8EE",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <h2 className="mb-3 text-[14px] font-semibold text-[#0A2540]">
                  Key insights
                </h2>
                <ul className="space-y-3 text-[13px] leading-5 text-[#425466]">
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-[#12B76A]">●</span>
                    Feedback volume{" "}
                    {stats.volumeChange >= 0 ? "increased" : "decreased"}{" "}
                    {Math.abs(stats.volumeChange)}% compared with the previous
                    period.
                  </li>
                  {stats.highestNegative && (
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-[#F04438]">●</span>
                      {stats.highestNegative.channel} has the highest negative
                      sentiment at {stats.highestNegative.negativePct}%.
                    </li>
                  )}
                  {stats.highestPositive && (
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-[#635BFF]">●</span>
                      {stats.highestPositive.channel} feedback has the highest
                      positive sentiment.
                    </li>
                  )}
                </ul>
                <Link
                  href="/trends"
                  className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[#635BFF]"
                >
                  View all insights <ArrowRight size={14} />
                </Link>
              </div>

              <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_10px_28px_rgba(10,37,64,0.06)]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-[#0A2540]">
                    Recent feedback
                  </h2>
                  <Link
                    href="/feedback"
                    className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#635BFF]"
                  >
                    View all <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[280px] text-left text-[12px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-[#8A94A6]">
                        <th className="pb-2 font-medium">Feedback</th>
                        <th className="pb-2 font-medium">Sentiment</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent ?? []).map((item) => (
                        <tr key={item.id} className="border-t border-[#EEF2F6]">
                          <td className="max-w-[140px] py-2 pr-2">
                            <p className="truncate text-[#0A2540]">{item.content}</p>
                            <p className="text-[11px] text-[#8A94A6]">{item.channel}</p>
                          </td>
                          <td className="py-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  background:
                                    SENTIMENT_COLORS[item.sentiment ?? "Unclassified"] ||
                                    "#D0D5DD",
                                }}
                              />
                              <span className="text-[#425466]">
                                {item.sentiment
                                  ? item.sentiment.charAt(0) +
                                    item.sentiment.slice(1).toLowerCase()
                                  : "—"}
                              </span>
                            </span>
                          </td>
                          <td className="py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle(
                                item.status
                              )}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        <p className="mt-8 text-center text-[12px] text-[#A3ACB9]">
          LOOP Feedback Intelligence © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
