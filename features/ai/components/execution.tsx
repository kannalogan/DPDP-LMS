import {
  Activity,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  HeartPulse,
  Info,
  RefreshCw,
  Route,
  ShieldAlert
} from "lucide-react";
import {
  configureAiModelRoute,
  refreshProviderHealth,
  setOrganizationAiPolicy,
  setProviderKillSwitch,
  updateAiCostRate
} from "@/features/ai/actions";
import type { AiModelDto, AiProviderDto } from "@/features/ai/dtos";
import type { AiExecutionAdminOverview } from "@/features/ai/repositories/ai-execution-repository";
import type { AiProviderKey } from "@/features/ai/execution/types";
import { Button } from "@/shared/ui/button";
import { Card, Table } from "@/shared/ui/data-display";
import { Badge, EmptyState } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";
import { Input } from "@/shared/ui/input";

type FormAction = (data: FormData) => void | Promise<void>;
type ProviderConfiguration = Array<{
  configured: boolean;
  enabled: boolean;
  provider: AiProviderKey;
}>;

const providerNames: Record<AiProviderKey, string> = {
  anthropic: "Anthropic Claude",
  gemini: "Google Gemini",
  openai: "OpenAI"
};

export function ProviderExecutionStatus({
  configuration,
  overview
}: {
  configuration: ProviderConfiguration;
  overview: AiExecutionAdminOverview;
}) {
  const health = new Map(overview.health.map((item) => [item.providerKey, item]));
  return (
    <Card className="ai-panel ai-panel-wide">
      <div className="ai-panel-heading">
        <h2>Provider configuration status</h2>
        <HeartPulse aria-hidden="true" />
      </div>
      <Table
        caption="AI provider execution status"
        columns={[
          { key: "provider", header: "Provider", render: (item) => providerNames[item.provider] },
          {
            key: "configuration",
            header: "Configuration",
            render: (item) => {
              const ready = item.configured && item.enabled;
              return (
                <Badge tone={ready ? "success" : "neutral"}>
                  {ready ? "Configured" : item.enabled ? "Credential missing" : "Disabled"}
                </Badge>
              );
            }
          },
          {
            key: "health",
            header: "Health",
            render: (item) => health.get(item.provider)?.healthStatus ?? "Not checked"
          },
          {
            key: "circuit",
            header: "Circuit",
            render: (item) => health.get(item.provider)?.circuitState ?? "Closed"
          },
          {
            key: "region",
            header: "Region",
            render: (item) => health.get(item.provider)?.region ?? "Unspecified"
          },
          {
            key: "verified",
            header: "Last verified",
            render: (item) => {
              const checked = health.get(item.provider)?.lastCheckedAt;
              return checked ? formatDate(checked) : "Never";
            }
          },
          {
            key: "action",
            header: "Action",
            render: (item) => (
              <form action={refreshProviderHealth as unknown as FormAction}>
                <input name="provider" type="hidden" value={item.provider} />
                <Button
                  disabled={!item.configured || !item.enabled}
                  size="sm"
                  type="submit"
                  variant="secondary"
                >
                  <RefreshCw aria-hidden="true" />
                  Test
                </Button>
              </form>
            )
          }
        ]}
        rows={configuration}
      />
    </Card>
  );
}

export function ModelRoutingManager({
  models,
  organizationId,
  overview,
  providers
}: {
  models: AiModelDto[];
  organizationId: string;
  overview: AiExecutionAdminOverview;
  providers: AiProviderDto[];
}) {
  return (
    <Card className="ai-panel ai-panel-wide">
      <div className="ai-panel-heading">
        <h2>Model routing</h2>
        <Route aria-hidden="true" />
      </div>
      <form
        action={configureAiModelRoute as unknown as FormAction}
        className="ai-form ai-control-grid"
      >
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Capability
          <Input name="capabilityKey" required />
        </label>
        <label>
          Provider
          <Select name="providerId" required>
            <option value="">Select provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Model
          <Select name="modelId" required>
            <option value="">Select model</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Priority
          <Input defaultValue="100" min="1" name="priority" type="number" />
        </label>
        <label>
          Input token limit
          <Input defaultValue="0" min="0" name="maxInputTokens" type="number" />
        </label>
        <label>
          Output token limit
          <Input defaultValue="4096" min="0" name="maxOutputTokens" type="number" />
        </label>
        <label>
          Cost limit (minor units)
          <Input min="0" name="maximumCostMinor" type="number" />
        </label>
        <label>
          Latency preference
          <Select defaultValue="balanced" name="latencyPreference">
            <option value="cost">Cost</option>
            <option value="balanced">Balanced</option>
            <option value="latency">Latency</option>
          </Select>
        </label>
        <label>
          Classifications
          <Input defaultValue="public,internal" name="allowedClassifications" />
        </label>
        <label>
          Regions
          <Input name="allowedRegions" placeholder="in,apac" />
        </label>
        <label>
          Status
          <Select defaultValue="active" name="status">
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="retired">Retired</option>
          </Select>
        </label>
        <label>
          Default route
          <Select defaultValue="false" name="isDefault">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </Select>
        </label>
        <Button type="submit">Save route</Button>
      </form>
      {overview.routes.length === 0 ? (
        <EmptyState description="No active model routes are configured." title="No model routes" />
      ) : (
        <Table
          caption="Configured AI model routes"
          columns={[
            { key: "capability", header: "Capability", render: (route) => route.capabilityKey },
            {
              key: "provider",
              header: "Provider",
              render: (route) => providerNames[route.providerKey]
            },
            { key: "model", header: "Model", render: (route) => route.modelKey },
            { key: "priority", header: "Priority", render: (route) => route.priority },
            {
              key: "health",
              header: "Health",
              render: (route) => route.healthStatus ?? "unknown"
            },
            {
              key: "limit",
              header: "Limit",
              render: (route) => route.maximumCostMinor ?? "Policy"
            }
          ]}
          rows={overview.routes}
        />
      )}
    </Card>
  );
}

export function ExecutionPolicyEditor({
  organizationId,
  overview
}: {
  organizationId: string;
  overview: AiExecutionAdminOverview;
}) {
  const policy = overview.policy;
  return (
    <Card className="ai-panel">
      <div className="ai-panel-heading">
        <h2>Execution policy</h2>
        <ShieldAlert aria-hidden="true" />
      </div>
      <form action={setOrganizationAiPolicy as unknown as FormAction} className="ai-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Execution
          <Select defaultValue={String(policy?.enabled ?? false)} name="enabled">
            <option value="false">Disabled</option>
            <option value="true">Enabled</option>
          </Select>
        </label>
        <label>
          Providers
          <Input
            defaultValue={policy?.allowedProviderKeys.join(",") ?? ""}
            name="allowedProviderKeys"
            placeholder="openai,anthropic,gemini"
          />
        </label>
        <label>
          Data classifications
          <Input
            defaultValue={policy?.allowedClassifications.join(",") ?? "public,internal"}
            name="allowedClassifications"
          />
        </label>
        <label>
          Regions
          <Input defaultValue={policy?.allowedRegions.join(",") ?? ""} name="allowedRegions" />
        </label>
        <div className="ai-form-row">
          <label>
            Input characters
            <Input
              defaultValue={policy?.maxInputCharacters ?? 50000}
              min="1"
              name="maxInputCharacters"
              type="number"
            />
          </label>
          <label>
            Output tokens
            <Input
              defaultValue={policy?.maxOutputTokens ?? 4096}
              min="1"
              name="maxOutputTokens"
              type="number"
            />
          </label>
        </div>
        <div className="ai-form-row">
          <label>
            Concurrent requests
            <Input
              defaultValue={policy?.maxConcurrentRequests ?? 5}
              min="1"
              name="maxConcurrentRequests"
              type="number"
            />
          </label>
          <label>
            Timeout (ms)
            <Input
              defaultValue={policy?.defaultTimeoutMs ?? 30000}
              min="1000"
              name="defaultTimeoutMs"
              type="number"
            />
          </label>
        </div>
        {[
          ["restrictedDataAllowed", policy?.restrictedDataAllowed ?? false, "Restricted data"],
          ["piiRedactionRequired", policy?.piiRedactionRequired ?? true, "PII redaction"],
          [
            "providerRetentionAllowed",
            policy?.providerRetentionAllowed ?? false,
            "Provider retention"
          ],
          ["allowUnknownCost", policy?.allowUnknownCost ?? false, "Unknown cost"]
        ].map(([name, value, text]) => (
          <label key={String(name)}>
            {text}
            <Select defaultValue={String(value)} name={String(name)}>
              <option value="false">Not allowed</option>
              <option value="true">Allowed</option>
            </Select>
          </label>
        ))}
        <Button type="submit">Save policy</Button>
      </form>
    </Card>
  );
}

export function KillSwitchManager({
  models,
  organizationId,
  providers
}: {
  models: AiModelDto[];
  organizationId: string;
  providers: AiProviderDto[];
}) {
  return (
    <Card className="ai-panel">
      <div className="ai-panel-heading">
        <h2>Kill switch manager</h2>
        <Ban aria-hidden="true" />
      </div>
      <form action={setProviderKillSwitch as unknown as FormAction} className="ai-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Scope
          <Select defaultValue="organization" name="scope">
            <option value="organization">Organization</option>
            <option value="provider">Provider</option>
            <option value="model">Model</option>
          </Select>
        </label>
        <label>
          Provider
          <Select name="providerId">
            <option value="">All providers</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Model
          <Select name="modelId">
            <option value="">All models</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          State
          <Select defaultValue="true" name="enabled">
            <option value="true">Execution blocked</option>
            <option value="false">Execution restored</option>
          </Select>
        </label>
        <label>
          Reason code
          <Input defaultValue="administrator_control" name="reasonCode" required />
        </label>
        <Button type="submit" variant="secondary">
          Apply switch
        </Button>
      </form>
    </Card>
  );
}

export function CostRateManager({
  models,
  organizationId,
  providers
}: {
  models: AiModelDto[];
  organizationId: string;
  providers: AiProviderDto[];
}) {
  return (
    <Card className="ai-panel">
      <div className="ai-panel-heading">
        <h2>Cost rate manager</h2>
        <CircleDollarSign aria-hidden="true" />
      </div>
      <form action={updateAiCostRate as unknown as FormAction} className="ai-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Provider
          <Select name="providerId" required>
            <option value="">Select provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Model
          <Select name="modelId" required>
            <option value="">Select model</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="ai-form-row">
          <label>
            Input / million
            <Input min="0" name="inputCostPerMillion" required type="number" />
          </label>
          <label>
            Output / million
            <Input min="0" name="outputCostPerMillion" required type="number" />
          </label>
        </div>
        <label>
          Cached input / million
          <Input min="0" name="cachedInputCostPerMillion" type="number" />
        </label>
        <label>
          Currency
          <Input defaultValue="INR" maxLength={3} name="currencyCode" />
        </label>
        <label>
          Effective from
          <Input name="effectiveFrom" required type="datetime-local" />
        </label>
        <label>
          Source reference hash
          <Input minLength={64} name="sourceReferenceHash" required />
        </label>
        <Button type="submit">Record rate</Button>
      </form>
    </Card>
  );
}

export function ExecutionAudit({ overview }: { overview: AiExecutionAdminOverview }) {
  if (overview.audit.length === 0)
    return (
      <EmptyState
        description="No controlled AI executions have been recorded."
        title="No execution evidence"
      />
    );
  return (
    <div className="ai-grid">
      <Card className="ai-panel ai-panel-wide">
        <div className="ai-panel-heading">
          <h2>Execution audit</h2>
          <Activity aria-hidden="true" />
        </div>
        <Table
          caption="Controlled AI execution evidence"
          columns={[
            { key: "trace", header: "Trace", render: (item) => item.traceId.slice(0, 8) },
            { key: "capability", header: "Capability", render: (item) => item.capability },
            { key: "status", header: "Status", render: (item) => item.status },
            {
              key: "latency",
              header: "Latency",
              render: (item) => (item.latencyMs === null ? "-" : `${item.latencyMs} ms`)
            },
            { key: "cost", header: "Cost", render: (item) => item.costMinor ?? "Unknown" },
            {
              key: "completed",
              header: "Completed",
              render: (item) => (item.completedAt ? formatDate(item.completedAt) : "Pending")
            }
          ]}
          rows={overview.audit}
        />
      </Card>
      <EvidenceSummary overview={overview} />
    </div>
  );
}

function EvidenceSummary({ overview }: { overview: AiExecutionAdminOverview }) {
  const failures = overview.audit.reduce((sum, item) => sum + item.failures, 0);
  const redactions = overview.audit.reduce((sum, item) => sum + item.redactions, 0);
  return (
    <Card className="ai-panel">
      <div className="ai-panel-heading">
        <h2>Failure and redaction evidence</h2>
        <Gauge aria-hidden="true" />
      </div>
      <dl className="ai-definition-list">
        <div>
          <dt>Failures</dt>
          <dd>{failures}</dd>
        </div>
        <div>
          <dt>Redactions</dt>
          <dd>{redactions}</dd>
        </div>
      </dl>
      <p className="ai-privacy-copy">
        Evidence contains classifications, counts, hashes, and safe error codes only. Prompt and
        response content is excluded.
      </p>
    </Card>
  );
}

export function AiSafetyNotice({ degraded = false }: { degraded?: boolean }) {
  return (
    <div role="note">
      <Card className="ai-notice">
        {degraded ? <Info aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        <div>
          <strong>{degraded ? "AI capability unavailable" : "Controlled AI capability"}</strong>
          <p>
            AI output may be incorrect. Sensitive data is minimized under organization policy, and
            consequential decisions always require authorized human action.
          </p>
        </div>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}
