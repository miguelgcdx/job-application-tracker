import * as Sentry from "@sentry/nextjs";

// Next.js calls this server instrumentation entry for the active runtime.
// Load only its matching bootstrap so Node and Edge initialization stay separate.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Expose Next.js's request-error hook to Sentry, independently of browser navigation.
export const onRequestError = Sentry.captureRequestError;
