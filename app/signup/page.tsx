"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import AuthShell, { inputClass, labelClass } from "../components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    workspaceName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (loginResult?.error) {
      setError("Account created, but login failed. Please try logging in.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="This sets up your company in LOOP and makes you the Admin. You can invite the rest of the team later."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2.5 text-[13.5px] text-[#B42318]">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Your name</label>
          <input
            type="text"
            required
            placeholder="Jordan Lee"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Company / workspace name</label>
          <input
            type="text"
            required
            placeholder="Acme Inc."
            className={inputClass}
            value={form.workspaceName}
            onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            placeholder="you@company.com"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-[#635BFF] py-2.5 text-[14.5px] font-medium text-white hover:bg-[#524AE0] disabled:opacity-50"
        >
          {loading ? "Creating workspace..." : "Create workspace"}
        </button>

        <p className="pt-1 text-center text-[13.5px] text-[#697386]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#635BFF] hover:text-[#524AE0]">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
