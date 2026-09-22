import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "./lib/observability/sentry-options";

// The Node branch of register() loads this server SDK bootstrap.
// Shared options keep privacy behavior consistent across runtime-specific entries.
const options = getSentryOptions({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
  release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
});

if (options.enabled) Sentry.init(options);
