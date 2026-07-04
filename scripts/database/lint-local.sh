#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

if ! "$ROOT/scripts/database/local-supabase.sh" check; then
  printf 'SKIPPED: database lint requires Docker and the stable Supabase CLI; no database was contacted.\n' >&2
  exit 2
fi

if ! "$ROOT/scripts/database/local-supabase.sh" status >/dev/null 2>&1; then
  printf 'SKIPPED: local Supabase stack is not running. Run npm run db:local:start, then retry.\n' >&2
  exit 2
fi

if [ -x node_modules/.bin/supabase ]; then
  CLI="$ROOT/node_modules/.bin/supabase"
else
  CLI=$(command -v supabase)
fi

unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL
SUPABASE_TELEMETRY_DISABLED=1 "$CLI" db lint --local --schema public --level warning --fail-on error
