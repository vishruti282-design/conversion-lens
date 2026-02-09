"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
  }

  return (
    <main className="min-h-screen bg-sage flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-lg p-10 max-w-[400px] w-full space-y-6">
        <div className="space-y-1">
          <h1 className="font-heading italic text-4xl text-brand">
            Conversion Lens
          </h1>
          <p className="font-body italic text-secondary text-sm">
            See what your page is really saying
          </p>
        </div>

        <div className="h-px bg-brand/30" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-dark"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-dark/15 bg-white text-dark placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-dark"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-dark/15 bg-white text-dark placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
              required
            />
          </div>

          {error && (
            <p className="text-critical text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-brand text-white font-semibold py-2.5 px-6 rounded-lg transition-colors hover:bg-brand/90"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
