"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
  createdAt: string;
};

export default function MembersPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load members");
        setLoading(false);
      });
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await fetch(`/api/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update role");
      return;
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId ? { ...m, role: newRole as Member["role"] } : m
      )
    );
  }

  if (loading) return <div className="p-8">Loading members...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Team members</h1>
      <p className="text-gray-500 text-sm mb-6">
        {isAdmin
          ? "As an admin, you can change roles below."
          : "Only admins can change roles."}
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="border rounded-lg divide-y">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4"
          >
            <div>
              <p className="font-medium text-gray-900">{member.name}</p>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>

            {isAdmin ? (
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                className="border rounded px-3 py-1.5 text-sm text-gray-900"
              >
                <option value="ADMIN">Admin</option>
                <option value="ANALYST">Analyst</option>
                <option value="VIEWER">Viewer</option>
              </select>
            ) : (
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded">
                {member.role}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}