"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LoopMark } from "./LoopMark";

export default function MarketingNav() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session);

  return (
    <header className="sticky top-0 z-30 border-b border-[#E3E8EE]/80 bg-[#F6F9FC]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <LoopMark />
        <nav className="hidden items-center gap-7 text-[13.5px] text-[#425466] md:flex">
          <a href="#product" className="hover:text-[#0A2540]">
            Product
          </a>
          <a href="#how-it-works" className="hover:text-[#0A2540]">
            How it works
          </a>
          <a href="#roles" className="hover:text-[#0A2540]">
            Roles
          </a>
        </nav>
        <div className="flex items-center gap-2.5">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#635BFF] px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-[#524AE0]"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-[#425466] hover:bg-white hover:text-[#0A2540]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#635BFF] px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-[#524AE0]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
