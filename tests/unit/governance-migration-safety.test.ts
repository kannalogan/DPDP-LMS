import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001200_governance_compliance_platform.sql"),
  "utf8"
);
const tables = [
  "governance_controls",
  "control_evidence_versions",
  "audit_sessions",
  "audit_findings",
  "policy_versions",
  "policy_acknowledgements",
  "risk_register",
  "retention_events",
  "privacy_requests",
  "consent_withdrawals",
  "legal_holds",
  "governance_events"
];
const rpcs = [
  "create_control",
  "publish_control",
  "record_evidence",
  "verify_evidence",
  "start_audit",
  "close_audit",
  "record_finding",
  "resolve_finding",
  "create_policy",
  "publish_policy",
  "acknowledge_policy",
  "create_risk",
  "review_risk",
  "approve_exception",
  "submit_privacy_request",
  "approve_privacy_request",
  "complete_privacy_request",
  "run_retention_job",
  "record_governance_event"
];

describe("governance migration safety", () => {
  it("is one additive, contract-referenced migration", () => {
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).toContain("SYRA-ADR: ADR-015");
    expect(migration).toContain("SYRA-CONTRACT:");
    expect(migration).not.toMatch(/delete\s+from|drop\s+(table|schema)/i);
  });
  it("creates the canonical table and RPC inventory", () => {
    for (const table of tables)
      expect(migration).toContain(`create table if not exists public.${table}`);
    for (const rpc of rpcs) expect(migration).toContain(`function public.${rpc}`);
  });
  it("forces RLS and keeps event evidence immutable", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("reject_governance_evidence_mutation");
    expect(migration).toContain("protect_published_governance_version");
  });
  it("uses security-invoker projections and no business seed", () => {
    expect(migration.match(/security_invoker=true/g)?.length).toBe(8);
    expect(migration).toContain("SYRA-SEED: deployment-reference");
    expect(migration).not.toContain("SYRA-BUSINESS-SEED");
  });
});
