#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

"$ROOT/scripts/database/check-all.sh"
"$ROOT/scripts/database/local-supabase.sh" status >/dev/null

if [ -x node_modules/.bin/supabase ]; then
  CLI="$ROOT/node_modules/.bin/supabase"
elif command -v supabase >/dev/null 2>&1; then
  CLI=$(command -v supabase)
else
  printf 'local validation: Supabase CLI unavailable\n' >&2
  exit 1
fi

if [ -f supabase/.temp/project-ref ] || [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] || [ -n "${SUPABASE_DB_PASSWORD:-}" ] || [ -n "${DATABASE_URL:-}" ]; then
  printf 'local validation: refusing linked or credential-bearing environment\n' >&2
  exit 1
fi

unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL
SUPABASE_TELEMETRY_DISABLED=1 "$CLI" db lint --local --schema public --level warning --fail-on error

if find supabase/tests -type f \( -name '*.sql' -o -name '*.pg' \) | grep -q .; then
  SUPABASE_TELEMETRY_DISABLED=1 "$CLI" test db --local
else
  printf 'local validation: no pgTAP files yet; expected until an approved migration exists\n'
fi

printf 'local validation: static policy and local schema lint passed\n'
