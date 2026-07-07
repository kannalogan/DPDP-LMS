#!/usr/bin/env sh
set -eu

migration="supabase/migrations/20260706000400_certificate_engine.sql"
docs="docs/23-master-table-catalog.md"

test -f "$migration"
grep -q "SYRA-ADR: ADR-007" "$migration"

for table in certificate_templates certificate_template_versions certificate_eligibility_records certificates certificate_status_events certificate_verification_events; do
  grep -q "create table if not exists public.$table" "$migration"
  grep -q "\`$table\`" "$docs"
done

grep -q "force row level security" "$migration"
grep -q "create or replace view public.certificate_public_views" "$migration"
grep -q "create or replace function public.issue_certificate" "$migration"
grep -q "create or replace function public.verify_certificate" "$migration"
grep -q "create or replace function public.download_certificate" "$migration"
grep -q "create or replace function public.revoke_certificate" "$migration"
grep -q "create or replace function public.record_certificate_download" "$migration"
grep -q "create or replace function public.record_verification_event" "$migration"
grep -q "certificates_reject_mutation" "$migration"
grep -q "certificate_status_events_reject_mutation" "$migration"
grep -q "certificate_verification_events_reject_mutation" "$migration"
grep -q "revoke all on table public.%I from anon, authenticated" "$migration"

if grep -q "create table if not exists public.certificate_revocations" "$migration"; then
  echo "certificate check failed: certificate_revocations alias must not be created" >&2
  exit 1
fi

if grep -q "create table if not exists public.certificate_verifications" "$migration"; then
  echo "certificate check failed: certificate_verifications alias must not be created" >&2
  exit 1
fi

echo "certificate migration check: ok (6 canonical tables, public projection, controlled RPCs)"
