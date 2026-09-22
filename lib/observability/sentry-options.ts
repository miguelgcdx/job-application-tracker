/**
 * Shared Sentry privacy/configuration boundary for browser, Node, and Edge setup.
 * One options factory keeps their filtering policy aligned; configuration alone
 * does not prove that events reach Sentry or that source maps resolve there.
 */
import type { BrowserOptions, ErrorEvent, Event } from "@sentry/nextjs";
import { z } from "zod";

type TransactionEvent = Parameters<NonNullable<BrowserOptions["beforeSendTransaction"]>>[0];

interface SentryEnvironment {
  dsn?: string;
  nodeEnv?: string;
  vercelEnv?: string;
  release?: string;
}

const releaseSchema = z.string().max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const environmentSchema = z.enum(["development", "preview", "production", "test"]);
const identifierSchema = z.string().max(80).regex(/^[a-zA-Z_$][\w.$]*$/);
const idSchema = z.string().regex(/^(?:[a-f0-9]{16}|[a-f0-9]{32})$/i);
const dsnSchema = z.url({ protocol: /^https$/ }).max(2048)
  .regex(/^https:\/\/[a-zA-Z0-9]+@[a-zA-Z0-9.-]+(?::\d+)?\/(?:[a-zA-Z0-9_-]+\/)*\d+$/);

// Keep only compiled asset paths, never origins, query strings, or local usernames.
function assetPath(value: string | undefined): string | undefined {
  return value?.split(/[?#]/, 1)[0].match(/(?:\/_next\/static\/|\/\.next\/server\/)[a-zA-Z0-9_./()[\]-]+\.js$/)?.[0];
}

/**
 * Rebuild an event from an allowlist rather than trying to redact every SDK field.
 * Drops messages, exception text, request/user data, breadcrumbs, tags, and extras
 * that could contain credentials or application content. Retains validated IDs,
 * bounded exception type names, and compiled stack/source-map locations for diagnosis.
 * Transactions retain timing but use a fixed name and no potentially sensitive spans.
 */
export function sanitizeSentryEvent(event: Event): Event {
  const trace = event.contexts?.trace;
  const trace_id = z.string().regex(/^[a-f0-9]{32}$/i).safeParse(trace?.trace_id).data;
  const span_id = z.string().regex(/^[a-f0-9]{16}$/i).safeParse(trace?.span_id).data;
  return {
    event_id: idSchema.safeParse(event.event_id).data,
    timestamp: event.timestamp,
    platform: "javascript",
    level: event.level,
    exception: event.exception && {
      values: event.exception.values?.map((exception) => ({
        type: identifierSchema.safeParse(exception.type).data,
        stacktrace: exception.stacktrace && {
          frames: exception.stacktrace.frames?.map((frame) => ({
            filename: assetPath(frame.filename),
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        },
      })),
    },
    contexts: trace_id && span_id ? {
      trace: {
        trace_id,
        span_id,
        parent_span_id: idSchema.safeParse(trace?.parent_span_id).data,
      },
    } : undefined,
    debug_meta: event.debug_meta && {
      images: event.debug_meta.images?.flatMap((image) => {
        const code_file = assetPath(image.code_file);
        const debug_id = z.uuid().safeParse(image.debug_id).data;
        return code_file && debug_id ? [{ type: "sourcemap", code_file, debug_id }] : [];
      }),
    },
    ...(event.type === "transaction" ? {
      type: "transaction",
      transaction: "application",
      start_timestamp: event.start_timestamp,
      spans: [],
    } as const : {}),
  };
}

/**
 * Build common runtime options with validated labels and pre-transport sanitization.
 * A missing or malformed HTTPS DSN disables collection; validation checks its shape,
 * not whether the destination exists or accepts events. Invalid releases are omitted.
 */
export function getSentryOptions(input: SentryEnvironment) {
  const dsn = dsnSchema.safeParse(input.dsn).data;
  // Prefer a recognized Vercel environment, then Node's; unknown labels fall back
  // to production rather than forwarding arbitrary configuration into telemetry.
  const environment = environmentSchema.safeParse(input.vercelEnv).data
    ?? environmentSchema.safeParse(input.nodeEnv).data ?? "production";
  const release = releaseSchema.safeParse(input.release).data;
  const sanitize = (event: Event) => ({ ...sanitizeSentryEvent(event), environment, release });
  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    release,
    // Minimize collection as well as payloads: no default PII, logs, metrics,
    // replay, or breadcrumbs. The event allowlist remains a separate safeguard.
    sendDefaultPii: false,
    debug: false,
    enableLogs: false,
    enableMetrics: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maxBreadcrumbs: 0,
    // Trace all when both environment labels are development, sample 10% under production Node, and
    // otherwise opt out. Missing DSNs and either test label always take precedence.
    tracesSampleRate: !dsn || input.nodeEnv === "test" || environment === "test" ? 0
      : input.nodeEnv === "development" && environment === "development" ? 1
      : input.nodeEnv === "production" ? 0.1 : 0,
    // Sanitize both error and transaction payloads before transport, then restore
    // only validated deployment labels so raw event context cannot leave the app.
    beforeSend: (event: ErrorEvent): ErrorEvent => ({ ...sanitize(event), type: undefined }),
    beforeSendTransaction: (event: TransactionEvent): TransactionEvent => ({ ...sanitize(event), type: "transaction" }),
  };
}
