"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" },
  { href: "/dashboard", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/feedback", label: "Feedback", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  { href: "/settings/members", label: "Members", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { href: "/themes", label: "Themes", icon: "M20.59 13.41L11 3.83A2 2 0 009.59 3.24L3 3v6.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l4.6-4.6a2 2 0 000-2.83zM7 7h.01" },
  { href: "/trends", label: "Trends", icon: "M23 6l-9.5 9.5-5-5L1 18" },
  { href: "/ask", label: "Ask LOOP", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  { href: "/reports", label: "Reports", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
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

  if (!session) return <>{children}</>;

  const showSidebar = isDesktop || mobileOpen;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {!isDesktop && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            background: "var(--loop-surface)",
            borderBottom: "1px solid var(--loop-border)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{ fontWeight: 700, fontSize: 15, color: "var(--loop-text-primary)", textDecoration: "none" }}
          >
            LOOP
          </Link>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              background: "none",
              border: "1px solid var(--loop-border)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 13,
              color: "var(--loop-text-primary)",
            }}
          >
            Menu
          </button>
        </div>
      )}

      {showSidebar && (
        <aside
          style={{
            width: 220,
            background: "var(--loop-surface)",
            borderRight: "1px solid var(--loop-border)",
            padding: "20px 14px",
            position: "fixed",
            top: 0,
            bottom: 0,
            left: 0,
            zIndex: 30,
            overflowY: "auto",
          }}
        >
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: "var(--loop-text-primary)",
              padding: "0 10px",
              marginBottom: 20,
              marginTop: 4,
              textDecoration: "none",
              display: "block",
            }}
          >
            LOOP
          </Link>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 13.5,
                    fontWeight: active ? 500 : 400,
                    color: active ? "#fff" : "var(--loop-text-secondary)",
                    background: active ? "var(--loop-accent)" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--loop-border)",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--loop-text-secondary)", padding: "0 10px", marginBottom: 8, wordBreak: "break-word" }}>
              {session.user?.email}
              <br />
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 }}>
                {session.user?.role}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 13,
                color: "var(--loop-text-secondary)",
                background: "transparent",
                border: "1px solid var(--loop-border)",
              }}
            >
              Log out
            </button>
          </div>
        </aside>
      )}

      <main
        style={{
          flex: 1,
          marginLeft: isDesktop ? 220 : 0,
          paddingTop: isDesktop ? 0 : 56,
        }}
      >
        {children}
      </main>
    </div>
  );
}