#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
fail() { printf 'assessment migration check: %s\n' "$1" >&2; exit 1; }

MIGRATION=supabase/migrations/20260706000300_assessment_engine.sql
[ -f "$MIGRATION" ] || fail "missing assessment migration"
[ -f docs/47-adr-006-assessment-contract-reconciliation.md ] || fail "missing ADR-006"
grep -q '^-- SYRA-ADR: ADR-006$' "$MIGRATION" || fail "migration is not bound to ADR-006"

TABLES='question_banks questions question_versions question_options question_answer_keys rubrics rubric_versions rubric_criteria assessments assessment_versions assessment_sections assessment_form_items assessment_assignments assessment_attempts attempt_items attempt_responses evaluations evaluation_scores'
for table in $TABLES; do
  grep -Eq "create table if not exists public\.${table}[[:space:](]" "$MIGRATION" || fail "missing canonical table: $table"
  grep -Eq "'${table}'" "$MIGRATION" || fail "RLS inventory missing: $table"
  grep -Eq "^\| \`${table}\`" docs/23-master-table-catalog.md || fail "table is outside frozen contract: $table"
done

for forbidden in assessment_collections assessment_questions question_choices attempt_sections attempt_answers attempt_events grading_results grading_events question_tags question_difficulty_profiles assessment_rules assessment_windows assessment_feedback question_media certificates; do
  grep -Eiq "create table if not exists public\.${forbidden}[[:space:](]" "$MIGRATION" && fail "noncanonical or forbidden table created: $forbidden"
done

for rpc in syra_start_assessment syra_resume_assessment syra_save_assessment_response syra_clear_assessment_response syra_mark_assessment_review syra_submit_assessment syra_abandon_assessment; do
  grep -Eq "create or replace function public\.${rpc}[[:space:](]" "$MIGRATION" || fail "missing controlled RPC: $rpc"
done

grep -q 'question_answer_keys from anon, authenticated' "$MIGRATION" || fail "answer-key service-only rule missing"
grep -q 'force row level security' "$MIGRATION" || fail "forced RLS missing"
grep -q 'submitted assessment responses are immutable' "$MIGRATION" || fail "submission immutability missing"
grep -q 'private.record_assessment_audit' "$MIGRATION" || fail "assessment audit evidence missing"
printf 'assessment migration check: ok (18 canonical tables, 7 controlled RPCs, S8 answer keys)\n'
