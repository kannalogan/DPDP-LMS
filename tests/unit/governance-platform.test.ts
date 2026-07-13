import { describe, expect, it } from "vitest";
import {
  emptyGovernanceDashboard,
  mapFinding,
  mapGovernanceDashboard,
  mapPolicyAssignment,
  mapPrivacyRequest,
  mapRisk
} from "@/features/governance/mappers";
import {
  createControlSchema,
  createRiskSchema,
  privacyRequestSchema
} from "@/features/governance/schemas";
import {
  criticalFindings,
  highRisks,
  overduePrivacyRequests
} from "@/features/governance/selectors";
import { canTransitionGovernanceState } from "@/features/governance/workflow";

const organizationId = "11111111-1111-4111-8111-111111111111";
describe("governance platform", () => {
  it("maps dashboard and risk projections to DTOs", () => {
    expect(mapGovernanceDashboard({ organization_id: organizationId, open_findings: 2 })).toEqual({
      openFindings: 2,
      openPrivacyRequests: 0,
      openRisks: 0,
      organizationId,
      publishedControls: 0
    });
    expect(mapRisk({ id: "risk-1", likelihood: 4, impact: 5, risk_score: 20 })).toMatchObject({
      id: "risk-1",
      riskScore: 20
    });
    expect(emptyGovernanceDashboard(organizationId).organizationId).toBe(organizationId);
  });
  it("maps policy and privacy DTOs without raw database fields", () => {
    const policy = mapPolicyAssignment({ id: "a1", policy_version_id: "v1", acknowledged: true });
    const request = mapPrivacyRequest({ id: "p1", case_number: "PR-1", overdue: true });
    expect(policy).toEqual({
      acknowledged: true,
      dueAt: null,
      id: "a1",
      mandatory: true,
      policyVersionId: "v1",
      title: "",
      version: 0
    });
    expect(request.caseNumber).toBe("PR-1");
    expect(request).not.toHaveProperty("requester_profile_id");
  });
  it("validates control, risk, and privacy request inputs", () => {
    expect(
      createControlSchema.safeParse({
        organizationId,
        controlKey: "DPDP.01",
        title: "Consent",
        category: "privacy",
        objective: "Consent evidence is retained."
      }).success
    ).toBe(true);
    expect(
      createRiskSchema.safeParse({
        organizationId,
        title: "Retention",
        description: "Records exceed approved periods.",
        likelihood: 3,
        impact: 5
      }).success
    ).toBe(true);
    expect(
      privacyRequestSchema.safeParse({
        organizationId,
        requestType: "access",
        details: "Provide my data."
      }).success
    ).toBe(true);
  });
  it("enforces workflow transitions", () => {
    expect(canTransitionGovernanceState("draft", "review")).toBe(true);
    expect(canTransitionGovernanceState("published", "draft")).toBe(false);
    expect(canTransitionGovernanceState("resolved", "closed")).toBe(true);
  });
  it("selects high-risk, critical, and overdue work", () => {
    const risk = mapRisk({ id: "r1", risk_score: 20 });
    const finding = mapFinding({ id: "f1", severity: "critical", status: "open" });
    const request = mapPrivacyRequest({ id: "p1", overdue: true });
    expect(highRisks([risk])).toHaveLength(1);
    expect(criticalFindings([finding])).toHaveLength(1);
    expect(overduePrivacyRequests([request])).toHaveLength(1);
  });
});
