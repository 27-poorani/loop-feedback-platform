"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

type Trend = {
  id: string;
  name: string;
  total: number;
  currentPeriod: number;
  previousPeriod: number;
  changePercent: number | null;
  isNewActivity: boolean;
  isSpiking: boolean;
  dominantSentiment: "NEGATIVE" | "POSITIVE" | "MIXED" | "NEUTRAL" | null;
  series: { date: string; count: number }[];
};

function badgeStyle(trend: Trend) {
  if (!trend.isSpiking) return null;

  switch (trend.dominantSentiment) {
    case "NEGATIVE":
      return {
        label: "🔥 Spiking — mostly negative",
        box: "border-red-300 bg-red-50",
        chip: "bg-red-600 text-white",
        line: "#dc2626",
      };
    case "POSITIVE":
      return {
        label: "📈 Trending up — mostly positive",
        box: "border-green-300 bg-green-50",
        chip: "bg-green-600 text-white",
        line: "#16a34a",
      };
    case "MIXED":
      return {
        label: "⚠️ Spiking — mixed sentiment",
        box: "border-amber-300 bg-amber-50",
        chip: "bg-amber-500 text-white",
        line: "#d97706",
      };
    default:
      return {
        label: "📊 Spiking — not yet classified",
        box: "border-gray-300 bg-gray-50",
        chip: "bg-gray-500 text-white",
        line: "#6b7280",
      };
  }
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/themes/trends")
      .then((res) => res.json())
      .then((data) => {
        setTrends(data.trends ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Trends</h1>
      <p className="text-gray-500 text-sm mb-6">
        Theme volume over the last 14 days, compared week-over-week. Color
        shows whether a spike is driven by negative or positive feedback.
      </p>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : trends.length === 0 ? (
        <p className="text-gray-500">
          No theme data yet — classify some feedback first.
        </p>
      ) : (
        <div className="space-y-3">
          {trends.map((trend) => {
            const style = badgeStyle(trend);
            return (
              <div
                key={trend.id}
                className={`border rounded-lg p-4 flex items-center gap-4 ${
                  style ? style.box : "bg-white"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {trend.name}
                    </span>
                    {style && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${style.chip}`}
                      >
                        {style.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {trend.total} total · {trend.currentPeriod} this week
                    {trend.isNewActivity ? (
                      <span className="text-gray-500"> (new this period)</span>
                    ) : (
                      trend.previousPeriod > 0 && (
                        <>
                          {" "}
                          (was {trend.previousPeriod} last week)
                          {trend.changePercent !== null && (
                            <span
                              className={
                                trend.changePercent > 0
                                  ? "text-red-600 font-medium"
                                  : trend.changePercent < 0
                                  ? "text-green-600 font-medium"
                                  : ""
                              }
                            >
                              {" "}
                              {trend.changePercent > 0 ? "+" : ""}
                              {trend.changePercent}%
                            </span>
                          )}
                        </>
                      )
                    )}
                  </p>
                </div>

                <div className="w-32 h-12">
                  {trend.series.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend.series}>
                        <YAxis hide domain={["auto", "auto"]} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke={style?.line ?? "#000000"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Not enough data
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}