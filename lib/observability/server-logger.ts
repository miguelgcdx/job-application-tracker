/**
 * Structured server logging boundary: emit only bounded operational metadata,
 * never arbitrary messages, request data, or exception details that may carry PII.
 * Stable JSON fields support filtering and aggregation without parsing free text.
 * Safe output here does not prove downstream ingestion or configured alerting.
 */
import "server-only";

const EVENTS = ["board_load", "job_mutation", "unknown"] as const;
const OPERATIONS = ["load", "create", "update", "delete", "unknown"] as const;
const OUTCOMES = ["success", "failure", "unavailable", "unknown"] as const;
const ERROR_TYPES = ["persistence", "internal", "none", "unknown"] as const;
const ENVIRONMENTS = ["local", "preview", "production", "test", "unknown"] as const;

export interface ServerEvent {
  event: (typeof EVENTS)[number];
  operation: (typeof OPERATIONS)[number];
  outcome: (typeof OUTCOMES)[number];
  durationMs: number;
  errorType?: (typeof ERROR_TYPES)[number];
  environment?: (typeof ENVIRONMENTS)[number];
  release?: string;
}

/** Collapse unexpected runtime labels to a fixed fallback to limit field cardinality. */
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

/**
 * Normalize a caller-classified event into an allowlisted JSON record.
 * Runtime checks also constrain values that bypass the TypeScript contract.
 * Failures use stderr via console.error; other outcomes use console.info.
 * Environment changes labels only, not filtering or the output destination.
 */
export function logServerEvent(input: ServerEvent): void {
  const value: Partial<ServerEvent> = input !== null && typeof input === "object" ? input : {};
  const outcome = enumValue(value.outcome, OUTCOMES, "unknown");
  const environment = value.environment ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const release = value.release ?? process.env.VERCEL_GIT_COMMIT_SHA;
  // Reconstruct the record: never spread caller data or inspect an exception.
  const record = {
    event: enumValue(value.event, EVENTS, "unknown"),
    operation: enumValue(value.operation, OPERATIONS, "unknown"),
    outcome,
    // Keep finite timings as whole milliseconds within 0–24 hours; invalid values become zero.
    durationMs: typeof value.durationMs === "number" && Number.isFinite(value.durationMs)
      ? Math.min(86_400_000, Math.max(0, Math.floor(value.durationMs))) : 0,
    // Retain only the caller's coarse failure category, never an error message or stack.
    // Non-failures always use "none", even if the caller supplied a category.
    errorType: outcome === "failure" ? enumValue(value.errorType, ERROR_TYPES, "unknown") : "none",
    // Prefer the explicit label, then Vercel/Node defaults; unknown labels stay bounded.
    environment: enumValue(environment === "development" ? "local" : environment, ENVIRONMENTS, "unknown"),
    // Only a full commit hash is a release identifier; never emit branch names or URLs.
    // Unlike enum labels, this dimension intentionally varies with deployed commits.
    release: typeof release === "string" && /^[a-f0-9]{40}$/i.test(release) ? release.toLowerCase() : "unknown",
  };
  const serialized = JSON.stringify(record);
  if (outcome === "failure") console.error(serialized);
  else console.info(serialized);
}
