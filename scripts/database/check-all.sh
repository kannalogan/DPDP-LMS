#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
"$ROOT/scripts/database/check-contract.sh"
"$ROOT/scripts/database/check-migrations.sh"
"$ROOT/scripts/database/check-foundation.sh"
"$ROOT/scripts/database/check-identity.sh"
"$ROOT/scripts/database/check-safety.sh"
