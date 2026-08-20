"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Info,
  MessageCircle,
  MoreVertical,
  Search,
  Shield,
  Sparkles,
  ThumbsDown,
  Trophy,
  X,
} from "lucide-react";

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
  createdAt?: string;
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

type TimeFilter = "all" | "month" | "30";

const PAGE_SIZE = 5;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function periodKind(report: { title: string; periodStart: string; periodEnd: string }) {
  const start = new Date(report.periodStart).getTime();
  const end = new Date(report.periodEnd).getTime();
  const days = Math.round((end - start) / 86_400_000);
  if (report.title.toLowerCase().includes("30") || days >= 20) return "Monthly";
  return "Weekly";
}

function executiveSummary(narrative: string) {
  const cleaned = narrative.replace(/\r\n/g, "\n").trim();
  const byHeading = cleaned.split(/\n(?=\d+\.\s|#{1,3}\s|\*\*)/);
  if (byHeading[0]) {
    return byHeading[0]
      .replace(/^(1\.\s*)?(an?\s+)?executive summary[:\s-]*/i, "")
      .replace(/\*\*/g, "")
      .trim();
  }
  return cleaned.split(/\n\n/)[0] ?? cleaned;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"weekly" | "monthly" | null>(null);
  const [selected, setSelected] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [page, setPage] = useState(1);
  const [howOpen, setHowOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const canGenerate = session?.user?.role !== "VIEWER";

  async function loadReports() {
    setLoading(true);
    const res = await fetch("/api/reports");
    const data = await res.json();
    const list: ReportSummary[] = data.reports ?? [];
    setReports(list);
    setLoading(false);
    return list;
  }

  useEffect(() => {
    loadReports().then((list) => {
      if (list[0]) openReport(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return reports.filter((r) => {
      const textOk = !q || r.title.toLowerCase().includes(q);
      if (!textOk) return false;
      const created = new Date(r.createdAt).getTime();
      if (timeFilter === "30") return now - created <= 30 * 86_400_000;
      if (timeFilter === "month") {
        const d = new Date(r.createdAt);
        const cur = new Date();
        return d.getMonth() === cur.getMonth() && d.getFullYear() === cur.getFullYear();
      }
      return true;
    });
  }, [reports, query, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  async function handleGenerate(periodDays: number) {
    setGenerating(periodDays === 30 ? "monthly" : "weekly");
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays }),
      });
      const data = await res.json();
      setGenerating(null);
      if (res.ok) {
        await loadReports();
        openReport(data.report.id);
      } else {
        setError(data.error || "Failed to generate report");
      }
    } catch {
      setGenerating(null);
      setError("Failed to generate report");
    }
  }

  async function openReport(id: string) {
    setLoadingDetail(true);
    const res = await fetch(`/api/reports/${id}`);
    const data = await res.json();
    setSelected(data.report ?? null);
    setLoadingDetail(false);
  }

  async function copyNarrative() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.contentJson.narrative);
    setMenuOpen(false);
  }

  return (
    <div className="loop-page px-5 pb-12 pt-7 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#0A2540]">
              Voice of Customer Reports
            </h1>
            <p className="mt-1.5 text-[14px] text-[#697386]">
              AI-generated summaries you can forward to leadership.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHowOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3.5 py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F6F9FC]"
          >
            <Info size={15} />
            How it works
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-3.5 py-2.5 text-[13px] text-[#B42318]">
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {canGenerate && (
              <>
                <button
                  type="button"
                  onClick={() => handleGenerate(7)}
                  disabled={Boolean(generating)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#635BFF] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#524AE0] disabled:opacity-50"
                >
                  <Calendar size={15} />
                  {generating === "weekly" ? "Generating..." : "Generate weekly report"}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate(30)}
                  disabled={Boolean(generating)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-50"
                >
                  <Calendar size={15} />
                  {generating === "monthly" ? "Generating..." : "Generate monthly report"}
                </button>
              </>
            )}
          </div>
          <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[#697386]">
            <Sparkles size={14} className="text-[#635BFF]" />
            Reports are generated using real feedback and AI summaries.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="flex min-h-[520px] flex-col rounded-xl border border-[#E3E8EE] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="border-b border-[#EEF2F6] px-4 py-3">
              <h2 className="text-[14px] font-semibold text-[#0A2540]">Past reports</h2>
            </div>
            <div className="flex gap-2 border-b border-[#EEF2F6] p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E3E8EE] px-3 py-2">
                <Search size={14} className="shrink-0 text-[#A3ACB9]" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search past reports..."
                  className="w-full bg-transparent text-[13px] text-[#0A2540] outline-none placeholder:text-[#A3ACB9]"
                />
              </div>
              <div className="relative">
                <select
                  value={timeFilter}
                  onChange={(e) => {
                    setTimeFilter(e.target.value as TimeFilter);
                    setPage(1);
                  }}
                  className="appearance-none rounded-lg border border-[#E3E8EE] py-2 pl-8 pr-7 text-[13px] text-[#425466] outline-none"
                >
                  <option value="all">All time</option>
                  <option value="month">This month</option>
                  <option value="30">Last 30 days</option>
                </select>
                <Calendar
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A94A6]"
                />
              </div>
            </div>

            <div className="flex-1 space-y-2 p-3">
              {loading ? (
                <p className="py-8 text-center text-[13px] text-[#697386]">Loading...</p>
              ) : pageItems.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#697386]">
                  No reports yet — generate one above.
                </p>
              ) : (
                pageItems.map((r) => {
                  const kind = periodKind(r);
                  const active = selected?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openReport(r.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${
                        active
                          ? "border-[#C7C3FF] bg-[#F8F7FF]"
                          : "border-[#E3E8EE] hover:border-[#C7C3FF]"
                      }`}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#635BFF]">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-[#0A2540]">
                          {r.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8A94A6]">
                          {formatWhen(r.createdAt)}
                        </p>
                        <span
                          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            kind === "Weekly"
                              ? "bg-[#F3F1FF] text-[#635BFF]"
                              : "bg-[#EFF6FF] text-[#2563EB]"
                          }`}
                        >
                          {kind}
                        </span>
                      </div>
                      <ChevronRight size={16} className="mt-2 shrink-0 text-[#C4C9D4]" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#EEF2F6] px-3 py-2.5">
              <p className="text-[12px] text-[#8A94A6]">
                Showing {from} to {to} of {filtered.length} reports
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md p-1 text-[#697386] disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`min-w-[28px] rounded-md px-1.5 py-1 text-[12px] ${
                        n === safePage
                          ? "bg-[#635BFF] font-medium text-white"
                          : "text-[#425466] hover:bg-[#F6F9FC]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md p-1 text-[#697386] disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col rounded-xl border border-[#E3E8EE] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {!selected && !loadingDetail ? (
              <p className="p-6 text-[13px] text-[#697386]">
                Select or generate a report to view it.
              </p>
            ) : loadingDetail ? (
              <p className="p-6 text-[13px] text-[#697386]">Loading...</p>
            ) : selected ? (
              <div id="printable-report" className="flex flex-1 flex-col p-5">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#0A2540]">
                      {selected.title}
                    </h3>
                    <p className="mt-0.5 text-[13px] text-[#8A94A6]">
                      {formatDay(selected.periodStart)} – {formatDay(selected.periodEnd)}
                    </p>
                  </div>
                  <div className="relative flex items-center gap-2 print:hidden" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8EE] px-3 py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F6F9FC]"
                    >
                      Export as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E3E8EE] text-[#697386] hover:bg-[#F6F9FC]"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-11 z-20 w-44 rounded-lg border border-[#E3E8EE] bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={copyNarrative}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#425466] hover:bg-[#F6F9FC]"
                        >
                          <Copy size={13} />
                          Copy summary
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-[#E3E8EE] bg-white p-3">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#635BFF]">
                      <MessageCircle size={15} />
                    </div>
                    <p className="text-[11px] text-[#8A94A6]">Total feedback</p>
                    <p className="text-[22px] font-bold text-[#0A2540]">
                      {selected.contentJson.stats.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E3E8EE] bg-white p-3">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3F2] text-[#F04438]">
                      <ThumbsDown size={15} />
                    </div>
                    <p className="text-[11px] text-[#8A94A6]">% Negative</p>
                    <p className="text-[22px] font-bold text-[#0A2540]">
                      {selected.contentJson.stats.pctNegativeNow}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E3E8EE] bg-white p-3">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#12B76A]">
                      <Trophy size={15} />
                    </div>
                    <p className="text-[11px] text-[#8A94A6]">Top theme</p>
                    <p className="truncate text-[16px] font-bold text-[#0A2540]">
                      {selected.contentJson.stats.topThemes[0]?.name ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-[#0A2540]">
                    <Sparkles size={15} className="text-[#635BFF]" />
                    Executive summary
                  </div>
                  <p className="text-[13.5px] leading-6 text-[#3D4A5C]">
                    {executiveSummary(selected.contentJson.narrative)}
                  </p>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-[#0A2540]">
                    <FileText size={15} className="text-[#635BFF]" />
                    Top themes this period
                  </div>
                  {selected.contentJson.stats.topThemes.length === 0 ? (
                    <p className="text-[13px] text-[#697386]">No themes in this period.</p>
                  ) : (
                    <ul className="space-y-1.5 text-[13.5px] leading-6 text-[#3D4A5C]">
                      {selected.contentJson.stats.topThemes.slice(0, 5).map((t) => (
                        <li key={t.name} className="flex gap-2">
                          <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A94A6]" />
                          <span>
                            {t.name} was a major topic, with {t.count} feedback item
                            {t.count !== 1 ? "s" : ""}.
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-4 text-[12px] text-[#8A94A6]">
                  <span>
                    Generated on{" "}
                    {formatWhen(selected.createdAt || selected.periodEnd)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#067647]">
                    <CheckCircle2 size={13} />
                    Data is based on real feedback
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#DDD9FF] bg-[#F5F3FF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#635BFF] shadow-sm">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#0A2540]">
                Secure &amp; share with confidence
              </p>
              <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-[#4B5565]">
                Reports are generated from verified workspace feedback. Share them
                with leadership knowing every figure is grounded in real items.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLearnOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3.5 py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F8F7FF]"
          >
            Learn more
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {howOpen && (
        <Modal title="How reports work" onClose={() => setHowOpen(false)}>
          <ol className="space-y-3 text-[13.5px] leading-6 text-[#425466]">
            <li>
              <span className="font-semibold text-[#0A2540]">1. Choose a period.</span>{" "}
              Weekly covers the last 7 days; monthly covers the last 30.
            </li>
            <li>
              <span className="font-semibold text-[#0A2540]">2. LOOP computes the numbers.</span>{" "}
              Totals, negative %, and top themes come from your workspace feedback.
            </li>
            <li>
              <span className="font-semibold text-[#0A2540]">3. AI writes the summary.</span>{" "}
              The narrative uses only those computed stats — it does not invent figures.
            </li>
          </ol>
        </Modal>
      )}

      {learnOpen && (
        <Modal title="Sharing reports" onClose={() => setLearnOpen(false)}>
          <p className="text-[13.5px] leading-6 text-[#425466]">
            Export as PDF from the report view and forward it internally. Reports stay
            in your workspace and are scoped to your team — they are not published
            publicly.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/30 px-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-[16px] font-semibold text-[#0A2540]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-[#F6F9FC]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-[#635BFF] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#524AE0]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
