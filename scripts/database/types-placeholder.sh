#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

if [ -x node_modules/.bin/supabase ]; then
  CLI="$ROOT/node_modules/.bin/supabase"
elif command -v supabase >/dev/null 2>&1; then
  CLI=$(command -v supabase)
else
  printf 'BLOCKED: Supabase CLI is unavailable; install the pinned CLI and run npm run db:types against the isolated local stack.\n' >&2
  exit 2
fi

if ! "$ROOT/scripts/database/local-supabase.sh" status >/dev/null 2>&1; then
  printf 'BLOCKED: isolated local Supabase is not running; run npm run db:local:start first.\n' >&2
  exit 2
fi

if [ -f supabase/.temp/project-ref ] || [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] || [ -n "${SUPABASE_DB_PASSWORD:-}" ] || [ -n "${DATABASE_URL:-}" ]; then
  printf 'REFUSED: type generation accepts only an unlinked local Supabase stack and no database credentials.\n' >&2
  exit 1
fi

unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL
SUPABASE_TELEMETRY_DISABLED=1 "$CLI" gen types typescript --local > lib/supabase/database.types.ts
printf 'database types: generated lib/supabase/database.types.ts from isolated local Supabase\n'
