export type GovernanceDashboardDto = {
  openFindings: number;
  openPrivacyRequests: number;
  openRisks: number;
  organizationId: string;
  publishedControls: number;
};

export type EvidenceDto = {
  controlKey: string;
  controlTitle: string;
  evidenceType: string;
  id: string;
  lastRecordedAt: string | null;
  status: string;
  title: string;
  validUntil: string | null;
  versionCount: number;
};

export type FindingDto = {
  auditTitle: string;
  dueAt: string | null;
  findingNumber: string;
  id: string;
  openActions: number;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  title: string;
};

export type PolicyAssignmentDto = {
  acknowledged: boolean;
  dueAt: string | null;
  id: string;
  mandatory: boolean;
  policyVersionId: string;
  title: string;
  version: number;
};

export type RiskDto = {
  category: string | null;
  id: string;
  impact: number;
  likelihood: number;
  residualScore: number | null;
  riskNumber: string;
  riskScore: number;
  status: string;
  title: string;
};

export type PrivacyRequestDto = {
  caseNumber: string;
  completedAt: string | null;
  dueAt: string;
  id: string;
  overdue: boolean;
  receivedAt: string;
  requestType: string;
  status: string;
};

export type RetentionJobDto = {
  action: string;
  candidateCount: number;
  completedAt: string | null;
  createdAt: string;
  dataCategory: string;
  id: string;
  legalHoldActive: boolean;
  processedCount: number;
  status: string;
};

export type GovernanceWorkspaceDto = {
  dashboard: GovernanceDashboardDto;
  evidence: EvidenceDto[];
  findings: FindingDto[];
  policies: PolicyAssignmentDto[];
  privacyRequests: PrivacyRequestDto[];
  retentionJobs: RetentionJobDto[];
  risks: RiskDto[];
};

export type GovernanceRepository = {
  getDashboard(): Promise<GovernanceDashboardDto>;
  getEvidence(): Promise<EvidenceDto[]>;
  getFindings(): Promise<FindingDto[]>;
  getPolicies(accountOnly?: boolean): Promise<PolicyAssignmentDto[]>;
  getPrivacyRequests(accountOnly?: boolean): Promise<PrivacyRequestDto[]>;
  getRetentionJobs(): Promise<RetentionJobDto[]>;
  getRisks(): Promise<RiskDto[]>;
  getWorkspace(accountOnly?: boolean): Promise<GovernanceWorkspaceDto>;
};
