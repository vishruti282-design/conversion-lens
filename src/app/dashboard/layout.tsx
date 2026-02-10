"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-sage">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-dark/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-heading italic text-xl text-brand">
            Conversion Lens
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard/history"
              className="text-sm text-secondary hover:text-dark transition-colors"
            >
              History
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-secondary hover:text-dark transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
