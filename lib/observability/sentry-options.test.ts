import type { Event } from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSentryOptions, sanitizeSentryEvent } from "./sentry-options";

type TransactionEvent = Parameters<ReturnType<typeof getSentryOptions>["beforeSendTransaction"]>[0];

const sdk = vi.hoisted(() => ({ init: vi.fn(), captureRequestError: vi.fn(), captureRouterTransitionStart: vi.fn() }));
vi.mock("@sentry/nextjs", () => sdk);
afterEach(() => vi.unstubAllEnvs());

const dsn = "https://public@example.invalid/1";
const privateEvent: Event = {
  event_id: "a".repeat(32), timestamp: 123, level: "error",
  user: { id: "private-user", email: "private@example.invalid" },
  request: { url: "https://private.invalid/jobs/private-job?notes=private", headers: { cookie: "private" }, cookies: { session: "private" }, data: "private", query_string: "private" },
  message: "private company", logentry: { message: "private salary" },
  breadcrumbs: [{ message: "private notes" }],
  extra: { job: "private-job", company: "private-company", description: "private-description", notes: "private-notes", salary: "private-salary", tags: ["private-tag"], boardId: "private-board" },
  tags: { userId: "private-user", jobId: "private-job" },
  contexts: { application: { boardId: "private-board" } },
  transaction: "/jobs/private-job", fingerprint: ["private"], server_name: "private-host",
  exception: { values: [{ type: "TypeError", value: "private error", stacktrace: { frames: [{
    filename: "https://private.invalid/_next/static/chunks/app.js?token=private#private",
    lineno: 12, colno: 4, in_app: true, vars: { notes: "private" }, context_line: "private source",
  }] } }] },
};

describe("Sentry entry points", () => {
  it.each(["", dsn])("initializes only with a DSN in browser, server and edge", async (value) => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", value);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SENTRY_RELEASE", "v1.2.3");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "preview");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_RELEASE", "v1.2.3");
    const client = await import("../../instrumentation-client");
    const instrumentation = await import("../../instrumentation");
    expect(client.onRouterTransitionStart).toBe(sdk.captureRouterTransitionStart);
    expect(instrumentation.onRequestError).toBe(sdk.captureRequestError);
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await instrumentation.register();
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await instrumentation.register();
    expect(sdk.init).toHaveBeenCalledTimes(value ? 3 : 0);
    for (const [options] of sdk.init.mock.calls) {
      expect(options).toMatchObject({ dsn, environment: "preview", release: "v1.2.3", tracesSampleRate: 0.1, sendDefaultPii: false });
      expect(JSON.stringify(options.beforeSend({ ...privateEvent, type: undefined }))).not.toContain("private");
    }
  });

  it("does not initialize for unrelated runtimes", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_RUNTIME", "unknown");
    const { register } = await import("../../instrumentation");
    await register();
    expect(sdk.init).not.toHaveBeenCalled();
  });
});

describe("Sentry privacy", () => {
  it("removes application data without mutating the original and retains a useful stack", () => {
    const original = structuredClone(privateEvent);
    const sanitized = sanitizeSentryEvent(privateEvent);
    expect(JSON.stringify(sanitized)).not.toContain("private");
    expect(privateEvent).toEqual(original);
    expect(sanitized).not.toBe(privateEvent);
    expect(sanitized.exception?.values?.[0]).toEqual({ type: "TypeError", stacktrace: { frames: [{
      filename: "/_next/static/chunks/app.js", lineno: 12, colno: 4, in_app: true,
    }] } });
  });

  it("disables telemetry without a DSN", () => {
    expect(getSentryOptions({ nodeEnv: "production" })).toMatchObject({
      enabled: false, tracesSampleRate: 0, sendDefaultPii: false,
      enableLogs: false, enableMetrics: false, debug: false,
    });
  });

  it.each([["test", 0], ["development", 1], ["production", 0.1]] as const)("samples %s conservatively", (nodeEnv, rate) => {
    expect(getSentryOptions({ dsn, nodeEnv })).toMatchObject({ enabled: true, tracesSampleRate: rate });
    expect(getSentryOptions({ nodeEnv }).tracesSampleRate).toBe(0);
  });

  it("bounds environment/release and rejects malformed or empty DSNs", () => {
    const preview = getSentryOptions({ dsn, nodeEnv: "production", vercelEnv: "preview", release: "a".repeat(40) });
    expect(preview).toMatchObject({ environment: "preview", release: "a".repeat(40), tracesSampleRate: 0.1 });
    expect(getSentryOptions({ dsn, nodeEnv: "test", vercelEnv: "production" }).tracesSampleRate).toBe(0);
    expect(getSentryOptions({ dsn, nodeEnv: "production", vercelEnv: "development" }).tracesSampleRate).toBe(0.1);
    expect(getSentryOptions({ dsn, nodeEnv: "unknown" }).tracesSampleRate).toBe(0);
    for (const invalid of ["", " ", "private", "https://example.invalid", "https://user:password@example.invalid/1"]) {
      expect(getSentryOptions({ dsn: invalid, nodeEnv: "development" }).enabled).toBe(false);
    }
    for (const release of ["private/name@example.invalid", "a".repeat(65), "\nprivate"]) {
      expect(getSentryOptions({ release, vercelEnv: "private-env" })).toMatchObject({ environment: "production", release: undefined });
    }
  });

  it("sanitizes transaction names, spans, metadata, and contexts as well as errors", () => {
    const options = getSentryOptions({ dsn, nodeEnv: "production", release: "v1.2.3" });
    const transaction: TransactionEvent = {
      ...structuredClone(privateEvent), type: "transaction", start_timestamp: 120,
      release: "private-release", environment: "private-environment",
      contexts: { trace: { trace_id: "a".repeat(32), span_id: "b".repeat(16), data: { query: "private" }, op: "private" }, application: { jobId: "private" } },
      spans: [{ trace_id: "a".repeat(32), span_id: "c".repeat(16), start_timestamp: 120, timestamp: 121, description: "private query", data: { notes: "private" } }],
      sdkProcessingMetadata: { private: "private" },
    };
    const original = structuredClone(transaction);
    const result = options.beforeSendTransaction(transaction);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(transaction).toEqual(original);
    expect(result).toMatchObject({ type: "transaction", transaction: "application", start_timestamp: 120, timestamp: 123, spans: [], environment: "production", release: "v1.2.3", contexts: { trace: { trace_id: "a".repeat(32), span_id: "b".repeat(16) } } });
    expect(options.beforeSend({ ...privateEvent, type: undefined })).toMatchObject({ environment: "production", release: "v1.2.3" });
    expect(JSON.stringify(options.beforeSend({ ...privateEvent, type: undefined }))).not.toContain("private");
  });

  it("drops local paths and stack data, preserves safe debug IDs, and never aliases frames", () => {
    const event = structuredClone(privateEvent);
    event.debug_meta = { images: [{ type: "sourcemap", code_file: "https://private.invalid/_next/static/chunks/app.js", debug_id: "123e4567-e89b-42d3-a456-426614174000" }] };
    const frame = event.exception!.values![0].stacktrace!.frames![0];
    frame.abs_path = "/home/private/app.ts";
    frame.filename = "/home/private/app.ts";
    frame.function = "privateFunction";
    const result = sanitizeSentryEvent(event);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.debug_meta?.images?.[0]).toEqual({ type: "sourcemap", code_file: "/_next/static/chunks/app.js", debug_id: "123e4567-e89b-42d3-a456-426614174000" });
    result.exception!.values![0].stacktrace!.frames![0].lineno = 99;
    expect(frame.lineno).toBe(12);
    expect(sanitizeSentryEvent({})).toMatchObject({ platform: "javascript" });
    expect(getSentryOptions({ dsn })).toMatchObject({ replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, maxBreadcrumbs: 0 });
  });
});
