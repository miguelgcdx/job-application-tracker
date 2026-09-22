// Next.js uses this as the segment's Suspense fallback while route content loads;
// shared layouts remain interactive rather than being replaced by the skeleton.
export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto space-y-6 p-6" role="status" aria-live="polite" aria-busy="true">
        <h1 className="text-3xl font-bold text-black">Job Hunt</h1>
        <p className="text-gray-600">Loading your dashboard…</p>
        <div aria-hidden="true" className="grid gap-4 md:grid-cols-3 motion-safe:animate-pulse">
          {[0, 1, 2].map((column) => <div key={column} className="h-64 rounded-lg border bg-gray-100" />)}
        </div>
      </div>
    </main>
  );
}
