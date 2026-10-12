"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Incorrect password");
      return;
    }

    const destination = searchParams.get("from") || "/";
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pale-pink px-4">
      <form
        onSubmit={handleSubmit}
        className="card-shadow w-full max-w-sm rounded-[28px] bg-white p-8"
      >
        <div className="rainbow-bar mb-6" />
        <p className="script-accent mb-1 text-2xl">just for you</p>
        <h1 className="mb-1 font-heading text-2xl font-semibold text-ink">
          Idea Vault
        </h1>
        <p className="mb-6 text-sm text-ink-soft">Enter the password to continue.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mb-3 w-full rounded-xl border border-pale-pink px-3 py-2 text-sm outline-none focus:border-hot-pink"
        />

        {error && <p className="mb-3 text-sm text-hot-pink">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-hot-pink px-3 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(235,81,143,0.28)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
