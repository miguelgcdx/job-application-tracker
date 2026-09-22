"use client";

// Next.js requires a Client Component for this segment's error boundary.
// It catches failures below the segment layout, not failures in that layout itself.

import Link from "next/link";
import { Button } from "@/components/ui/button";

// reset clears the boundary and re-renders its children; it does not re-fetch their contents.
export default function DashboardError({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-white p-6">
      <section aria-labelledby="dashboard-error-title" className="mx-auto max-w-xl space-y-4 rounded-lg border p-6">
        <h1 id="dashboard-error-title" className="text-2xl font-bold text-black">We couldn&apos;t load your dashboard</h1>
        <p className="text-gray-600">Please try again. If the problem continues, return home and come back later.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline"><Link href="/">Return home</Link></Button>
        </div>
      </section>
    </main>
  );
}
