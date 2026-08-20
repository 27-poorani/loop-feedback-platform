import Link from "next/link";
import { LoopMark } from "./components/LoopMark";

export default function NotFound() {
  return (
    <div className="loop-page flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl border border-[#E3E8EE] bg-white px-8 py-10 text-center shadow-[0_18px_50px_rgba(10,37,64,0.08)]">
        <LoopMark className="justify-center" />
        <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#635BFF]">
          404
        </p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[#0A2540]">
          This page isn&apos;t here
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[#697386]">
          The link may be old, or the page moved. Head back to the workspace.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-[#635BFF] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#524AE0]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
