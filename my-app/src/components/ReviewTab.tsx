"use client";

import dynamic from "next/dynamic";

// IMPORTANT: react-pdf/pdf.js uses browser-only APIs (e.g., DOMMatrix).
// Load the actual implementation on the client only to avoid SSR crashes.
export const ReviewTab = dynamic(
  () => import("./ReviewTab.client").then((m) => m.ReviewTab),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-slate-500">Loading PDF…</div>
    ),
  }
);
