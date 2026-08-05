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
];

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    content: "",
    channel: CHANNELS[0],
    customerLabel: "",
  });

  const canCreate = session?.user?.role !== "VIEWER";

  async function loadFeedback() {
    setLoading(true);
    const res = await fetch("/api/feedback");
    const data = await res.json();
    setItems(data.feedback ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadFeedback();
  }, []);

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
    loadFeedback();
  }

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
              onChange={(e) =>
                setForm({ ...form, content: e.target.value })
              }
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
                onChange={(e) =>
                  setForm({ ...form, channel: e.target.value })
                }
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

      <h2 className="font-semibold text-gray-900 mb-3">
        Recent feedback ({items.length})
      </h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No feedback yet.</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}