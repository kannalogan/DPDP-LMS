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
  const [data, organizationId] = await Promise.all([
    getAiWorkspace(access),
    getAiOrganizationId(access)
  ]);
  if (!data || !organizationId) return <AiPermissionDenied />;
  const content =
    mode === "settings" ? (
      <AISettings data={data} organizationId={organizationId} />
    ) : mode === "providers" ? (
      <ProviderManager organizationId={organizationId} providers={data.providers} />
    ) : mode === "models" ? (
      <ModelManager models={data.models} providers={data.providers} />
    ) : mode === "prompts" ? (
      <PromptEditor
        organizationId={organizationId}
        prompts={data.prompts}
        workflows={data.workflows}
      />
    ) : mode === "guardrails" ? (
      <GuardrailManager guardrails={data.guardrails} organizationId={organizationId} />
    ) : mode === "usage" ? (
      <UsageDashboard usage={data.usage} />
    ) : mode === "budgets" ? (
      <BudgetDashboard budgets={data.budgets} organizationId={organizationId} />
    ) : mode === "audit" ? (
      <ConversationAudit events={data.auditEvents} />
    ) : mode === "assistant" ? (
      <AssistantPanel />
    ) : mode === "recommendations" ? (
      <RecommendationCards />
    ) : mode === "tools" ? (
      <div className="ai-grid">
        <AssistantPanel />
        <FeedbackWidget />
      </div>
    ) : (
      <div className="ai-grid">
        <ConversationViewer conversations={data.conversations} organizationId={organizationId} />
        <AssistantPanel />
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
