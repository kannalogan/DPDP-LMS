#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'database safety check: %s\n' "$1" >&2
  exit 1
}

if grep -R -E 'NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE|NEXT_PUBLIC_SUPABASE_DB_PASSWORD' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.example' \
  app config features lib services types .env.example .env.development.example .env.testing.example .env.staging.example .env.production.example 2>/dev/null; then
  fail "service-role or database credentials use a public environment prefix"
fi

find app config features lib services -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) | while read -r source; do
  if grep -Eq "^[[:space:]]*['\"]use client['\"]" "$source" && grep -q 'SUPABASE_SERVICE_ROLE_KEY' "$source"; then
    fail "client-marked source references SUPABASE_SERVICE_ROLE_KEY: $source"
  fi
done

printf 'database safety check: ok (no public/client service-role references)\n'
