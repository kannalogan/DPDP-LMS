import { AiExecutionError } from "@/features/ai/errors";

export type RetryAttempt<T> = {
  completedAt: Date;
  error: AiExecutionError | null;
  latencyMs: number;
  startedAt: Date;
  value: T | null;
};

export async function executeWithRetry<T>(options: {
  execute: (signal: AbortSignal) => Promise<T>;
  maxRetries: number;
  random?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs: number;
}) {
  const attempts: RetryAttempt<T>[] = [];
  const sleep =
    options.sleep ??
    ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const random = options.random ?? Math.random;
  for (let index = 0; index <= options.maxRetries; index += 1) {
    const startedAt = new Date();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const value = await options.execute(controller.signal);
      const completedAt = new Date();
      attempts.push({
        completedAt,
        error: null,
        latencyMs: completedAt.getTime() - startedAt.getTime(),
        startedAt,
        value
      });
      return { attempts, value };
    } catch (error) {
      const normalized =
        error instanceof AiExecutionError
          ? error
          : new AiExecutionError(controller.signal.aborted ? "timeout" : "transient", {
              retryable: true
            });
      const completedAt = new Date();
      attempts.push({
        completedAt,
        error: normalized,
        latencyMs: completedAt.getTime() - startedAt.getTime(),
        startedAt,
        value: null
      });
      if (!normalized.retryable || index === options.maxRetries)
        throw new RetryExhaustedError(attempts);
      const backoff = Math.min(250 * 2 ** index + Math.floor(random() * 100), 5000);
      await sleep(backoff);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new RetryExhaustedError(attempts);
}

export class RetryExhaustedError<T> extends Error {
  constructor(readonly attempts: RetryAttempt<T>[]) {
    super("AI provider retries were exhausted.");
    this.name = "RetryExhaustedError";
  }
}
