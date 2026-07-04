#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"

fail() {
  printf 'local Supabase: %s\n' "$1" >&2
  exit 1
}

find_cli() {
  if [ -x node_modules/.bin/supabase ]; then
    printf '%s\n' "$ROOT/node_modules/.bin/supabase"
  elif command -v supabase >/dev/null 2>&1; then
    command -v supabase
  else
    fail "stable Supabase CLI is not installed; installation is intentionally not automatic"
  fi
}

check_isolation() {
  [ -f supabase/config.toml ] || fail "supabase/config.toml is missing"
  [ ! -f supabase/.temp/project-ref ] || fail "hosted project link detected; remove it before local harness use"
  [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] || fail "SUPABASE_ACCESS_TOKEN must not be present for local harness use"
  [ -z "${SUPABASE_DB_PASSWORD:-}" ] || fail "SUPABASE_DB_PASSWORD must not be present for local harness use"
  [ -z "${DATABASE_URL:-}" ] || fail "DATABASE_URL must not be present; this harness targets only the isolated CLI stack"
}

check_prerequisites() {
  check_isolation
  command -v docker >/dev/null 2>&1 || fail "Docker-compatible CLI is not installed"
  docker info >/dev/null 2>&1 || fail "Docker-compatible runtime is not available"
  cli=$(find_cli)
  "$cli" --version
  printf 'local Supabase: prerequisites and isolation checks passed\n'
}

run_cli() {
  check_isolation
  cli=$(find_cli)
  unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL
  SUPABASE_TELEMETRY_DISABLED=1 "$cli" "$@"
}

case "${1:-check}" in
  check)
    check_prerequisites
    ;;
  start)
    check_prerequisites
    run_cli start
    ;;
  status)
    run_cli status
    ;;
  stop)
    run_cli stop
    ;;
  *)
    fail "usage: $0 [check|start|status|stop]"
    ;;
esac
