"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import AuthShell, { inputClass, labelClass } from "../components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your company workspace to review feedback, themes, and reports."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2.5 text-[13.5px] text-[#B42318]">
            {error}
          </div>
        )}

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
            placeholder="Your password"
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
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="pt-1 text-center text-[13.5px] text-[#697386]">
          Don&apos;t have a workspace yet?{" "}
          <Link href="/signup" className="font-medium text-[#635BFF] hover:text-[#524AE0]">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
