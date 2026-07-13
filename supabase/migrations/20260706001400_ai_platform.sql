-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-017
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-PII-NOTES: P2 metadata; P3 encrypted conversation and feedback content
-- SYRA-RLS: S2/S4/S6/S8 forced RLS, tenant and subject isolation, no public access
-- SYRA-IMMUTABLE: published versions, messages, usage, guardrail, job and recommendation events
-- SYRA-SEED: deployment-reference
-- SYRA-SEED-NOTES: permission keys only; no provider configuration or credentials

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  key text not null, name text not null, adapter_type text not null, status text not null default 'disabled', capabilities jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_providers_key_check check(key ~ '^[a-z][a-z0-9_.-]*$'), constraint ai_providers_status_check check(status in('disabled','configured','retired')),
  constraint ai_providers_capabilities_check check(jsonb_typeof(capabilities)='array'), constraint ai_providers_unique unique nulls not distinct(organization_id,key)
);
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  provider_id uuid not null references public.ai_providers(id) on delete restrict, key text not null, name text not null, modality text not null default 'text',
  context_window integer not null default 0, status text not null default 'disabled', created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_models_key_check check(key ~ '^[a-z][a-z0-9_.-]*$'), constraint ai_models_context_check check(context_window>=0),
  constraint ai_models_status_check check(status in('disabled','approved','retired')), constraint ai_models_unique unique(provider_id,key)
);
create table if not exists public.ai_model_versions (
  id uuid primary key default gen_random_uuid(), model_id uuid not null references public.ai_models(id) on delete restrict,
  version integer not null, model_reference text not null, capabilities jsonb not null default '[]'::jsonb, limits jsonb not null default '{}'::jsonb,
  status text not null default 'draft', content_hash text not null, released_at timestamptz, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), constraint ai_model_versions_version_check check(version>0),
  constraint ai_model_versions_json_check check(jsonb_typeof(capabilities)='array' and jsonb_typeof(limits)='object'),
  constraint ai_model_versions_status_check check(status in('draft','approved','retired')), constraint ai_model_versions_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_model_versions_unique unique(model_id,version)
);
create table if not exists public.ai_capabilities (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  key text not null, name text not null, category text not null, risk_tier text not null default 'medium', enabled boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_capabilities_key_check check(key ~ '^[a-z][a-z0-9_.-]*$'), constraint ai_capabilities_risk_check check(risk_tier in('low','medium','high','critical')),
  constraint ai_capabilities_unique unique nulls not distinct(organization_id,key)
);
create table if not exists public.ai_workflows (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  capability_id uuid not null references public.ai_capabilities(id) on delete restrict, key text not null, name text not null,
  status text not null default 'disabled', human_review_required boolean not null default true, configuration jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_workflows_key_check check(key ~ '^[a-z][a-z0-9_.-]*$'), constraint ai_workflows_status_check check(status in('draft','disabled','approved','retired')),
  constraint ai_workflows_configuration_check check(jsonb_typeof(configuration)='object'), constraint ai_workflows_unique unique(organization_id,key)
);
create table if not exists public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  workflow_id uuid not null references public.ai_workflows(id) on delete restrict, key text not null, title text not null, status text not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_prompt_templates_key_check check(key ~ '^[a-z][a-z0-9_.-]*$'), constraint ai_prompt_templates_status_check check(status in('draft','review','published','retired')),
  constraint ai_prompt_templates_unique unique(organization_id,key)
);
create table if not exists public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(), prompt_template_id uuid not null references public.ai_prompt_templates(id) on delete restrict,
  version integer not null, template_text text not null, input_schema jsonb not null default '{}'::jsonb, output_schema jsonb not null default '{}'::jsonb,
  status text not null default 'draft', content_hash text not null, published_at timestamptz, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), constraint ai_prompt_versions_version_check check(version>0),
  constraint ai_prompt_versions_schema_check check(jsonb_typeof(input_schema)='object' and jsonb_typeof(output_schema)='object'),
  constraint ai_prompt_versions_status_check check(status in('draft','review','published','retired')), constraint ai_prompt_versions_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_prompt_versions_unique unique(prompt_template_id,version)
);
create table if not exists public.ai_prompt_variables (
  id uuid primary key default gen_random_uuid(), prompt_version_id uuid not null references public.ai_prompt_versions(id) on delete restrict,
  name text not null, data_type text not null, required boolean not null default true, classification text not null default 'internal', default_value jsonb,
  created_at timestamptz not null default now(), constraint ai_prompt_variables_name_check check(name ~ '^[a-z][a-z0-9_]*$'),
  constraint ai_prompt_variables_type_check check(data_type in('string','number','boolean','array','object')),
  constraint ai_prompt_variables_classification_check check(classification in('public','internal','confidential','restricted')),
  constraint ai_prompt_variables_unique unique(prompt_version_id,name)
);
create table if not exists public.ai_guardrails (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  key text not null, name text not null, scope text not null, enforcement text not null default 'block', status text not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_guardrails_key_check check(key ~ '^[a-z][a-z0-9_.-]*$'), constraint ai_guardrails_enforcement_check check(enforcement in('observe','review','block')),
  constraint ai_guardrails_status_check check(status in('draft','active','retired')), constraint ai_guardrails_unique unique nulls not distinct(organization_id,key)
);
create table if not exists public.ai_guardrail_rules (
  id uuid primary key default gen_random_uuid(), guardrail_id uuid not null references public.ai_guardrails(id) on delete restrict,
  rule_key text not null, rule_type text not null, configuration jsonb not null default '{}'::jsonb, priority integer not null default 100,
  enabled boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_guardrail_rules_key_check check(rule_key ~ '^[a-z][a-z0-9_.-]*$'), constraint ai_guardrail_rules_priority_check check(priority>=0),
  constraint ai_guardrail_rules_configuration_check check(jsonb_typeof(configuration)='object'), constraint ai_guardrail_rules_unique unique(guardrail_id,rule_key)
);
create table if not exists public.ai_usage_limits (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  subject_type text not null, subject_id uuid, period text not null, unit text not null, limit_value bigint not null, status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_usage_limits_subject_check check(subject_type in('organization','role','profile','workflow')),
  constraint ai_usage_limits_period_check check(period in('day','week','month','quarter')), constraint ai_usage_limits_value_check check(limit_value>=0),
  constraint ai_usage_limits_status_check check(status in('active','paused','retired')), constraint ai_usage_limits_unique unique nulls not distinct(organization_id,subject_type,subject_id,period,unit)
);
create table if not exists public.ai_usage_budgets (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  period text not null, currency_code text not null default 'INR', budget_minor bigint not null, warning_threshold numeric not null default 0.8,
  status text not null default 'active', created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_usage_budgets_period_check check(period in('month','quarter','year')), constraint ai_usage_budgets_currency_check check(currency_code ~ '^[A-Z]{3}$'),
  constraint ai_usage_budgets_value_check check(budget_minor>=0 and warning_threshold between 0 and 1), constraint ai_usage_budgets_status_check check(status in('active','paused','retired')),
  constraint ai_usage_budgets_unique unique(organization_id,period,currency_code)
);
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, purpose text not null, title_ciphertext text,
  status text not null default 'open', started_at timestamptz not null default now(), ended_at timestamptz, expires_at timestamptz not null,
  constraint ai_conversations_status_check check(status in('open','closed','expired','archived')), constraint ai_conversations_dates_check check(expires_at>started_at and (ended_at is null or ended_at>=started_at))
);
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  conversation_id uuid not null references public.ai_conversations(id) on delete restrict, profile_id uuid references public.profiles(id) on delete set null,
  sequence_no integer not null, role text not null, content_ciphertext text not null, classification text not null default 'confidential',
  source_manifest jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), expires_at timestamptz not null,
  constraint ai_messages_sequence_check check(sequence_no>0), constraint ai_messages_role_check check(role in('system','user','assistant','tool')),
  constraint ai_messages_classification_check check(classification in('public','internal','confidential','restricted')),
  constraint ai_messages_manifest_check check(jsonb_typeof(source_manifest)='object'), constraint ai_messages_dates_check check(expires_at>created_at),
  constraint ai_messages_unique unique(conversation_id,sequence_no)
);
create table if not exists public.ai_context_windows (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  conversation_id uuid not null references public.ai_conversations(id) on delete restrict, start_sequence integer not null, end_sequence integer not null,
  token_budget integer not null default 0, state jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint ai_context_windows_sequence_check check(start_sequence>0 and end_sequence>=start_sequence), constraint ai_context_windows_budget_check check(token_budget>=0),
  constraint ai_context_windows_state_check check(jsonb_typeof(state)='object'), constraint ai_context_windows_unique unique(conversation_id,start_sequence,end_sequence)
);
create table if not exists public.ai_prompt_runs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  workflow_id uuid not null references public.ai_workflows(id) on delete restrict, prompt_version_id uuid not null references public.ai_prompt_versions(id) on delete restrict,
  conversation_id uuid references public.ai_conversations(id) on delete restrict, provider_id uuid references public.ai_providers(id) on delete restrict,
  model_version_id uuid references public.ai_model_versions(id) on delete restrict, requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'blocked', input_classification text not null default 'internal', human_review_required boolean not null default true,
  idempotency_key text not null, started_at timestamptz not null default now(), completed_at timestamptz,
  constraint ai_prompt_runs_status_check check(status in('blocked','queued','running','completed','failed','cancelled')),
  constraint ai_prompt_runs_classification_check check(input_classification in('public','internal','confidential','restricted')),
  constraint ai_prompt_runs_dates_check check(completed_at is null or completed_at>=started_at), constraint ai_prompt_runs_unique unique(organization_id,idempotency_key)
);
create table if not exists public.ai_prompt_results (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  prompt_run_id uuid not null references public.ai_prompt_runs(id) on delete restrict, status text not null,
  output_classification text not null default 'internal', result_reference_hash text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint ai_prompt_results_status_check check(status in('blocked','completed','failed')), constraint ai_prompt_results_classification_check check(output_classification in('public','internal','confidential','restricted')),
  constraint ai_prompt_results_reference_check check(result_reference_hash is null or length(result_reference_hash)>=32),
  constraint ai_prompt_results_metadata_check check(jsonb_typeof(metadata)='object'), constraint ai_prompt_results_run_unique unique(prompt_run_id)
);
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  prompt_run_id uuid references public.ai_prompt_runs(id) on delete restrict, provider_id uuid references public.ai_providers(id) on delete restrict,
  model_version_id uuid references public.ai_model_versions(id) on delete restrict, capability_key text not null,
  input_units integer not null default 0, output_units integer not null default 0, cached_units integer not null default 0,
  latency_ms integer not null default 0, cost_minor bigint not null default 0, currency_code text not null default 'INR', occurred_at timestamptz not null default now(),
  constraint ai_usage_events_values_check check(input_units>=0 and output_units>=0 and cached_units>=0 and latency_ms>=0 and cost_minor>=0),
  constraint ai_usage_events_currency_check check(currency_code ~ '^[A-Z]{3}$')
);
create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  prompt_run_id uuid references public.ai_prompt_runs(id) on delete restrict, conversation_id uuid references public.ai_conversations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, rating integer, reason_codes text[] not null default '{}',
  comment_ciphertext text, created_at timestamptz not null default now(), constraint ai_feedback_parent_check check(prompt_run_id is not null or conversation_id is not null),
  constraint ai_feedback_rating_check check(rating is null or rating between 1 and 5), constraint ai_feedback_unique unique nulls not distinct(prompt_run_id,conversation_id,profile_id)
);
create table if not exists public.ai_guardrail_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  guardrail_id uuid references public.ai_guardrails(id) on delete restrict, rule_id uuid references public.ai_guardrail_rules(id) on delete restrict,
  prompt_run_id uuid references public.ai_prompt_runs(id) on delete restrict, actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null, severity text not null, action text not null, details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint ai_guardrail_events_severity_check check(severity in('info','low','medium','high','critical')),
  constraint ai_guardrail_events_action_check check(action in('observed','reviewed','blocked','approved','rejected')),
  constraint ai_guardrail_events_details_check check(jsonb_typeof(details)='object')
);
create table if not exists public.ai_embeddings_registry (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  source_type text not null, source_id uuid not null, registry_key text not null, implementation_state text not null default 'reserved',
  status text not null default 'disabled', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint ai_embeddings_registry_state_check check(implementation_state='reserved'), constraint ai_embeddings_registry_status_check check(status in('disabled','retired')),
  constraint ai_embeddings_registry_metadata_check check(jsonb_typeof(metadata)='object'), constraint ai_embeddings_registry_unique unique(organization_id,registry_key)
);
create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  workflow_id uuid references public.ai_workflows(id) on delete restrict, job_type text not null, status text not null default 'blocked',
  payload_reference_hash text, priority integer not null default 100, scheduled_at timestamptz, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), completed_at timestamptz,
  constraint ai_jobs_status_check check(status in('blocked','queued','running','completed','failed','cancelled')),
  constraint ai_jobs_reference_check check(payload_reference_hash is null or length(payload_reference_hash)>=32), constraint ai_jobs_priority_check check(priority>=0),
  constraint ai_jobs_dates_check check(completed_at is null or completed_at>=created_at)
);
create table if not exists public.ai_job_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  ai_job_id uuid not null references public.ai_jobs(id) on delete restrict, event_type text not null, status text not null,
  details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(), constraint ai_job_events_details_check check(jsonb_typeof(details)='object')
);
create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  cache_key_hash text not null, capability_key text not null, status text not null default 'disabled', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), expires_at timestamptz not null,
  constraint ai_cache_hash_check check(length(cache_key_hash)>=32), constraint ai_cache_status_check check(status in('disabled','valid','invalidated','expired')),
  constraint ai_cache_metadata_check check(jsonb_typeof(metadata)='object'), constraint ai_cache_dates_check check(expires_at>created_at), constraint ai_cache_unique unique(organization_id,cache_key_hash)
);
create table if not exists public.ai_recommendation_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, recommendation_type text not null, target_type text not null, target_id uuid not null,
  event_type text not null, source_rule text not null, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint ai_recommendation_events_type_check check(event_type in('presented','opened','accepted','dismissed')),
  constraint ai_recommendation_events_metadata_check check(jsonb_typeof(metadata)='object')
);
create table if not exists public.ai_learning_profiles (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, preferences jsonb not null default '{}'::jsonb,
  learning_objectives jsonb not null default '[]'::jsonb, constraints jsonb not null default '{}'::jsonb,
  status text not null default 'disabled', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ai_learning_profiles_json_check check(jsonb_typeof(preferences)='object' and jsonb_typeof(learning_objectives)='array' and jsonb_typeof(constraints)='object'),
  constraint ai_learning_profiles_status_check check(status in('disabled','active','archived')), constraint ai_learning_profiles_unique unique(organization_id,profile_id)
);

create index if not exists ai_models_provider_idx on public.ai_models(provider_id,status);
create index if not exists ai_prompt_versions_template_idx on public.ai_prompt_versions(prompt_template_id,version desc);
create index if not exists ai_conversations_profile_idx on public.ai_conversations(profile_id,status,started_at desc);
create index if not exists ai_messages_conversation_idx on public.ai_messages(conversation_id,sequence_no);
create index if not exists ai_prompt_runs_org_time_idx on public.ai_prompt_runs(organization_id,started_at desc,status);
create index if not exists ai_usage_events_org_time_idx on public.ai_usage_events(organization_id,occurred_at desc,capability_key);
create index if not exists ai_guardrail_events_org_time_idx on public.ai_guardrail_events(organization_id,occurred_at desc,severity);
create index if not exists ai_jobs_org_status_idx on public.ai_jobs(organization_id,status,priority,created_at);
create index if not exists ai_recommendation_events_profile_idx on public.ai_recommendation_events(profile_id,occurred_at desc);

create or replace function private.can_manage_ai(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and (private.has_permission(target_organization_id,'ai.platform.manage') or private.can_administer_organization(target_organization_id))
$$;
create or replace function private.can_use_ai(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and (private.has_permission(target_organization_id,'ai.platform.use') or private.is_active_org_member(target_organization_id))
$$;
create or replace function private.can_read_ai_audit(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and (private.has_permission(target_organization_id,'ai.audit.read') or private.can_manage_ai(target_organization_id))
$$;

create or replace view public.ai_provider_catalog_projection with(security_invoker=true) as
select p.id,p.organization_id,p.key,p.name,p.adapter_type,p.status,p.capabilities,p.updated_at,
  count(distinct m.id)::integer as model_count
from public.ai_providers p left join public.ai_models m on m.provider_id=p.id
group by p.id;
create or replace view public.ai_prompt_catalog_projection with(security_invoker=true) as
select t.id,t.organization_id,t.workflow_id,t.key,t.title,t.status,t.updated_at,
  count(v.id)::integer as version_count,max(v.version) as latest_version,max(v.published_at) as published_at
from public.ai_prompt_templates t left join public.ai_prompt_versions v on v.prompt_template_id=t.id
group by t.id;
create or replace view public.ai_conversation_projection with(security_invoker=true) as
select c.id,c.organization_id,c.profile_id,c.purpose,c.status,c.started_at,c.ended_at,c.expires_at,
  count(m.id)::integer as message_count
from public.ai_conversations c left join public.ai_messages m on m.conversation_id=c.id
group by c.id;
create or replace view public.ai_usage_summary_projection with(security_invoker=true) as
select organization_id,date_trunc('day',occurred_at) as usage_day,count(*)::integer as event_count,
  coalesce(sum(input_units),0)::bigint as input_units,coalesce(sum(output_units),0)::bigint as output_units,
  coalesce(sum(cost_minor),0)::bigint as cost_minor,coalesce(avg(latency_ms),0)::numeric(12,2) as average_latency_ms
from public.ai_usage_events group by organization_id,date_trunc('day',occurred_at);
create or replace view public.ai_guardrail_audit_projection with(security_invoker=true) as
select e.id,e.organization_id,e.guardrail_id,g.name as guardrail_name,e.event_type,e.severity,e.action,e.occurred_at
from public.ai_guardrail_events e left join public.ai_guardrails g on g.id=e.guardrail_id;
create or replace view public.reporting_ai_metrics with(security_invoker=true) as
select o.id as organization_id,
  (select count(*)::integer from public.ai_prompt_runs r where r.organization_id=o.id) as prompt_runs,
  (select count(*)::integer from public.ai_conversations c where c.organization_id=o.id) as conversations,
  (select count(*)::integer from public.ai_feedback f where f.organization_id=o.id) as feedback_count,
  (select coalesce(avg(f.rating),0)::numeric(5,2) from public.ai_feedback f where f.organization_id=o.id) as feedback_score,
  (select count(*)::integer from public.ai_recommendation_events e where e.organization_id=o.id and e.event_type='accepted') as recommendations_accepted,
  (select coalesce(avg(e.latency_ms),0)::numeric(12,2) from public.ai_usage_events e where e.organization_id=o.id) as prompt_latency_ms
from public.organizations o;

create or replace function public.register_ai_provider(p_organization_id uuid,p_key text,p_name text,p_adapter_type text,p_capabilities jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) then raise exception 'AI administration denied' using errcode='42501'; end if;
  insert into public.ai_providers(organization_id,key,name,adapter_type,capabilities,created_by)
  values(p_organization_id,p_key,p_name,p_adapter_type,p_capabilities,auth.uid()) returning id into result_id; return result_id;
end $$;
create or replace function public.register_ai_model(p_provider_id uuid,p_key text,p_name text,p_modality text,p_context_window integer default 0)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; begin
  select organization_id into org_id from public.ai_providers where id=p_provider_id;
  if not private.can_manage_ai(org_id) then raise exception 'AI administration denied' using errcode='42501'; end if;
  insert into public.ai_models(organization_id,provider_id,key,name,modality,context_window,created_by)
  values(org_id,p_provider_id,p_key,p_name,p_modality,p_context_window,auth.uid()) returning id into result_id; return result_id;
end $$;
create or replace function public.register_ai_capability(p_organization_id uuid,p_key text,p_name text,p_category text,p_risk_tier text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) then raise exception 'AI administration denied' using errcode='42501'; end if;
  insert into public.ai_capabilities(organization_id,key,name,category,risk_tier,created_by)
  values(p_organization_id,p_key,p_name,p_category,p_risk_tier,auth.uid()) returning id into result_id; return result_id;
end $$;
create or replace function public.create_ai_workflow(p_organization_id uuid,p_capability_id uuid,p_key text,p_name text,p_human_review_required boolean default true)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) or not exists(select 1 from public.ai_capabilities c where c.id=p_capability_id and c.organization_id=p_organization_id) then raise exception 'AI workflow administration denied' using errcode='42501'; end if;
  insert into public.ai_workflows(organization_id,capability_id,key,name,human_review_required,created_by)
  values(p_organization_id,p_capability_id,p_key,p_name,p_human_review_required,auth.uid()) returning id into result_id; return result_id;
end $$;
create or replace function public.create_ai_prompt_template(p_organization_id uuid,p_workflow_id uuid,p_key text,p_title text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) or not exists(select 1 from public.ai_workflows w where w.id=p_workflow_id and w.organization_id=p_organization_id) then raise exception 'AI prompt administration denied' using errcode='42501'; end if;
  insert into public.ai_prompt_templates(organization_id,workflow_id,key,title,created_by) values(p_organization_id,p_workflow_id,p_key,p_title,auth.uid()) returning id into result_id; return result_id;
end $$;
create or replace function public.save_ai_prompt_version(p_prompt_template_id uuid,p_template_text text,p_input_schema jsonb default '{}'::jsonb,p_output_schema jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; next_version integer; begin
  select organization_id into org_id from public.ai_prompt_templates where id=p_prompt_template_id;
  if not private.can_manage_ai(org_id) then raise exception 'AI prompt administration denied' using errcode='42501'; end if;
  select coalesce(max(version),0)+1 into next_version from public.ai_prompt_versions where prompt_template_id=p_prompt_template_id;
  insert into public.ai_prompt_versions(prompt_template_id,version,template_text,input_schema,output_schema,content_hash,created_by)
  values(p_prompt_template_id,next_version,p_template_text,p_input_schema,p_output_schema,encode(extensions.digest(p_template_text||p_input_schema::text||p_output_schema::text,'sha256'),'hex'),auth.uid()) returning id into result_id; return result_id;
end $$;
create or replace function public.publish_ai_prompt_version(p_prompt_version_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare template_id uuid; org_id uuid; begin
  select v.prompt_template_id,t.organization_id into template_id,org_id from public.ai_prompt_versions v join public.ai_prompt_templates t on t.id=v.prompt_template_id where v.id=p_prompt_version_id;
  if not private.can_manage_ai(org_id) then raise exception 'AI prompt publication denied' using errcode='42501'; end if;
  update public.ai_prompt_versions set status='published',published_at=now() where id=p_prompt_version_id and status in('draft','review');
  update public.ai_prompt_templates set status='published',updated_at=now() where id=template_id;
end $$;
create or replace function public.configure_ai_guardrail(p_organization_id uuid,p_key text,p_name text,p_scope text,p_enforcement text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) then raise exception 'AI guardrail administration denied' using errcode='42501'; end if;
  insert into public.ai_guardrails(organization_id,key,name,scope,enforcement,created_by) values(p_organization_id,p_key,p_name,p_scope,p_enforcement,auth.uid()) returning id into result_id; return result_id;
end $$;
create or replace function public.set_ai_usage_limit(p_organization_id uuid,p_subject_type text,p_subject_id uuid,p_period text,p_unit text,p_limit_value bigint)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) then raise exception 'AI usage administration denied' using errcode='42501'; end if;
  insert into public.ai_usage_limits(organization_id,subject_type,subject_id,period,unit,limit_value,created_by)
  values(p_organization_id,p_subject_type,p_subject_id,p_period,p_unit,p_limit_value,auth.uid())
  on conflict(organization_id,subject_type,subject_id,period,unit) do update set limit_value=excluded.limit_value,status='active',updated_at=now() returning id into result_id; return result_id;
end $$;
create or replace function public.set_ai_usage_budget(p_organization_id uuid,p_period text,p_currency_code text,p_budget_minor bigint,p_warning_threshold numeric default 0.8)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) then raise exception 'AI budget administration denied' using errcode='42501'; end if;
  insert into public.ai_usage_budgets(organization_id,period,currency_code,budget_minor,warning_threshold,created_by)
  values(p_organization_id,p_period,p_currency_code,p_budget_minor,p_warning_threshold,auth.uid())
  on conflict(organization_id,period,currency_code) do update set budget_minor=excluded.budget_minor,warning_threshold=excluded.warning_threshold,status='active',updated_at=now() returning id into result_id; return result_id;
end $$;
create or replace function public.create_ai_conversation(p_organization_id uuid,p_purpose text,p_retention_days integer default 30)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_use_ai(p_organization_id) or p_retention_days not between 1 and 365 then raise exception 'AI conversation denied' using errcode='42501'; end if;
  insert into public.ai_conversations(organization_id,profile_id,purpose,expires_at) values(p_organization_id,auth.uid(),p_purpose,now()+make_interval(days=>p_retention_days)) returning id into result_id; return result_id;
end $$;
create or replace function public.record_ai_feedback(p_prompt_run_id uuid,p_rating integer,p_reason_codes text[] default '{}',p_comment_ciphertext text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; owner_id uuid; begin
  select organization_id,requested_by into org_id,owner_id from public.ai_prompt_runs where id=p_prompt_run_id;
  if auth.uid() is null or auth.uid() is distinct from owner_id or not private.can_use_ai(org_id) then raise exception 'AI feedback denied' using errcode='42501'; end if;
  insert into public.ai_feedback(organization_id,prompt_run_id,profile_id,rating,reason_codes,comment_ciphertext)
  values(org_id,p_prompt_run_id,auth.uid(),p_rating,p_reason_codes,p_comment_ciphertext) returning id into result_id; return result_id;
end $$;
create or replace function public.record_ai_recommendation_event(p_organization_id uuid,p_recommendation_type text,p_target_type text,p_target_id uuid,p_event_type text,p_source_rule text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_use_ai(p_organization_id) then raise exception 'AI recommendation event denied' using errcode='42501'; end if;
  insert into public.ai_recommendation_events(organization_id,profile_id,recommendation_type,target_type,target_id,event_type,source_rule)
  values(p_organization_id,auth.uid(),p_recommendation_type,p_target_type,p_target_id,p_event_type,p_source_rule) returning id into result_id; return result_id;
end $$;
create or replace function public.record_ai_guardrail_event(p_organization_id uuid,p_guardrail_id uuid,p_rule_id uuid,p_event_type text,p_severity text,p_action text,p_details jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if not private.can_manage_ai(p_organization_id) then raise exception 'AI guardrail event denied' using errcode='42501'; end if;
  insert into public.ai_guardrail_events(organization_id,guardrail_id,rule_id,actor_profile_id,event_type,severity,action,details)
  values(p_organization_id,p_guardrail_id,p_rule_id,auth.uid(),p_event_type,p_severity,p_action,p_details) returning id into result_id; return result_id;
end $$;

create or replace function private.reject_ai_event_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'AI evidence is immutable'; end $$;
create or replace function private.reject_published_ai_version_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin
  if old.status in('published','approved') then raise exception 'published AI versions are immutable'; end if; return new;
end $$;
create trigger ai_prompt_versions_published_immutable before update or delete on public.ai_prompt_versions for each row execute function private.reject_published_ai_version_mutation();
create trigger ai_model_versions_approved_immutable before update or delete on public.ai_model_versions for each row execute function private.reject_published_ai_version_mutation();
do $$ declare table_name text; begin foreach table_name in array array['ai_messages','ai_prompt_results','ai_usage_events','ai_guardrail_events','ai_job_events','ai_recommendation_events'] loop
  execute format('create trigger %I before update or delete on public.%I for each row execute function private.reject_ai_event_mutation()',table_name||'_immutable',table_name);
end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'ai_providers','ai_models','ai_model_versions','ai_capabilities','ai_workflows','ai_prompt_templates','ai_prompt_versions','ai_prompt_variables',
  'ai_prompt_runs','ai_prompt_results','ai_usage_events','ai_usage_limits','ai_usage_budgets','ai_feedback','ai_guardrails','ai_guardrail_rules',
  'ai_guardrail_events','ai_conversations','ai_messages','ai_context_windows','ai_embeddings_registry','ai_jobs','ai_job_events','ai_cache',
  'ai_recommendation_events','ai_learning_profiles'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from anon,authenticated',table_name);
end loop; end $$;

create policy ai_providers_admin_select on public.ai_providers for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_ai(organization_id));
create policy ai_models_admin_select on public.ai_models for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_ai(organization_id));
create policy ai_model_versions_admin_select on public.ai_model_versions for select to authenticated using(exists(select 1 from public.ai_models m where m.id=model_id and ((m.organization_id is null and private.can_platform_admin()) or private.can_manage_ai(m.organization_id))));
create policy ai_capabilities_context_select on public.ai_capabilities for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_ai(organization_id) or (enabled and private.can_use_ai(organization_id)));
create policy ai_workflows_context_select on public.ai_workflows for select to authenticated using(private.can_manage_ai(organization_id) or (status='approved' and private.can_use_ai(organization_id)));
create policy ai_prompt_templates_admin_select on public.ai_prompt_templates for select to authenticated using(private.can_manage_ai(organization_id));
create policy ai_prompt_versions_admin_select on public.ai_prompt_versions for select to authenticated using(exists(select 1 from public.ai_prompt_templates t where t.id=prompt_template_id and private.can_manage_ai(t.organization_id)));
create policy ai_prompt_variables_admin_select on public.ai_prompt_variables for select to authenticated using(exists(select 1 from public.ai_prompt_versions v join public.ai_prompt_templates t on t.id=v.prompt_template_id where v.id=prompt_version_id and private.can_manage_ai(t.organization_id)));
create policy ai_prompt_runs_context_select on public.ai_prompt_runs for select to authenticated using(requested_by=auth.uid() or private.can_read_ai_audit(organization_id));
create policy ai_prompt_results_context_select on public.ai_prompt_results for select to authenticated using(exists(select 1 from public.ai_prompt_runs r where r.id=prompt_run_id and (r.requested_by=auth.uid() or private.can_read_ai_audit(r.organization_id))));
create policy ai_usage_events_audit_select on public.ai_usage_events for select to authenticated using(private.can_read_ai_audit(organization_id));
create policy ai_usage_limits_admin_select on public.ai_usage_limits for select to authenticated using(private.can_manage_ai(organization_id));
create policy ai_usage_budgets_admin_select on public.ai_usage_budgets for select to authenticated using(private.can_manage_ai(organization_id));
create policy ai_feedback_context_select on public.ai_feedback for select to authenticated using(profile_id=auth.uid() or private.can_read_ai_audit(organization_id));
create policy ai_guardrails_admin_select on public.ai_guardrails for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_ai(organization_id));
create policy ai_guardrail_rules_admin_select on public.ai_guardrail_rules for select to authenticated using(exists(select 1 from public.ai_guardrails g where g.id=guardrail_id and ((g.organization_id is null and private.can_platform_admin()) or private.can_manage_ai(g.organization_id))));
create policy ai_guardrail_events_audit_select on public.ai_guardrail_events for select to authenticated using(private.can_read_ai_audit(organization_id));
create policy ai_conversations_context_select on public.ai_conversations for select to authenticated using(profile_id=auth.uid() or private.can_read_ai_audit(organization_id));
create policy ai_messages_owner_select on public.ai_messages for select to authenticated using(exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.profile_id=auth.uid()));
create policy ai_context_windows_owner_select on public.ai_context_windows for select to authenticated using(exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.profile_id=auth.uid()));
create policy ai_embeddings_registry_admin_select on public.ai_embeddings_registry for select to authenticated using(private.can_manage_ai(organization_id));
create policy ai_jobs_admin_select on public.ai_jobs for select to authenticated using(private.can_manage_ai(organization_id));
create policy ai_job_events_admin_select on public.ai_job_events for select to authenticated using(private.can_read_ai_audit(organization_id));
create policy ai_cache_admin_select on public.ai_cache for select to authenticated using(private.can_manage_ai(organization_id));
create policy ai_recommendation_events_context_select on public.ai_recommendation_events for select to authenticated using(profile_id=auth.uid() or private.can_read_ai_audit(organization_id));
create policy ai_learning_profiles_owner_select on public.ai_learning_profiles for select to authenticated using(profile_id=auth.uid() or private.can_manage_ai(organization_id));

grant select on public.ai_providers,public.ai_models,public.ai_model_versions,public.ai_capabilities,public.ai_workflows,public.ai_prompt_templates,public.ai_prompt_versions,public.ai_prompt_variables,public.ai_prompt_runs,public.ai_prompt_results,public.ai_usage_events,public.ai_usage_limits,public.ai_usage_budgets,public.ai_feedback,public.ai_guardrails,public.ai_guardrail_rules,public.ai_guardrail_events,public.ai_conversations,public.ai_messages,public.ai_context_windows,public.ai_embeddings_registry,public.ai_jobs,public.ai_job_events,public.ai_cache,public.ai_recommendation_events,public.ai_learning_profiles to authenticated;
grant select on public.ai_provider_catalog_projection,public.ai_prompt_catalog_projection,public.ai_conversation_projection,public.ai_usage_summary_projection,public.ai_guardrail_audit_projection,public.reporting_ai_metrics to authenticated;
revoke all on function private.can_manage_ai(uuid) from public;
revoke all on function private.can_use_ai(uuid) from public;
revoke all on function private.can_read_ai_audit(uuid) from public;
grant execute on function private.can_manage_ai(uuid),private.can_use_ai(uuid),private.can_read_ai_audit(uuid) to authenticated;
do $$ declare signature text; begin foreach signature in array array[
  'register_ai_provider(uuid,text,text,text,jsonb)','register_ai_model(uuid,text,text,text,integer)',
  'register_ai_capability(uuid,text,text,text,text)','create_ai_workflow(uuid,uuid,text,text,boolean)',
  'create_ai_prompt_template(uuid,uuid,text,text)','save_ai_prompt_version(uuid,text,jsonb,jsonb)','publish_ai_prompt_version(uuid)',
  'configure_ai_guardrail(uuid,text,text,text,text)','set_ai_usage_limit(uuid,text,uuid,text,text,bigint)',
  'set_ai_usage_budget(uuid,text,text,bigint,numeric)','create_ai_conversation(uuid,text,integer)',
  'record_ai_feedback(uuid,integer,text[],text)','record_ai_recommendation_event(uuid,text,text,uuid,text,text)',
  'record_ai_guardrail_event(uuid,uuid,uuid,text,text,text,jsonb)'
] loop
  execute format('revoke all on function public.%s from public',signature);
  execute format('grant execute on function public.%s to authenticated',signature);
end loop; end $$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions(key,description,risk_level) values
 ('ai.platform.manage','Manage provider-agnostic AI policies, registries, prompts, limits and guardrails','critical'),
 ('ai.platform.use','Access organization-approved AI foundation surfaces','high'),
 ('ai.audit.read','Read redacted AI usage, guardrail and operational audit metadata','high')
on conflict(key) do update set description=excluded.description,risk_level=excluded.risk_level;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.organization_id is null
and ((r.key in('organization_admin','enterprise_admin','platform_admin','super_admin') and p.key in('ai.platform.manage','ai.audit.read','ai.platform.use'))
  or (r.key in('student','mentor') and p.key='ai.platform.use')) on conflict do nothing;
-- SYRA-REFERENCE-DATA-END
