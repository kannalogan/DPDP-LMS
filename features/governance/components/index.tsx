import {
  AlertTriangle,
  Archive,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileLock2,
  FolderSearch,
  Gauge,
  Landmark,
  Search,
  ShieldCheck
} from "lucide-react";
import {
  acknowledgePolicy,
  createControl,
  createPolicy,
  createRisk,
  recordEvidence,
  resolveFinding,
  startAudit,
  submitPrivacyRequest
} from "@/features/governance/actions";
import { riskTone } from "@/features/governance/selectors";
import type {
  EvidenceDto,
  FindingDto,
  GovernanceWorkspaceDto,
  PolicyAssignmentDto,
  PrivacyRequestDto,
  RetentionJobDto,
  RiskDto
} from "@/features/governance/types";
import { Button } from "@/shared/ui/button";
import { Card, Table, Timeline } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/shared/ui/feedback";
import { SearchInput, Select, Textarea } from "@/shared/ui/forms";
import { Input } from "@/shared/ui/input";
import "@/features/governance/governance.css";

type FormAction = (data: FormData) => void | Promise<void>;
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value)
      )
    : "Not set";
const titleCase = (value: string) => value.replaceAll("_", " ");

export function GovernanceHeader({ description, title }: { description: string; title: string }) {
  return (
    <header className="governance-header">
      <div>
        <span className="student-eyebrow">Governance and compliance</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <ShieldCheck aria-hidden="true" />
    </header>
  );
}
export function GovernanceDashboard({ data }: { data: GovernanceWorkspaceDto }) {
  return (
    <div className="governance-workspace">
      <ComplianceKpiCards data={data} />
      <div className="governance-grid">
        <AuditDashboard findings={data.findings} />
        <RiskMatrix risks={data.risks} />
        <PrivacyRequestQueue requests={data.privacyRequests} />
        <EvidenceLibrary evidence={data.evidence} />
      </div>
    </div>
  );
}
export function ComplianceKpiCards({ data }: { data: GovernanceWorkspaceDto }) {
  const metrics = [
    ["Published controls", data.dashboard.publishedControls, ShieldCheck],
    ["Open findings", data.dashboard.openFindings, ClipboardCheck],
    ["Open risks", data.dashboard.openRisks, AlertTriangle],
    ["Privacy requests", data.dashboard.openPrivacyRequests, FileLock2]
  ] as const;
  return (
    <div className="governance-metrics">
      {metrics.map(([label, value, Icon]) => (
        <Card className="governance-metric" key={label}>
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
          <Icon aria-hidden="true" />
        </Card>
      ))}
    </div>
  );
}
export function AuditDashboard({ findings }: { findings: FindingDto[] }) {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={ClipboardCheck} title="Audit findings" />
      <FindingTimeline findings={findings} />
    </Card>
  );
}
export function EvidenceLibrary({ evidence }: { evidence: EvidenceDto[] }) {
  return (
    <Card className="governance-panel governance-panel-wide">
      <PanelTitle icon={FolderSearch} title="Evidence library" />
      {evidence.length ? (
        <Table
          caption="Control evidence"
          columns={[
            {
              key: "control",
              header: "Control",
              render: (row) => `${row.controlKey} · ${row.controlTitle}`
            },
            { key: "title", header: "Evidence", render: (row) => row.title },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge>{titleCase(row.status)}</Badge>
            },
            { key: "versions", header: "Versions", render: (row) => row.versionCount }
          ]}
          rows={evidence}
        />
      ) : (
        <GovernanceEmpty title="No evidence recorded" />
      )}
    </Card>
  );
}
export function EvidenceViewer({ evidence }: { evidence: EvidenceDto | null }) {
  if (!evidence) return <GovernanceEmpty title="Evidence unavailable" />;
  return (
    <Card className="governance-panel">
      <PanelTitle icon={FileCheck2} title={evidence.title} />
      <dl className="governance-details">
        <div>
          <dt>Control</dt>
          <dd>{evidence.controlKey}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{titleCase(evidence.status)}</dd>
        </div>
        <div>
          <dt>Versions</dt>
          <dd>{evidence.versionCount}</dd>
        </div>
        <div>
          <dt>Valid until</dt>
          <dd>{formatDate(evidence.validUntil)}</dd>
        </div>
      </dl>
    </Card>
  );
}
export function PolicyManager({
  organizationId,
  policies
}: {
  organizationId: string;
  policies: PolicyAssignmentDto[];
}) {
  return (
    <div className="governance-grid">
      <Card className="governance-panel">
        <PanelTitle icon={BookOpenCheck} title="Create policy" />
        <form action={createPolicy as unknown as FormAction} className="governance-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Policy key
            <Input name="policyKey" pattern="[A-Z0-9.-]+" required />
          </label>
          <label>
            Title
            <Input name="title" required />
          </label>
          <label>
            Category
            <Input name="category" required />
          </label>
          <label>
            Policy content
            <Textarea name="content" required rows={8} />
          </label>
          <Button type="submit">
            <BookOpenCheck />
            Create draft
          </Button>
        </form>
      </Card>
      <PolicyReader policies={policies} />
    </div>
  );
}
export function PolicyReader({ policies }: { policies: PolicyAssignmentDto[] }) {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={BookOpenCheck} title="Assigned policies" />
      {policies.length ? (
        <div className="governance-list">
          {policies.map((policy) => (
            <PolicyAcknowledgement key={policy.id} policy={policy} />
          ))}
        </div>
      ) : (
        <GovernanceEmpty title="No policy assignments" />
      )}
    </Card>
  );
}
export function PolicyAcknowledgement({ policy }: { policy: PolicyAssignmentDto }) {
  return (
    <article className="governance-list-item">
      <div>
        <strong>{policy.title}</strong>
        <p>
          Version {policy.version} · due {formatDate(policy.dueAt)}
        </p>
      </div>
      {policy.acknowledged ? (
        <Badge tone="success">Acknowledged</Badge>
      ) : (
        <form action={acknowledgePolicy as unknown as FormAction}>
          <input name="policyVersionId" type="hidden" value={policy.policyVersionId} />
          <Button size="sm" type="submit">
            <CheckCircle2 />
            Acknowledge
          </Button>
        </form>
      )}
    </article>
  );
}
export function RiskRegister({
  organizationId,
  risks
}: {
  organizationId: string;
  risks: RiskDto[];
}) {
  return (
    <div className="governance-grid">
      <Card className="governance-panel">
        <PanelTitle icon={AlertTriangle} title="Record risk" />
        <form action={createRisk as unknown as FormAction} className="governance-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Title
            <Input name="title" required />
          </label>
          <label>
            Description
            <Textarea name="description" required rows={5} />
          </label>
          <div className="governance-form-row">
            <label>
              Likelihood
              <Select defaultValue="3" name="likelihood">
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Impact
              <Select defaultValue="3" name="impact">
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <Button type="submit">
            <AlertTriangle />
            Record risk
          </Button>
        </form>
      </Card>
      <RiskMatrix risks={risks} />
    </div>
  );
}
export function RiskMatrix({ risks }: { risks: RiskDto[] }) {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={Gauge} title="Risk matrix" />
      {risks.length ? (
        <div className="governance-risk-grid">
          {risks.map((risk) => (
            <article
              className={`governance-risk governance-risk-${riskTone(risk.riskScore)}`}
              key={risk.id}
            >
              <span>{risk.riskNumber}</span>
              <strong>{risk.riskScore}</strong>
              <p>{risk.title}</p>
            </article>
          ))}
        </div>
      ) : (
        <GovernanceEmpty title="No risks recorded" />
      )}
    </Card>
  );
}
export function ExceptionManager() {
  return (
    <GovernanceEmpty
      description="Approved exceptions will appear with immutable review and approval evidence."
      title="No exceptions"
    />
  );
}
export function ComplianceReview({ data }: { data: GovernanceWorkspaceDto }) {
  return (
    <div className="governance-grid">
      <EvidenceLibrary evidence={data.evidence} />
      <AuditDashboard findings={data.findings} />
    </div>
  );
}
export function FindingTimeline({ findings }: { findings: FindingDto[] }) {
  if (!findings.length) return <GovernanceEmpty title="No audit findings" />;
  return (
    <Timeline
      items={findings.slice(0, 12).map((finding) => ({
        title: `${finding.findingNumber} · ${finding.title}`,
        time: formatDate(finding.dueAt),
        content: (
          <div className="governance-timeline-content">
            <Badge
              tone={
                finding.severity === "critical"
                  ? "danger"
                  : finding.severity === "high"
                    ? "warning"
                    : "neutral"
              }
            >
              {finding.severity}
            </Badge>
            <span>
              {titleCase(finding.status)} · {finding.openActions} open actions
            </span>
          </div>
        )
      }))}
    />
  );
}
export function FindingResolution({ finding }: { finding: FindingDto }) {
  return (
    <form action={resolveFinding as unknown as FormAction} className="governance-form">
      <input name="findingId" type="hidden" value={finding.id} />
      <label>
        Resolution summary
        <Textarea name="resolutionSummary" required rows={4} />
      </label>
      <Button type="submit">Resolve finding</Button>
    </form>
  );
}
export function RetentionManager({ jobs }: { jobs: RetentionJobDto[] }) {
  return (
    <Card className="governance-panel governance-panel-wide">
      <PanelTitle icon={Archive} title="Retention operations" />
      {jobs.length ? (
        <Table
          caption="Retention jobs"
          columns={[
            { key: "category", header: "Category", render: (row) => row.dataCategory },
            { key: "action", header: "Action", render: (row) => titleCase(row.action) },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge>{titleCase(row.status)}</Badge>
            },
            {
              key: "progress",
              header: "Processed",
              render: (row) => `${row.processedCount} / ${row.candidateCount}`
            },
            {
              key: "hold",
              header: "Legal hold",
              render: (row) => (row.legalHoldActive ? "Active" : "None")
            }
          ]}
          rows={jobs}
        />
      ) : (
        <GovernanceEmpty title="No retention jobs" />
      )}
    </Card>
  );
}
export function PrivacyRequestQueue({ requests }: { requests: PrivacyRequestDto[] }) {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={FileLock2} title="Privacy requests" />
      {requests.length ? (
        <div className="governance-list">
          {requests.map((request) => (
            <article className="governance-list-item" key={request.id}>
              <div>
                <strong>{request.caseNumber}</strong>
                <p>
                  {titleCase(request.requestType)} · received {formatDate(request.receivedAt)}
                </p>
              </div>
              <Badge tone={request.overdue ? "danger" : "info"}>
                {request.overdue ? "Overdue" : titleCase(request.status)}
              </Badge>
            </article>
          ))}
        </div>
      ) : (
        <GovernanceEmpty title="No privacy requests" />
      )}
    </Card>
  );
}
export function PrivacyRequestForm({ organizationId }: { organizationId: string }) {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={FileLock2} title="Submit a privacy request" />
      <form action={submitPrivacyRequest as unknown as FormAction} className="governance-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Request type
          <Select name="requestType">
            <option value="access">Access</option>
            <option value="correction">Correction</option>
            <option value="erasure">Erasure</option>
            <option value="grievance">Grievance</option>
            <option value="consent_withdrawal">Withdraw consent</option>
          </Select>
        </label>
        <label>
          Details
          <Textarea name="details" rows={6} />
        </label>
        <Button type="submit">
          <FileLock2 />
          Submit request
        </Button>
      </form>
    </Card>
  );
}
export function ConsentTimeline({ requests }: { requests: PrivacyRequestDto[] }) {
  const withdrawals = requests.filter((request) => request.requestType === "consent_withdrawal");
  return withdrawals.length ? (
    <Timeline
      items={withdrawals.map((request) => ({
        title: request.caseNumber,
        time: formatDate(request.receivedAt),
        content: titleCase(request.status)
      }))}
    />
  ) : (
    <GovernanceEmpty title="No consent withdrawals" />
  );
}
export function EvidenceUpload() {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={FileCheck2} title="Record evidence" />
      <form action={recordEvidence as unknown as FormAction} className="governance-form">
        <label>
          Control ID
          <Input name="controlId" required />
        </label>
        <label>
          Title
          <Input name="title" required />
        </label>
        <label>
          Evidence type
          <Input name="evidenceType" required />
        </label>
        <label>
          Description
          <Textarea name="description" required rows={5} />
        </label>
        <label>
          SHA-256 checksum
          <Input
            maxLength={64}
            minLength={64}
            name="evidenceHash"
            pattern="[a-f0-9]{64}"
            required
          />
        </label>
        <Button type="submit">
          <FileCheck2 />
          Record evidence
        </Button>
      </form>
    </Card>
  );
}
export function ControlFrameworkViewer({ organizationId }: { organizationId: string }) {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={Landmark} title="Create control" />
      <form action={createControl as unknown as FormAction} className="governance-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Control key
          <Input name="controlKey" pattern="[A-Z0-9.-]+" required />
        </label>
        <label>
          Title
          <Input name="title" required />
        </label>
        <label>
          Category
          <Input name="category" required />
        </label>
        <label>
          Objective
          <Textarea name="objective" required rows={6} />
        </label>
        <Button type="submit">Create control</Button>
      </form>
    </Card>
  );
}
export function AuditChecklist({ organizationId }: { organizationId: string }) {
  return (
    <Card className="governance-panel">
      <PanelTitle icon={ClipboardCheck} title="Start audit" />
      <form action={startAudit as unknown as FormAction} className="governance-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Audit title
          <Input name="title" required />
        </label>
        <label>
          Scope
          <Textarea name="scope" required rows={6} />
        </label>
        <label>
          Start time
          <Input name="startsAt" type="datetime-local" />
        </label>
        <Button type="submit">Start audit</Button>
      </form>
    </Card>
  );
}
export function GovernanceFilters() {
  return (
    <div className="governance-filters">
      <GovernanceSearch />
      <Select aria-label="Status filter" defaultValue="all">
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </Select>
    </div>
  );
}
export function GovernanceSearch() {
  return <SearchInput aria-label="Search governance records" placeholder="Search" />;
}
export function GovernancePagination() {
  return (
    <nav aria-label="Governance pagination" className="governance-pagination">
      <Button disabled size="sm" variant="secondary">
        Previous
      </Button>
      <span>Page 1</span>
      <Button disabled size="sm" variant="secondary">
        Next
      </Button>
    </nav>
  );
}
export function GovernanceLoading() {
  return <LoadingState label="Loading governance workspace" />;
}
export function GovernanceEmpty({
  description = "Records will appear when they are created through an approved workflow.",
  title = "No records"
}: {
  description?: string;
  title?: string;
}) {
  return <EmptyState description={description} title={title} />;
}
export function GovernanceError() {
  return (
    <ErrorState description="The governance workspace could not be loaded. Try again safely." />
  );
}
export function GovernancePermissionDenied() {
  return (
    <ErrorState
      description="Your active organization role does not grant access to this governance workspace."
      title="Permission denied"
    />
  );
}

function PanelTitle({ icon: Icon, title }: { icon: typeof Search; title: string }) {
  return (
    <div className="governance-panel-heading">
      <h2>{title}</h2>
      <Icon aria-hidden="true" />
    </div>
  );
}
