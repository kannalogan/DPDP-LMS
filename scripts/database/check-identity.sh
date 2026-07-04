#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'identity migration check: %s\n' "$1" >&2
  exit 1
}

MIGRATION=supabase/migrations/20260704000200_identity_platform.sql
[ -f "$MIGRATION" ] || fail "missing identity migration"

for table in user_settings user_sessions devices organization_invitations organization_settings; do
  grep -Eq "create table if not exists public\.${table}[[:space:](]" "$MIGRATION" || fail "missing table: $table"
  grep -Eq "alter table public\.${table} enable row level security;" "$MIGRATION" || fail "RLS missing: $table"
  grep -Eq "^\| \`${table}\`" docs/23-master-table-catalog.md || fail "table is outside frozen contract: $table"
done

for function in current_profile_id is_active_org_member has_permission bootstrap_profile create_organization accept_organization_invitation; do
  grep -Eq "function private\.${function}\(" "$MIGRATION" || fail "missing protected function: $function"
done
grep -Eq 'function public\.syra_mark_profile_verified\(' "$MIGRATION" || fail "missing profile verification RPC"

grep -q '^-- SYRA-SEED: deployment-reference$' "$MIGRATION" || fail "reference registry is not declared"
grep -q 'create trigger syra_auth_user_bootstrap' "$MIGRATION" || fail "profile bootstrap trigger missing"
grep -q 'create trigger user_sessions_reject_mutation' "$MIGRATION" || fail "session immutability trigger missing"
grep -q 'profiles_select_self' "$MIGRATION" || fail "profile self policy missing"
grep -q 'organizations_member_select' "$MIGRATION" || fail "organization membership policy missing"
grep -q 'private.has_permission' "$MIGRATION" || fail "permission resolver missing"

if sed -n '/^-- SYRA-REFERENCE-DATA-BEGIN$/,/^-- SYRA-REFERENCE-DATA-END$/p' "$MIGRATION" | grep -Eiq '^[[:space:]]*insert[[:space:]]+into[[:space:]]+public\.(profiles|organizations|organization_members|organization_invitations|user_settings|devices|user_sessions)'; then
  fail "identity migration contains fake user or tenant data"
fi

printf 'identity migration check: ok (5 tables, protected RBAC, production reference registry)\n'
