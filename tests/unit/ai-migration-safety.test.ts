import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001400_ai_platform.sql"),
  "utf8"
);
const tables = [
  "ai_providers",
  "ai_models",
  "ai_model_versions",
  "ai_capabilities",
  "ai_workflows",
  "ai_prompt_templates",
  "ai_prompt_versions",
  "ai_prompt_variables",
  "ai_prompt_runs",
  "ai_prompt_results",
  "ai_usage_events",
  "ai_usage_limits",
  "ai_usage_budgets",
  "ai_feedback",
  "ai_guardrails",
  "ai_guardrail_rules",
  "ai_guardrail_events",
  "ai_conversations",
  "ai_messages",
  "ai_context_windows",
  "ai_embeddings_registry",
  "ai_jobs",
  "ai_job_events",
  "ai_cache",
  "ai_recommendation_events",
  "ai_learning_profiles"
];
const rpcs = [
  "register_ai_provider",
  "register_ai_model",
  "register_ai_capability",
  "create_ai_workflow",
  "create_ai_prompt_template",
  "save_ai_prompt_version",
  "publish_ai_prompt_version",
  "configure_ai_guardrail",
  "set_ai_usage_limit",
  "set_ai_usage_budget",
  "create_ai_conversation",
  "record_ai_feedback",
  "record_ai_recommendation_event",
  "record_ai_guardrail_event"
];
describe("AI migration safety", () => {
  it("is one additive ADR-backed migration", () => {
    expect(migration).toContain("SYRA-ADR: ADR-017");
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).not.toMatch(/delete\s+from|drop\s+(table|schema)/i);
  });
  it("creates the complete table and controlled RPC inventory", () => {
    for (const table of tables)
      expect(migration).toContain(`create table if not exists public.${table}`);
    for (const rpc of rpcs) expect(migration).toContain(`function public.${rpc}`);
  });
  it("forces RLS and immutable evidence", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("reject_ai_event_mutation");
    expect(migration).toContain("reject_published_ai_version_mutation");
    expect(migration.match(/security_invoker=true/g)?.length).toBe(6);
  });
  it("contains no provider credentials or executable embeddings", () => {
    expect(migration).not.toMatch(
      /api[_-]?key|client[_-]?secret|access[_-]?token|provider[_-]?credential/i
    );
    expect(migration).not.toMatch(/embedding\s*(vector|value)|vector\(/i);
    expect(migration).toContain("implementation_state='reserved'");
  });
  it("contains no vendor-specific integration", () => {
    expect(migration).not.toMatch(/openai|gemini|anthropic|claude|bedrock|vertex|ollama/i);
  });
});
