"use client";

import { useEffect } from "react";
import { logger } from "@/lib/observability/logger";

export default function ErrorBoundary({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logger.error("Route rendering failed", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Something went wrong.</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          The request could not be completed. Please try again.
        </p>
        <button
          className="bg-primary text-primary-foreground mt-6 rounded-md px-4 py-2 text-sm font-medium"
          onClick={reset}
          type="button"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
