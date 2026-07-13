import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyGovernanceDashboard,
  mapEvidence,
  mapFinding,
  mapGovernanceDashboard,
  mapPolicyAssignment,
  mapPrivacyRequest,
  mapRetentionJob,
  mapRisk
} from "@/features/governance/mappers";
import type { GovernanceRepository } from "@/features/governance/types";

export class SupabaseGovernanceRepository implements GovernanceRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string
  ) {}

  async getDashboard() {
    const { data, error } = await this.client
      .from("governance_dashboard_projection")
      .select("organization_id,published_controls,open_findings,open_risks,open_privacy_requests")
      .eq("organization_id", this.organizationId)
      .maybeSingle();
    return error || !data
      ? emptyGovernanceDashboard(this.organizationId)
      : mapGovernanceDashboard(data as Record<string, unknown>);
  }
  async getEvidence() {
    const { data, error } = await this.client
      .from("control_evidence_projection")
      .select(
        "id,organization_id,control_key,control_title,title,evidence_type,status,valid_until,version_count,last_recorded_at"
      )
      .eq("organization_id", this.organizationId)
      .order("last_recorded_at", { ascending: false, nullsFirst: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapEvidence(row as Record<string, unknown>));
  }
  async getFindings() {
    const { data, error } = await this.client
      .from("audit_findings_projection")
      .select(
        "id,organization_id,audit_title,finding_number,title,severity,status,due_at,open_actions"
      )
      .eq("organization_id", this.organizationId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapFinding(row as Record<string, unknown>));
  }
  async getPolicies(accountOnly = false) {
    let query = this.client
      .from("policy_assignment_projection")
      .select(
        "id,organization_id,profile_id,policy_version_id,title,version,due_at,mandatory,acknowledged"
      )
      .eq("organization_id", this.organizationId)
      .order("due_at", { ascending: true, nullsFirst: false });
    if (accountOnly) query = query.eq("profile_id", this.profileId);
    const { data, error } = await query.limit(100);
    return error
      ? []
      : (data ?? []).map((row) => mapPolicyAssignment(row as Record<string, unknown>));
  }
  async getRisks() {
    const { data, error } = await this.client
      .from("risk_register_projection")
      .select(
        "id,organization_id,risk_number,title,status,likelihood,impact,risk_score,category,residual_score"
      )
      .eq("organization_id", this.organizationId)
      .order("risk_score", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapRisk(row as Record<string, unknown>));
  }
  async getPrivacyRequests(accountOnly = false) {
    let query = this.client
      .from("privacy_request_projection")
      .select(
        "id,organization_id,requester_profile_id,request_type,status,case_number,received_at,due_at,completed_at,overdue"
      )
      .eq("organization_id", this.organizationId)
      .order("received_at", { ascending: false });
    if (accountOnly) query = query.eq("requester_profile_id", this.profileId);
    const { data, error } = await query.limit(100);
    return error
      ? []
      : (data ?? []).map((row) => mapPrivacyRequest(row as Record<string, unknown>));
  }
  async getRetentionJobs() {
    const { data, error } = await this.client
      .from("retention_status_projection")
      .select(
        "id,organization_id,data_category,action,status,candidate_count,processed_count,created_at,completed_at,legal_hold_active"
      )
      .eq("organization_id", this.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapRetentionJob(row as Record<string, unknown>));
  }
  async getWorkspace(accountOnly = false) {
    const [dashboard, evidence, findings, policies, privacyRequests, retentionJobs, risks] =
      await Promise.all([
        this.getDashboard(),
        accountOnly ? Promise.resolve([]) : this.getEvidence(),
        accountOnly ? Promise.resolve([]) : this.getFindings(),
        this.getPolicies(accountOnly),
        this.getPrivacyRequests(accountOnly),
        accountOnly ? Promise.resolve([]) : this.getRetentionJobs(),
        accountOnly ? Promise.resolve([]) : this.getRisks()
      ]);
    return { dashboard, evidence, findings, policies, privacyRequests, retentionJobs, risks };
  }
}
