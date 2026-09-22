import Link from "next/link";
import { Button } from "@/components/ui/button";

// notFound() selects this fallback inside the layout, rather than the unexpected-error UI.
export default function NotFound() {
  return (
    <main className="min-h-screen bg-white p-6">
      <section aria-labelledby="not-found-title" className="mx-auto max-w-xl space-y-4 rounded-lg border p-6">
        <h1 id="not-found-title" className="text-2xl font-bold text-black">Page not found</h1>
        <p className="text-gray-600">This page may have moved or no longer exists. Head back to your dashboard or start from home.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>
          <Button asChild variant="outline"><Link href="/">Return home</Link></Button>
        </div>
      </section>
    </main>
  );
}
