#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'delivery migration check: %s\n' "$1" >&2
  exit 1
}

MIGRATION=supabase/migrations/20260706000200_learning_delivery.sql
[ -f "$MIGRATION" ] || fail "missing delivery migration"
[ -f docs/45-adr-005-delivery-routing-and-note-encryption.md ] || fail "missing ADR-005"
grep -q '^-- SYRA-ADR: ADR-005$' "$MIGRATION" || fail "migration is not bound to ADR-005"

if grep -Eiq 'create[[:space:]]+table' "$MIGRATION"; then
  fail "delivery wave must not create or rename frozen tables"
fi

for function in syra_start_course syra_resume_course syra_start_lesson syra_update_lesson_progress syra_complete_lesson syra_save_lesson_note syra_delete_lesson_note syra_bookmark_lesson syra_remove_lesson_bookmark syra_bookmark_resource syra_remove_resource_bookmark; do
  grep -Eq "create or replace function public\.${function}[[:space:](]" "$MIGRATION" || fail "missing controlled RPC: $function"
done

grep -q 'learner_notes_ciphertext_format_check' "$MIGRATION" || fail "encrypted-note constraint missing"
grep -q 'learner_notes_validate_write' "$MIGRATION" || fail "note access trigger missing"
grep -q 'learner_bookmarks_validate_write' "$MIGRATION" || fail "bookmark access trigger missing"
grep -q 'storage_objects_learning_select' "$MIGRATION" || fail "learning object metadata policy missing"
grep -q 'learning_objects_select' "$MIGRATION" || fail "private learning object policy missing"
grep -q 'revoke all on function' "$MIGRATION" || fail "RPC execution hardening missing"
grep -q 'private.record_learning_audit' "$MIGRATION" || fail "learning write audit missing"

printf 'delivery migration check: ok (11 controlled RPCs, encrypted notes, storage RLS)\n'
