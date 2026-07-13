#!/usr/bin/env sh
set -eu

migration="supabase/migrations/20260706000800_question_authoring_cms.sql"

test -f "$migration"
grep -q "SYRA-ADR: ADR-011" "$migration"
grep -q "SYRA-CONTRACT:" "$migration"
grep -q "SYRA-RLS:" "$migration"
grep -q "SYRA-IMMUTABLE:" "$migration"

for table in assessment_workflow_states question_bank_members question_categories question_tags question_drafts question_tag_assignments question_collections collection_questions question_review_comments question_publications question_import_jobs question_import_rows assessment_blueprints assessment_templates assessment_section_questions assessment_review_assignments assessment_authoring_events question_change_logs question_media question_assets; do
  grep -q "create table if not exists public.$table" "$migration"
done

for canonical in question_banks questions question_versions question_options question_answer_keys assessments assessment_versions assessment_sections assessment_form_items; do
  if grep -q "create table if not exists public.$canonical" "$migration"; then
    echo "question authoring check failed: $canonical must be reused, not recreated" >&2
    exit 1
  fi
done

for view in question_authoring_overview assessment_template_authoring_overview; do
  grep -q "create or replace view public.$view" "$migration"
done

for rpc in create_question save_question publish_question archive_question clone_question create_collection add_question_to_collection remove_question_from_collection create_assessment_template save_assessment_template publish_assessment_template assign_reviewer approve_question reject_question record_authoring_event; do
  grep -q "function public.$rpc" "$migration"
  grep -q "grant execute on function public.$rpc" "$migration"
done

grep -q "question.authoring.manage" "$migration"
grep -q "question_publications_reject_mutation" "$migration"
grep -q "assessment_authoring_events_reject_mutation" "$migration"
grep -q "question_change_logs_reject_mutation" "$migration"
grep -q "force row level security" "$migration"

echo "question authoring migration check: ok (20 tables, 2 projections, controlled RPCs, immutable evidence)"
