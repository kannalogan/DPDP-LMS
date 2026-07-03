"use client";

import { useEffect } from "react";
import { logger } from "@/lib/observability/logger";

export default function GlobalError({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logger.error("Global rendering failure", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center px-6">
          <section className="max-w-md text-center">
            <h1 className="text-2xl font-semibold">Application unavailable.</h1>
            <p className="mt-3 text-sm">
              A critical error occurred while loading the application shell.
            </p>
            <button onClick={reset} type="button">
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
