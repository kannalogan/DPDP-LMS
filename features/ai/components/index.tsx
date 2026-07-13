import {
  Activity,
  Bot,
  Boxes,
  BrainCircuit,
  CircleDollarSign,
  FileClock,
  Gauge,
  MessageSquareText,
  OctagonAlert,
  Settings2,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  configureGuardrail,
  createConversation,
  createPromptTemplate,
  createWorkflow,
  registerCapability,
  registerModel,
  registerProvider,
  savePromptVersion,
  setUsageBudget
} from "@/features/ai/actions";
import type {
  AiAuditEventDto,
  AiBudgetDto,
  AiCapabilityDto,
  AiConversationDto,
  AiGuardrailDto,
  AiModelDto,
  AiPromptDto,
  AiProviderDto,
  AiUsageDto,
  AiWorkflowDto,
  AiWorkspaceDto
} from "@/features/ai/dtos";
import { selectAiUsageTotals } from "@/features/ai/selectors";
import { Button } from "@/shared/ui/button";
import { Card, Table } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/shared/ui/feedback";
import { Select, Textarea } from "@/shared/ui/forms";
import { Input } from "@/shared/ui/input";
import "@/features/ai/ai.css";
type FormAction = (data: FormData) => void | Promise<void>;
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value)
      )
    : "Not set";
const label = (value: string) => value.replaceAll("_", " ");
function PanelTitle({ icon: Icon, title }: { icon: typeof Bot; title: string }) {
  return (
    <div className="ai-panel-heading">
      <h2>{title}</h2>
      <Icon aria-hidden="true" />
    </div>
  );
}
export function AiHeader({ description, title }: { description: string; title: string }) {
  return (
    <header className="ai-header">
      <div>
        <span className="student-eyebrow">AI platform</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <BrainCircuit aria-hidden="true" />
    </header>
  );
}
export function AISettings({
  data,
  organizationId
}: {
  data: AiWorkspaceDto;
  organizationId: string;
}) {
  return (
    <div className="ai-workspace">
      <AiMetrics data={data} />
      <div className="ai-grid">
        <CapabilityManager capabilities={data.capabilities} organizationId={organizationId} />
        <WorkflowManager
          capabilities={data.capabilities}
          organizationId={organizationId}
          workflows={data.workflows}
        />
      </div>
    </div>
  );
}
function AiMetrics({ data }: { data: AiWorkspaceDto }) {
  const totals = selectAiUsageTotals(data);
  const metrics = [
    ["Providers", data.providers.length, Boxes],
    ["Prompt versions", data.prompts.reduce((sum, item) => sum + item.versionCount, 0), FileClock],
    ["Guardrails", data.guardrails.length, ShieldCheck],
    ["Usage events", totals.events, Activity]
  ] as const;
  return (
    <div className="ai-metrics">
      {metrics.map(([name, value, Icon]) => (
        <Card className="ai-metric" key={name}>
          <div>
            <span>{name}</span>
            <strong>{value}</strong>
          </div>
          <Icon aria-hidden="true" />
        </Card>
      ))}
    </div>
  );
}
export function CapabilityManager({
  capabilities,
  organizationId
}: {
  capabilities: AiCapabilityDto[];
  organizationId: string;
}) {
  return (
    <Card className="ai-panel">
      <PanelTitle icon={Sparkles} title="Capabilities" />
      <form action={registerCapability as unknown as FormAction} className="ai-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Capability key
          <Input name="key" required />
        </label>
        <label>
          Name
          <Input name="name" required />
        </label>
        <div className="ai-form-row">
          <label>
            Category
            <Input name="category" required />
          </label>
          <label>
            Risk tier
            <Select defaultValue="medium" name="riskTier">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </label>
        </div>
        <Button type="submit">
          <Sparkles />
          Register capability
        </Button>
      </form>
      {capabilities.length ? (
        <div className="ai-list">
          {capabilities.map((item) => (
            <div className="ai-list-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>
                  {item.key} · {label(item.riskTier)}
                </p>
              </div>
              <Badge>{item.enabled ? "Enabled" : "Disabled"}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <AiEmpty title="No capabilities registered" />
      )}
    </Card>
  );
}
export function WorkflowManager({
  capabilities,
  organizationId,
  workflows
}: {
  capabilities: AiCapabilityDto[];
  organizationId: string;
  workflows: AiWorkflowDto[];
}) {
  return (
    <Card className="ai-panel">
      <PanelTitle icon={Settings2} title="Workflow policies" />
      {capabilities.length ? (
        <form action={createWorkflow as unknown as FormAction} className="ai-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Capability
            <Select name="capabilityId" required>
              {capabilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Workflow key
            <Input name="key" required />
          </label>
          <label>
            Name
            <Input name="name" required />
          </label>
          <label>
            Human review
            <Select defaultValue="true" name="humanReviewRequired">
              <option value="true">Required</option>
              <option value="false">Policy controlled</option>
            </Select>
          </label>
          <Button type="submit">
            <Settings2 />
            Create workflow
          </Button>
        </form>
      ) : (
        <AiEmpty title="Register a capability first" />
      )}
      {workflows.length ? (
        <div className="ai-list">
          {workflows.map((item) => (
            <div className="ai-list-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>
                  {item.key} · review {item.humanReviewRequired ? "required" : "policy controlled"}
                </p>
              </div>
              <Badge>{label(item.status)}</Badge>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
export function ProviderManager({
  organizationId,
  providers
}: {
  organizationId: string;
  providers: AiProviderDto[];
}) {
  return (
    <div className="ai-grid">
      <Card className="ai-panel">
        <PanelTitle icon={Boxes} title="Provider registry" />
        <form action={registerProvider as unknown as FormAction} className="ai-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Provider key
            <Input name="key" required />
          </label>
          <label>
            Display name
            <Input name="name" required />
          </label>
          <label>
            Adapter type
            <Input name="adapterType" required />
          </label>
          <label>
            Capabilities
            <Input name="capabilities" placeholder="chat, summarization" />
          </label>
          <Button type="submit">
            <Boxes />
            Register disabled provider
          </Button>
        </form>
      </Card>
      <Card className="ai-panel">
        <PanelTitle icon={Boxes} title="Registered providers" />
        {providers.length ? (
          <Table
            caption="AI provider registry"
            columns={[
              { key: "name", header: "Provider", render: (row) => row.name },
              { key: "adapter", header: "Adapter", render: (row) => row.adapterType },
              { key: "models", header: "Models", render: (row) => row.modelCount },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge>{label(row.status)}</Badge>
              }
            ]}
            rows={providers}
          />
        ) : (
          <AiEmpty title="No providers registered" />
        )}
      </Card>
    </div>
  );
}
export function ModelManager({
  models,
  providers
}: {
  models: AiModelDto[];
  providers: AiProviderDto[];
}) {
  return (
    <div className="ai-grid">
      <Card className="ai-panel">
        <PanelTitle icon={BrainCircuit} title="Model registry" />
        {providers.length ? (
          <form action={registerModel as unknown as FormAction} className="ai-form">
            <label>
              Provider
              <Select name="providerId" required>
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Model key
              <Input name="key" required />
            </label>
            <label>
              Name
              <Input name="name" required />
            </label>
            <div className="ai-form-row">
              <label>
                Modality
                <Select defaultValue="text" name="modality">
                  <option value="text">Text</option>
                  <option value="multimodal">Multimodal</option>
                  <option value="audio">Audio</option>
                  <option value="image">Image</option>
                </Select>
              </label>
              <label>
                Context window
                <Input min="0" name="contextWindow" type="number" defaultValue="0" />
              </label>
            </div>
            <Button type="submit">
              <BrainCircuit />
              Register disabled model
            </Button>
          </form>
        ) : (
          <AiEmpty title="Register a provider first" />
        )}
      </Card>
      <Card className="ai-panel">
        <PanelTitle icon={BrainCircuit} title="Registered models" />
        {models.length ? (
          <Table
            caption="AI model registry"
            columns={[
              { key: "name", header: "Model", render: (row) => row.name },
              { key: "modality", header: "Modality", render: (row) => label(row.modality) },
              {
                key: "context",
                header: "Context",
                render: (row) => row.contextWindow.toLocaleString("en-IN")
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge>{label(row.status)}</Badge>
              }
            ]}
            rows={models}
          />
        ) : (
          <AiEmpty title="No models registered" />
        )}
      </Card>
    </div>
  );
}
export function PromptEditor({
  organizationId,
  prompts,
  workflows
}: {
  organizationId: string;
  prompts: AiPromptDto[];
  workflows: AiWorkflowDto[];
}) {
  return (
    <div className="ai-grid">
      <Card className="ai-panel">
        <PanelTitle icon={MessageSquareText} title="Prompt template" />
        {workflows.length ? (
          <form action={createPromptTemplate as unknown as FormAction} className="ai-form">
            <input name="organizationId" type="hidden" value={organizationId} />
            <label>
              Workflow
              <Select name="workflowId" required>
                {workflows.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Template key
              <Input name="key" required />
            </label>
            <label>
              Title
              <Input name="title" required />
            </label>
            <Button type="submit">
              <MessageSquareText />
              Create template
            </Button>
          </form>
        ) : (
          <AiEmpty title="Create a workflow first" />
        )}
      </Card>
      <Card className="ai-panel">
        <PanelTitle icon={FileClock} title="Version editor" />
        {prompts.length ? (
          <form action={savePromptVersion as unknown as FormAction} className="ai-form">
            <label>
              Template
              <Select name="promptTemplateId" required>
                {prompts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Template text
              <Textarea name="templateText" required rows={8} />
            </label>
            <label>
              Input schema
              <Textarea defaultValue="{}" name="inputSchema" rows={4} />
            </label>
            <label>
              Output schema
              <Textarea defaultValue="{}" name="outputSchema" rows={4} />
            </label>
            <Button type="submit">
              <FileClock />
              Save immutable version
            </Button>
          </form>
        ) : (
          <AiEmpty title="No prompt templates" />
        )}
      </Card>
      <PromptVersionHistory prompts={prompts} />
    </div>
  );
}
export function PromptVersionHistory({ prompts }: { prompts: AiPromptDto[] }) {
  return (
    <Card className="ai-panel ai-panel-wide">
      <PanelTitle icon={FileClock} title="Prompt version history" />
      {prompts.length ? (
        <Table
          caption="Prompt template versions"
          columns={[
            { key: "title", header: "Template", render: (row) => row.title },
            { key: "versions", header: "Versions", render: (row) => row.versionCount },
            { key: "latest", header: "Latest", render: (row) => row.latestVersion ?? "None" },
            { key: "published", header: "Published", render: (row) => formatDate(row.publishedAt) },
            { key: "status", header: "Status", render: (row) => <Badge>{label(row.status)}</Badge> }
          ]}
          rows={prompts}
        />
      ) : (
        <AiEmpty title="No prompt history" />
      )}
    </Card>
  );
}
export function GuardrailManager({
  guardrails,
  organizationId
}: {
  guardrails: AiGuardrailDto[];
  organizationId: string;
}) {
  return (
    <div className="ai-grid">
      <Card className="ai-panel">
        <PanelTitle icon={ShieldCheck} title="Guardrail policy" />
        <form action={configureGuardrail as unknown as FormAction} className="ai-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Guardrail key
            <Input name="key" required />
          </label>
          <label>
            Name
            <Input name="name" required />
          </label>
          <label>
            Scope
            <Input name="scope" required />
          </label>
          <label>
            Enforcement
            <Select defaultValue="block" name="enforcement">
              <option value="observe">Observe</option>
              <option value="review">Review</option>
              <option value="block">Block</option>
            </Select>
          </label>
          <Button type="submit">
            <ShieldCheck />
            Create guardrail draft
          </Button>
        </form>
      </Card>
      <Card className="ai-panel">
        <PanelTitle icon={ShieldCheck} title="Guardrails" />
        {guardrails.length ? (
          <div className="ai-list">
            {guardrails.map((item) => (
              <div className="ai-list-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.scope} · {label(item.enforcement)}
                  </p>
                </div>
                <Badge>{label(item.status)}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <AiEmpty title="No guardrails configured" />
        )}
      </Card>
    </div>
  );
}
export function UsageDashboard({ usage }: { usage: AiUsageDto[] }) {
  const totals = usage.reduce(
    (value, row) => ({
      cost: value.cost + row.costMinor,
      events: value.events + row.eventCount,
      input: value.input + row.inputUnits,
      output: value.output + row.outputUnits
    }),
    { cost: 0, events: 0, input: 0, output: 0 }
  );
  return (
    <div className="ai-grid">
      <Card className="ai-panel">
        <PanelTitle icon={Gauge} title="Usage totals" />
        <dl className="ai-list">
          <div className="ai-status-row">
            <dt>Events</dt>
            <dd>{totals.events.toLocaleString("en-IN")}</dd>
          </div>
          <div className="ai-status-row">
            <dt>Input units</dt>
            <dd>{totals.input.toLocaleString("en-IN")}</dd>
          </div>
          <div className="ai-status-row">
            <dt>Output units</dt>
            <dd>{totals.output.toLocaleString("en-IN")}</dd>
          </div>
          <div className="ai-status-row">
            <dt>Recorded cost</dt>
            <dd>{totals.cost.toLocaleString("en-IN")}</dd>
          </div>
        </dl>
      </Card>
      <Card className="ai-panel">
        <PanelTitle icon={Activity} title="Daily usage" />
        {usage.length ? (
          <Table
            caption="Daily AI usage"
            columns={[
              { key: "day", header: "Day", render: (row) => formatDate(row.usageDay) },
              { key: "events", header: "Events", render: (row) => row.eventCount },
              { key: "units", header: "Units", render: (row) => row.inputUnits + row.outputUnits },
              { key: "latency", header: "Latency", render: (row) => `${row.averageLatencyMs} ms` }
            ]}
            rows={usage}
          />
        ) : (
          <AiEmpty title="No usage recorded" />
        )}
      </Card>
    </div>
  );
}
export function BudgetDashboard({
  budgets,
  organizationId
}: {
  budgets: AiBudgetDto[];
  organizationId: string;
}) {
  return (
    <div className="ai-grid">
      <Card className="ai-panel">
        <PanelTitle icon={CircleDollarSign} title="Usage budget" />
        <form action={setUsageBudget as unknown as FormAction} className="ai-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Period
            <Select defaultValue="month" name="period">
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </Select>
          </label>
          <div className="ai-form-row">
            <label>
              Currency
              <Input defaultValue="INR" name="currencyCode" pattern="[A-Z]{3}" />
            </label>
            <label>
              Budget minor units
              <Input min="0" name="budgetMinor" type="number" required />
            </label>
          </div>
          <label>
            Warning threshold
            <Input
              max="1"
              min="0"
              name="warningThreshold"
              step="0.05"
              type="number"
              defaultValue="0.8"
            />
          </label>
          <Button type="submit">
            <CircleDollarSign />
            Save budget
          </Button>
        </form>
      </Card>
      <Card className="ai-panel">
        <PanelTitle icon={CircleDollarSign} title="Budgets" />
        {budgets.length ? (
          <div className="ai-list">
            {budgets.map((item) => (
              <div className="ai-list-item" key={item.id}>
                <div>
                  <strong>
                    {item.currencyCode} {item.budgetMinor.toLocaleString("en-IN")}
                  </strong>
                  <p>
                    {label(item.period)} · warning at {Math.round(item.warningThreshold * 100)}%
                  </p>
                </div>
                <Badge>{label(item.status)}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <AiEmpty title="No budgets configured" />
        )}
      </Card>
    </div>
  );
}
export function ConversationViewer({
  conversations,
  organizationId
}: {
  conversations: AiConversationDto[];
  organizationId: string;
}) {
  return (
    <div className="ai-grid">
      <Card className="ai-panel">
        <PanelTitle icon={MessageSquareText} title="Conversation boundary" />
        <form action={createConversation as unknown as FormAction} className="ai-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Purpose
            <Input name="purpose" required />
          </label>
          <label>
            Retention days
            <Input defaultValue="30" max="365" min="1" name="retentionDays" type="number" />
          </label>
          <Button type="submit">
            <MessageSquareText />
            Create boundary
          </Button>
        </form>
      </Card>
      <ConversationTimeline conversations={conversations} />
    </div>
  );
}
export function ConversationTimeline({ conversations }: { conversations: AiConversationDto[] }) {
  return (
    <Card className="ai-panel">
      <PanelTitle icon={MessageSquareText} title="Conversation timeline" />
      {conversations.length ? (
        <div className="ai-timeline">
          {conversations.map((item) => (
            <article className="ai-timeline-item" key={item.id}>
              <strong>{label(item.purpose)}</strong>
              <span>
                {item.messageCount} messages · {label(item.status)}
              </span>
              <time dateTime={item.startedAt}>{formatDate(item.startedAt)}</time>
            </article>
          ))}
        </div>
      ) : (
        <AiEmpty title="No conversations" />
      )}
    </Card>
  );
}
export function AssistantPanel() {
  return (
    <Card className="ai-panel">
      <PanelTitle icon={Bot} title="Assistant" />
      <div className="ai-callout">
        <strong>Unavailable</strong>
        <p className="ai-muted">
          No approved provider adapter or execution workflow is configured.
        </p>
      </div>
    </Card>
  );
}
export function RecommendationCards() {
  return (
    <Card className="ai-panel">
      <PanelTitle icon={Sparkles} title="AI recommendations" />
      <AiEmpty title="No AI recommendations" />
    </Card>
  );
}
export function FeedbackWidget() {
  return (
    <Card className="ai-panel">
      <PanelTitle icon={MessageSquareText} title="Feedback" />
      <p className="ai-muted">Feedback becomes available for retained prompt-run evidence.</p>
    </Card>
  );
}
export function ConversationAudit({ events }: { events: AiAuditEventDto[] }) {
  return (
    <Card className="ai-panel">
      <PanelTitle icon={OctagonAlert} title="Guardrail audit" />
      {events.length ? (
        <div className="ai-timeline">
          {events.map((item) => (
            <article className="ai-timeline-item" key={item.id}>
              <strong>{item.guardrailName ?? "Platform guardrail"}</strong>
              <span>
                {label(item.eventType)} · {label(item.action)} · {label(item.severity)}
              </span>
              <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
            </article>
          ))}
        </div>
      ) : (
        <AiEmpty title="No guardrail events" />
      )}
    </Card>
  );
}
export function AiLoading() {
  return <LoadingState label="Loading AI workspace" />;
}
export function AiEmpty({ title = "No AI records" }: { title?: string }) {
  return (
    <EmptyState description="No records are available for the active organization." title={title} />
  );
}
export function AiError() {
  return (
    <ErrorState
      description="The AI workspace could not be loaded."
      title="AI workspace unavailable"
    />
  );
}
export function AiPermissionDenied() {
  return (
    <ErrorState
      description="Your active role cannot access this AI workspace."
      title="Permission denied"
    />
  );
}
