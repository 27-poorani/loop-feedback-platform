"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="border-b bg-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-gray-900">
          LOOP
        </Link>
        <nav className="flex gap-4 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/feedback" className="hover:text-gray-900">
            Feedback
          </Link>
          <Link href="/settings/members" className="hover:text-gray-900">
            Members
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">
          {session.user?.email} · {session.user?.role}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
    </header>
  );
}