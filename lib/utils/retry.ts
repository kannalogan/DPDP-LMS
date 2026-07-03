export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  { attempts, baseDelayMs, shouldRetry = () => true }: RetryOptions
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error, attempt)) {
        break;
      }

      await delay(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
