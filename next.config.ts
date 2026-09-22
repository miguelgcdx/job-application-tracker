import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { getSentryOptions } from "./lib/observability/sentry-options";

const deployment = getSentryOptions({
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
  release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
});
const canUpload = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Only bounded public labels are inlined, never source-map credentials.
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: deployment.environment,
    NEXT_PUBLIC_SENTRY_RELEASE: deployment.release ?? "",
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: { disable: !canUpload, deleteSourcemapsAfterUpload: true },
  release: { name: deployment.release, create: canUpload, finalize: canUpload },
  bundleSizeOptimizations: { excludeDebugStatements: true },
});
