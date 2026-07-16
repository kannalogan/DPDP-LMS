import { readFileSync } from "node:fs";

const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const BLOCKED_ENVIRONMENTS = new Set(["production", "preview", "staging"]);

export function readEnvironmentFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          const key = line.slice(0, separator);
          const raw = line.slice(separator + 1).trim();
          const value = raw.replace(/^(['"])(.*)\1$/, "$2");
          return [key, value];
        })
    );
  } catch {
    return {};
  }
}

export function assertLocalBootstrapEnvironment(environment) {
  const deploymentEnvironment = String(environment.VERCEL_ENV ?? "").toLowerCase();
  const nodeEnvironment = String(environment.NODE_ENV ?? "development").toLowerCase();
  if (
    BLOCKED_ENVIRONMENTS.has(deploymentEnvironment) ||
    BLOCKED_ENVIRONMENTS.has(nodeEnvironment)
  ) {
    throw new Error("Local bootstrap is disabled in staging, preview, and production.");
  }
  if (/^(1|true)$/i.test(String(environment.CI ?? ""))) {
    throw new Error("Local bootstrap is disabled in CI.");
  }

  let supabaseUrl;
  try {
    supabaseUrl = new URL(String(environment.NEXT_PUBLIC_SUPABASE_URL ?? ""));
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must identify the local Supabase API.");
  }
  if (supabaseUrl.protocol !== "http:" || !LOCAL_HOSTS.has(supabaseUrl.hostname)) {
    throw new Error("Local bootstrap refuses non-loopback Supabase URLs.");
  }
  return supabaseUrl;
}

export function normalizeBootstrapEmails(input) {
  const result = {
    admin: String(input.admin ?? "")
      .trim()
      .toLowerCase(),
    mentor: String(input.mentor ?? "")
      .trim()
      .toLowerCase(),
    student: String(input.student ?? "")
      .trim()
      .toLowerCase()
  };
  for (const [role, email] of Object.entries(result)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`A valid ${role} email is required.`);
    }
  }
  if (new Set(Object.values(result)).size !== 3) {
    throw new Error("Student, mentor, and admin emails must be distinct.");
  }
  return result;
}

export function assertLocalDatabaseUrl(value) {
  const databaseUrl = new URL(value);
  if (!LOCAL_HOSTS.has(databaseUrl.hostname)) {
    throw new Error("Supabase CLI returned a non-local database URL; refusing bootstrap.");
  }
  return databaseUrl;
}
