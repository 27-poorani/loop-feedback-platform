import Link from "next/link";

export function LoopMark({
  href = "/",
  light = false,
  className = "",
  onClick,
}: {
  href?: string;
  light?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 no-underline ${className}`}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#635BFF] shadow-[0_8px_16px_-8px_rgba(99,91,255,0.9)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 12a4 4 0 014-4h1.2a3.8 3.8 0 110 7.6H11a4 4 0 01-4-4zm10 0a4 4 0 01-4 4h-1.2a3.8 3.8 0 110-7.6H13a4 4 0 014 4z"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        className={`text-[15px] font-semibold tracking-[-0.02em] ${
          light ? "text-white" : "text-[#0A2540]"
        }`}
      >
        LOOP
      </span>
    </Link>
  );
}
