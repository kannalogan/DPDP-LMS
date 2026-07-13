#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
"$ROOT/scripts/database/check-contract.sh"
"$ROOT/scripts/database/check-migrations.sh"
"$ROOT/scripts/database/check-foundation.sh"
"$ROOT/scripts/database/check-identity.sh"
"$ROOT/scripts/database/check-learning.sh"
"$ROOT/scripts/database/check-delivery.sh"
"$ROOT/scripts/database/check-assessment.sh"
"$ROOT/scripts/database/check-certificate.sh"
"$ROOT/scripts/database/check-mentor.sh"
"$ROOT/scripts/database/check-admin.sh"
"$ROOT/scripts/database/check-authoring.sh"
"$ROOT/scripts/database/check-question-authoring.sh"
"$ROOT/scripts/database/check-reporting.sh"
"$ROOT/scripts/database/check-assignments.sh"
"$ROOT/scripts/database/check-notifications.sh"
"$ROOT/scripts/database/check-governance.sh"
"$ROOT/scripts/database/check-search.sh"
"$ROOT/scripts/database/check-ai.sh"
"$ROOT/scripts/database/check-ai-execution.sh"
"$ROOT/scripts/database/check-safety.sh"
