"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  createControlSchema,
  createPolicySchema,
  createRiskSchema,
  findingResolutionSchema,
  policyAcknowledgementSchema,
  privacyRequestSchema,
  recordEvidenceSchema,
  retentionJobSchema,
  startAuditSchema
} from "@/features/governance/schemas";
import { canManageGovernance } from "@/features/governance/permissions";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

const invalid = (parsed: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) =>
  ({ fieldErrors: parsed.error.flatten().fieldErrors, success: false }) satisfies ActionResult;
const refresh = () => {
  for (const path of [
    "/admin/governance",
    "/admin/compliance",
    "/account/privacy",
    "/account/policies"
  ])
    revalidatePath(path);
};
async function client(action: string) {
  await enforceServerActionSecurity(action, 20);
  return createSupabaseServerClient();
}
async function authorize(organizationId: string) {
  const identity = await resolveIdentityContext();
  return Boolean(
    identity?.organizationId === organizationId && (await canManageGovernance(organizationId))
  );
}
export async function createControl(formData: FormData): Promise<ActionResult> {
  const parsed = createControlSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Governance permission required.", success: false };
  const { error } = await (
    await client("governance-create-control")
  ).rpc("create_control", {
    p_category: parsed.data.category,
    p_control_key: parsed.data.controlKey,
    p_objective: parsed.data.objective,
    p_organization_id: parsed.data.organizationId,
    p_title: parsed.data.title
  });
  if (error) return { error: "Control could not be created.", success: false };
  refresh();
  return { message: "Control draft created.", success: true };
}
export async function startAudit(formData: FormData): Promise<ActionResult> {
  const input = Object.fromEntries(formData);
  if (typeof input.startsAt === "string" && input.startsAt)
    input.startsAt = new Date(input.startsAt).toISOString();
  const parsed = startAuditSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Governance permission required.", success: false };
  const { error } = await (
    await client("governance-start-audit")
  ).rpc("start_audit", {
    p_organization_id: parsed.data.organizationId,
    p_scope: { summary: parsed.data.scope },
    p_starts_at: parsed.data.startsAt,
    p_title: parsed.data.title
  });
  if (error) return { error: "Audit could not be started.", success: false };
  refresh();
  return { message: "Audit started.", success: true };
}
export async function createPolicy(formData: FormData): Promise<ActionResult> {
  const parsed = createPolicySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Governance permission required.", success: false };
  const { error } = await (
    await client("governance-create-policy")
  ).rpc("create_policy", {
    p_category: parsed.data.category,
    p_content: { markdown: parsed.data.content },
    p_organization_id: parsed.data.organizationId,
    p_policy_key: parsed.data.policyKey,
    p_title: parsed.data.title
  });
  if (error) return { error: "Policy could not be created.", success: false };
  refresh();
  return { message: "Policy draft created.", success: true };
}
export async function createRisk(formData: FormData): Promise<ActionResult> {
  const parsed = createRiskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Governance permission required.", success: false };
  const { error } = await (
    await client("governance-create-risk")
  ).rpc("create_risk", {
    p_category_id: parsed.data.categoryId || null,
    p_description: parsed.data.description,
    p_impact: parsed.data.impact,
    p_likelihood: parsed.data.likelihood,
    p_organization_id: parsed.data.organizationId,
    p_title: parsed.data.title
  });
  if (error) return { error: "Risk could not be created.", success: false };
  refresh();
  return { message: "Risk recorded.", success: true };
}
export async function recordEvidence(formData: FormData): Promise<ActionResult> {
  const parsed = recordEvidenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("governance-record-evidence")
  ).rpc("record_evidence", {
    p_control_id: parsed.data.controlId,
    p_description: parsed.data.description,
    p_evidence_hash: parsed.data.evidenceHash,
    p_evidence_type: parsed.data.evidenceType,
    p_metadata: {},
    p_title: parsed.data.title
  });
  if (error) return { error: "Evidence could not be recorded.", success: false };
  refresh();
  return { message: "Evidence recorded for verification.", success: true };
}
export async function submitPrivacyRequest(formData: FormData): Promise<ActionResult> {
  const parsed = privacyRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  const organizationId = parsed.data.organizationId || identity?.organizationId || null;
  if (!identity || (organizationId && organizationId !== identity.organizationId))
    return { error: "Active account context required.", success: false };
  const { error } = await (
    await client("privacy-request-submit")
  ).rpc("submit_privacy_request", {
    p_details_ciphertext: parsed.data.details || null,
    p_organization_id: organizationId,
    p_request_type: parsed.data.requestType
  });
  if (error) return { error: "Privacy request could not be submitted.", success: false };
  refresh();
  return { message: "Privacy request submitted.", success: true };
}
export async function acknowledgePolicy(formData: FormData): Promise<ActionResult> {
  const input = Object.fromEntries(formData);
  if (typeof input.policyVersionId === "string" && !input.acknowledgementHash)
    input.acknowledgementHash = createHash("sha256")
      .update(`${input.policyVersionId}:acknowledged`)
      .digest("hex");
  const parsed = policyAcknowledgementSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("policy-acknowledge")
  ).rpc("acknowledge_policy", {
    p_acknowledgement_hash: parsed.data.acknowledgementHash,
    p_ip_hash: null,
    p_policy_version_id: parsed.data.policyVersionId,
    p_user_agent_hash: null
  });
  if (error) return { error: "Policy acknowledgement could not be recorded.", success: false };
  refresh();
  return { message: "Policy acknowledged.", success: true };
}
export async function resolveFinding(formData: FormData): Promise<ActionResult> {
  const parsed = findingResolutionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("governance-resolve-finding")
  ).rpc("resolve_finding", {
    p_finding_id: parsed.data.findingId,
    p_resolution_summary: parsed.data.resolutionSummary
  });
  if (error) return { error: "Finding could not be resolved.", success: false };
  refresh();
  return { message: "Finding resolved with immutable evidence.", success: true };
}
export async function runRetentionJob(formData: FormData): Promise<ActionResult> {
  const parsed = retentionJobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("governance-retention-job")
  ).rpc("run_retention_job", {
    p_policy_id: parsed.data.policyId
  });
  if (error) return { error: "Retention job could not be queued.", success: false };
  refresh();
  return { message: "Retention review queued.", success: true };
}
