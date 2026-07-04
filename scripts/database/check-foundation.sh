#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'foundation migration check: %s\n' "$1" >&2
  exit 1
}

MIGRATION=supabase/migrations/20260704000100_trust_foundation.sql
[ -f "$MIGRATION" ] || fail "missing $MIGRATION"

expected_tables='organizations profiles organization_members roles permissions role_permissions member_role_assignments storage_objects system_config_versions processing_purposes audit_events'

for table in $expected_tables; do
  grep -Eq "create table (if not exists )?public\.${table}[[:space:](]" "$MIGRATION" || fail "missing table declaration: $table"
  grep -Eq "alter table public\.${table} enable row level security;" "$MIGRATION" || fail "RLS is not enabled for $table"
  grep -Eq "alter table public\.${table} force row level security;" "$MIGRATION" || fail "RLS is not forced for $table"
  grep -Eq "^\| \`${table}\`" docs/23-master-table-catalog.md || fail "$table is not in the frozen catalog"
done

declared_tables=$(grep -Eio 'create table (if not exists )?public\.[a-z_][a-z0-9_]*' "$MIGRATION" | sed -E 's/.*public\.//' | sort -u)
declared_count=$(printf '%s\n' "$declared_tables" | sed '/^$/d' | wc -l | tr -d ' ')
[ "$declared_count" = "11" ] || fail "expected exactly 11 table declarations, found $declared_count"

for extension in pgcrypto citext; do
  grep -Eq "create extension if not exists ${extension} with schema extensions;" "$MIGRATION" || fail "missing required extension: $extension"
done

for enum in risk_level audit_outcome; do
  grep -Eq "create type public\.${enum} as enum" "$MIGRATION" || fail "missing native enum: $enum"
done

grep -Eq 'create trigger audit_events_reject_mutation' "$MIGRATION" || fail "missing immutable audit trigger"
grep -Eq 'before update or delete on public\.audit_events' "$MIGRATION" || fail "audit trigger does not cover update and delete"
grep -Eq 'revoke all on table' "$MIGRATION" || fail "foundation grants are not explicitly revoked"

if grep -Eiq '^[[:space:]]*create[[:space:]]+policy' "$MIGRATION"; then
  fail "final/permissive RLS policies are forbidden in this wave"
fi

if grep -Eiq '^[[:space:]]*(insert[[:space:]]+into|update[[:space:]]+[a-z_]|delete[[:space:]]+from)' "$MIGRATION"; then
  fail "migration contains row DML or seed data"
fi

if grep -Eiq '^[[:space:]]*grant[[:space:]]+(all|select|insert|update|delete)' "$MIGRATION"; then
  fail "migration grants table access before final RLS policies"
fi

previous=''
find supabase/migrations -maxdepth 1 -type f -name '[0-9]*_*.sql' | sort | while read -r file; do
  base=$(basename "$file")
  stamp=${base%%_*}
  printf '%s' "$stamp" | grep -Eq '^[0-9]{14}$' || fail "invalid migration timestamp: $base"
  if [ -n "$previous" ] && [ "$stamp" -le "$previous" ]; then
    fail "migration order is not strictly increasing at $base"
  fi
  previous=$stamp
done

printf 'foundation migration check: ok (11 tables, 2 enums, 2 extensions, deny-by-default RLS)\n'
