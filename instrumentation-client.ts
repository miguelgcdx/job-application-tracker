import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "./lib/observability/sentry-options";

// Next.js runs this entry in the browser; shared options centralize privacy
// behavior without merging browser, Node, and Edge runtime loading boundaries.
const options = getSentryOptions({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});

if (options.enabled) Sentry.init(options);

// This browser-only hook lets Sentry observe client-side navigation starts.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
