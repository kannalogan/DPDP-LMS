import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706000900_enterprise_reporting.sql"),
  "utf8"
);
describe("reporting migration safety", () => {
  it("is additive and contract referenced", () => {
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).toContain("SYRA-ADR: ADR-012");
    expect(migration).toContain("force row level security");
  });
  it("includes controlled RPCs and immutable evidence", () => {
    for (const rpc of [
      "create_report",
      "run_report",
      "export_report",
      "refresh_kpis",
      "record_report_download"
    ])
      expect(migration).toContain("function public." + rpc);
    expect(migration).toContain("reject_reporting_immutable");
  });
  it("does not seed business data", () =>
    expect(migration).not.toMatch(
      /insert into public\.(report_definitions|analytics_metrics).*seed/i
    ));
});
