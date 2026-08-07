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

type Stats = {
  total: number;
  newThisWeek: number;
  percentNegative: number;
  volumeData: { date: string; count: number }[];
  channelData: { channel: string; count: number }[];
  sentimentData: { name: string; value: number }[];
};

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "#22c55e",
  NEUTRAL: "#9ca3af",
  NEGATIVE: "#ef4444",
  Unclassified: "#d1d5db",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading dashboard...</div>;
  }

  if (!stats) {
    return (
      <div className="p-8 text-gray-500">
        Couldn&apos;t load dashboard data. Try refreshing.
      </div>
    );
  }

  const isEmpty = stats.total === 0;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">
        Welcome back, {session?.user?.name || session?.user?.email}.
      </p>

      {isEmpty ? (
        <div className="border rounded-lg p-12 text-center text-gray-500">
          <p className="font-medium text-gray-700 mb-1">No feedback yet</p>
          <p className="text-sm">
            Add some feedback from the Feedback page to see your dashboard
            come to life.
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-500">Total feedback</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total}
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-500">New this week</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.newThisWeek}
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-500">% negative</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.percentNegative}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Volume over time */}
            <div className="border rounded-lg p-4 bg-white">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Volume over time (last 30 days)
              </h2>
              {stats.volumeData.length === 0 ? (
                <p className="text-sm text-gray-400">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#000000"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sentiment breakdown */}
            <div className="border rounded-lg p-4 bg-white">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Sentiment breakdown
              </h2>
              {stats.sentimentData.every((s) => s.name === "Unclassified") && (
                <p className="text-xs text-amber-600 mb-2">
                  Feedback isn&apos;t classified yet — this fills in once AI
                  auto-classification is built (Week 3).
                </p>
              )}
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.sentimentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {stats.sentimentData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={SENTIMENT_COLORS[entry.name] || "#d1d5db"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top channels (stand-in for themes until AI classification exists) */}
          <div className="border rounded-lg p-4 bg-white">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              Feedback by channel
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Top themes will replace this once AI theme clustering is built
              (Week 3).
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="channel"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}