/**
 * Loads the signed-in user's dashboard. Keeping this page a Server Component
 * lets session checks and database access stay on the server; KanbanBoard owns interactivity.
 */
import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";
import { redirect } from "next/navigation";
import KanbanBoard from "@/components/kanban-board";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logServerEvent } from "@/lib/observability/server-logger";

/**
 * Connects to MongoDB, loads the user's Job Hunt board with columns and jobs,
 * and serializes it for the client. Returns null when absent; logs failures
 * without document contents and rethrows them rather than masking an outage.
 */
async function getBoard(userId: string) {
  const startedAt = performance.now();
  try {
    // Keep retries fresh, including when a previously missing board becomes available.
    await connectDB();
    const boardDoc = await Board.findOne({ userId, name: "Job Hunt" }).populate({
      path: "columns",
      populate: { path: "jobApplications" },
    });
    if (!boardDoc) return null;
    // Hydrated Mongoose documents carry methods and BSON values. The JSON round-trip
    // produces plain data for KanbanBoard's Client Component props (dates become strings).
    return JSON.parse(JSON.stringify(boardDoc));
  } catch (error) {
    logServerEvent({ event: "board_load", operation: "load", outcome: "failure",
      durationMs: performance.now() - startedAt, errorType: "internal" });
    throw error;
  }
}

export default async function Dashboard() {
  // Authenticate before querying with the session's user ID, not caller-supplied ownership.
  // This page guards loading only: mutations must independently check session and ownership.
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const board = await getBoard(session.user.id);

  // A successful query with no board gets a retryable fallback. Database failures
  // are rethrown by getBoard and reach the error boundary instead of appearing as missing data.
  if (!board) {
    return (
      <main className="min-h-screen bg-white p-6">
        <section aria-labelledby="missing-board-title" className="mx-auto max-w-xl space-y-4 rounded-lg border p-6">
          <h1 id="missing-board-title" className="text-2xl font-bold text-black">Your board isn&apos;t available yet</h1>
          <p className="text-gray-600">Try loading your dashboard again. If your board still isn&apos;t available, return home and try again later.</p>
          <div className="flex flex-wrap gap-3">
            <form action="/dashboard" method="get"><Button type="submit">Try again</Button></form>
            <Button asChild variant="outline"><Link href="/">Return home</Link></Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">Job Hunt</h1>
          <p className="text-gray-600">Track your job applications</p>
        </div>
        <KanbanBoard board={board} />
      </div>
    </div>
  );
}
