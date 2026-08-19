"use client";

import { useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Info,
  MessageCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type Source = {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  createdAt: string;
};

type Exchange = {
  id: string;
  question: string;
  answer: string;
  sources: Source[];
  askedAt: string;
  pending?: boolean;
  vote: "up" | "down" | null;
};

const SUGGESTIONS = [
  "What are the most common complaints?",
  "What do people say about pricing?",
  "What's working well in onboarding?",
  "Any recurring bugs mentioned?",
];

function initialsFrom(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
    return letters.toUpperCase() || "U";
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function periodLabel(sources: Source[]) {
  if (sources.length === 0) return null;
  const times = sources
    .map((s) => new Date(s.createdAt).getTime())
    .filter((n) => !Number.isNaN(n));
  if (times.length === 0) return null;
  const spanDays = Math.max(
    1,
    Math.round((Math.max(...times) - Math.min(...times)) / 86_400_000) + 1
  );
  if (spanDays <= 1) return "Today";
  if (spanDays <= 7) return "Last 7 days";
  if (spanDays <= 14) return "Last 14 days";
  if (spanDays <= 30) return "Last 30 days";
  return `Last ${spanDays} days`;
}

type AnswerBlock =
  | { type: "paragraph"; text: string }
  | { type: "section"; title: string; items: string[] };

function parseAnswer(answer: string): AnswerBlock[] {
  const lines = answer.replace(/\r\n/g, "\n").split("\n");
  const blocks: AnswerBlock[] = [];
  let paragraph: string[] = [];
  let section: { title: string; items: string[] } | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  const flushSection = () => {
    if (section && (section.title || section.items.length)) {
      blocks.push({ type: "section", ...section });
    }
    section = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (section) continue;
      flushParagraph();
      continue;
    }

    const heading = line.match(/^\*\*(.+?)\*\*:?\s*$/) || line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushSection();
      section = { title: heading[1].trim(), items: [] };
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!section) section = { title: "", items: [] };
      section.items.push(bullet[1].replace(/\*\*/g, "").trim());
      continue;
    }

    if (section) {
      section.items.push(line.replace(/\*\*/g, "").trim());
    } else {
      paragraph.push(line.replace(/\*\*/g, "").trim());
    }
  }

  flushParagraph();
  flushSection();
  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: answer }];
}

function sectionTone(title: string): "like" | "dislike" | "neutral" {
  const t = title.toLowerCase();
  if (t.includes("like") || t.includes("working well") || t.includes("positive")) {
    return "like";
  }
  if (
    t.includes("dislike") ||
    t.includes("complaint") ||
    t.includes("negative") ||
    t.includes("bug")
  ) {
    return "dislike";
  }
  return "neutral";
}

function AnswerBody({ answer }: { answer: string }) {
  const blocks = parseAnswer(answer);

  return (
    <div className="space-y-4 text-[15px] leading-7 text-[#3D4A5C]">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-[#3D4A5C]">
              {block.text}
            </p>
          );
        }

        const tone = sectionTone(block.title);
        return (
          <div key={i}>
            {block.title && (
              <div className="mb-2 flex items-center gap-2 font-semibold text-[#0A2540]">
                {tone === "like" && (
                  <CheckCircle2 size={16} className="text-[#12B76A]" strokeWidth={2.2} />
                )}
                {tone === "dislike" && (
                  <XCircle size={16} className="text-[#F04438]" strokeWidth={2.2} />
                )}
                {block.title}
              </div>
            )}
            <ul className="space-y-1.5 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A94A6]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function AskPage() {
  const { data: session } = useSession();
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [error, setError] = useState("");
  const [howOpen, setHowOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const initials = useMemo(
    () => initialsFrom(session?.user?.name, session?.user?.email),
    [session?.user?.name, session?.user?.email]
  );

  async function submitQuestion(text: string) {
    const currentQuestion = text.trim();
    if (!currentQuestion || asking) return;

    setAsking(true);
    setError("");
    setQuestion("");

    const id = `${Date.now()}`;
    const pending: Exchange = {
      id,
      question: currentQuestion,
      answer: "",
      sources: [],
      askedAt: new Date().toISOString(),
      pending: true,
      vote: null,
    };
    setHistory((prev) => [...prev, pending]);
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    );

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        setHistory((prev) => prev.filter((e) => e.id !== id));
        setError(data.error || "Something went wrong");
        setQuestion(currentQuestion);
        setAsking(false);
        return;
      }

      setHistory((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                answer: data.answer,
                sources: data.sources ?? [],
                pending: false,
              }
            : e
        )
      );
    } catch {
      setHistory((prev) => prev.filter((e) => e.id !== id));
      setError("Request failed. Try again.");
      setQuestion(currentQuestion);
    }

    setAsking(false);
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    );
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    await submitQuestion(question);
  }

  async function copyAnswer(exchange: Exchange) {
    try {
      await navigator.clipboard.writeText(exchange.answer);
      setCopiedId(exchange.id);
      setTimeout(() => setCopiedId((cur) => (cur === exchange.id ? null : cur)), 1600);
    } catch {
      setError("Couldn't copy the answer.");
    }
  }

  return (
    <div className="relative min-h-screen px-8 pb-10 pt-8">
      <div className="mx-auto max-w-[880px]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-[#0A2540]">Ask LOOP</h1>
            <p className="mt-1.5 max-w-xl text-[14px] leading-6 text-[#697386]">
              Ask a plain-English question about your feedback. Answers are based
              only on real feedback in your workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHowOpen(true)}
            className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3.5 py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F6F9FC]"
          >
            <Info size={15} strokeWidth={2} />
            How it works
          </button>
        </div>

        <div className="rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <form onSubmit={handleAsk}>
            <div className="flex items-center gap-2 rounded-[10px] border border-[#C7C3FF] bg-white px-3 py-1.5 focus-within:border-[#635BFF] focus-within:shadow-[0_0_0_3px_rgba(99,91,255,0.12)]">
              <Sparkles size={18} className="ml-1 shrink-0 text-[#635BFF]" />
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What are users saying about onboarding?"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-[14.5px] text-[#0A2540] outline-none placeholder:text-[#A3ACB9]"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#635BFF] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#524AE0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {asking ? "Thinking..." : "Ask"}
                {!asking && <ArrowRight size={15} strokeWidth={2.4} />}
              </button>
            </div>
          </form>

          <div className="mt-4">
            <p className="mb-2.5 text-[13px] text-[#697386]">Try asking something like:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={asking}
                  onClick={() => {
                    setQuestion(prompt);
                    inputRef.current?.focus();
                    void submitQuestion(prompt);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3 py-2 text-left text-[13px] text-[#425466] hover:border-[#C7C3FF] hover:bg-[#F8F7FF] disabled:opacity-50"
                >
                  <MessageCircle size={14} className="shrink-0 text-[#635BFF]" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-3.5 py-2.5 text-[13px] text-[#B42318]">
            {error}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-6 rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#0A2540]">Conversation</h2>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  setOpenSources({});
                  setError("");
                }}
                className="inline-flex items-center gap-1.5 text-[13px] text-[#697386] hover:text-[#F04438]"
              >
                <Trash2 size={14} />
                Clear conversation
              </button>
            </div>

            <div className="space-y-4">
              {history.map((exchange) => {
                const period = periodLabel(exchange.sources);
                const sourcesOpen = Boolean(openSources[exchange.id]);

                return (
                  <div key={exchange.id} className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl bg-[#F3F1FF] px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#635BFF] text-[11px] font-semibold text-white">
                        {initials}
                      </div>
                      <p className="min-w-0 flex-1 text-[14px] font-medium text-[#0A2540]">
                        {exchange.question}
                      </p>
                      <span className="shrink-0 text-[12px] text-[#8A94A6]">
                        {formatTime(exchange.askedAt)}
                      </span>
                    </div>

                    <div className="flex gap-3 px-1 pt-1">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F1FF] text-[#635BFF]">
                        <Sparkles size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {exchange.pending ? (
                          <div className="py-2">
                            <p className="text-[14px] text-[#697386]">
                              LOOP is reading your feedback…
                            </p>
                            <div className="mt-3 h-2 w-40 animate-pulse rounded-full bg-[#EDE9FE]" />
                            <div className="mt-2 h-2 w-64 animate-pulse rounded-full bg-[#F3F1FF]" />
                          </div>
                        ) : (
                          <>
                            <AnswerBody answer={exchange.answer} />

                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EEF2F6] pt-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenSources((prev) => ({
                                    ...prev,
                                    [exchange.id]: !prev[exchange.id],
                                  }))
                                }
                                className="text-left text-[12.5px] text-[#8A94A6] hover:text-[#635BFF]"
                              >
                                Sources: {exchange.sources.length} feedback item
                                {exchange.sources.length !== 1 ? "s" : ""}
                                {period ? ` · Period: ${period}` : ""}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  title={copiedId === exchange.id ? "Copied" : "Copy"}
                                  onClick={() => copyAnswer(exchange)}
                                  className="rounded-md p-1.5 text-[#8A94A6] hover:bg-[#F6F9FC] hover:text-[#425466]"
                                >
                                  <Copy size={15} />
                                </button>
                                <button
                                  type="button"
                                  title="Helpful"
                                  onClick={() =>
                                    setHistory((prev) =>
                                      prev.map((e) =>
                                        e.id === exchange.id
                                          ? { ...e, vote: e.vote === "up" ? null : "up" }
                                          : e
                                      )
                                    )
                                  }
                                  className={`rounded-md p-1.5 hover:bg-[#F6F9FC] ${
                                    exchange.vote === "up"
                                      ? "text-[#12B76A]"
                                      : "text-[#8A94A6] hover:text-[#425466]"
                                  }`}
                                >
                                  <ThumbsUp size={15} />
                                </button>
                                <button
                                  type="button"
                                  title="Not helpful"
                                  onClick={() =>
                                    setHistory((prev) =>
                                      prev.map((e) =>
                                        e.id === exchange.id
                                          ? { ...e, vote: e.vote === "down" ? null : "down" }
                                          : e
                                      )
                                    )
                                  }
                                  className={`rounded-md p-1.5 hover:bg-[#F6F9FC] ${
                                    exchange.vote === "down"
                                      ? "text-[#F04438]"
                                      : "text-[#8A94A6] hover:text-[#425466]"
                                  }`}
                                >
                                  <ThumbsDown size={15} />
                                </button>
                              </div>
                            </div>

                            {sourcesOpen && exchange.sources.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {exchange.sources.map((s) => (
                                  <div
                                    key={s.id}
                                    className="rounded-lg border border-[#E3E8EE] bg-[#F6F9FC] p-3"
                                  >
                                    <div className="mb-1 flex justify-between text-[11px] text-[#8A94A6]">
                                      <span>{s.channel}</span>
                                      {s.sentiment && <span>{s.sentiment}</span>}
                                    </div>
                                    <p className="text-[13px] leading-5 text-[#0A2540]">
                                      {s.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-[12.5px] text-[#A3ACB9]">
          LOOP only answers questions related to feedback in your workspace.
        </p>
      </div>

      {howOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/30 px-4"
          onClick={() => setHowOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F1FF] text-[#635BFF]">
                  <Sparkles size={15} />
                </div>
                <h3 className="text-[16px] font-semibold text-[#0A2540]">How Ask LOOP works</h3>
              </div>
              <button
                type="button"
                onClick={() => setHowOpen(false)}
                className="rounded-md p-1 text-[#8A94A6] hover:bg-[#F6F9FC]"
              >
                <X size={16} />
              </button>
            </div>
            <ol className="space-y-3 text-[13.5px] leading-6 text-[#425466]">
              <li>
                <span className="font-semibold text-[#0A2540]">1. Ask in plain English.</span>{" "}
                Type a question about themes, complaints, pricing, onboarding, or anything else in your feedback.
              </li>
              <li>
                <span className="font-semibold text-[#0A2540]">2. LOOP searches your workspace.</span>{" "}
                It retrieves the most relevant feedback items — not the open web.
              </li>
              <li>
                <span className="font-semibold text-[#0A2540]">3. Answers stay grounded.</span>{" "}
                Every response is based only on matching feedback. If there isn’t enough, LOOP will say so.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setHowOpen(false)}
              className="mt-5 w-full rounded-lg bg-[#635BFF] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#524AE0]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
