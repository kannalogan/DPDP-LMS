#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'migration policy check: %s\n' "$1" >&2
  exit 1
}

INVENTORY=database/migration-inventory.tsv
[ -f "$INVENTORY" ] || fail "missing $INVENTORY"

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

tail -n +2 "$INVENTORY" | while IFS="$(printf '\t')" read -r path expected status disposition; do
  [ -n "$path" ] || continue
  [ -f "$path" ] || fail "inventory path missing: $path"
  actual=$(hash_file "$path")
  [ "$actual" = "$expected" ] || fail "inventoried migration changed: $path"
  case "$status" in
    quarantined | active) ;;
    *) fail "unsupported inventory status for $path: $status" ;;
  esac
  [ -n "$disposition" ] || fail "missing disposition for $path"
done

find database/migrations supabase/migrations -type f -name '*.sql' | sort | while read -r migration; do
  if awk -F '\t' -v path="$migration" 'NR > 1 && $1 == path && $3 == "quarantined" { found=1 } END { exit !found }' "$INVENTORY"; then
    continue
  fi

  awk -F '\t' -v path="$migration" 'NR > 1 && $1 == path && $3 == "active" { found=1 } END { exit !found }' "$INVENTORY" || fail "$migration is not registered as active"

  grep -Eq '^-- SYRA-CONTRACT: docs/(2[1-9]|30)-' "$migration" || fail "$migration lacks docs/21-30 contract reference"
  grep -Eq '^-- SYRA-ADR: (ADR-[0-9]{3}|none-additive)$' "$migration" || fail "$migration lacks valid ADR declaration"
  grep -Eq '^-- SYRA-CHANGE: (additive|backfill|contract)$' "$migration" || fail "$migration lacks change classification"
  grep -Eq '^-- SYRA-PII: (none|P1|P2|P3|P4)$' "$migration" || fail "$migration lacks PII classification"
  grep -Eq '^-- SYRA-RLS: .+' "$migration" || fail "$migration lacks RLS classification/test reference"
  grep -Eq '^-- SYRA-IMMUTABLE: .+' "$migration" || fail "$migration lacks immutability declaration"

  if grep -Eiq '(^|[^[:alnum:]_])(drop|truncate)[[:space:]]+(table|schema|type)|alter[[:space:]]+table.+drop|delete[[:space:]]+from' "$migration"; then
    grep -Eq '^-- SYRA-ADR: ADR-[0-9]{3}$' "$migration" || fail "$migration contains destructive SQL without an ADR"
  fi

  if grep -Eiq '^[[:space:]]*create[[:space:]]+table' "$migration"; then
    grep -Eq '^-- SYRA-PII: (P1|P2|P3|P4|none)$' "$migration" || fail "$migration creates a table without PII classification"
    grep -Eq '^-- SYRA-RLS: (S[0-9]|not-exposed).+' "$migration" || fail "$migration creates a table without explicit RLS class"
  fi

  if grep -Eq '^-- SYRA-SEED: deployment-reference$' "$migration"; then
    grep -q '^-- SYRA-REFERENCE-DATA-BEGIN$' "$migration" || fail "$migration lacks reference-data boundary"
    grep -q '^-- SYRA-REFERENCE-DATA-END$' "$migration" || fail "$migration lacks reference-data boundary"
    if sed -n '/^-- SYRA-REFERENCE-DATA-BEGIN$/,/^-- SYRA-REFERENCE-DATA-END$/p' "$migration" | grep -Eiq '^[[:space:]]*insert[[:space:]]+into[[:space:]]+(public\.)?(learning_tracks|profiles|organizations|organization_members|organization_invitations)([^[:alnum:]_]|$)'; then
      fail "$migration contains tenant, user, or business seed data"
    fi
  elif grep -Eiq '^[[:space:]]*(insert[[:space:]]+into|update|delete[[:space:]]+from)[[:space:]]+(public\.)?(learning_tracks|roles|permissions|profiles|organizations)([^[:alnum:]_]|$)' "$migration"; then
    fail "$migration contains unapproved seed-like DML"
  fi

  immutable_tables=$(awk -F '|' '/^\| `[^`]+`/ && $7 ~ /A2/ { name=$2; gsub(/[ `]/, "", name); print name }' docs/23-master-table-catalog.md)
  for table in $immutable_tables; do
    if grep -Eiq "^[[:space:]]*(update[[:space:]]+(public\\.)?${table}|delete[[:space:]]+from[[:space:]]+(public\\.)?${table})([^[:alnum:]_]|$)" "$migration"; then
      fail "$migration mutates immutable table $table"
    fi
  done
done

[ ! -f supabase/seed.sql ] || fail "supabase/seed.sql is not approved in Phase 0"

printf 'migration policy check: ok (legacy and active checksums pinned; no unapproved migrations or seeds)\n'
