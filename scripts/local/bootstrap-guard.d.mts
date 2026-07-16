export function readEnvironmentFile(path: string): Record<string, string>;

export function assertLocalBootstrapEnvironment(
  environment: Record<string, string | undefined>
): URL;

export function normalizeBootstrapEmails(input: {
  admin?: string;
  mentor?: string;
  student?: string;
}): { admin: string; mentor: string; student: string };

export function assertLocalDatabaseUrl(value: string): URL;
