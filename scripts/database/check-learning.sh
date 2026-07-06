#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'learning migration check: %s\n' "$1" >&2
  exit 1
}

MIGRATION=supabase/migrations/20260706000100_learning_domain.sql
ADR=docs/43-adr-004-learning-wave-contract-reconciliation.md
[ -f "$MIGRATION" ] || fail "missing learning migration"
[ -f "$ADR" ] || fail "missing ADR-004"

TABLES='learning_tracks course_categories courses course_versions course_modules lessons lesson_versions learning_resources resource_versions tags course_tags learning_paths learning_path_versions learning_path_items enrollments lesson_progress module_progress course_progress learner_bookmarks learner_notes learner_favorites study_plans'

for table in $TABLES; do
  grep -Eq "create table if not exists public\.${table}[[:space:](]" "$MIGRATION" || fail "missing table: $table"
  grep -Eq "'${table}'" "$MIGRATION" || fail "RLS enablement inventory missing: $table"
  grep -Eq "^\| \`${table}\`" docs/23-master-table-catalog.md || fail "table is outside frozen contract: $table"
done

for forbidden in tracks modules resources bookmarks notes favorites assessments certificates ai_interactions cohorts study_plan_items; do
  if grep -Eq "create table if not exists public\.${forbidden}[[:space:](]" "$MIGRATION"; then
    fail "forbidden or noncanonical table created: $forbidden"
  fi
done

grep -q '^-- SYRA-ADR: ADR-004$' "$MIGRATION" || fail "migration is not bound to ADR-004"
grep -q 'learning.catalog.manage' "$MIGRATION" || fail "controlled catalog permission missing"
grep -q 'published learning versions are immutable' "$MIGRATION" || fail "published immutability guard missing"
grep -q 'profile_id = auth.uid()' "$MIGRATION" || fail "self-owned learner policy missing"
grep -q 'private.is_active_org_member(organization_id)' "$MIGRATION" || fail "tenant membership check missing"

if sed -n '/^-- SYRA-REFERENCE-DATA-BEGIN$/,/^-- SYRA-REFERENCE-DATA-END$/p' "$MIGRATION" | grep -Eiq 'insert[[:space:]]+into[[:space:]]+public\.(learning_tracks|course_categories|courses|course_versions|enrollments|profiles|organizations)'; then
  fail "learning migration contains fake user, tenant, or business seed rows"
fi

printf 'learning migration check: ok (22 canonical tables, RLS, no business seeds)\n'
