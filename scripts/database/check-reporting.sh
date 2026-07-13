#!/usr/bin/env sh
set -eu
migration="supabase/migrations/20260706000900_enterprise_reporting.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-012" "$migration"
grep -q "SYRA-CONTRACT:" "$migration"
grep -q "SYRA-RLS:" "$migration"
for table in report_definitions report_templates saved_reports scheduled_reports report_executions report_exports dashboard_widgets dashboard_layouts analytics_snapshots analytics_dimensions analytics_metrics analytics_events executive_kpis organization_statistics course_statistics assessment_statistics learner_statistics mentor_statistics certificate_statistics system_health_snapshots audit_reporting_events; do grep -q "create table if not exists public.$table" "$migration"; done
for view in reporting_student_progress reporting_course_completion reporting_assessment_outcomes reporting_certificates reporting_organization_usage reporting_learning_activity reporting_mentor_activity reporting_admin_activity reporting_authoring_activity reporting_question_bank_usage reporting_risk_analytics reporting_compliance_metrics; do grep -q "create or replace view public.$view" "$migration"; done
for rpc in create_report update_report delete_report run_report schedule_report cancel_report export_report save_dashboard_layout save_dashboard_widget record_dashboard_event refresh_analytics_snapshot refresh_kpis record_report_download; do grep -q "function public.$rpc" "$migration"; grep -q "grant execute on function public.$rpc" "$migration"; done
grep -q "force row level security" "$migration"
grep -q "reject_reporting_immutable" "$migration"
if grep -q "insert into public.report_definitions.*demo\|insert into public.report_definitions.*seed" "$migration"; then echo "reporting check failed: business seed data" >&2; exit 1; fi
echo "reporting migration check: ok (21 tables, 12 projections, controlled RPCs, immutable evidence)"
