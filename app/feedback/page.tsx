"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  status: string;
  createdAt: string;
};

const CHANNELS = [
  "Support ticket",
  "App store review",
  "NPS survey",
  "Sales call note",
  "Community post",
  "Social mentions",
];

const STATUSES = ["NEW", "REVIEWED", "ACTIONED"];

export default function FeedbackPage() {
  const { data: session } = useSession();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [form, setForm] = useState({
    content: "",
    channel: CHANNELS[0],
    customerLabel: "",
  });

  const [uploadResult, setUploadResult] = useState<{
    imported: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const canCreate = session?.user?.role !== "VIEWER";

  function buildParams(pageNum: number) {
    return new URLSearchParams({
      page: String(pageNum),
      ...(search ? { search } : {}),
      ...(filterChannel ? { channel: filterChannel } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  // Re-run whenever any filter or the applied search term changes
  useEffect(() => {
    setPage(1);
    loadFeedback(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterChannel, filterStatus, filterDateFrom, filterDateTo]);

  function goToPage(newPage: number) {
    setPage(newPage);
    loadFeedback(newPage);
  }

  function clearFilters() {
    setFilterChannel("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchInput("");
    setSearch("");
  }

  async function handleStatusChange(id: string, newStatus: string) {
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
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Failed to add feedback");
      return;
    }

    setForm({ content: "", channel: CHANNELS[0], customerLabel: "" });
    loadFeedback(1);
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/feedback/bulk", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);
    setUploadResult(data);
    loadFeedback(1);
    e.target.value = "";
  }

  async function handleSimulate(channel: string) {
    setSimulating(true);
    const res = await fetch("/api/feedback/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const data = await res.json();
    setSimulating(false);
    if (res.ok) {
      setUploadResult({ imported: data.imported, failed: 0, errors: [] });
      loadFeedback(1);
    }
  }

  const hasActiveFilters =
    filterChannel || filterStatus || filterDateFrom || filterDateTo || search;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Feedback</h1>
      <p className="text-gray-500 text-sm mb-6">
        Add and review customer feedback for your workspace.
      </p>

      {canCreate && (
        <form
          onSubmit={handleSubmit}
          className="border rounded-lg p-4 mb-8 space-y-3 bg-gray-50"
        >
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-2 rounded">
              {error}
            </div>
          )}

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

          {uploadResult && (
            <div className="mt-3 text-sm">
              <p className="text-green-700">
                ✓ Imported {uploadResult.imported} items
              </p>
              {uploadResult.failed > 0 && (
                <p className="text-red-700">
                  ✗ {uploadResult.failed} rows failed
                </p>
              )}
            </div>
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
              <div className="mt-2">
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