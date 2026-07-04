#!/bin/sh
set -eu

printf 'BLOCKED: database type generation starts only after the local trust-foundation migration, lint and pgTAP suite pass.\n' >&2
printf 'No remote project, database URL or real credential was used.\n' >&2
exit 2
