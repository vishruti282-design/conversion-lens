"use client";

import { useParams } from "next/navigation";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface rounded-xl p-8 space-y-4">
          <h1 className="font-heading italic text-3xl text-dark">
            Report ready
          </h1>
          <p className="text-secondary">
            Report ID: <span className="font-mono text-dark">{id}</span>
          </p>
          <p className="text-secondary text-sm">
            The full report view will be built in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}
