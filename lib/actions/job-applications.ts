"use server";

/**
 * UI-facing mutation boundary: these Server Actions connect session identity,
 * domain results, and dashboard refreshes; persistence belongs to the service/store.
 */

import { revalidatePath } from "next/cache";
import { getSession } from "../auth/auth";
import { jobStore } from "../job-applications/mongoose-repository";
import { createJobService, type ErrorCode, type Result } from "../job-applications/service";
import { logServerEvent, type ServerEvent } from "../observability/server-logger";
import type { CreateJobInput, UpdateJobInput } from "../job-applications/schemas";

const service = createJobService(jobStore);
const messages: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Unauthorized",
  INVALID_INPUT: "Invalid job application input",
  NOT_FOUND: "Job application, board, or column not found",
  PERSISTENCE_ERROR: "Unable to save job application. Please try again.",
};

/**
 * Resolve the server session before invoking the service. Returned failures remain
 * typed results; persistence failures are logged, while unexpected throws are
 * logged and rethrown rather than converted into ordinary validation feedback.
 */
async function runMutation<T>(
  operation: Extract<ServerEvent["operation"], "create" | "update" | "delete">,
  work: (actor: string | undefined) => Promise<Result<T>>,
): Promise<Result<T>> {
  const startedAt = performance.now();
  let result: Result<T>;
  try {
    const session = await getSession();
    // Never derive ownership from caller input: pass the authenticated actor to
    // the service so authorization can reach data access, not just the UI boundary.
    // Missing identity is passed as undefined for the service to handle.
    result = await work(session?.user?.id);
    // Only a successful service result triggers revalidation after persistence,
    // allowing server-rendered dashboard data to reconcile with the saved state.
    if (result.ok) revalidatePath("/dashboard");
  } catch (error) {
    logServerEvent({ event: "job_mutation", operation, outcome: "failure",
      durationMs: performance.now() - startedAt, errorType: "internal" });
    throw error;
  }
  if (!result.ok && result.code === "PERSISTENCE_ERROR") {
    logServerEvent({ event: "job_mutation", operation, outcome: "failure",
      durationMs: performance.now() - startedAt, errorType: "persistence" });
  }
  return result;
}

/**
 * Submit new application fields to the service and return its saved data, or a
 * fixed user-facing error message instead of exposing internal failure details.
 */
export async function createJobApplication(data: CreateJobInput) {
  const result = await runMutation("create", (actor) => service.create(actor, data));
  if (!result.ok) return { error: messages[result.code] };
  return { data: result.data };
}

/**
 * Submit a target ID and edited fields under the session actor's identity;
 * return updated data or a fixed message for a returned service failure.
 */
export async function updateJobApplication(id: string, updates: UpdateJobInput) {
  const result = await runMutation("update", (actor) => service.update(actor, id, updates));
  if (!result.ok) return { error: messages[result.code] };
  return { data: result.data };
}

/**
 * Request deletion of the target ID under the session actor's identity;
 * return a success marker or a fixed message for a returned service failure.
 */
export async function deleteJobApplication(id: string) {
  const result = await runMutation("delete", (actor) => service.delete(actor, id));
  if (!result.ok) return { error: messages[result.code] };
  return { success: true };
}
