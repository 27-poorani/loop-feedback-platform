import type { ReactNode } from "react";
import Link from "next/link";
import { LoopMark } from "./LoopMark";

const POINTS = [
  {
    title: "One inbox for every channel",
    detail: "App Store reviews, support tickets, surveys, and social comments in a single workspace.",
  },
  {
    title: "See what is actually changing",
    detail: "Volume, sentiment, and themes so the team can act before issues spread.",
  },
  {
    title: "Ask questions in plain English",
    detail: "LOOP answers from your real feedback — not generic summaries.",
  },
];

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F6F9FC] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <aside className="relative hidden overflow-hidden bg-[#0A2540] px-10 py-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#635BFF]/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#7A73FF]/20 blur-3xl" />
        <LoopMark href="/" light />
        <div className="relative z-10 mt-16 max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#A5B4FC]">
            Customer feedback intelligence
          </p>
          <h2 className="mt-4 text-[32px] font-semibold leading-10 tracking-[-0.03em]">
            Turn scattered comments into a clear picture of what customers want.
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#635BFF]" />
                <div>
                  <p className="text-[14.5px] font-medium">{point.title}</p>
                  <p className="mt-1 text-[13.5px] leading-5 text-[#9AA8BC]">{point.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 mt-auto text-[12.5px] text-[#7B8A9E]">
          Each company workspace is private. Teams never see another organisation&apos;s feedback.
        </p>
      </aside>

      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-[440px] items-center justify-between lg:hidden">
          <LoopMark href="/" />
          <Link href="/" className="text-[13px] text-[#697386] hover:text-[#0A2540]">
            Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
          <Link href="/" className="mb-8 hidden text-[13px] text-[#697386] hover:text-[#0A2540] lg:inline">
            ← Back to home
          </Link>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#0A2540]">{title}</h1>
          <p className="mt-2 text-[14.5px] leading-6 text-[#697386]">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#E3E8EE] bg-white px-3.5 py-2.5 text-[14px] text-[#0A2540] outline-none transition placeholder:text-[#A3ACB9] focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15";

const labelClass = "block text-[13px] font-medium text-[#0A2540]";

export { inputClass, labelClass };
