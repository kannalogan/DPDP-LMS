#!/bin/sh
set -eu

migration="supabase/migrations/20260706001600_ai_learning_assistant.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-019" "$migration"
grep -q "SYRA-CHANGE: additive" "$migration"

for table in ai_learning_sessions ai_learning_context ai_learning_plans ai_learning_plan_steps ai_flashcard_sets ai_flashcards ai_quiz_generations ai_quiz_questions ai_quiz_attempts ai_learning_recommendations ai_revision_plans ai_revision_sessions ai_concept_explanations ai_summary_requests ai_learning_memory ai_student_strengths ai_student_weaknesses ai_study_goals ai_learning_preferences ai_learning_events; do
  grep -q "create table if not exists public.$table" "$migration"
done

for view in student_ai_dashboard_projection student_ai_progress_projection mentor_ai_student_projection reporting_ai_learning_projection ai_learning_usage_projection; do
  grep -q "view public.$view with(security_invoker=true)" "$migration"
done

for rpc in create_learning_session save_learning_context append_learning_message generate_flashcards generate_quiz generate_summary generate_explanation generate_revision_plan generate_learning_plan generate_learning_recommendations record_learning_insights record_learning_feedback record_learning_event close_learning_session; do
  grep -q "function public.$rpc" "$migration"
done

test "$(grep -Eio 'create table (if not exists )?public\.ai_[a-z_][a-z0-9_]*' "$migration" | sort -u | wc -l | tr -d ' ')" = "20"
test "$(grep -c 'security_invoker=true' "$migration")" = "5"
grep -q "private.completed_ai_learning_execution" "$migration"
grep -q "private.can_read_ai_learning_content" "$migration"
grep -q "private.can_read_ai_learning_audit" "$migration"
grep -q "reject_ai_learning_evidence_mutation" "$migration"
grep -q "alter table public.%I force row level security" "$migration"
grep -q "revoke all on table public.%I from anon,authenticated" "$migration"

if grep -Eiq 'delete[[:space:]]+from|drop[[:space:]]+(table|schema)' "$migration"; then
  echo "AI learning check failed: destructive SQL" >&2
  exit 1
fi
if grep -Eiq 'to[[:space:]]+anon|service_role' "$migration"; then
  echo "AI learning check failed: broad or privileged access" >&2
  exit 1
fi
if grep -Eiq '(api[_-]?key|client[_-]?secret|provider[_-]?credential)' "$migration"; then
  echo "AI learning check failed: credential persistence" >&2
  exit 1
fi

echo "AI learning migration check: ok (20 tables, 5 projections, controlled execution-backed RPCs)"
