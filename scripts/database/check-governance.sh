#!/usr/bin/env sh
set -eu
migration="supabase/migrations/20260706001200_governance_compliance_platform.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-015" "$migration"; grep -q "SYRA-CONTRACT:" "$migration"; grep -q "SYRA-CHANGE: additive" "$migration"
for table in governance_controls governance_control_versions control_frameworks control_framework_mappings control_evidence control_evidence_versions evidence_artifacts evidence_storage audit_sessions audit_findings audit_observations audit_actions audit_action_events compliance_reviews compliance_review_items policy_documents policy_versions policy_acknowledgements policy_assignments risk_register risk_categories risk_assessments risk_treatments risk_reviews exceptions exception_reviews exception_approvals retention_policies retention_jobs retention_events privacy_requests privacy_request_events privacy_request_documents consent_withdrawals legal_holds compliance_dashboards governance_events; do grep -q "create table if not exists public.$table" "$migration"; done
for view in governance_dashboard_projection control_evidence_projection audit_findings_projection policy_assignment_projection risk_register_projection privacy_request_projection retention_status_projection reporting_governance_metrics; do grep -q "view public.$view" "$migration"; done
for rpc in create_control publish_control record_evidence verify_evidence start_audit close_audit record_finding resolve_finding create_policy publish_policy acknowledge_policy create_risk review_risk approve_exception submit_privacy_request approve_privacy_request complete_privacy_request run_retention_job record_governance_event; do grep -q "function public.$rpc" "$migration"; done
grep -q "force row level security" "$migration"; grep -q "reject_governance_evidence_mutation" "$migration"
if grep -Eiq 'delete[[:space:]]+from|drop[[:space:]]+(table|schema)' "$migration"; then echo "governance check failed: destructive SQL" >&2; exit 1; fi
echo "governance migration check: ok (37 tables, 8 projections, 19 controlled RPCs, immutable evidence)"
