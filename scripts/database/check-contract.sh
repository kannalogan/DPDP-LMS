#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'database contract check: %s\n' "$1" >&2
  exit 1
}

for number in 21 22 23 24 25 26 27 28 29 30; do
  matches=$(find docs -maxdepth 1 -type f -name "${number}-*.md" | wc -l | tr -d ' ')
  [ "$matches" = "1" ] || fail "expected exactly one docs/${number}-*.md file"
done

metrics=$(awk -F '|' '
  /^\| `[^`]+`/ {
    rows++
    if ($2 ~ /certificate_public_views/) projections++
    relationships = $4
    while (match(relationships, /->/)) {
      relation_count++
      relationships = substr(relationships, RSTART + 2)
    }
    security = $7
    if (security ~ /A2/) immutable++
    if (security ~ /P[234]/) pii++
    if (security ~ /RT1/) realtime++
  }
  END {
    printf "%d %d %d %d %d %d %d\n", rows, rows - projections, projections, relation_count, immutable, pii, realtime
  }
' docs/23-master-table-catalog.md)

set -- $metrics
[ "$1" = "170" ] || fail "expected 170 catalog relations, found $1"
[ "$2" = "169" ] || fail "expected 169 physical tables, found $2"
[ "$3" = "1" ] || fail "expected one protected projection, found $3"
[ "$4" = "312" ] || fail "expected 312 named relationships, found $4"
[ "$5" = "30" ] || fail "expected 30 immutable/evidence tables, found $5"
[ "$6" = "118" ] || fail "expected 118 PII-bearing relations, found $6"
[ "$7" = "12" ] || fail "expected 12 Realtime tables, found $7"

enum_count=$(awk -F '|' 'NR >= 13 && NR <= 64 && /^\| [0-9]+/ { count++ } END { print count + 0 }' docs/22-master-enum-catalog.md)
[ "$enum_count" = "52" ] || fail "expected 52 logical enums, found $enum_count"

domain_count=$(awk -F '|' 'NR >= 72 && /^\| `/ { count++ } END { print count + 0 }' docs/22-master-enum-catalog.md)
[ "$domain_count" = "7" ] || fail "expected 7 controlled domains, found $domain_count"

grep -q 'Database design readiness: 88/100' docs/30-database-open-decisions.md || fail "readiness score drifted"
grep -q 'organization_id.*tenant key' docs/30-database-open-decisions.md || fail "canonical tenant-key decision missing"

printf 'database contract check: ok (169 tables, 52 enums, 312 relationships)\n'
