import Link from "next/link";
import {
  BarChart3,
  MessageSquareQuote,
  Shield,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import MarketingNav from "./components/MarketingNav";
import { LoopMark } from "./components/LoopMark";

const FEATURES = [
  {
    icon: Upload,
    title: "Collect everything",
    body: "Add feedback one item at a time, import a CSV, or generate realistic samples from App Store, social, and support channels.",
  },
  {
    icon: MessageSquareQuote,
    title: "Browse and triage",
    body: "Search, filter by channel or status, and mark items as New, Reviewed, or Actioned without losing context.",
  },
  {
    icon: BarChart3,
    title: "See the pulse",
    body: "A dashboard for volume over time, source mix, and how much of the conversation is negative this week.",
  },
  {
    icon: Sparkles,
    title: "Let AI do the reading",
    body: "Themes, trends, Ask LOOP, and executive reports — so nobody has to scroll a thousand comments by hand.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create a workspace",
    body: "Sign up with your company name. You become the Admin, and the workspace stays private to your team.",
  },
  {
    n: "02",
    title: "Bring feedback in",
    body: "Paste comments, upload a spreadsheet, or simulate channels when you want a live demo.",
  },
  {
    n: "03",
    title: "Act on what matters",
    body: "Triage the inbox, watch the dashboard, then use themes, trends, and Ask LOOP when you need answers.",
  },
];

const ROLES = [
  {
    title: "Admin",
    detail: "Full control — settings, teammates, and every part of the product.",
  },
  {
    title: "Analyst",
    detail: "Add and manage feedback, review reports, and dig into the data.",
  },
  {
    title: "Viewer",
    detail: "Look at feedback and reports without changing anything.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F6F9FC] text-[#0A2540]">
      <MarketingNav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[540px] bg-[radial-gradient(ellipse_at_top,_rgba(99,91,255,0.14),_transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#DDD9FF] bg-white px-3 py-1 text-[12px] font-medium text-[#635BFF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#635BFF]" />
              Customer feedback, in one place
            </p>
            <h1 className="mt-5 max-w-xl text-[40px] font-semibold leading-[1.12] tracking-[-0.04em] sm:text-[48px]">
              Know what customers are unhappy about — before it becomes a trend.
            </h1>
            <p className="mt-5 max-w-lg text-[16.5px] leading-7 text-[#4B5565]">
              LOOP gathers reviews, tickets, and comments into a private company
              workspace, then helps your team see what is rising, what is broken,
              and what to do next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-[#635BFF] px-5 py-2.5 text-[14.5px] font-medium text-white hover:bg-[#524AE0]"
              >
                Create your workspace
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-[#E3E8EE] bg-white px-5 py-2.5 text-[14.5px] font-medium text-[#0A2540] hover:bg-[#F6F9FC]"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-[#697386]">
              The person who signs up becomes Admin. Invite Analysts and Viewers later.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E3E8EE] bg-white p-4 shadow-[0_18px_50px_rgba(10,37,64,0.08)]">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-[13px] font-medium text-[#0A2540]">Workspace snapshot</p>
              <span className="rounded-md bg-[#ECFDF3] px-2 py-0.5 text-[11px] font-medium text-[#027A48]">
                Live
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total feedback", value: "1,284" },
                { label: "This week", value: "+86" },
                { label: "Negative", value: "18%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[#E3E8EE] bg-[#F6F9FC] px-3 py-3">
                  <p className="text-[11px] text-[#697386]">{stat.label}</p>
                  <p className="mt-1 text-[18px] font-semibold tracking-tight">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-[#E3E8EE] bg-[#F6F9FC] px-4 py-4">
              <p className="text-[12px] font-medium text-[#697386]">Volume</p>
              <div className="mt-3 flex h-24 items-end gap-1.5">
                {[32, 44, 38, 52, 48, 61, 55, 72, 64, 80, 74, 90].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-[#635BFF]/80"
                    style={{ height: `${h}%`, opacity: 0.45 + i * 0.04 }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {[
                { channel: "App Store", text: "Checkout fails after Apple Pay on iOS 18." },
                { channel: "Support", text: "Billing page still shows the old plan name." },
                { channel: "Social", text: "Love the new search — much faster." },
              ].map((row) => (
                <div key={row.text} className="flex items-start gap-3 rounded-xl border border-[#E3E8EE] px-3 py-2.5">
                  <span className="mt-0.5 rounded-md bg-[#F5F3FF] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#635BFF]">
                    {row.channel}
                  </span>
                  <p className="text-[13px] leading-5 text-[#425466]">{row.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#635BFF]">Product</p>
        <h2 className="mt-2 max-w-xl text-[28px] font-semibold tracking-[-0.03em]">
          Built for the messy, real stream of customer voice.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-[#E3E8EE] bg-white p-5 shadow-[0_1px_2px_rgba(10,37,64,0.04)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#635BFF]">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-[14px] leading-6 text-[#4B5565]">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#635BFF]">How it works</p>
        <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">From signup to insight in three steps.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="rounded-2xl border border-[#E3E8EE] bg-white p-5">
              <p className="text-[12px] font-semibold text-[#635BFF]">{step.n}</p>
              <h3 className="mt-3 text-[16px] font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-[14px] leading-6 text-[#4B5565]">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="overflow-hidden rounded-2xl border border-[#DDD9FF] bg-[#F5F3FF] px-6 py-8 sm:px-10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#635BFF] shadow-sm">
              <Shield size={16} />
            </div>
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Roles that keep the workspace tidy</h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-6 text-[#4B5565]">
                Your data stays inside your company. Nobody from another organisation can see it.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {ROLES.map((role) => (
              <div key={role.title} className="rounded-xl border border-[#DDD9FF] bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <Users size={14} className="text-[#635BFF]" />
                  {role.title}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-5 text-[#4B5565]">{role.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#0A2540] px-7 py-9 text-white sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.03em]">Start with your own company workspace.</h2>
            <p className="mt-2 max-w-xl text-[14.5px] leading-6 text-[#9AA8BC]">
              Import a spreadsheet or simulate a few channels. The inbox and dashboard are ready as soon as you sign up.
            </p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 rounded-lg bg-[#635BFF] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#524AE0]"
          >
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E3E8EE] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-6 sm:flex-row sm:items-center sm:px-8">
          <LoopMark />
          <p className="text-[12.5px] text-[#697386]">Private workspaces. Team roles. Feedback that stays yours.</p>
        </div>
      </footer>
    </div>
  );
}
