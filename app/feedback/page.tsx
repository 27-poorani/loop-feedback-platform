"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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

const CHANNELS = [
  "Support ticket",
  "App store review",
  "NPS survey",
  "Sales call note",
  "Community post",
  "Social mentions",
];

const STATUSES = ["NEW", "REVIEWED", "ACTIONED"];
const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

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

  const [toast, setToast] = useState<Toast | null>(null);

  const canCreate = session?.user?.role !== "VIEWER";

  const [embedding, setEmbedding] = useState(false); 

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function buildParams(pageNum: number) {
    return new URLSearchParams({
      page: String(pageNum),
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
    loadFeedback(1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

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
  ]);

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
        showToast("success", `Status updated to ${newStatus}`);
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
  const [classifyElapsed, setClassifyElapsed] = useState(0);

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
const [deduping, setDeduping] = useState(false);

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

  const hasActiveFilters =
    filterChannel ||
    filterStatus ||
    filterSentiment ||
    filterTheme ||
    filterDateFrom ||
    filterDateTo ||
    search;

  function sentimentBadgeClass(sentiment: string | null) {
    if (sentiment === "NEGATIVE") return "bg-red-100 text-red-700";
    if (sentiment === "POSITIVE") return "bg-green-100 text-green-700";
    if (sentiment === "NEUTRAL") return "bg-gray-200 text-gray-700";
    return "bg-gray-100 text-gray-400";
  }

  

  return (
    <div className="p-8 max-w-3xl">
     {toast && (
  <div
    className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${
      toast.type === "success" ? "bg-green-600" : "bg-red-600"
    }`}
  >
    {toast.message}
  </div>
)}

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Feedback</h1>
      <p className="text-gray-500 text-sm mb-6">
        Add and review customer feedback for your workspace.
      </p>

      {canCreate && (
        <form
          onSubmit={handleSubmit}
          className="border rounded-lg p-4 mb-8 space-y-3 bg-gray-50"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Feedback content
            </label>
            <textarea
              required
              rows={3}
              className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Channel
              </label>
              <select
                className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Customer (optional)
              </label>
              <input
                type="text"
                className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                value={form.customerLabel}
                onChange={(e) =>
                  setForm({ ...form, customerLabel: e.target.value })
                }
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add feedback"}
          </button>
        </form>
      )}

      {canCreate && (
          <div className="border rounded-lg p-4 mb-8 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or bulk import from CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              disabled={uploading}
              className="text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Columns expected: content, channel, customer_label (optional)
            </p>
            {uploading && (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Uploading and importing rows, please wait...
              </p>
            )}
          </div>
        )}

      {canCreate && (
        <div className="border rounded-lg p-4 mb-8 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or simulate a channel
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleSimulate("App store review")}
              disabled={simulating}
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-100 text-gray-900"
            >
              📱 Simulate App Store
            </button>
            <button
              onClick={() => handleSimulate("Social mentions")}
              disabled={simulating}
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-100 text-gray-900"
            >
              💬 Simulate Social
            </button>
            <button
              onClick={() => handleSimulate("Support ticket")}
              disabled={simulating}
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-100 text-gray-900"
            >
              🎫 Simulate Support
            </button>
          </div>
        </div>
      )}

      {canCreate && (
        <div className="border rounded-lg p-4 mb-8 bg-blue-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Classification
          </label>
         <button
              onClick={handleClassifyAll}
              disabled={classifying}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {classifying ? `Classifying... (${classifyElapsed}s)` : "🤖 Classify all unclassified feedback"}
            </button>

            {classifying && (
              <p className="text-xs text-blue-600 mt-2">
                This runs one item at a time — roughly 2-3 seconds per item, so larger
                batches may take a few minutes. Feel free to keep working elsewhere; it
                continues in the background on the server.
              </p>
            )}
          <button
            onClick={handleEmbedAll}
            disabled={embedding}
            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ml-2"
          >
            {embedding ? "Embedding..." : "🔍 Enable search on all feedback"}
          </button>
          {session?.user?.role === "ADMIN" && (
          <button
            onClick={handleDedupe}
            disabled={deduping}
            className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 ml-2"
          >
            {deduping ? "Removing..." : "🧹 Remove duplicates"}
          </button>
        )}
        </div>
      )}

      <h2 className="font-semibold text-gray-900 mb-3">Feedback ({total})</h2>

      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search feedback content..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 border rounded px-3 py-2 text-sm text-gray-900"
        />
        <button
          type="submit"
          className="px-4 py-2 border rounded text-sm text-gray-900 hover:bg-gray-100"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2 items-center mb-6 p-3 border rounded-lg bg-gray-50">
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm text-gray-900"
        >
          <option value="">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm text-gray-900"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterSentiment}
          onChange={(e) => setFilterSentiment(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm text-gray-900"
        >
          <option value="">All sentiments</option>
          {SENTIMENTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterTheme}
          onChange={(e) => setFilterTheme(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm text-gray-900"
        >
          <option value="">All themes</option>
          {themeOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label className="text-sm text-gray-600 flex items-center gap-1">
          From
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm text-gray-900"
          />
        </label>

        <label className="text-sm text-gray-600 flex items-center gap-1">
          To
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm text-gray-900"
          />
        </label>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 underline ml-auto"
          >
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No feedback found.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {item.channel}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-900">{item.content}</p>
              {item.customerLabel && (
                <p className="text-sm text-gray-500 mt-1">
                  — {item.customerLabel}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <select
                  value={item.status}
                  onChange={(e) =>
                    handleStatusChange(item.id, e.target.value)
                  }
                  className="text-xs border rounded px-2 py-1 text-gray-900"
                >
                  <option value="NEW">New</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="ACTIONED">Actioned</option>
                </select>

                <span
                  className={`text-xs px-2 py-1 rounded-full ${sentimentBadgeClass(
                    item.sentiment
                  )}`}
                >
                  {item.sentiment ?? "Unclassified"}
                </span>

                {canCreate && (
                  <button
                    onClick={() => handleReclassify(item.id)}
                    disabled={reclassifyingId === item.id}
                    className="text-xs px-2 py-1 border rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {reclassifyingId === item.id
                      ? "Re-classifying..."
                      : "🔄 Re-classify"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 text-gray-900"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 text-gray-900"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}