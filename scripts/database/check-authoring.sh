#!/usr/bin/env sh
set -eu

migration="supabase/migrations/20260706000700_course_authoring_cms.sql"

test -f "$migration"
grep -q "SYRA-ADR: ADR-010" "$migration"
grep -q "SYRA-CONTRACT:" "$migration"
grep -q "SYRA-RLS:" "$migration"
grep -q "SYRA-IMMUTABLE:" "$migration"

for table in workflow_states content_categories content_labels resource_folders resource_library course_drafts module_drafts lesson_drafts course_assets course_reviews content_review_assignments lesson_review_comments draft_lock_sessions editor_preferences course_publications publishing_jobs publishing_events version_change_logs; do
  grep -q "create table if not exists public.$table" "$migration"
done

for canonical in courses course_versions course_modules lessons lesson_versions learning_resources resource_versions course_categories tags; do
  if grep -q "create table if not exists public.$canonical" "$migration"; then
    echo "authoring check failed: $canonical must be reused, not recreated" >&2
    exit 1
  fi
done

for view in authoring_course_overview authoring_publishing_queue; do
  grep -q "create or replace view public.$view" "$migration"
done

for rpc in create_course_draft save_course_draft submit_course_review approve_course reject_course publish_course schedule_publication archive_course lock_editor unlock_editor record_editor_event; do
  grep -q "function public.$rpc" "$migration"
  grep -q "grant execute on function public.$rpc" "$migration"
done

grep -q "course.authoring.manage" "$migration"
grep -q "course_publications_reject_mutation" "$migration"
grep -q "publishing_events_reject_mutation" "$migration"
grep -q "version_change_logs_reject_mutation" "$migration"
grep -q "force row level security" "$migration"

echo "authoring migration check: ok (18 tables, 2 projections, controlled RPCs, immutable publication evidence)"
