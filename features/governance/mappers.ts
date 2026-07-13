import type {
  EvidenceDto,
  FindingDto,
  GovernanceDashboardDto,
  PolicyAssignmentDto,
  PrivacyRequestDto,
  RetentionJobDto,
  RiskDto
} from "@/features/governance/types";

type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const nullableText = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export function emptyGovernanceDashboard(organizationId: string): GovernanceDashboardDto {
  return {
    openFindings: 0,
    openPrivacyRequests: 0,
    openRisks: 0,
    organizationId,
    publishedControls: 0
  };
}
export function mapGovernanceDashboard(row: Row): GovernanceDashboardDto {
  return {
    openFindings: number(row.open_findings),
    openPrivacyRequests: number(row.open_privacy_requests),
    openRisks: number(row.open_risks),
    organizationId: text(row.organization_id),
    publishedControls: number(row.published_controls)
  };
}
export function mapEvidence(row: Row): EvidenceDto {
  return {
    controlKey: text(row.control_key),
    controlTitle: text(row.control_title),
    evidenceType: text(row.evidence_type),
    id: text(row.id),
    lastRecordedAt: nullableText(row.last_recorded_at),
    status: text(row.status),
    title: text(row.title),
    validUntil: nullableText(row.valid_until),
    versionCount: number(row.version_count)
  };
}
export function mapFinding(row: Row): FindingDto {
  return {
    auditTitle: text(row.audit_title),
    dueAt: nullableText(row.due_at),
    findingNumber: text(row.finding_number),
    id: text(row.id),
    openActions: number(row.open_actions),
    severity: text(row.severity, "low") as FindingDto["severity"],
    status: text(row.status),
    title: text(row.title)
  };
}
export function mapPolicyAssignment(row: Row): PolicyAssignmentDto {
  return {
    acknowledged: row.acknowledged === true,
    dueAt: nullableText(row.due_at),
    id: text(row.id),
    mandatory: row.mandatory !== false,
    policyVersionId: text(row.policy_version_id),
    title: text(row.title),
    version: number(row.version)
  };
}
export function mapRisk(row: Row): RiskDto {
  return {
    category: nullableText(row.category),
    id: text(row.id),
    impact: number(row.impact),
    likelihood: number(row.likelihood),
    residualScore: row.residual_score == null ? null : number(row.residual_score),
    riskNumber: text(row.risk_number),
    riskScore: number(row.risk_score),
    status: text(row.status),
    title: text(row.title)
  };
}
export function mapPrivacyRequest(row: Row): PrivacyRequestDto {
  return {
    caseNumber: text(row.case_number),
    completedAt: nullableText(row.completed_at),
    dueAt: text(row.due_at),
    id: text(row.id),
    overdue: row.overdue === true,
    receivedAt: text(row.received_at),
    requestType: text(row.request_type),
    status: text(row.status)
  };
}
export function mapRetentionJob(row: Row): RetentionJobDto {
  return {
    action: text(row.action),
    candidateCount: number(row.candidate_count),
    completedAt: nullableText(row.completed_at),
    createdAt: text(row.created_at),
    dataCategory: text(row.data_category),
    id: text(row.id),
    legalHoldActive: row.legal_hold_active === true,
    processedCount: number(row.processed_count),
    status: text(row.status)
  };
}
