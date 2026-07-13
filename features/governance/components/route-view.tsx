import {
  AuditChecklist,
  ComplianceReview,
  ConsentTimeline,
  ControlFrameworkViewer,
  EvidenceLibrary,
  EvidenceUpload,
  ExceptionManager,
  FindingTimeline,
  GovernanceDashboard,
  GovernanceEmpty,
  GovernanceHeader,
  GovernancePermissionDenied,
  PolicyManager,
  PolicyReader,
  PrivacyRequestForm,
  PrivacyRequestQueue,
  RetentionManager,
  RiskRegister
} from "@/features/governance/components";
import {
  canAccessGovernance,
  getGovernanceOrganizationId,
  getGovernanceWorkspace,
  type GovernanceAccess
} from "@/features/governance/server";

export type GovernanceRouteMode =
  | "dashboard"
  | "controls"
  | "evidence"
  | "audits"
  | "findings"
  | "policies"
  | "risks"
  | "exceptions"
  | "privacy"
  | "retention"
  | "reviews"
  | "reports"
  | "account-privacy"
  | "account-requests"
  | "account-consents"
  | "account-policies";

const copy: Record<GovernanceRouteMode, { description: string; title: string }> = {
  dashboard: {
    title: "Governance dashboard",
    description:
      "Monitor controls, audits, risk, evidence, privacy operations, and retention obligations."
  },
  controls: {
    title: "Control framework",
    description: "Create, review, publish, and map versioned governance controls."
  },
  evidence: {
    title: "Evidence library",
    description: "Inspect immutable compliance evidence and its verification history."
  },
  audits: {
    title: "Audit operations",
    description: "Plan and execute organization-scoped audit sessions."
  },
  findings: {
    title: "Audit findings",
    description: "Track remediation actions and immutable resolution evidence."
  },
  policies: {
    title: "Policy management",
    description: "Manage versioned policies and acknowledgement obligations."
  },
  risks: {
    title: "Risk register",
    description: "Assess risk exposure, treatments, reviews, and acceptance evidence."
  },
  exceptions: {
    title: "Exceptions",
    description: "Review time-bound control and policy exceptions."
  },
  privacy: {
    title: "Privacy operations",
    description: "Manage DPDP data principal requests without destructive deletion."
  },
  retention: {
    title: "Retention operations",
    description: "Run review-first retention jobs with legal hold protection."
  },
  reviews: {
    title: "Compliance reviews",
    description: "Review controls, evidence completeness, and audit outcomes."
  },
  reports: {
    title: "Compliance reports",
    description: "Use reporting-ready governance projections and KPI evidence."
  },
  "account-privacy": {
    title: "Privacy",
    description: "Review your privacy rights, requests, consents, and assigned policies."
  },
  "account-requests": {
    title: "Privacy requests",
    description:
      "Submit and track DPDP access, correction, erasure, grievance, and withdrawal requests."
  },
  "account-consents": {
    title: "Consent history",
    description: "Review immutable consent withdrawal evidence."
  },
  "account-policies": {
    title: "Policies",
    description: "Read and acknowledge policies assigned to your account."
  }
};

export async function GovernanceRouteView({
  access = "governance",
  mode
}: {
  access?: GovernanceAccess;
  mode: GovernanceRouteMode;
}) {
  if (!(await canAccessGovernance(access))) return <GovernancePermissionDenied />;
  const [data, organizationId] = await Promise.all([
    getGovernanceWorkspace(access),
    getGovernanceOrganizationId(access)
  ]);
  if (!data || !organizationId) return <GovernancePermissionDenied />;
  const content =
    mode === "dashboard" ? (
      <GovernanceDashboard data={data} />
    ) : mode === "controls" ? (
      <ControlFrameworkViewer organizationId={organizationId} />
    ) : mode === "evidence" ? (
      <div className="governance-grid">
        <EvidenceUpload />
        <EvidenceLibrary evidence={data.evidence} />
      </div>
    ) : mode === "audits" ? (
      <AuditChecklist organizationId={organizationId} />
    ) : mode === "findings" ? (
      <FindingTimeline findings={data.findings} />
    ) : mode === "policies" ? (
      <PolicyManager organizationId={organizationId} policies={data.policies} />
    ) : mode === "risks" ? (
      <RiskRegister organizationId={organizationId} risks={data.risks} />
    ) : mode === "exceptions" ? (
      <ExceptionManager />
    ) : mode === "privacy" ? (
      <PrivacyRequestQueue requests={data.privacyRequests} />
    ) : mode === "retention" ? (
      <RetentionManager jobs={data.retentionJobs} />
    ) : mode === "reviews" || mode === "reports" ? (
      <ComplianceReview data={data} />
    ) : mode === "account-requests" ? (
      <div className="governance-grid">
        <PrivacyRequestForm organizationId={organizationId} />
        <PrivacyRequestQueue requests={data.privacyRequests} />
      </div>
    ) : mode === "account-consents" ? (
      <ConsentTimeline requests={data.privacyRequests} />
    ) : mode === "account-policies" ? (
      <PolicyReader policies={data.policies} />
    ) : mode === "account-privacy" ? (
      <div className="governance-grid">
        <PrivacyRequestQueue requests={data.privacyRequests} />
        <PolicyReader policies={data.policies} />
      </div>
    ) : (
      <GovernanceEmpty />
    );
  return (
    <>
      <GovernanceHeader {...copy[mode]} />
      <div className="governance-workspace">{content}</div>
    </>
  );
}
