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

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ANALYST",
  });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    loadMembers();
  }, []);

  function loadMembers() {
    setLoading(true);
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
  }

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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInviteSuccess("");
    setInviting(true);

    const res = await fetch("/api/members/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });

    const data = await res.json();
    setInviting(false);

    if (!res.ok) {
      setError(data.error || "Failed to add teammate");
      return;
    }

    setInviteSuccess(`Added ${data.user.email} as ${data.user.role}`);
    setInviteForm({ name: "", email: "", password: "", role: "ANALYST" });
    setShowInviteForm(false);
    loadMembers();
  }

  if (loading) return <div className="p-8">Loading members...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Team members</h1>
        {isAdmin && (
          <button
            onClick={() => setShowInviteForm((v) => !v)}
            className="text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800"
          >
            {showInviteForm ? "Cancel" : "+ Add teammate"}
          </button>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-6">
        {isAdmin
          ? "As an admin, you can add teammates and change roles below."
          : "Only admins can manage team members."}
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
          {error}
        </div>
      )}
      {inviteSuccess && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded mb-4">
          {inviteSuccess}
        </div>
      )}

      {isAdmin && showInviteForm && (
        <form
          onSubmit={handleInvite}
          className="border rounded-lg p-4 mb-6 space-y-3 bg-gray-50"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              required
              className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
              value={inviteForm.name}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Initial password
            </label>
            <input
              type="text"
              required
              minLength={8}
              className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
              value={inviteForm.password}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, password: e.target.value })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Share this with them directly — there&apos;s no email invite
              system.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, role: e.target.value })
              }
            >
              <option value="ADMIN">Admin</option>
              <option value="ANALYST">Analyst</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {inviting ? "Adding..." : "Add teammate"}
          </button>
        </form>
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