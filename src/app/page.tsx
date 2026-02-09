"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-sage flex items-center justify-center p-8">
      <div className="bg-surface rounded-2xl shadow-sm border border-white/60 p-12 max-w-lg w-full space-y-6">
        <h1 className="font-heading italic text-5xl text-dark">
          Conversion Lens
        </h1>

        <p className="font-body text-secondary text-lg leading-relaxed">
          Welcome back. You are signed in and ready to analyze landing pages.
        </p>

        <button
          onClick={handleSignOut}
          className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-colors bg-brand hover:bg-brand/90"
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}
