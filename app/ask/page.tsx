"use client";

import { useState } from "react";

type Source = {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  createdAt: string;
};

type Exchange = {
  question: string;
  answer: string;
  sources: Source[];
};

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [error, setError] = useState("");

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    setError("");
    const currentQuestion = question;
    setQuestion("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setAsking(false);
        return;
      }

      setHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: data.answer,
          sources: data.sources ?? [],
        },
      ]);
    } catch {
      setError("Request failed. Try again.");
    }

    setAsking(false);
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Ask LOOP</h1>
      <p className="text-gray-500 text-sm mb-6">
        Ask a plain-English question about your feedback. Answers are based
        only on real feedback in your workspace.
      </p>

      <form onSubmit={handleAsk} className="flex gap-2 mb-8">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What are users saying about onboarding?"
          className="flex-1 border rounded px-3 py-2 text-gray-900"
        />
        <button
          type="submit"
          disabled={asking}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {asking ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {history
          .slice()
          .reverse()
          .map((exchange, i) => (
            <div key={i} className="border rounded-lg p-5 bg-white">
              <p className="font-medium text-gray-900 mb-2">
                {exchange.question}
              </p>
              <p className="text-gray-700 mb-4">{exchange.answer}</p>

              {exchange.sources.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                    Based on {exchange.sources.length} feedback item
                    {exchange.sources.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {exchange.sources.map((s) => (
                      <div
                        key={s.id}
                        className="text-sm bg-gray-50 border rounded p-2"
                      >
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{s.channel}</span>
                          {s.sentiment && <span>{s.sentiment}</span>}
                        </div>
                        <p className="text-gray-800">{s.content}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
      </div>

      {history.length === 0 && !asking && (
        <p className="text-gray-400 text-sm">
          Try asking something like &quot;what are the most common
          complaints?&quot; or &quot;what do people say about pricing?&quot;
        </p>
      )}
    </div>
  );
}