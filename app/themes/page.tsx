"use client";

import { useEffect, useState } from "react";

type Theme = {
  id: string;
  name: string;
  description: string | null;
  count: number;
};

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  status: string;
  createdAt: string;
};

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [themeFeedback, setThemeFeedback] = useState<FeedbackItem[]>([]);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);

  useEffect(() => {
    fetch("/api/themes")
      .then((res) => res.json())
      .then((data) => {
        setThemes(data.themes ?? []);
        setLoading(false);
      });
  }, []);

  async function openTheme(theme: Theme) {
    setSelectedTheme(theme);
    setLoadingDrilldown(true);
    const res = await fetch(`/api/themes/${theme.id}`);
    const data = await res.json();
    setThemeFeedback(data.feedback ?? []);
    setLoadingDrilldown(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Themes</h1>
      <p className="text-gray-500 text-sm mb-6">
        Feedback automatically grouped by AI-detected topic.
      </p>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : themes.length === 0 ? (
        <p className="text-gray-500">
          No themes yet — classify some feedback first.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Theme list */}
          <div className="space-y-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => openTheme(theme)}
                className={`w-full text-left border rounded-lg p-3 hover:border-gray-400 transition ${
                  selectedTheme?.id === theme.id
                    ? "border-black bg-gray-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">
                    {theme.name}
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {theme.count}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Drill-down panel */}
          <div className="border rounded-lg p-4 bg-gray-50">
            {!selectedTheme ? (
              <p className="text-gray-500 text-sm">
                Click a theme to see its feedback.
              </p>
            ) : loadingDrilldown ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : (
              <>
                <h2 className="font-semibold text-gray-900 mb-3">
                  {selectedTheme.name} ({themeFeedback.length})
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {themeFeedback.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border rounded p-3 text-sm"
                    >
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{item.channel}</span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-900">{item.content}</p>
                      {item.sentiment && (
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                            item.sentiment === "NEGATIVE"
                              ? "bg-red-100 text-red-700"
                              : item.sentiment === "POSITIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {item.sentiment}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}