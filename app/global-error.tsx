"use client";

// This boundary replaces a failed root layout, so it must provide its own html and body.

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

// Weak references deduplicate StrictMode effects and repeated boundary mounts.
const capturedErrors = new WeakSet<Error>();

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (!capturedErrors.has(error)) {
      capturedErrors.add(error);
      captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main>
          <h1>Something went wrong</h1>
          <p>Please return home and try again.</p>
          {/* A full navigation works even when the root layout failed. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Return home</a>
        </main>
      </body>
    </html>
  );
}
