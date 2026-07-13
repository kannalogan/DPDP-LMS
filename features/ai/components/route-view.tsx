import {
  AISettings,
  AiHeader,
  AiPermissionDenied,
  AssistantPanel,
  BudgetDashboard,
  ConversationAudit,
  ConversationViewer,
  FeedbackWidget,
  GuardrailManager,
  ModelManager,
  PromptEditor,
  ProviderManager,
  RecommendationCards,
  UsageDashboard
} from "@/features/ai/components";
import {
  AiSafetyNotice,
  CostRateManager,
  ExecutionAudit,
  ExecutionPolicyEditor,
  KillSwitchManager,
  ModelRoutingManager,
  ProviderExecutionStatus
} from "@/features/ai/components/execution";
import {
  getAiExecutionAvailability,
  getAiExecutionAdminOverview,
  getAiProviderConfigurationStatus
} from "@/features/ai/execution/server";
import { canAccessAi, getAiOrganizationId, getAiWorkspace } from "@/features/ai/server";
import type { AiWorkspaceAccess } from "@/features/ai/types";
export type AiRouteMode =
  | "settings"
  | "providers"
  | "models"
  | "prompts"
  | "guardrails"
  | "usage"
  | "budgets"
  | "audit"
  | "workspace"
  | "tools"
  | "assistant"
  | "recommendations";
const copy: Record<AiRouteMode, { description: string; title: string }> = {
  settings: {
    title: "AI platform",
    description: "Manage organization AI policy, capabilities, workflows, and readiness."
  },
  providers: {
    title: "Provider registry",
    description:
      "Maintain disabled provider adapter metadata without credentials or network access."
  },
  models: {
    title: "Model registry",
    description: "Record provider-neutral model metadata and approval state."
  },
  prompts: {
    title: "Prompt framework",
    description: "Manage versioned prompt templates and structured input and output contracts."
  },
  guardrails: {
    title: "Guardrails",
    description: "Define review, observation, and blocking policies for future AI execution."
  },
  usage: { title: "AI usage", description: "Review immutable usage, latency, and cost evidence." },
  budgets: {
    title: "AI budgets",
    description: "Set organization spending boundaries before provider activation."
  },
  audit: { title: "AI audit", description: "Inspect redacted guardrail and operational evidence." },
  workspace: {
    title: "AI workspace",
    description: "Review available conversation boundaries and organization-approved AI services."
  },
  tools: { title: "AI tools", description: "Review mentor AI tool readiness and policy state." },
  assistant: {
    title: "Assistant",
    description: "Access the organization-approved assistant when an execution provider is enabled."
  },
  recommendations: {
    title: "AI recommendations",
    description: "Review provider-neutral recommendation evidence when available."
  }
};
export async function AiRouteView({
  access,
  mode
}: {
  access: AiWorkspaceAccess;
  mode: AiRouteMode;
}) {
  if (!(await canAccessAi(access))) return <AiPermissionDenied />;
  const [data, organizationId, availability] = await Promise.all([
    getAiWorkspace(access),
    getAiOrganizationId(access),
    access === "admin" ? Promise.resolve(null) : getAiExecutionAvailability()
  ]);
  if (!data || !organizationId) return <AiPermissionDenied />;
  const execution =
    access === "admin"
      ? await Promise.all([getAiExecutionAdminOverview(), getAiProviderConfigurationStatus()])
      : null;
  const content =
    mode === "settings" ? (
      <div className="ai-grid">
        <AISettings data={data} organizationId={organizationId} />
        {execution ? (
          <>
            <ExecutionPolicyEditor organizationId={organizationId} overview={execution[0]} />
            <KillSwitchManager
              models={data.models}
              organizationId={organizationId}
              providers={data.providers}
            />
          </>
        ) : null}
      </div>
    ) : mode === "providers" ? (
      <div className="ai-grid">
        <ProviderManager organizationId={organizationId} providers={data.providers} />
        {execution ? (
          <ProviderExecutionStatus configuration={execution[1]} overview={execution[0]} />
        ) : null}
      </div>
    ) : mode === "models" ? (
      <div className="ai-grid">
        <ModelManager models={data.models} providers={data.providers} />
        {execution ? (
          <ModelRoutingManager
            models={data.models}
            organizationId={organizationId}
            overview={execution[0]}
            providers={data.providers}
          />
        ) : null}
      </div>
    ) : mode === "prompts" ? (
      <PromptEditor
        organizationId={organizationId}
        prompts={data.prompts}
        workflows={data.workflows}
      />
    ) : mode === "guardrails" ? (
      <div className="ai-grid">
        <GuardrailManager guardrails={data.guardrails} organizationId={organizationId} />
        {execution ? (
          <KillSwitchManager
            models={data.models}
            organizationId={organizationId}
            providers={data.providers}
          />
        ) : null}
      </div>
    ) : mode === "usage" ? (
      <div className="ai-grid">
        <UsageDashboard usage={data.usage} />
        {execution ? <ExecutionAudit overview={execution[0]} /> : null}
      </div>
    ) : mode === "budgets" ? (
      <div className="ai-grid">
        <BudgetDashboard budgets={data.budgets} organizationId={organizationId} />
        {execution ? (
          <CostRateManager
            models={data.models}
            organizationId={organizationId}
            providers={data.providers}
          />
        ) : null}
      </div>
    ) : mode === "audit" ? (
      <div className="ai-grid">
        <ConversationAudit events={data.auditEvents} />
        {execution ? <ExecutionAudit overview={execution[0]} /> : null}
      </div>
    ) : mode === "assistant" ? (
      <div className="ai-grid">
        <AiSafetyNotice degraded={!availability?.available} />
        <AssistantPanel available={availability?.available ?? false} />
      </div>
    ) : mode === "recommendations" ? (
      <RecommendationCards />
    ) : mode === "tools" ? (
      <div className="ai-grid">
        <AiSafetyNotice degraded={!availability?.available} />
        <AssistantPanel available={availability?.available ?? false} />
        <FeedbackWidget />
      </div>
    ) : (
      <div className="ai-grid">
        <AiSafetyNotice degraded={!availability?.available} />
        <ConversationViewer conversations={data.conversations} organizationId={organizationId} />
        <AssistantPanel available={availability?.available ?? false} />
        <RecommendationCards />
      </div>
    );
  return (
    <>
      <AiHeader {...copy[mode]} />
      <div className="ai-workspace">{content}</div>
    </>
  );
}
