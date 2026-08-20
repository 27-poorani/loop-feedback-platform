"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronDown,
  Copy,
  FileSpreadsheet,
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
  Star,
  Ticket,
  Users,
  X,
} from "lucide-react";

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  status: string;
  sentiment: string | null;
  sentimentScore: number | null;
  createdAt: string;
};

type ThemeOption = { id: string; name: string };
type Toast = { type: "success" | "error"; message: string };
type SortKey = "newest" | "oldest";

const CHANNELS = [
  "Support ticket",
  "App store review",
  "NPS survey",
  "Sales call note",
  "Community post",
  "Social mentions",
];

const STATUSES = ["NEW", "REVIEWED", "ACTIONED"] as const;
const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

const CHANNEL_UI: Record<
  string,
  { stripe: string; iconBg: string; iconColor: string; Icon: typeof MessageCircle }
> = {
  "Social mentions": {
    stripe: "#635BFF",
    iconBg: "#F3F1FF",
    iconColor: "#635BFF",
    Icon: MessageCircle,
  },
  "Support ticket": {
    stripe: "#F5C518",
    iconBg: "#FFF8E1",
    iconColor: "#B45309",
    Icon: Ticket,
  },
  "App store review": {
    stripe: "#3B82F6",
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
    Icon: Smartphone,
  },
  "NPS survey": {
    stripe: "#F79009",
    iconBg: "#FFFAEB",
    iconColor: "#B54708",
    Icon: Star,
  },
  "Sales call note": {
    stripe: "#12B76A",
    iconBg: "#ECFDF3",
    iconColor: "#067647",
    Icon: Phone,
  },
  "Community post": {
    stripe: "#EE46BC",
    iconBg: "#FDF2FA",
    iconColor: "#C11574",
    Icon: Users,
  },
};

const DEFAULT_CHANNEL_UI = {
  stripe: "#635BFF",
  iconBg: "#F3F1FF",
  iconColor: "#635BFF",
  Icon: MessageCircle,
};

function statusLabel(status: string) {
  if (status === "NEW") return "New";
  if (status === "REVIEWED") return "Reviewed";
  if (status === "ACTIONED") return "Actioned";
  return status;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sentimentClass(sentiment: string | null) {
  if (sentiment === "NEGATIVE") return "bg-[#FEF3F2] text-[#B42318]";
  if (sentiment === "POSITIVE") return "bg-[#ECFDF3] text-[#067647]";
  if (sentiment === "NEUTRAL") return "bg-[#F2F4F7] text-[#344054]";
  return "bg-[#F2F4F7] text-[#98A2B3]";
}

function paginationItems(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 3) return [1, 2, 3, "…", totalPages];
  if (page >= totalPages - 2) {
    return [1, "…", totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "…", page - 1, page, page + 1, "…", totalPages];
}

const selectClass =
  "appearance-none rounded-lg border border-[#E3E8EE] bg-white py-2 pl-3 pr-8 text-[13px] text-[#425466] outline-none";

export default function FeedbackPage() {
  const { data: session } = useSession();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [filterTheme, setFilterTheme] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [themeOptions, setThemeOptions] = useState<ThemeOption[]>([]);

  const [form, setForm] = useState({
    content: "",
    channel: CHANNELS[0],
    customerLabel: "",
  });

  const [uploading, setUploading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [reclassifyingId, setReclassifyingId] = useState<string | null>(null);
  const [embedding, setEmbedding] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [classifyElapsed, setClassifyElapsed] = useState(0);

  const [toast, setToast] = useState<Toast | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canCreate = session?.user?.role !== "VIEWER";
  const isAdmin = session?.user?.role === "ADMIN";

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function buildParams(pageNum: number) {
    return new URLSearchParams({
      page: String(pageNum),
      sort,
      ...(search ? { search } : {}),
      ...(filterChannel ? { channel: filterChannel } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterSentiment ? { sentiment: filterSentiment } : {}),
      ...(filterTheme ? { themeId: filterTheme } : {}),
      ...(filterDateFrom ? { dateFrom: filterDateFrom } : {}),
      ...(filterDateTo ? { dateTo: filterDateTo } : {}),
    });
  }

  async function loadFeedback(pageNum = page) {
    setLoading(true);
    const params = buildParams(pageNum);
    const res = await fetch(`/api/feedback?${params}`);
    const data = await res.json();
    setItems(data.feedback ?? []);
    setTotalPages(data.totalPages ?? 1);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    const themeId = new URLSearchParams(window.location.search).get("themeId");
    if (themeId) setFilterTheme(themeId);
  }, []);

  useEffect(() => {
    fetch("/api/themes")
      .then((res) => res.json())
      .then((data) =>
        setThemeOptions(
          (data.themes ?? []).map((t: { id: string; name: string }) => ({
            id: t.id,
            name: t.name,
          }))
        )
      );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    loadFeedback(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    filterChannel,
    filterStatus,
    filterSentiment,
    filterTheme,
    filterDateFrom,
    filterDateTo,
    sort,
  ]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function goToPage(newPage: number) {
    setPage(newPage);
    loadFeedback(newPage);
  }

  function clearFilters() {
    setFilterChannel("");
    setFilterStatus("");
    setFilterSentiment("");
    setFilterTheme("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchInput("");
    setSearch("");
    setSort("newest");
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: newStatus } : item
          )
        );
        showToast("success", `Status updated to ${statusLabel(newStatus)}`);
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to update status");
      }
    } catch {
      showToast("error", "Failed to update status");
    }
  }

  async function handleReclassify(id: string) {
    setReclassifyingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}/classify`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.feedback) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  sentiment: data.feedback.sentiment,
                  sentimentScore: data.feedback.sentimentScore,
                }
              : item
          )
        );
        showToast("success", "Re-classified successfully");
      } else {
        showToast("error", data.error || "Re-classification failed");
      }
    } catch {
      showToast("error", "Re-classification failed");
    }
    setReclassifyingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        showToast("error", data.error || "Failed to add feedback");
        return;
      }

      setForm({ content: "", channel: CHANNELS[0], customerLabel: "" });
      setAddOpen(false);
      showToast("success", "Feedback added");
      loadFeedback(1);
    } catch {
      setSubmitting(false);
      showToast("error", "Failed to add feedback");
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/feedback/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploading(false);

      if (res.ok) {
        showToast(
          "success",
          `Imported ${data.imported} items${
            data.failed > 0 ? `, ${data.failed} failed` : ""
          }`
        );
        loadFeedback(1);
      } else {
        showToast("error", data.error || "CSV upload failed");
      }
    } catch {
      setUploading(false);
      showToast("error", "CSV upload failed");
    }

    e.target.value = "";
  }

  async function handleSimulate(channel: string) {
    setSimulating(true);
    try {
      const res = await fetch("/api/feedback/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      setSimulating(false);
      if (res.ok) {
        showToast("success", `Added ${data.imported} simulated items`);
        loadFeedback(1);
      } else {
        showToast("error", data.error || "Simulation failed");
      }
    } catch {
      setSimulating(false);
      showToast("error", "Simulation failed");
    }
  }

  async function handleClassifyAll() {
    setClassifying(true);
    setClassifyElapsed(0);

    const timer = setInterval(() => {
      setClassifyElapsed((prev) => prev + 1);
    }, 1000);

    try {
      const res = await fetch("/api/feedback/classify-all", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        clearInterval(timer);
        setClassifying(false);
        showToast("error", data.error || "Failed to start classification");
        return;
      }

      showToast(
        "success",
        `Started classifying ${data.total} items in the background`
      );

      const poll = setInterval(async () => {
        const statusRes = await fetch("/api/feedback/classify-status");
        const status = await statusRes.json();

        if (status.unclassified === 0) {
          clearInterval(poll);
          clearInterval(timer);
          setClassifying(false);
          showToast("success", "Classification complete");
          loadFeedback(page);
        }
      }, 3000);
    } catch {
      clearInterval(timer);
      setClassifying(false);
      showToast("error", "Failed to start classification");
    }
  }

  async function handleEmbedAll() {
    setEmbedding(true);
    try {
      const res = await fetch("/api/feedback/embed-all", { method: "POST" });
      const data = await res.json();
      setEmbedding(false);
      if (res.ok) {
        showToast(
          "success",
          `Embedded ${data.succeeded}/${data.total} items for search`
        );
      } else {
        showToast("error", data.error || "Embedding failed");
      }
    } catch {
      setEmbedding(false);
      showToast("error", "Embedding failed");
    }
  }

  async function handleDedupe() {
    if (
      !confirm(
        "Remove all duplicate feedback items (keeping the oldest copy of each)? This can't be undone."
      )
    )
      return;

    setDeduping(true);
    try {
      const res = await fetch("/api/feedback/dedupe", { method: "POST" });
      const data = await res.json();
      setDeduping(false);
      if (res.ok) {
        showToast("success", `Removed ${data.removed} duplicates`);
        loadFeedback(1);
      } else {
        showToast("error", data.error || "Failed to remove duplicates");
      }
    } catch {
      setDeduping(false);
      showToast("error", "Failed to remove duplicates");
    }
  }

  async function copyContent(item: FeedbackItem) {
    try {
      await navigator.clipboard.writeText(item.content);
      setMenuFor(null);
      showToast("success", "Copied feedback text");
    } catch {
      showToast("error", "Couldn't copy");
    }
  }

  const hasActiveFilters = Boolean(
    filterChannel ||
      filterStatus ||
      filterSentiment ||
      filterTheme ||
      filterDateFrom ||
      filterDateTo ||
      search
  );

  const pages = useMemo(
    () => paginationItems(page, totalPages),
    [page, totalPages]
  );

  return (
    <div className="loop-page px-5 pb-12 pt-7 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        {toast && (
          <div
            className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${
              toast.type === "success" ? "bg-[#12B76A]" : "bg-[#F04438]"
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#0A2540]">
              Feedback
            </h1>
            <p className="mt-1.5 text-[14px] text-[#697386]">
              Add, manage and analyse customer feedback from all channels.
            </p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#635BFF] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#524AE0]"
            >
              <Plus size={16} />
              Add Feedback
            </button>
          )}
        </div>

        {canCreate && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F1FF] text-[#635BFF]">
                <Pencil size={16} />
              </div>
              <p className="text-[14.5px] font-semibold text-[#0A2540]">Add Feedback</p>
              <p className="mt-1 text-[12.5px] leading-5 text-[#697386]">
                Capture a note, review, or ticket in a few seconds.
              </p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#635BFF]"
              >
                Add Feedback <ArrowRight size={14} />
              </button>
            </div>

            <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#ECFDF3] text-[#12B76A]">
                <FileSpreadsheet size={16} />
              </div>
              <p className="text-[14.5px] font-semibold text-[#0A2540]">Import from CSV</p>
              <p className="mt-1 text-[12.5px] leading-5 text-[#697386]">
                Bulk import with content, channel, and optional customer label.
              </p>
              <input
                ref={csvRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => csvRef.current?.click()}
                className="mt-3 rounded-md border border-[#A7F3D0] bg-[#ECFDF3] px-3 py-1.5 text-[12.5px] font-medium text-[#067647] disabled:opacity-50"
              >
                {uploading ? "Importing..." : "Import CSV"}
              </button>
            </div>

            <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                <BarChart3 size={16} />
              </div>
              <p className="text-[14.5px] font-semibold text-[#0A2540]">Simulate Channel</p>
              <p className="mt-1 text-[12.5px] leading-5 text-[#697386]">
                Generate sample items from App Store, social, or support.
              </p>
              <div className="mt-3 flex gap-2">
                <SimIcon
                  title="App Store"
                  disabled={simulating}
                  onClick={() => handleSimulate("App store review")}
                >
                  <Smartphone size={14} />
                </SimIcon>
                <SimIcon
                  title="Social"
                  disabled={simulating}
                  onClick={() => handleSimulate("Social mentions")}
                >
                  <MessageCircle size={14} />
                </SimIcon>
                <SimIcon
                  title="Support"
                  disabled={simulating}
                  onClick={() => handleSimulate("Support ticket")}
                >
                  <Ticket size={14} />
                </SimIcon>
              </div>
            </div>

            <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#FDF2FA] text-[#EE46BC]">
                <Brain size={16} />
              </div>
              <p className="text-[14.5px] font-semibold text-[#0A2540]">AI Classification</p>
              <p className="mt-1 text-[12.5px] leading-5 text-[#697386]">
                Classify, embed for search, or clean duplicate items.
              </p>
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                className="mt-3 rounded-md border border-[#F9DBEA] bg-[#FDF2FA] px-3 py-1.5 text-[12.5px] font-medium text-[#C11574]"
              >
                Open AI Tools →
              </button>
            </div>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#E3E8EE] bg-white p-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#E3E8EE] px-3 py-2">
            <Search size={15} className="shrink-0 text-[#A3ACB9]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search feedback content..."
              className="w-full bg-transparent text-[13.5px] text-[#0A2540] outline-none placeholder:text-[#A3ACB9]"
            />
          </div>

          <label className="flex items-center gap-1.5 text-[12px] text-[#697386]">
            From
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="rounded-lg border border-[#E3E8EE] px-2 py-2 text-[13px] text-[#425466]"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-[#697386]">
            To
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="rounded-lg border border-[#E3E8EE] px-2 py-2 text-[13px] text-[#425466]"
            />
          </label>

          <FilterSelect
            value={filterChannel}
            onChange={setFilterChannel}
            options={[
              { value: "", label: "All channels" },
              ...CHANNELS.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "", label: "All statuses" },
              ...STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
            ]}
          />
          <FilterSelect
            value={filterSentiment}
            onChange={setFilterSentiment}
            options={[
              { value: "", label: "All sentiments" },
              ...SENTIMENTS.map((s) => ({ value: s, label: s })),
            ]}
          />
          <FilterSelect
            value={filterTheme}
            onChange={setFilterTheme}
            options={[
              { value: "", label: "All themes" },
              ...themeOptions.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8EE] px-3 py-2 text-[13px] text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Reset filters
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#0A2540]">
            Feedback ({total})
          </h2>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={selectClass}
            >
              <option value="newest">Sort by: Newest first</option>
              <option value="oldest">Sort by: Oldest first</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A94A6]"
            />
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-[13px] text-[#697386]">Loading...</p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[#697386]">
            No feedback found.
          </p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const ui = CHANNEL_UI[item.channel] ?? DEFAULT_CHANNEL_UI;
              const Icon = ui.Icon;
              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-xl border border-[#E3E8EE] bg-white pl-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div
                    className="absolute bottom-0 left-0 top-0 w-[4px]"
                    style={{ background: ui.stripe }}
                  />
                  <div className="flex flex-wrap items-start gap-4 px-4 py-3.5 pl-5">
                    <div className="flex w-[150px] shrink-0 items-start gap-2.5">
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: ui.iconBg, color: ui.iconColor }}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#697386]">
                          {item.channel}
                        </p>
                        <p className="truncate text-[12px] text-[#8A94A6]">
                          {item.customerLabel ? `— ${item.customerLabel}` : "— Workspace"}
                        </p>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <select
                        value={item.status}
                        disabled={!canCreate}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className="appearance-none rounded-md border border-[#E3E8EE] bg-white py-1 pl-2.5 pr-7 text-[12px] text-[#425466] outline-none disabled:opacity-60"
                      >
                        <option value="NEW">New</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="ACTIONED">Actioned</option>
                      </select>
                      <ChevronDown
                        size={12}
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#8A94A6]"
                      />
                    </div>

                    <p className="min-w-[200px] flex-1 text-[13.5px] leading-6 text-[#0A2540]">
                      {item.content}
                    </p>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${sentimentClass(
                          item.sentiment
                        )}`}
                      >
                        {item.sentiment ?? "UNCLASSIFIED"}
                      </span>
                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => handleReclassify(item.id)}
                          disabled={reclassifyingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E8EE] px-2.5 py-1 text-[12px] text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-50"
                        >
                          <RefreshCw
                            size={12}
                            className={reclassifyingId === item.id ? "animate-spin" : ""}
                          />
                          {reclassifyingId === item.id ? "Re-classifying..." : "Re-classify"}
                        </button>
                      )}
                    </div>

                    <div
                      className="relative ml-auto flex shrink-0 items-center gap-2 text-[12.5px] text-[#697386]"
                      ref={menuFor === item.id ? menuRef : undefined}
                    >
                      <span>{formatDate(item.createdAt)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setMenuFor((cur) => (cur === item.id ? null : item.id))
                        }
                        className="rounded-md p-1 hover:bg-[#F6F9FC]"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuFor === item.id && (
                        <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-[#E3E8EE] bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => copyContent(item)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#425466] hover:bg-[#F6F9FC]"
                          >
                            <Copy size={13} />
                            Copy text
                          </button>
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuFor(null);
                                handleReclassify(item.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#425466] hover:bg-[#F6F9FC]"
                            >
                              <Sparkles size={13} />
                              Re-classify
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-[#E3E8EE] px-3 py-1.5 text-[13px] text-[#425466] disabled:opacity-40"
            >
              Previous
            </button>
            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`e-${i}`} className="px-1 text-[13px] text-[#8A94A6]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  className={`min-w-[34px] rounded-md px-2.5 py-1.5 text-[13px] ${
                    p === page
                      ? "bg-[#635BFF] font-medium text-white"
                      : "border border-[#E3E8EE] text-[#425466] hover:bg-[#F6F9FC]"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-[#E3E8EE] px-3 py-1.5 text-[13px] text-[#425466] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/30 px-4"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-[#0A2540]">Add Feedback</h3>
                <p className="mt-1 text-[13px] text-[#697386]">
                  Add a single item from any channel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-md p-1 text-[#8A94A6] hover:bg-[#F6F9FC]"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-[13px] font-medium text-[#425466]">
                Feedback content
                <textarea
                  required
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-[#E3E8EE] px-3 py-2 text-[14px] text-[#0A2540] outline-none focus:border-[#635BFF]"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[13px] font-medium text-[#425466]">
                  Channel
                  <select
                    className="mt-1 w-full rounded-lg border border-[#E3E8EE] px-3 py-2 text-[14px] text-[#0A2540]"
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[13px] font-medium text-[#425466]">
                  Customer (optional)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-[#E3E8EE] px-3 py-2 text-[14px] text-[#0A2540] outline-none focus:border-[#635BFF]"
                    value={form.customerLabel}
                    onChange={(e) =>
                      setForm({ ...form, customerLabel: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-lg border border-[#E3E8EE] px-4 py-2 text-[13.5px] font-medium text-[#425466]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#635BFF] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#524AE0] disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/30 px-4"
          onClick={() => setAiOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-[#0A2540]">AI Tools</h3>
                <p className="mt-1 text-[13px] text-[#697386]">
                  Run classification, embeddings, or duplicate cleanup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                className="rounded-md p-1 text-[#8A94A6] hover:bg-[#F6F9FC]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleClassifyAll}
                disabled={classifying}
                className="w-full rounded-lg bg-[#635BFF] px-3 py-2.5 text-left text-[13.5px] font-medium text-white hover:bg-[#524AE0] disabled:opacity-50"
              >
                {classifying
                  ? `Classifying... (${classifyElapsed}s)`
                  : "Classify all unclassified feedback"}
              </button>
              {classifying && (
                <p className="text-[12px] text-[#697386]">
                  Runs one item at a time in the background. You can keep using the app.
                </p>
              )}
              <button
                type="button"
                onClick={handleEmbedAll}
                disabled={embedding}
                className="w-full rounded-lg border border-[#E3E8EE] px-3 py-2.5 text-left text-[13.5px] font-medium text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-50"
              >
                {embedding ? "Embedding..." : "Enable search on all feedback"}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleDedupe}
                  disabled={deduping}
                  className="w-full rounded-lg border border-[#FECDCA] px-3 py-2.5 text-left text-[13.5px] font-medium text-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-50"
                >
                  {deduping ? "Removing..." : "Remove duplicates"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={o.value || o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A94A6]"
      />
    </div>
  );
}

function SimIcon({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E3E8EE] text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
