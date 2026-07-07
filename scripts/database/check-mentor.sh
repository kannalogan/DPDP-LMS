#!/usr/bin/env sh
set -eu

migration="supabase/migrations/20260706000500_mentor_workspace.sql"
docs="docs/23-master-table-catalog.md"

test -f "$migration"
grep -q "SYRA-ADR: ADR-008" "$migration"

for table in cohorts cohort_members mentor_profiles mentor_assignments mentor_interventions learner_reviews risk_signals notifications announcements announcement_acknowledgements; do
  grep -q "create table if not exists public.$table" "$migration"
  grep -q "\`$table\`" "$docs"
done

for view in mentor_dashboard_projections mentor_learner_activity_summaries mentor_task_queue mentor_review_queue; do
  grep -q "create or replace view public.$view" "$migration"
done

for rpc in assign_mentor assign_cohort record_mentor_note create_intervention mark_intervention_complete publish_announcement record_dashboard_event resolve_review_item; do
  grep -q "create or replace function public.$rpc" "$migration"
  grep -q "grant execute on function public.$rpc" "$migration"
done

grep -q "mentor.workspace.manage" "$migration"
grep -q "private.can_access_assigned_learner" "$migration"
grep -q "force row level security" "$migration"

if grep -q "create table if not exists public.mentor_reviews" "$migration"; then
  echo "mentor check failed: mentor_reviews alias must not be created" >&2
  exit 1
fi

if grep -q "create table if not exists public.interventions" "$migration"; then
  echo "mentor check failed: interventions alias must not be created" >&2
  exit 1
fi

echo "mentor migration check: ok (10 tables, 4 projections, 8 controlled RPCs)"
