"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { LoopMark } from "./LoopMark";

const OVERVIEW = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/settings/members", label: "Members", icon: Users },
];

const INTELLIGENCE = [
  { href: "/themes", label: "Themes", icon: Tag },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/ask", label: "Ask LOOP", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: FileText },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: typeof OVERVIEW;
  pathname: string | null;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A94A6]">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] no-underline transition-colors ${
                active
                  ? "bg-[#635BFF] font-medium text-white shadow-[0_8px_18px_-10px_rgba(99,91,255,0.9)]"
                  : "font-normal text-[#425466] hover:bg-[#F6F9FC] hover:text-[#0A2540]"
              }`}
            >
              <Icon size={16} strokeWidth={1.9} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const onMarketing = pathname === "/";
  if (!session || onMarketing) return <>{children}</>;

  const showSidebar = isDesktop || mobileOpen;
  const email = session.user?.email ?? "";
  const role = session.user?.role ?? "";
  const initials = (session.user?.name || email || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      {!isDesktop && (
        <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#E3E8EE] bg-white/90 px-4 py-3 backdrop-blur-md">
          <LoopMark />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E3E8EE] text-[#0A2540]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      )}

      {!isDesktop && mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-[#0A2540]/30 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {showSidebar && (
        <aside className="fixed bottom-0 left-0 top-0 z-40 flex w-[248px] flex-col border-r border-[#E3E8EE] bg-white px-3.5 py-5">
          <LoopMark className="mb-6 px-1.5" onClick={() => setMobileOpen(false)} />

          <nav className="flex-1 overflow-y-auto pr-0.5">
            <NavGroup
              title="Workspace"
              items={OVERVIEW}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <NavGroup
              title="Intelligence"
              items={INTELLIGENCE}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>

          <div className="mt-3 rounded-xl border border-[#E3E8EE] bg-[#F8FAFC] p-3">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#635BFF] text-[12px] font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-[#0A2540]">
                  {session.user?.name || email}
                </p>
                <p className="truncate text-[11px] uppercase tracking-[0.12em] text-[#8A94A6]">
                  {role}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E3E8EE] bg-white py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F6F9FC]"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        </aside>
      )}

      <main className={`min-w-0 flex-1 ${isDesktop ? "ml-[248px]" : "pt-14"}`}>
        {children}
      </main>
    </div>
  );
}
