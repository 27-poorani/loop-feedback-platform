"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  LayoutGrid,
  MoreVertical,
  RefreshCw,
  Rocket,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

type Theme = {
  id: string;
  name: string;
  description: string | null;
  count: number;
  changePercent: number | null;
};

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  status: string;
  createdAt: string;
};

const THEME_ICONS: { match: RegExp; Icon: typeof LayoutGrid; bg: string; color: string }[] = [
  { match: /perform|speed|slow|latency/i, Icon: TrendingUp, bg: "#F3F1FF", color: "#635BFF" },
  { match: /ui|interface|visual|design/i, Icon: LayoutGrid, bg: "#EFF6FF", color: "#2563EB" },
  { match: /onboard|signup|getting started/i, Icon: Rocket, bg: "#FDF2FA", color: "#EE46BC" },
  { match: /bill|price|payment|plan/i, Icon: Wallet, bg: "#ECFDF3", color: "#12B76A" },
  { match: /support|ticket/i, Icon: Tag, bg: "#FFFAEB", color: "#F79009" },
  { match: /analytic|report|chart/i, Icon: BarChart3, bg: "#EEF4FF", color: "#3538CD" },
  { match: /credit|invoice/i, Icon: CreditCard, bg: "#FEF3F2", color: "#F04438" },
];

function themeIcon(name: string) {
  return THEME_ICONS.find((t) => t.match.test(name)) ?? {
    Icon: Tag,
    bg: "#F3F1FF",
    color: "#635BFF",
  };
}

function fallbackDescription(name: string) {
  return `Feedback grouped under ${name}.`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${date} • ${time}`;
}

function sentimentClass(sentiment: string | null) {
  if (sentiment === "NEGATIVE") return "bg-[#FEF3F2] text-[#B42318]";
  if (sentiment === "POSITIVE") return "bg-[#ECFDF3] text-[#067647]";
  if (sentiment === "NEUTRAL") return "bg-[#FFFAEB] text-[#B54708]";
  return "bg-[#F2F4F7] text-[#98A2B3]";
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [themeFeedback, setThemeFeedback] = useState<FeedbackItem[]>([]);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeThemes = useMemo(
    () => themes.filter((t) => t.count > 0),
    [themes]
  );
  const archivedThemes = useMemo(
    () => themes.filter((t) => t.count === 0),
    [themes]
  );
  const list = showArchived ? archivedThemes : activeThemes;

  async function loadThemes(selectId?: string) {
    const res = await fetch("/api/themes");
    const data = await res.json();
    const next: Theme[] = data.themes ?? [];
    setThemes(next);
    setLoading(false);

    const preferred =
      next.find((t) => t.id === selectId) ||
      next.find((t) => t.count > 0) ||
      next[0] ||
      null;
    if (preferred) {
      await openTheme(preferred, next);
    } else {
      setSelectedTheme(null);
      setThemeFeedback([]);
    }
  }

  useEffect(() => {
    loadThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function openTheme(theme: Theme, source = themes) {
    const latest = source.find((t) => t.id === theme.id) ?? theme;
    setSelectedTheme(latest);
    setLoadingDrilldown(true);
    const res = await fetch(`/api/themes/${latest.id}`);
    const data = await res.json();
    setThemeFeedback(data.feedback ?? []);
    setLoadingDrilldown(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadThemes(selectedTheme?.id);
    setRefreshing(false);
  }

  function exportTheme() {
    if (!selectedTheme) return;
    const header = "channel,sentiment,createdAt,content";
    const rows = themeFeedback.map((item) =>
      [
        item.channel,
        item.sentiment ?? "",
        item.createdAt,
        `"${item.content.replace(/"/g, '""')}"`,
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTheme.name.toLowerCase().replace(/\s+/g, "-")}-feedback.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setMenuFor(null);
    setThemeMenuOpen(false);
  }

  return (
    <div className="min-h-screen px-8 pb-10 pt-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-[#0A2540]">
              Themes
            </h1>
            <p className="mt-1.5 text-[14px] text-[#697386]">
              Feedback automatically grouped by AI-detected topic.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#635BFF] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#524AE0] disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh themes
          </button>
        </div>

        {loading ? (
          <p className="text-[13px] text-[#697386]">Loading themes...</p>
        ) : themes.length === 0 ? (
          <div className="rounded-xl border border-[#E3E8EE] bg-white p-8 text-[13px] text-[#697386]">
            No themes yet — classify some feedback first.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="flex flex-col rounded-xl border border-[#E3E8EE] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="border-b border-[#EEF2F6] px-4 py-3">
                <h2 className="text-[14px] font-semibold text-[#0A2540]">
                  {showArchived ? "Archived themes" : "All themes"}
                </h2>
              </div>
              <div className="flex-1 space-y-2 p-3">
                {list.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[13px] text-[#697386]">
                    {showArchived
                      ? "No archived themes."
                      : "No active themes with feedback yet."}
                  </p>
                ) : (
                  list.map((theme) => {
                    const { Icon, bg, color } = themeIcon(theme.name);
                    const selected = selectedTheme?.id === theme.id;
                    const up = (theme.changePercent ?? 0) > 0;
                    const down = (theme.changePercent ?? 0) < 0;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => openTheme(theme)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-[#C7C3FF] bg-[#F8F7FF]"
                            : "border-[#E3E8EE] bg-white hover:border-[#C7C3FF]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: bg, color }}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[14px] font-semibold text-[#0A2540]">
                                {theme.name}
                              </p>
                              <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[12px] font-medium text-[#425466]">
                                {theme.count}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#697386]">
                              {theme.description || fallbackDescription(theme.name)}
                            </p>
                            {theme.changePercent !== null && (
                              <p
                                className={`mt-2 flex items-center gap-1 text-[12px] ${
                                  up
                                    ? "text-[#067647]"
                                    : down
                                      ? "text-[#B42318]"
                                      : "text-[#697386]"
                                }`}
                              >
                                {up && <TrendingUp size={12} />}
                                {down && <TrendingDown size={12} />}
                                {up ? "↑" : down ? "↓" : "→"}{" "}
                                {Math.abs(theme.changePercent)}% vs last 30 days
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="border-t border-[#EEF2F6] p-3">
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#425466] hover:text-[#635BFF]"
                >
                  {showArchived ? "View active themes" : "View archived themes"}
                  <ChevronDown
                    size={14}
                    className={showArchived ? "rotate-180" : ""}
                  />
                </button>
              </div>
            </div>

            <div className="flex min-h-[520px] flex-col rounded-xl border border-[#E3E8EE] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              {!selectedTheme ? (
                <p className="p-6 text-[13px] text-[#697386]">
                  Click a theme to see its feedback.
                </p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-[#EEF2F6] px-5 py-4">
                    <div>
                      <h2 className="text-[18px] font-semibold text-[#0A2540]">
                        {selectedTheme.name} ({selectedTheme.count})
                      </h2>
                      <p className="mt-0.5 text-[13px] text-[#697386]">
                        {selectedTheme.description ||
                          fallbackDescription(selectedTheme.name)}
                      </p>
                    </div>
                    <div className="relative flex items-center gap-2" ref={menuRef}>
                      <button
                        type="button"
                        onClick={exportTheme}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8EE] px-3 py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F6F9FC]"
                      >
                        <Download size={14} />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMenuOpen((v) => !v)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E3E8EE] text-[#697386] hover:bg-[#F6F9FC]"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {themeMenuOpen && (
                        <div className="absolute right-0 top-11 z-20 w-44 rounded-lg border border-[#E3E8EE] bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => copyText(selectedTheme.name)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#425466] hover:bg-[#F6F9FC]"
                          >
                            <Copy size={13} />
                            Copy theme name
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {loadingDrilldown ? (
                      <p className="py-8 text-center text-[13px] text-[#697386]">
                        Loading...
                      </p>
                    ) : themeFeedback.length === 0 ? (
                      <p className="py-8 text-center text-[13px] text-[#697386]">
                        No feedback in this theme yet.
                      </p>
                    ) : (
                      themeFeedback.map((item) => (
                        <div
                          key={item.id}
                          className="relative rounded-xl border border-[#E3E8EE] bg-white p-3.5"
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-[#8A94A6]">
                            <span>{item.channel}</span>
                            <span>{formatWhen(item.createdAt)}</span>
                          </div>
                          <p className="pr-6 text-[13.5px] leading-6 text-[#0A2540]">
                            {item.content}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${sentimentClass(
                                item.sentiment
                              )}`}
                            >
                              {item.sentiment ?? "UNCLASSIFIED"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setMenuFor((cur) =>
                                  cur === item.id ? null : item.id
                                )
                              }
                              className="rounded-md p-1 text-[#8A94A6] hover:bg-[#F6F9FC]"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>
                          {menuFor === item.id && (
                            <div className="absolute right-3 top-10 z-10 w-36 rounded-lg border border-[#E3E8EE] bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => copyText(item.content)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#425466] hover:bg-[#F6F9FC]"
                              >
                                <Copy size={13} />
                                Copy text
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-[#EEF2F6] px-5 py-3">
                    <Link
                      href={`/feedback?themeId=${selectedTheme.id}`}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-[#635BFF]"
                    >
                      View all feedback in this theme
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
