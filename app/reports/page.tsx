"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ReportSummary = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
};

type ReportDetail = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  contentJson: {
    narrative: string;
    stats: {
      total: number;
      pctNegativeNow: number;
      pctNegativePrev: number | null;
      topThemes: { name: string; count: number }[];
    };
  };
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const canGenerate = session?.user?.role !== "VIEWER";

  async function loadReports() {
    setLoading(true);
    const res = await fetch("/api/reports");
    const data = await res.json();
    setReports(data.reports ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleGenerate(periodDays: number) {
    setGenerating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays }),
      });
      const data = await res.json();
      setGenerating(false);
      if (res.ok) {
        await loadReports();
        openReport(data.report.id);
      }
    } catch {
      setGenerating(false);
    }
  }

  async function openReport(id: string) {
    setLoadingDetail(true);
    const res = await fetch(`/api/reports/${id}`);
    const data = await res.json();
    setSelected(data.report ?? null);
    setLoadingDetail(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Voice of Customer Reports
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        AI-generated summaries you can forward to leadership.
      </p>

      {canGenerate && (
        <div className="border rounded-lg p-4 mb-8 bg-gray-50 flex gap-2">
          <button
            onClick={() => handleGenerate(7)}
            disabled={generating}
            className="text-sm px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate weekly report"}
          </button>
          <button
            onClick={() => handleGenerate(30)}
            disabled={generating}
            className="text-sm px-4 py-2 border rounded text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate monthly report"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Past reports</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No reports yet — generate one above.
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openReport(r.id)}
                  className={`w-full text-left border rounded-lg p-3 hover:border-gray-400 ${
                    selected?.id === r.id
                      ? "border-black bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {r.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          {!selected ? (
            <p className="text-gray-500 text-sm">
              Select or generate a report to view it.
            </p>
          ) : loadingDetail ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <div id="printable-report">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900">
                  {selected.title}
                </h3>
                <button
                  onClick={() => window.print()}
                  className="text-xs px-2 py-1 border rounded text-gray-600 hover:bg-gray-50"
                >
                  🖨️ Export as PDF
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-4">
                {new Date(selected.periodStart).toLocaleDateString()} –{" "}
                {new Date(selected.periodEnd).toLocaleDateString()}
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-white border rounded p-2">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-gray-900">
                    {selected.contentJson.stats.total}
                  </p>
                </div>
                <div className="bg-white border rounded p-2">
                  <p className="text-xs text-gray-500">% Negative</p>
                  <p className="font-bold text-gray-900">
                    {selected.contentJson.stats.pctNegativeNow}%
                  </p>
                </div>
                <div className="bg-white border rounded p-2">
                  <p className="text-xs text-gray-500">Top theme</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {selected.contentJson.stats.topThemes[0]?.name ?? "—"}
                  </p>
                </div>
              </div>

              <div className="bg-white border rounded p-4 text-sm text-gray-800 whitespace-pre-wrap">
                {selected.contentJson.narrative}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}