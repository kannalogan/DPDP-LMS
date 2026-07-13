#!/bin/sh
set -eu
migration="supabase/migrations/20260706001400_ai_platform.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-017" "$migration"; grep -q "SYRA-CONTRACT:" "$migration"; grep -q "SYRA-CHANGE: additive" "$migration"
for table in ai_providers ai_models ai_model_versions ai_capabilities ai_workflows ai_prompt_templates ai_prompt_versions ai_prompt_variables ai_prompt_runs ai_prompt_results ai_usage_events ai_usage_limits ai_usage_budgets ai_feedback ai_guardrails ai_guardrail_rules ai_guardrail_events ai_conversations ai_messages ai_context_windows ai_embeddings_registry ai_jobs ai_job_events ai_cache ai_recommendation_events ai_learning_profiles; do grep -q "create table if not exists public.$table" "$migration"; done
for view in ai_provider_catalog_projection ai_prompt_catalog_projection ai_conversation_projection ai_usage_summary_projection ai_guardrail_audit_projection reporting_ai_metrics; do grep -q "view public.$view" "$migration"; done
for rpc in register_ai_provider register_ai_model register_ai_capability create_ai_workflow create_ai_prompt_template save_ai_prompt_version publish_ai_prompt_version configure_ai_guardrail set_ai_usage_limit set_ai_usage_budget create_ai_conversation record_ai_feedback record_ai_recommendation_event record_ai_guardrail_event; do grep -q "function public.$rpc" "$migration"; done
grep -q "force row level security" "$migration"; grep -q "reject_ai_event_mutation" "$migration"; grep -q "reject_published_ai_version_mutation" "$migration"
test "$(grep -Eio 'create table (if not exists )?public\.ai_[a-z_][a-z0-9_]*' "$migration" | sort -u | wc -l | tr -d ' ')" = "26"
test "$(grep -c 'security_invoker=true' "$migration")" = "6"
if grep -Eiq 'delete[[:space:]]+from|drop[[:space:]]+(table|schema)' "$migration"; then echo "AI check failed: destructive SQL" >&2; exit 1; fi
if grep -Eiq 'api[_-]?key|client[_-]?secret|access[_-]?token|provider[_-]?credential' "$migration"; then echo "AI check failed: credential field" >&2; exit 1; fi
if grep -Eiq 'openai|gemini|anthropic|claude|bedrock|vertex|ollama|azure[[:space:]_-]*openai' "$migration"; then echo "AI check failed: vendor-specific integration" >&2; exit 1; fi
if grep -Eiq 'embedding[[:space:]_]*(vector|value)|vector\(' "$migration"; then echo "AI check failed: executable embedding storage" >&2; exit 1; fi
echo "AI migration check: ok (26 tables, 6 projections, 14 controlled RPCs, no providers or credentials)"
