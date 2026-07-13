#!/usr/bin/env sh
set -eu
migration="supabase/migrations/20260706001000_assignment_grading_platform.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-013" "$migration"
grep -q "SYRA-CONTRACT:" "$migration"
grep -q "SYRA-RLS:" "$migration"
for reused in rubrics rubric_versions rubric_criteria; do
  if grep -q "create table if not exists public.$reused" "$migration"; then
    echo "assignment migration check failed: $reused must be reused" >&2
    exit 1
  fi
done
for table in assignments assignment_versions assignment_publications assignment_course_links assignment_module_links assignment_lesson_links assignment_windows assignment_rules assignment_assets assignment_attachments assignment_assignments assignment_submissions submission_versions submission_files submission_text_entries submission_events submission_status_events grading_queue_items grading_assignments grading_results grading_events grading_comments rubric_scores rubric_score_events feedback_threads feedback_messages resubmission_requests resubmission_events gradebook_entries gradebook_events assignment_authoring_events assignment_change_logs; do
  grep -q "create table if not exists public.$table" "$migration"
done
for view in assignment_catalog_projection student_assignment_projection grading_queue_projection assignment_gradebook_projection assignment_reporting_projection; do
  grep -q "create or replace view public.$view" "$migration"
done
for rpc in create_assignment save_assignment_draft submit_assignment_review approve_assignment reject_assignment publish_assignment archive_assignment create_rubric save_rubric_draft publish_rubric clone_rubric start_assignment_submission save_submission_draft attach_submission_file remove_submission_file submit_assignment request_resubmission start_resubmission claim_grading_item save_grading_draft score_rubric_criterion finalize_grade release_feedback record_assignment_event; do
  grep -q "function public.$rpc" "$migration"
  grep -q "grant execute on function public.$rpc" "$migration"
done
grep -q "assignment-private" "$migration"
grep -q "force row level security" "$migration"
grep -q "reject_assignment_evidence_mutation" "$migration"
echo "assignment migration check: ok (32 tables, 5 projections, controlled RPCs, private storage, immutable evidence)"
