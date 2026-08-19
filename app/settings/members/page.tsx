"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Search,
  Shield,
  SlidersHorizontal,
  UserPlus,
  Users,
  User,
  X,
} from "lucide-react";

type Role = "ADMIN" | "ANALYST" | "VIEWER";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type SortKey = "joined-asc" | "joined-desc" | "name";

const ROLE_META: Record<
  Role,
  {
    label: string;
    permissionTitle: string;
    permissionDetail: string;
    avatar: string;
    selectClass: string;
    PermissionIcon: typeof Shield;
  }
> = {
  ADMIN: {
    label: "Admin",
    permissionTitle: "Full access",
    permissionDetail: "Can manage all settings and members.",
    avatar: "bg-[#635BFF]",
    selectClass: "border-[#C7C3FF] bg-[#F8F7FF] text-[#635BFF]",
    PermissionIcon: Shield,
  },
  ANALYST: {
    label: "Analyst",
    permissionTitle: "Analyst access",
    permissionDetail: "Can view reports and analyze feedback.",
    avatar: "bg-[#3B82F6]",
    selectClass: "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]",
    PermissionIcon: BarChart3,
  },
  VIEWER: {
    label: "Viewer",
    permissionTitle: "Viewer access",
    permissionDetail: "Can view feedback and reports.",
    avatar: "bg-[#12B76A]",
    selectClass: "border-[#A7F3D0] bg-[#ECFDF3] text-[#059669]",
    PermissionIcon: Eye,
  },
};

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts[0]?.length) return parts[0][0].toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MembersPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ANALYST" as Role,
  });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [sort, setSort] = useState<SortKey>("joined-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === "ADMIN";
  const currentUserId = session?.user?.id;

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setFiltersOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuFor(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
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
        m.id === userId ? { ...m, role: newRole as Role } : m
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
    setInviteOpen(false);
    loadMembers();
  }

  async function copyEmail(member: Member) {
    try {
      await navigator.clipboard.writeText(member.email);
      setCopiedId(member.id);
      setMenuFor(null);
      setTimeout(() => setCopiedId((cur) => (cur === member.id ? null : cur)), 1600);
    } catch {
      setError("Couldn't copy email.");
    }
  }

  const stats = useMemo(() => {
    const admins = members.filter((m) => m.role === "ADMIN").length;
    const limited = members.length - admins;
    return { total: members.length, admins, limited };
  }, [members]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = members.filter((m) => {
      const roleOk = roleFilter === "ALL" || m.role === roleFilter;
      const textOk =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      return roleOk && textOk;
    });

    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === "joined-desc" ? db - da : da - db;
    });
  }, [members, query, roleFilter, sort]);

  return (
    <div className="min-h-screen px-8 pb-10 pt-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-[#0A2540]">
              Team members
            </h1>
            <p className="mt-1.5 text-[14px] text-[#697386]">
              Manage your teammates and their roles &amp; permissions.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setInviteOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#635BFF] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#524AE0]"
            >
              <UserPlus size={16} />
              Add teammate
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-3.5 py-2.5 text-[13px] text-[#B42318]">
            {error}
          </div>
        )}
        {inviteSuccess && (
          <div className="mb-4 rounded-lg border border-[#A7F3D0] bg-[#ECFDF3] px-3.5 py-2.5 text-[13px] text-[#067647]">
            {inviteSuccess}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={<Users size={18} />}
            iconClass="bg-[#F3F1FF] text-[#635BFF]"
            value={loading ? "—" : String(stats.total)}
            label="Total members"
            hint="Active teammates in workspace."
          />
          <SummaryCard
            icon={<Shield size={18} />}
            iconClass="bg-[#EFF6FF] text-[#2563EB]"
            value={loading ? "—" : String(stats.admins)}
            label="Admins"
            hint="Full access to workspace."
          />
          <SummaryCard
            icon={<User size={18} />}
            iconClass="bg-[#ECFDF3] text-[#12B76A]"
            value={loading ? "—" : String(stats.limited)}
            label="Analysts & Viewers"
            hint="Limited access."
          />
        </div>

        <div className="rounded-xl border border-[#E3E8EE] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF2F6] p-4">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3 py-2">
              <Search size={16} className="shrink-0 text-[#A3ACB9]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members by name or email..."
                className="w-full bg-transparent text-[13.5px] text-[#0A2540] outline-none placeholder:text-[#A3ACB9]"
              />
            </div>

            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "ALL" | Role)}
                className="appearance-none rounded-lg border border-[#E3E8EE] bg-white py-2 pl-3 pr-9 text-[13.5px] text-[#425466] outline-none"
              >
                <option value="ALL">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="ANALYST">Analyst</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8A94A6]"
              />
            </div>

            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={`flex h-[38px] w-[38px] items-center justify-center rounded-lg border ${
                  filtersOpen
                    ? "border-[#C7C3FF] bg-[#F8F7FF] text-[#635BFF]"
                    : "border-[#E3E8EE] text-[#697386] hover:bg-[#F6F9FC]"
                }`}
                title="More filters"
              >
                <SlidersHorizontal size={16} />
              </button>
              {filtersOpen && (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-[#E3E8EE] bg-white p-2 shadow-lg">
                  <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8A94A6]">
                    Sort by
                  </p>
                  {(
                    [
                      ["joined-asc", "Joined (oldest)"],
                      ["joined-desc", "Joined (newest)"],
                      ["name", "Name A–Z"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSort(key);
                        setFiltersOpen(false);
                      }}
                      className={`block w-full rounded-md px-2 py-1.5 text-left text-[13px] ${
                        sort === key
                          ? "bg-[#F8F7FF] font-medium text-[#635BFF]"
                          : "text-[#425466] hover:bg-[#F6F9FC]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-[#EEF2F6] text-[12px] font-medium uppercase tracking-wide text-[#8A94A6]">
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Permissions</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-[#697386]">
                      Loading members...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-[#697386]">
                      No members match your search.
                    </td>
                  </tr>
                ) : (
                  visible.map((member) => {
                    const meta = ROLE_META[member.role];
                    const Icon = meta.PermissionIcon;
                    const isYou = member.id === currentUserId;

                    return (
                      <tr key={member.id} className="border-b border-[#EEF2F6] last:border-0">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white ${meta.avatar}`}
                            >
                              {initials(member.name, member.email)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-[14px] font-semibold text-[#0A2540]">
                                  {member.name}
                                </p>
                                {isYou && (
                                  <span className="rounded-full bg-[#F3F1FF] px-2 py-0.5 text-[11px] font-medium text-[#635BFF]">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-[13px] text-[#697386]">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {isAdmin ? (
                            <div className="relative inline-block">
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className={`appearance-none rounded-lg border py-1.5 pl-3 pr-8 text-[13px] font-medium outline-none ${meta.selectClass}`}
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="ANALYST">Analyst</option>
                                <option value="VIEWER">Viewer</option>
                              </select>
                              <ChevronDown
                                size={13}
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70"
                              />
                            </div>
                          ) : (
                            <span
                              className={`inline-flex rounded-lg border px-3 py-1.5 text-[13px] font-medium ${meta.selectClass}`}
                            >
                              {meta.label}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 text-[#8A94A6]">
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className="text-[13.5px] font-medium text-[#0A2540]">
                                {meta.permissionTitle}
                              </p>
                              <p className="text-[12.5px] text-[#697386]">{meta.permissionDetail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-2 text-[13px] text-[#425466]">
                            <Calendar size={14} className="text-[#A3ACB9]" />
                            {formatJoined(member.createdAt)}
                          </div>
                        </td>
                        <td className="relative px-5 py-4 text-right" ref={menuFor === member.id ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={() =>
                              setMenuFor((cur) => (cur === member.id ? null : member.id))
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E8EE] text-[#697386] hover:bg-[#F6F9FC]"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {menuFor === member.id && (
                            <div className="absolute right-5 z-20 mt-1 w-44 rounded-lg border border-[#E3E8EE] bg-white py-1 text-left shadow-lg">
                              <button
                                type="button"
                                onClick={() => copyEmail(member)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#425466] hover:bg-[#F6F9FC]"
                              >
                                <Copy size={13} />
                                {copiedId === member.id ? "Copied" : "Copy email"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#DDD9FF] bg-[#F5F3FF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#635BFF] shadow-sm">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#0A2540]">
                About roles &amp; permissions
              </p>
              <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-[#4B5565]">
                Admins manage settings and teammates. Analysts can review reports and
                analyze feedback. Viewers can look at feedback and reports without
                making changes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLearnOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E3E8EE] bg-white px-3.5 py-2 text-[13px] font-medium text-[#425466] hover:bg-[#F8F7FF]"
          >
            Learn more
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/30 px-4"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-[#0A2540]">Add teammate</h3>
                <p className="mt-1 text-[13px] text-[#697386]">
                  They&apos;ll join this workspace with the role you choose.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-md p-1 text-[#8A94A6] hover:bg-[#F6F9FC]"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-3">
              <label className="block text-[13px] font-medium text-[#425466]">
                Name
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border border-[#E3E8EE] px-3 py-2 text-[14px] text-[#0A2540] outline-none focus:border-[#635BFF]"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                />
              </label>
              <label className="block text-[13px] font-medium text-[#425466]">
                Email
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-[#E3E8EE] px-3 py-2 text-[14px] text-[#0A2540] outline-none focus:border-[#635BFF]"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </label>
              <label className="block text-[13px] font-medium text-[#425466]">
                Initial password
                <input
                  type="text"
                  required
                  minLength={8}
                  className="mt-1 w-full rounded-lg border border-[#E3E8EE] px-3 py-2 text-[14px] text-[#0A2540] outline-none focus:border-[#635BFF]"
                  value={inviteForm.password}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, password: e.target.value })
                  }
                />
                <span className="mt-1 block text-[12px] font-normal text-[#8A94A6]">
                  Share this with them directly — there&apos;s no email invite system.
                </span>
              </label>
              <label className="block text-[13px] font-medium text-[#425466]">
                Role
                <select
                  className="mt-1 w-full rounded-lg border border-[#E3E8EE] px-3 py-2 text-[14px] text-[#0A2540] outline-none"
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value as Role })
                  }
                >
                  <option value="ADMIN">Admin</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-lg border border-[#E3E8EE] px-4 py-2 text-[13.5px] font-medium text-[#425466]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-lg bg-[#635BFF] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#524AE0] disabled:opacity-50"
                >
                  {inviting ? "Adding..." : "Add teammate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {learnOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/30 px-4"
          onClick={() => setLearnOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[#E3E8EE] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-[16px] font-semibold text-[#0A2540]">
                Roles &amp; permissions
              </h3>
              <button
                type="button"
                onClick={() => setLearnOpen(false)}
                className="rounded-md p-1 text-[#8A94A6] hover:bg-[#F6F9FC]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {(Object.keys(ROLE_META) as Role[]).map((role) => {
                const meta = ROLE_META[role];
                const Icon = meta.PermissionIcon;
                return (
                  <div
                    key={role}
                    className="flex gap-3 rounded-lg border border-[#E3E8EE] p-3"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-white ${meta.avatar}`}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#0A2540]">{meta.label}</p>
                      <p className="text-[13px] text-[#425466]">{meta.permissionDetail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setLearnOpen(false)}
              className="mt-4 w-full rounded-lg bg-[#635BFF] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#524AE0]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  iconClass,
  value,
  label,
  hint,
}: {
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[#E3E8EE] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
        {icon}
      </div>
      <p className="text-[26px] font-bold leading-none text-[#0A2540]">{value}</p>
      <p className="mt-2 text-[13.5px] font-medium text-[#0A2540]">{label}</p>
      <p className="text-[12.5px] text-[#697386]">{hint}</p>
    </div>
  );
}
