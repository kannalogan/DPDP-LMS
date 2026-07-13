import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706001500_ai_provider_execution.sql"),
  "utf8"
);
const repository = readFileSync(
  join(root, "features/ai/repositories/ai-execution-repository.ts"),
  "utf8"
);
const engine = readFileSync(join(root, "features/ai/execution/engine.ts"), "utf8");

describe("AI execution migration and secret boundary", () => {
  it("is one additive ADR-backed migration with the controlled inventory", () => {
    expect(migration).toContain("SYRA-ADR: ADR-018");
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration.match(/create table if not exists public\.ai_/g)).toHaveLength(14);
    expect(migration.match(/security_invoker=true/g)).toHaveLength(5);
    expect(migration).not.toMatch(/delete\s+from|drop\s+(table|schema)/i);
  });

  it("forces RLS, denies anonymous access, and protects immutable evidence", () => {
    expect(migration).toContain("alter table public.%I force row level security");
    expect(migration).not.toMatch(/to\s+anon/i);
    expect(migration).toContain("reject_ai_execution_evidence_mutation");
    expect(migration).toContain("revoke all on table public.%I from anon,authenticated");
  });

  it("persists no provider credential or plaintext request and response content", () => {
    expect(migration).not.toMatch(
      /(api[_-]?key|client[_-]?secret|access[_-]?token|provider[_-]?credential)\s+(text|varchar|json)/i
    );
    expect(migration).not.toMatch(/(prompt|input|output|message)_(text|content|plaintext)/i);
    expect(migration).toContain("request_hash");
    expect(migration).toContain("output_hash");
  });

  it("uses RPC-only writes and one controlled adapter execution boundary", () => {
    expect(repository).not.toMatch(/\.from\([^)]*\)\.(insert|update|delete|upsert)/);
    expect(engine).toContain("this.registry.resolve");
    const constructors = walk(join(root, "features/ai"))
      .filter((path) => path.endsWith(".ts") || path.endsWith(".tsx"))
      .filter((path) =>
        /new (OpenAiAdapter|AnthropicAdapter|GeminiAdapter)/.test(readFileSync(path, "utf8"))
      );
    expect(constructors.map((path) => path.replace(`${root}/`, ""))).toEqual([
      "features/ai/adapters/registry.ts"
    ]);
  });

  it("keeps every checked-in environment free of public AI secrets", () => {
    for (const file of readdirSync(root).filter(
      (name) => name.startsWith(".env") && name.endsWith(".example")
    )) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source).not.toMatch(/NEXT_PUBLIC_(OPENAI|ANTHROPIC|GEMINI|AI_)/);
      expect(source).not.toMatch(/(OPENAI|ANTHROPIC|GEMINI)_API_KEY=\S+/);
    }
  });
});

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
