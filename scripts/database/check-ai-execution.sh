#!/bin/sh
set -eu

migration="supabase/migrations/20260706001500_ai_provider_execution.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-018" "$migration"
grep -q "SYRA-CHANGE: additive" "$migration"

for table in ai_execution_policies ai_provider_health ai_provider_circuit_states ai_model_routes ai_provider_fallback_rules ai_provider_kill_switches ai_cost_rates ai_execution_requests ai_budget_reservations ai_execution_attempts ai_execution_results ai_execution_failures ai_execution_redactions ai_execution_policy_decisions; do
  grep -q "create table if not exists public.$table" "$migration"
done

for view in ai_provider_execution_status_projection ai_model_route_projection ai_execution_audit_projection reporting_ai_execution_metrics ai_execution_privacy_projection; do
  grep -q "view public.$view with(security_invoker=true)" "$migration"
done

for rpc in set_organization_ai_policy configure_ai_model_route configure_ai_fallback_rule set_ai_provider_kill_switch update_ai_cost_rate record_ai_provider_health begin_ai_execution reserve_ai_budget record_ai_execution_policy_decision record_ai_execution_redaction record_ai_execution_attempt complete_ai_execution fail_ai_execution; do
  grep -q "function public.$rpc" "$migration"
done

test "$(grep -Eio 'create table (if not exists )?public\.ai_[a-z_][a-z0-9_]*' "$migration" | sort -u | wc -l | tr -d ' ')" = "14"
test "$(grep -c 'security_invoker=true' "$migration")" = "5"
grep -q "reject_ai_execution_evidence_mutation" "$migration"
grep -q "alter table public.%I force row level security" "$migration"
grep -q "revoke all on table public.%I from anon,authenticated" "$migration"

if grep -Eiq 'delete[[:space:]]+from|drop[[:space:]]+(table|schema)' "$migration"; then
  echo "AI execution check failed: destructive SQL" >&2
  exit 1
fi
if grep -Eiq '(api[_-]?key|client[_-]?secret|access[_-]?token|provider[_-]?credential)[[:space:]]+(text|varchar|json)' "$migration"; then
  echo "AI execution check failed: credential persistence" >&2
  exit 1
fi
if grep -Eiq '(prompt|input|output|message|system_instruction)_(text|content|plaintext)' "$migration"; then
  echo "AI execution check failed: plaintext execution content" >&2
  exit 1
fi
if grep -Eiq 'to[[:space:]]+anon|service_role' "$migration"; then
  echo "AI execution check failed: broad or privileged access" >&2
  exit 1
fi

echo "AI execution migration check: ok (14 tables, 5 projections, 13 controlled RPCs)"
