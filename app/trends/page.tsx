"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  CreditCard,
  Info,
  LayoutGrid,
  Lightbulb,
  RefreshCw,
  Rocket,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

type Trend = {
  id: string;
  name: string;
  description: string | null;
  total: number;
  currentPeriod: number;
  previousPeriod: number;
  changePercent: number | null;
  isNewActivity: boolean;
  isSpiking: boolean;
  dominantSentiment: "NEGATIVE" | "POSITIVE" | "MIXED" | "NEUTRAL" | null;
  series: { date: string; count: number }[];
};

const THEME_STYLES: { match: RegExp; color: string; bg: string; Icon: typeof LayoutGrid }[] = [
  { match: /perform|speed|slow|latency/i, color: "#635BFF", bg: "#F3F1FF", Icon: TrendingUp },
  { match: /ui|interface|visual|design/i, color: "#2563EB", bg: "#EFF6FF", Icon: LayoutGrid },
  { match: /onboard|signup|getting started/i, color: "#12B76A", bg: "#ECFDF3", Icon: Rocket },
  { match: /bill|price|payment|plan/i, color: "#F79009", bg: "#FFFAEB", Icon: Wallet },
  { match: /support|ticket/i, color: "#EE46BC", bg: "#FDF2FA", Icon: Tag },
  { match: /analytic|report|chart/i, color: "#3538CD", bg: "#EEF4FF", Icon: BarChart3 },
  { match: /credit|invoice/i, color: "#F04438", bg: "#FEF3F2", Icon: CreditCard },
];

const FALLBACK_COLORS = ["#635BFF", "#2563EB", "#12B76A", "#F79009", "#EE46BC"];

function themeStyle(name: string, index: number) {
  const found = THEME_STYLES.find((t) => t.match.test(name));
  if (found) return found;
  return {
    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    bg: "#F3F1FF",
    Icon: Tag,
  };
}

function formatRange(from: string, to: string) {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

function formatTick(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function changeTone(trend: Trend): "good" | "bad" | "neutral" {
  const pct = trend.changePercent;
  if (pct === null || pct === 0) return "neutral";
  const up = pct > 0;
  if (trend.dominantSentiment === "NEGATIVE") return up ? "bad" : "good";
  if (trend.dominantSentiment === "POSITIVE") return up ? "good" : "bad";
  return up ? "bad" : "good";
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(14);
  const [mode, setMode] = useState<"absolute" | "percent">("absolute");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const res = await fetch(`/api/themes/trends?days=${days}`);
    const data = await res.json();
    setTrends(data.trends ?? []);
    setPeriodStart(data.periodStart ?? "");
    setPeriodEnd(data.periodEnd ?? "");
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const periodLabel = useMemo(() => {
    if (!periodStart || !periodEnd) return "";
    return formatRange(periodStart, periodEnd);
  }, [periodStart, periodEnd]);

  return (
    <div className="loop-page px-5 pb-12 pt-7 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#0A2540]">
              Trends
            </h1>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-6 text-[#697386]">
              Theme volume over the last {days} days, compared week-over-week.
              Color shows whether a spike is driven by negative or positive
              feedback.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3.5 py-2 text-[13.5px] font-medium text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="appearance-none rounded-lg border border-[#E3E8EE] bg-white py-2 pl-3 pr-8 text-[13px] text-[#425466] outline-none"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A94A6]"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3 py-2 text-[13px] text-[#425466]">
            <Calendar size={14} className="text-[#8A94A6]" />
            {periodLabel || "—"}
          </div>

          <div className="inline-flex rounded-lg border border-[#E3E8EE] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setMode("absolute")}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
                mode === "absolute"
                  ? "bg-[#F3F1FF] text-[#635BFF]"
                  : "text-[#697386]"
              }`}
            >
              Absolute
            </button>
            <button
              type="button"
              onClick={() => setMode("percent")}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
                mode === "percent"
                  ? "bg-[#F3F1FF] text-[#635BFF]"
                  : "text-[#697386]"
              }`}
            >
              % Change
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white text-[#8A94A6] hover:text-[#635BFF]"
              title="How to read trends"
            >
              <Info size={15} />
            </button>
            {infoOpen && (
              <div className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-[#E3E8EE] bg-white p-3 text-[12.5px] leading-5 text-[#425466] shadow-lg">
                Compare this half of the selected window to the previous half.
                Chart color is the theme color; the % badge uses green/red based
                on whether volume and sentiment moved in a helpful direction.
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-[13px] text-[#697386]">Loading trends...</p>
        ) : trends.length === 0 ? (
          <div className="rounded-xl border border-[#E3E8EE] bg-white p-8 text-[13px] text-[#697386]">
            No theme data yet — classify some feedback first.
          </div>
        ) : (
          <div className="space-y-3">
            {trends.map((trend, index) => {
              const style = themeStyle(trend.name, index);
              const Icon = style.Icon;
              const tone = changeTone(trend);
              const pct = trend.changePercent;
              const headline =
                mode === "percent"
                  ? pct === null
                    ? "—"
                    : `${pct > 0 ? "+" : ""}${pct}%`
                  : String(trend.total);
              const toneClass =
                tone === "good"
                  ? "text-[#067647] bg-[#ECFDF3]"
                  : tone === "bad"
                    ? "text-[#B42318] bg-[#FEF3F2]"
                    : "text-[#425466] bg-[#F2F4F7]";

              return (
                <div
                  key={trend.id}
                  className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(220px,1.1fr)_minmax(280px,1fr)_180px]">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: style.bg, color: style.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-[#0A2540]">
                          {trend.name}
                        </p>
                        <p className="mt-0.5 text-[12.5px] leading-5 text-[#697386]">
                          {trend.description ||
                            `Feedback grouped under ${trend.name}.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A94A6]">
                          {mode === "percent" ? "vs last week" : "Total"}
                        </p>
                        <p
                          className="text-[26px] font-bold leading-none"
                          style={{ color: style.color }}
                        >
                          {headline}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A94A6]">
                          This week
                        </p>
                        <p className="text-[16px] font-semibold text-[#0A2540]">
                          {trend.currentPeriod}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A94A6]">
                          Last week
                        </p>
                        <p className="text-[16px] font-semibold text-[#0A2540]">
                          {trend.previousPeriod}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A94A6]">
                          vs last week
                        </p>
                        <p
                          className={`text-[16px] font-semibold ${
                            tone === "good"
                              ? "text-[#067647]"
                              : tone === "bad"
                                ? "text-[#B42318]"
                                : "text-[#425466]"
                          }`}
                        >
                          {pct === null
                            ? "—"
                            : `${pct > 0 ? "+" : ""}${pct}%`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`flex min-w-[72px] flex-col items-center rounded-lg px-2.5 py-1.5 ${toneClass}`}
                      >
                        <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold">
                          {pct !== null && pct > 0 && <TrendingUp size={13} />}
                          {pct !== null && pct < 0 && <TrendingDown size={13} />}
                          {pct === null ? "—" : `${Math.abs(pct)}%`}
                        </span>
                        <span className="text-[10px] opacity-80">vs last week</span>
                      </div>
                      <div className="h-[88px] min-w-[140px] flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trend.series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient
                                id={`fill-${trend.id}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={style.color}
                                  stopOpacity={0.28}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={style.color}
                                  stopOpacity={0.02}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              vertical={false}
                              stroke="#EEF2F6"
                              strokeDasharray="3 3"
                            />
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatTick}
                              tick={{ fontSize: 10, fill: "#8A94A6" }}
                              axisLine={false}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              width={28}
                              tick={{ fontSize: 10, fill: "#8A94A6" }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              labelFormatter={(v) => formatTick(String(v))}
                              contentStyle={{
                                fontSize: 12,
                                borderRadius: 8,
                                border: "1px solid #E3E8EE",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke={style.color}
                              strokeWidth={2}
                              fill={`url(#fill-${trend.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#DDD9FF] bg-[#F5F3FF] px-5 py-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#635BFF] shadow-sm">
            <Lightbulb size={16} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#0A2540]">
              How to read trends
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[#4B5565]">
              We compare the selected period to the previous period of equal
              length.{" "}
              <span className="font-semibold text-[#067647]">Green</span>{" "}
              indicates a positive change (increase in positive feedback or
              decrease in negative feedback).{" "}
              <span className="font-semibold text-[#B42318]">Red</span>{" "}
              indicates a negative change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
