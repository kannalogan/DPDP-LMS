import { AiExecutionError, normalizeProviderHttpError } from "@/features/ai/errors";
import type { AiProviderKey } from "@/features/ai/execution/types";

export type AiHttpTransport = (input: string, init: RequestInit) => Promise<Response>;

export const defaultAiHttpTransport: AiHttpTransport = (input, init) => fetch(input, init);

export async function requestProviderJson(options: {
  body?: unknown;
  headers: Record<string, string>;
  method: "GET" | "POST";
  provider: AiProviderKey;
  signal: AbortSignal;
  transport: AiHttpTransport;
  url: string;
}) {
  let response: Response;
  try {
    const init: RequestInit = {
      headers: options.headers,
      method: options.method,
      redirect: "error",
      signal: options.signal
    };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);
    response = await options.transport(options.url, init);
  } catch (error) {
    if (options.signal.aborted || (error instanceof DOMException && error.name === "AbortError"))
      throw new AiExecutionError("timeout", { provider: options.provider, retryable: true });
    throw new AiExecutionError("transient", { provider: options.provider, retryable: true });
  }
  const payload = await parseJson(response);
  if (!response.ok)
    throw normalizeProviderHttpError(options.provider, response.status, readProviderCode(payload));
  return { payload, response };
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (response.ok) throw new AiExecutionError("invalid_request");
    return null;
  }
}

function readProviderCode(payload: unknown) {
  const root = record(payload);
  const error = record(root.error);
  return string(error.code) ?? string(error.type) ?? string(root.type) ?? string(error.status);
}

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function string(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function safeRegion(response: Response) {
  const value = response.headers.get("x-request-region") ?? response.headers.get("x-goog-region");
  return value?.match(/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/)?.[0] ?? "unspecified";
}
