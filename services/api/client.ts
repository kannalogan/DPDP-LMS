import { AppError } from "@/lib/api/errors";

export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export function createApiClient({ baseUrl, fetcher = fetch }: ApiClientOptions) {
  return {
    async get<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
      const response = await fetcher(`${baseUrl}${path}`, {
        ...init,
        method: "GET"
      });

      if (!response.ok) {
        throw new AppError("BAD_REQUEST", `API request failed with status ${response.status}`);
      }

      return (await response.json()) as TResponse;
    }
  };
}
