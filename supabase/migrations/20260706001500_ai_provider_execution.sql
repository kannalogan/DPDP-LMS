-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-018
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-PII-NOTES: execution evidence stores hashes and minimized metadata only; provider payloads and secrets are excluded
-- SYRA-RLS: S2/S4/S6/S8 forced RLS, tenant and subject isolation, no public access
-- SYRA-IMMUTABLE: attempts, results, failures, redactions, policy decisions and cost rates are append-only
-- SYRA-SEED: none

create or replace function private.ai_safe_code_array(values_to_check text[])
returns boolean language sql immutable set search_path=pg_catalog as $$
  select coalesce(bool_and(value ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),true) from unnest(values_to_check) as item(value)
$$;

create table if not exists public.ai_execution_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  enabled boolean not null default false,
  allowed_provider_keys text[] not null default '{}',
  allowed_classifications text[] not null default array['public','internal']::text[],
  allowed_regions text[] not null default '{}',
  restricted_data_allowed boolean not null default false,
  pii_redaction_required boolean not null default true,
  provider_retention_allowed boolean not null default false,
  allow_unknown_cost boolean not null default false,
  max_input_characters integer not null default 50000,
  max_output_tokens integer not null default 4096,
  max_concurrent_requests integer not null default 5,
  default_timeout_ms integer not null default 30000,
  version integer not null default 1,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_execution_policies_organization_unique unique(organization_id),
  constraint ai_execution_policies_classifications_check check(
    allowed_classifications <@ array['public','internal','confidential','restricted','pii','sensitive_personal_data']::text[]
  ),
  constraint ai_execution_policies_codes_check check(private.ai_safe_code_array(allowed_provider_keys) and private.ai_safe_code_array(allowed_regions)),
  constraint ai_execution_policies_limits_check check(
    max_input_characters between 1 and 1000000 and max_output_tokens between 1 and 100000
    and max_concurrent_requests between 1 and 1000 and default_timeout_ms between 1000 and 600000
  ),
  constraint ai_execution_policies_status_check check(status in('active','disabled','archived')),
  constraint ai_execution_policies_version_check check(version > 0)
);

create table if not exists public.ai_provider_health (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  status text not null default 'unknown',
  region text not null default 'unspecified',
  latency_ms integer,
  consecutive_failures integer not null default 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  checked_at timestamptz not null default now(),
  account_reference_hash text,
  details jsonb not null default '{}'::jsonb,
  constraint ai_provider_health_unique unique(organization_id,provider_id,region),
  constraint ai_provider_health_status_check check(status in('unknown','healthy','degraded','unavailable','disabled')),
  constraint ai_provider_health_region_check check(region ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_provider_health_values_check check((latency_ms is null or latency_ms >= 0) and consecutive_failures >= 0),
  constraint ai_provider_health_hash_check check(account_reference_hash is null or account_reference_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_provider_health_details_check check(jsonb_typeof(details)='object')
);

create table if not exists public.ai_provider_circuit_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  state text not null default 'closed',
  failure_count integer not null default 0,
  success_count integer not null default 0,
  opened_at timestamptz,
  cooldown_until timestamptz,
  last_transition_at timestamptz not null default now(),
  version integer not null default 1,
  constraint ai_provider_circuit_states_unique unique(organization_id,provider_id),
  constraint ai_provider_circuit_states_state_check check(state in('closed','open','half_open')),
  constraint ai_provider_circuit_states_values_check check(failure_count >= 0 and success_count >= 0 and version > 0),
  constraint ai_provider_circuit_states_dates_check check(cooldown_until is null or opened_at is not null)
);

create table if not exists public.ai_model_routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  capability_key text not null,
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  model_id uuid not null references public.ai_models(id) on delete restrict,
  priority integer not null default 100,
  status text not null default 'disabled',
  max_input_tokens integer not null default 0,
  max_output_tokens integer not null default 0,
  maximum_cost_minor bigint,
  latency_preference text not null default 'balanced',
  allowed_classifications text[] not null default array['public','internal']::text[],
  allowed_regions text[] not null default '{}',
  is_default boolean not null default false,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_model_routes_unique unique(organization_id,capability_key,provider_id,model_id),
  constraint ai_model_routes_priority_check check(priority between 1 and 10000),
  constraint ai_model_routes_status_check check(status in('active','disabled','retired')),
  constraint ai_model_routes_token_check check(max_input_tokens >= 0 and max_output_tokens >= 0),
  constraint ai_model_routes_cost_check check(maximum_cost_minor is null or maximum_cost_minor >= 0),
  constraint ai_model_routes_latency_check check(latency_preference in('cost','balanced','latency')),
  constraint ai_model_routes_classifications_check check(
    allowed_classifications <@ array['public','internal','confidential','restricted','pii','sensitive_personal_data']::text[]
  ),
  constraint ai_model_routes_regions_check check(private.ai_safe_code_array(allowed_regions)),
  constraint ai_model_routes_dates_check check(effective_to is null or effective_to > effective_from)
);

create unique index if not exists ai_model_routes_default_unique
  on public.ai_model_routes(organization_id,capability_key)
  where is_default and status='active';

create table if not exists public.ai_provider_fallback_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  primary_route_id uuid not null references public.ai_model_routes(id) on delete restrict,
  fallback_route_id uuid not null references public.ai_model_routes(id) on delete restrict,
  priority integer not null default 100,
  failure_classes text[] not null default array['rate_limited','overloaded','timeout','transient']::text[],
  allow_region_crossing boolean not null default false,
  maximum_additional_attempts integer not null default 1,
  status text not null default 'disabled',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_provider_fallback_rules_unique unique(organization_id,primary_route_id,fallback_route_id),
  constraint ai_provider_fallback_rules_self_check check(primary_route_id <> fallback_route_id),
  constraint ai_provider_fallback_rules_priority_check check(priority between 1 and 10000),
  constraint ai_provider_fallback_rules_attempts_check check(maximum_additional_attempts between 0 and 5),
  constraint ai_provider_fallback_rules_classes_check check(private.ai_safe_code_array(failure_classes)),
  constraint ai_provider_fallback_rules_status_check check(status in('active','disabled','retired'))
);

create table if not exists public.ai_provider_kill_switches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  provider_id uuid references public.ai_providers(id) on delete restrict,
  model_id uuid references public.ai_models(id) on delete restrict,
  scope text not null,
  enabled boolean not null default true,
  reason_code text not null,
  effective_at timestamptz not null default now(),
  ends_at timestamptz,
  set_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_provider_kill_switches_scope_check check(scope in('global','organization','provider','model')),
  constraint ai_provider_kill_switches_target_check check(
    (scope='global' and organization_id is null and provider_id is null and model_id is null)
    or (scope='organization' and organization_id is not null and provider_id is null and model_id is null)
    or (scope='provider' and organization_id is not null and provider_id is not null and model_id is null)
    or (scope='model' and organization_id is not null and provider_id is not null and model_id is not null)
  ),
  constraint ai_provider_kill_switches_reason_check check(reason_code ~ '^[a-z][a-z0-9_.-]*$'),
  constraint ai_provider_kill_switches_dates_check check(ends_at is null or ends_at > effective_at)
);

create unique index if not exists ai_provider_kill_switches_active_unique
  on public.ai_provider_kill_switches(
    scope,
    coalesce(organization_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(provider_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(model_id,'00000000-0000-0000-0000-000000000000'::uuid)
  ) where enabled;

create table if not exists public.ai_cost_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  model_id uuid not null references public.ai_models(id) on delete restrict,
  currency_code text not null,
  input_cost_per_million numeric(18,6),
  output_cost_per_million numeric(18,6),
  cached_input_cost_per_million numeric(18,6),
  effective_from timestamptz not null,
  effective_to timestamptz,
  status text not null default 'active',
  source_reference_hash text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ai_cost_rates_unique unique nulls not distinct(organization_id,provider_id,model_id,effective_from),
  constraint ai_cost_rates_currency_check check(currency_code ~ '^[A-Z]{3}$'),
  constraint ai_cost_rates_values_check check(
    (input_cost_per_million is null or input_cost_per_million >= 0)
    and (output_cost_per_million is null or output_cost_per_million >= 0)
    and (cached_input_cost_per_million is null or cached_input_cost_per_million >= 0)
  ),
  constraint ai_cost_rates_known_check check(input_cost_per_million is not null or output_cost_per_million is not null),
  constraint ai_cost_rates_dates_check check(effective_to is null or effective_to > effective_from),
  constraint ai_cost_rates_status_check check(status in('active','retired')),
  constraint ai_cost_rates_hash_check check(source_reference_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.ai_execution_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  workflow_id uuid references public.ai_workflows(id) on delete restrict,
  prompt_version_id uuid references public.ai_prompt_versions(id) on delete restrict,
  capability_key text not null,
  trace_id uuid not null,
  idempotency_key_hash text not null,
  request_hash text not null,
  system_instruction_hash text,
  input_classification text not null,
  requested_provider_id uuid references public.ai_providers(id) on delete restrict,
  requested_model_id uuid references public.ai_models(id) on delete restrict,
  maximum_output_tokens integer not null,
  estimated_input_tokens integer not null,
  message_count integer not null,
  retention_category text not null,
  status text not null default 'accepted',
  accepted_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null,
  constraint ai_execution_requests_idempotency_unique unique(organization_id,profile_id,idempotency_key_hash),
  constraint ai_execution_requests_hashes_check check(
    idempotency_key_hash ~ '^[a-f0-9]{64}$' and request_hash ~ '^[a-f0-9]{64}$'
    and (system_instruction_hash is null or system_instruction_hash ~ '^[a-f0-9]{64}$')
  ),
  constraint ai_execution_requests_classification_check check(
    input_classification in('public','internal','confidential','restricted','pii','sensitive_personal_data')
  ),
  constraint ai_execution_requests_values_check check(maximum_output_tokens > 0 and estimated_input_tokens >= 0 and message_count > 0),
  constraint ai_execution_requests_target_check check(
    (requested_provider_id is null and requested_model_id is null) or (requested_provider_id is not null and requested_model_id is not null)
  ),
  constraint ai_execution_requests_retention_check check(retention_category ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_execution_requests_status_check check(status in('accepted','reserved','running','completed','failed','blocked','cancelled')),
  constraint ai_execution_requests_dates_check check(
    expires_at > accepted_at and (started_at is null or started_at >= accepted_at)
    and (completed_at is null or completed_at >= coalesce(started_at,accepted_at))
  )
);

create table if not exists public.ai_budget_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  reserved_minor bigint not null,
  actual_minor bigint,
  currency_code text not null,
  status text not null default 'reserved',
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finalized_at timestamptz,
  constraint ai_budget_reservations_request_unique unique(execution_request_id),
  constraint ai_budget_reservations_values_check check(reserved_minor >= 0 and (actual_minor is null or actual_minor >= 0)),
  constraint ai_budget_reservations_currency_check check(currency_code ~ '^[A-Z]{3}$'),
  constraint ai_budget_reservations_status_check check(status in('reserved','settled','released','expired')),
  constraint ai_budget_reservations_dates_check check(expires_at > reserved_at and (finalized_at is null or finalized_at >= reserved_at))
);

create table if not exists public.ai_execution_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  route_id uuid references public.ai_model_routes(id) on delete restrict,
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  model_id uuid not null references public.ai_models(id) on delete restrict,
  attempt_number integer not null,
  status text not null,
  region text not null default 'unspecified',
  started_at timestamptz not null,
  completed_at timestamptz not null,
  latency_ms integer not null,
  provider_request_id_hash text,
  failure_class text,
  retryable boolean not null default false,
  fallback_from_attempt_id uuid references public.ai_execution_attempts(id) on delete restrict,
  constraint ai_execution_attempts_unique unique(execution_request_id,attempt_number),
  constraint ai_execution_attempts_number_check check(attempt_number > 0),
  constraint ai_execution_attempts_status_check check(status in('completed','failed','timed_out','blocked','cancelled')),
  constraint ai_execution_attempts_region_check check(region ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_execution_attempts_failure_check check(failure_class is null or failure_class ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_execution_attempts_values_check check(completed_at >= started_at and latency_ms >= 0),
  constraint ai_execution_attempts_hash_check check(provider_request_id_hash is null or provider_request_id_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.ai_execution_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  execution_attempt_id uuid not null references public.ai_execution_attempts(id) on delete restrict,
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  model_id uuid not null references public.ai_models(id) on delete restrict,
  output_hash text not null,
  structured_output_hash text,
  finish_reason text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  total_tokens integer not null,
  cached_tokens integer not null default 0,
  latency_ms integer not null,
  cost_minor bigint,
  currency_code text,
  cache_state text not null default 'miss',
  safety_metadata jsonb not null default '{}'::jsonb,
  redaction_metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  constraint ai_execution_results_request_unique unique(execution_request_id),
  constraint ai_execution_results_hashes_check check(
    output_hash ~ '^[a-f0-9]{64}$' and (structured_output_hash is null or structured_output_hash ~ '^[a-f0-9]{64}$')
  ),
  constraint ai_execution_results_tokens_check check(
    input_tokens >= 0 and output_tokens >= 0 and total_tokens=input_tokens+output_tokens and cached_tokens >= 0
  ),
  constraint ai_execution_results_values_check check(latency_ms >= 0 and (cost_minor is null or cost_minor >= 0)),
  constraint ai_execution_results_finish_check check(finish_reason ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_execution_results_currency_check check(currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  constraint ai_execution_results_cache_check check(cache_state in('hit','miss','bypass')),
  constraint ai_execution_results_metadata_check check(jsonb_typeof(safety_metadata)='object' and jsonb_typeof(redaction_metadata)='object')
);

create table if not exists public.ai_execution_failures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  execution_attempt_id uuid references public.ai_execution_attempts(id) on delete restrict,
  failure_class text not null,
  provider_error_code text,
  http_status integer,
  retryable boolean not null,
  terminal boolean not null,
  error_fingerprint_hash text not null,
  occurred_at timestamptz not null default now(),
  constraint ai_execution_failures_status_check check(http_status is null or http_status between 100 and 599),
  constraint ai_execution_failures_class_check check(failure_class ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_execution_failures_code_check check(provider_error_code is null or provider_error_code ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_execution_failures_hash_check check(error_fingerprint_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.ai_execution_redactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  direction text not null,
  category text not null,
  strategy text not null,
  occurrence_count integer not null,
  content_hash_before text not null,
  content_hash_after text not null,
  occurred_at timestamptz not null default now(),
  constraint ai_execution_redactions_direction_check check(direction in('input','output')),
  constraint ai_execution_redactions_codes_check check(category ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$' and strategy ~ '^[A-Za-z][A-Za-z0-9_.-]{0,99}$'),
  constraint ai_execution_redactions_values_check check(occurrence_count > 0),
  constraint ai_execution_redactions_hashes_check check(content_hash_before ~ '^[a-f0-9]{64}$' and content_hash_after ~ '^[a-f0-9]{64}$')
);

create table if not exists public.ai_execution_policy_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  phase text not null,
  decision text not null,
  reason_codes text[] not null default '{}',
  policy_version integer,
  guardrail_ids uuid[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint ai_execution_policy_decisions_phase_check check(phase in('request','routing','input','output','budget','reliability')),
  constraint ai_execution_policy_decisions_decision_check check(decision in('allow','review','block','degrade','fallback')),
  constraint ai_execution_policy_decisions_version_check check(policy_version is null or policy_version > 0),
  constraint ai_execution_policy_decisions_reasons_check check(private.ai_safe_code_array(reason_codes)),
  constraint ai_execution_policy_decisions_details_check check(jsonb_typeof(details)='object')
);

create index if not exists ai_provider_health_org_status_idx on public.ai_provider_health(organization_id,status,checked_at desc);
create index if not exists ai_provider_circuit_org_state_idx on public.ai_provider_circuit_states(organization_id,state,cooldown_until);
create index if not exists ai_model_routes_resolution_idx on public.ai_model_routes(organization_id,capability_key,status,priority);
create index if not exists ai_fallback_rules_resolution_idx on public.ai_provider_fallback_rules(organization_id,primary_route_id,status,priority);
create index if not exists ai_kill_switches_resolution_idx on public.ai_provider_kill_switches(organization_id,provider_id,model_id,enabled,effective_at);
create index if not exists ai_cost_rates_resolution_idx on public.ai_cost_rates(provider_id,model_id,effective_from desc);
create index if not exists ai_execution_requests_actor_idx on public.ai_execution_requests(profile_id,accepted_at desc,status);
create index if not exists ai_execution_requests_org_idx on public.ai_execution_requests(organization_id,accepted_at desc,capability_key,status);
create index if not exists ai_execution_attempts_request_idx on public.ai_execution_attempts(execution_request_id,attempt_number);
create index if not exists ai_execution_failures_org_idx on public.ai_execution_failures(organization_id,occurred_at desc,failure_class);
create index if not exists ai_execution_redactions_org_idx on public.ai_execution_redactions(organization_id,occurred_at desc,category);
create index if not exists ai_execution_decisions_request_idx on public.ai_execution_policy_decisions(execution_request_id,occurred_at);
create index if not exists ai_budget_reservations_org_idx on public.ai_budget_reservations(organization_id,status,expires_at);

create or replace function private.can_manage_ai_execution(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select case when target_organization_id is null then private.can_platform_admin() else private.can_manage_ai(target_organization_id) end
$$;

create or replace function private.can_execute_ai(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and private.can_use_ai(target_organization_id)
$$;

create or replace function private.can_read_ai_execution_audit(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and private.can_read_ai_audit(target_organization_id)
$$;

create or replace function private.ai_provider_model_belongs_to_org(
  target_organization_id uuid,target_provider_id uuid,target_model_id uuid
) returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.ai_providers p
    join public.ai_models m on m.provider_id=p.id
    where p.id=target_provider_id and m.id=target_model_id
      and (p.organization_id is null or p.organization_id=target_organization_id)
      and (m.organization_id is null or m.organization_id=target_organization_id)
  )
$$;

create or replace view public.ai_provider_execution_status_projection with(security_invoker=true) as
select p.id as provider_id,p.organization_id,p.key,p.name,p.status as registry_status,
  h.status as health_status,h.region,h.latency_ms,h.consecutive_failures,h.checked_at,h.last_success_at,h.last_failure_at,
  c.state as circuit_state,c.cooldown_until,
  exists(select 1 from public.ai_provider_kill_switches k where k.enabled and (k.ends_at is null or k.ends_at>now())
    and (k.scope='global' or (k.organization_id=p.organization_id and (k.provider_id is null or k.provider_id=p.id)))) as kill_switch_enabled
from public.ai_providers p
left join lateral (
  select ph.* from public.ai_provider_health ph where ph.provider_id=p.id and ph.organization_id=p.organization_id order by ph.checked_at desc limit 1
) h on true
left join public.ai_provider_circuit_states c on c.provider_id=p.id and c.organization_id=p.organization_id;

create or replace view public.ai_model_route_projection with(security_invoker=true) as
select r.id,r.organization_id,r.capability_key,r.priority,r.status,r.is_default,r.max_input_tokens,r.max_output_tokens,
  r.maximum_cost_minor,r.latency_preference,r.allowed_classifications,r.allowed_regions,r.effective_from,r.effective_to,
  p.id as provider_id,p.key as provider_key,p.name as provider_name,m.id as model_id,m.key as model_key,m.name as model_name,
  s.health_status,s.region,s.circuit_state,s.kill_switch_enabled
from public.ai_model_routes r
join public.ai_providers p on p.id=r.provider_id
join public.ai_models m on m.id=r.model_id
left join public.ai_provider_execution_status_projection s on s.provider_id=p.id;

create or replace view public.ai_execution_audit_projection with(security_invoker=true) as
select r.id,r.organization_id,r.profile_id,r.trace_id,r.capability_key,r.input_classification,r.status,r.retention_category,
  r.accepted_at,r.started_at,r.completed_at,r.expires_at,
  a.provider_id,a.model_id,a.attempt_number,a.status as attempt_status,a.region,a.latency_ms,a.retryable,
  x.input_tokens,x.output_tokens,x.total_tokens,x.cached_tokens,x.cost_minor,x.currency_code,x.finish_reason,x.cache_state,
  (select count(*)::integer from public.ai_execution_redactions d where d.execution_request_id=r.id) as redaction_count,
  (select count(*)::integer from public.ai_execution_failures f where f.execution_request_id=r.id) as failure_count
from public.ai_execution_requests r
left join lateral (select aa.* from public.ai_execution_attempts aa where aa.execution_request_id=r.id order by aa.attempt_number desc limit 1) a on true
left join public.ai_execution_results x on x.execution_request_id=r.id;

create or replace view public.reporting_ai_execution_metrics with(security_invoker=true) as
with last_attempt as (
  select distinct on(execution_request_id) execution_request_id,provider_id,model_id,latency_ms
  from public.ai_execution_attempts order by execution_request_id,attempt_number desc
), decision_counts as (
  select execution_request_id,count(*) filter(where decision='block')::integer as guardrail_blocks
  from public.ai_execution_policy_decisions group by execution_request_id
), redaction_counts as (
  select execution_request_id,sum(occurrence_count)::integer as redaction_count
  from public.ai_execution_redactions group by execution_request_id
)
select r.organization_id,date_trunc('day',r.accepted_at) as metric_day,r.capability_key,
  coalesce(a.provider_id,r.requested_provider_id) as provider_id,coalesce(a.model_id,r.requested_model_id) as model_id,
  count(*)::integer as execution_count,count(*) filter(where r.status='completed')::integer as success_count,
  count(*) filter(where r.status='failed')::integer as failure_count,
  coalesce(sum(x.input_tokens),0)::bigint as input_tokens,coalesce(sum(x.output_tokens),0)::bigint as output_tokens,
  coalesce(sum(x.cost_minor),0)::bigint as estimated_cost_minor,coalesce(avg(a.latency_ms),0)::numeric(12,2) as average_latency_ms,
  coalesce(sum(d.guardrail_blocks),0)::bigint as guardrail_blocks,coalesce(sum(z.redaction_count),0)::bigint as redaction_count
from public.ai_execution_requests r
left join last_attempt a on a.execution_request_id=r.id
left join public.ai_execution_results x on x.execution_request_id=r.id
left join decision_counts d on d.execution_request_id=r.id
left join redaction_counts z on z.execution_request_id=r.id
group by r.organization_id,date_trunc('day',r.accepted_at),r.capability_key,coalesce(a.provider_id,r.requested_provider_id),coalesce(a.model_id,r.requested_model_id);

create or replace view public.ai_execution_privacy_projection with(security_invoker=true) as
select id as execution_request_id,organization_id,profile_id,trace_id,capability_key,input_classification,request_hash,
  retention_category,status,accepted_at,completed_at,expires_at
from public.ai_execution_requests;

create or replace function public.set_organization_ai_policy(
  p_organization_id uuid,p_enabled boolean,p_allowed_provider_keys text[],p_allowed_classifications text[],p_allowed_regions text[],
  p_restricted_data_allowed boolean,p_pii_redaction_required boolean,p_provider_retention_allowed boolean,p_allow_unknown_cost boolean,
  p_max_input_characters integer,p_max_output_tokens integer,p_max_concurrent_requests integer,p_default_timeout_ms integer
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_manage_ai_execution(p_organization_id) then raise exception 'AI policy administration denied' using errcode='42501'; end if;
  insert into public.ai_execution_policies(
    organization_id,enabled,allowed_provider_keys,allowed_classifications,allowed_regions,restricted_data_allowed,pii_redaction_required,
    provider_retention_allowed,allow_unknown_cost,max_input_characters,max_output_tokens,max_concurrent_requests,default_timeout_ms,created_by,updated_by
  ) values(
    p_organization_id,p_enabled,p_allowed_provider_keys,p_allowed_classifications,p_allowed_regions,p_restricted_data_allowed,p_pii_redaction_required,
    p_provider_retention_allowed,p_allow_unknown_cost,p_max_input_characters,p_max_output_tokens,p_max_concurrent_requests,p_default_timeout_ms,auth.uid(),auth.uid()
  ) on conflict(organization_id) do update set
    enabled=excluded.enabled,allowed_provider_keys=excluded.allowed_provider_keys,allowed_classifications=excluded.allowed_classifications,
    allowed_regions=excluded.allowed_regions,restricted_data_allowed=excluded.restricted_data_allowed,pii_redaction_required=excluded.pii_redaction_required,
    provider_retention_allowed=excluded.provider_retention_allowed,allow_unknown_cost=excluded.allow_unknown_cost,
    max_input_characters=excluded.max_input_characters,max_output_tokens=excluded.max_output_tokens,
    max_concurrent_requests=excluded.max_concurrent_requests,default_timeout_ms=excluded.default_timeout_ms,
    version=public.ai_execution_policies.version+1,updated_by=auth.uid(),updated_at=now()
  returning id into result_id; return result_id;
end $$;

create or replace function public.configure_ai_model_route(
  p_organization_id uuid,p_capability_key text,p_provider_id uuid,p_model_id uuid,p_priority integer,p_status text,
  p_max_input_tokens integer,p_max_output_tokens integer,p_maximum_cost_minor bigint,p_latency_preference text,
  p_allowed_classifications text[],p_allowed_regions text[],p_is_default boolean
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_manage_ai_execution(p_organization_id) then raise exception 'AI route administration denied' using errcode='42501'; end if;
  if not private.ai_provider_model_belongs_to_org(p_organization_id,p_provider_id,p_model_id) then raise exception 'AI route provider or model is invalid' using errcode='23503'; end if;
  if p_is_default then update public.ai_model_routes set is_default=false,updated_at=now() where organization_id=p_organization_id and capability_key=p_capability_key and is_default; end if;
  insert into public.ai_model_routes(organization_id,capability_key,provider_id,model_id,priority,status,max_input_tokens,max_output_tokens,maximum_cost_minor,latency_preference,allowed_classifications,allowed_regions,is_default,created_by)
  values(p_organization_id,p_capability_key,p_provider_id,p_model_id,p_priority,p_status,p_max_input_tokens,p_max_output_tokens,p_maximum_cost_minor,p_latency_preference,p_allowed_classifications,p_allowed_regions,p_is_default,auth.uid())
  on conflict(organization_id,capability_key,provider_id,model_id) do update set priority=excluded.priority,status=excluded.status,max_input_tokens=excluded.max_input_tokens,max_output_tokens=excluded.max_output_tokens,maximum_cost_minor=excluded.maximum_cost_minor,latency_preference=excluded.latency_preference,allowed_classifications=excluded.allowed_classifications,allowed_regions=excluded.allowed_regions,is_default=excluded.is_default,updated_at=now()
  returning id into result_id; return result_id;
end $$;

create or replace function public.configure_ai_fallback_rule(
  p_organization_id uuid,p_primary_route_id uuid,p_fallback_route_id uuid,p_priority integer,p_failure_classes text[],
  p_allow_region_crossing boolean,p_maximum_additional_attempts integer,p_status text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_manage_ai_execution(p_organization_id) then raise exception 'AI fallback administration denied' using errcode='42501'; end if;
  if (select count(*) from public.ai_model_routes where id in(p_primary_route_id,p_fallback_route_id) and organization_id=p_organization_id) <> 2 then raise exception 'AI fallback routes are invalid' using errcode='23503'; end if;
  insert into public.ai_provider_fallback_rules(organization_id,primary_route_id,fallback_route_id,priority,failure_classes,allow_region_crossing,maximum_additional_attempts,status,created_by)
  values(p_organization_id,p_primary_route_id,p_fallback_route_id,p_priority,p_failure_classes,p_allow_region_crossing,p_maximum_additional_attempts,p_status,auth.uid())
  on conflict(organization_id,primary_route_id,fallback_route_id) do update set priority=excluded.priority,failure_classes=excluded.failure_classes,allow_region_crossing=excluded.allow_region_crossing,maximum_additional_attempts=excluded.maximum_additional_attempts,status=excluded.status,updated_at=now()
  returning id into result_id; return result_id;
end $$;

create or replace function public.set_ai_provider_kill_switch(
  p_organization_id uuid,p_provider_id uuid,p_model_id uuid,p_scope text,p_enabled boolean,p_reason_code text,p_ends_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_manage_ai_execution(p_organization_id) then raise exception 'AI kill switch administration denied' using errcode='42501'; end if;
  update public.ai_provider_kill_switches set enabled=false,updated_at=now() where enabled and scope=p_scope and organization_id is not distinct from p_organization_id and provider_id is not distinct from p_provider_id and model_id is not distinct from p_model_id;
  insert into public.ai_provider_kill_switches(organization_id,provider_id,model_id,scope,enabled,reason_code,ends_at,set_by)
  values(p_organization_id,p_provider_id,p_model_id,p_scope,p_enabled,p_reason_code,p_ends_at,auth.uid()) returning id into result_id; return result_id;
end $$;

create or replace function public.update_ai_cost_rate(
  p_organization_id uuid,p_provider_id uuid,p_model_id uuid,p_currency_code text,p_input_cost_per_million numeric,
  p_output_cost_per_million numeric,p_cached_input_cost_per_million numeric,p_effective_from timestamptz,p_effective_to timestamptz,p_source_reference_hash text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_manage_ai_execution(p_organization_id) then raise exception 'AI cost administration denied' using errcode='42501'; end if;
  insert into public.ai_cost_rates(organization_id,provider_id,model_id,currency_code,input_cost_per_million,output_cost_per_million,cached_input_cost_per_million,effective_from,effective_to,source_reference_hash,created_by)
  values(p_organization_id,p_provider_id,p_model_id,p_currency_code,p_input_cost_per_million,p_output_cost_per_million,p_cached_input_cost_per_million,p_effective_from,p_effective_to,p_source_reference_hash,auth.uid())
  returning id into result_id; return result_id;
end $$;

create or replace function public.record_ai_provider_health(
  p_organization_id uuid,p_provider_id uuid,p_status text,p_region text,p_latency_ms integer,p_success boolean,p_account_reference_hash text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; failures integer; begin
  if auth.uid() is null or not private.can_execute_ai(p_organization_id) then raise exception 'AI provider health recording denied' using errcode='42501'; end if;
  if not exists(select 1 from public.ai_providers p where p.id=p_provider_id and (p.organization_id is null or p.organization_id=p_organization_id)) then raise exception 'AI provider is outside organization scope' using errcode='23503'; end if;
  insert into public.ai_provider_health(organization_id,provider_id,status,region,latency_ms,consecutive_failures,last_success_at,last_failure_at,account_reference_hash,details)
  values(p_organization_id,p_provider_id,p_status,p_region,p_latency_ms,case when p_success then 0 else 1 end,case when p_success then now() end,case when not p_success then now() end,p_account_reference_hash,'{}'::jsonb)
  on conflict(organization_id,provider_id,region) do update set status=excluded.status,latency_ms=excluded.latency_ms,
    consecutive_failures=case when p_success then 0 else public.ai_provider_health.consecutive_failures+1 end,
    last_success_at=case when p_success then now() else public.ai_provider_health.last_success_at end,
    last_failure_at=case when p_success then public.ai_provider_health.last_failure_at else now() end,
    checked_at=now(),account_reference_hash=excluded.account_reference_hash,details='{}'::jsonb
  returning id,consecutive_failures into result_id,failures;
  insert into public.ai_provider_circuit_states(organization_id,provider_id,state,failure_count,success_count,opened_at,cooldown_until)
  values(p_organization_id,p_provider_id,case when p_success then 'closed' when failures>=3 then 'open' else 'closed' end,case when p_success then 0 else failures end,case when p_success then 1 else 0 end,case when not p_success and failures>=3 then now() end,case when not p_success and failures>=3 then now()+interval '60 seconds' end)
  on conflict(organization_id,provider_id) do update set state=excluded.state,failure_count=excluded.failure_count,
    success_count=case when p_success then public.ai_provider_circuit_states.success_count+1 else public.ai_provider_circuit_states.success_count end,
    opened_at=excluded.opened_at,cooldown_until=excluded.cooldown_until,last_transition_at=now(),version=public.ai_provider_circuit_states.version+1;
  return result_id;
end $$;

create or replace function public.begin_ai_execution(
  p_organization_id uuid,p_workflow_id uuid,p_prompt_version_id uuid,p_capability_key text,p_trace_id uuid,p_idempotency_key_hash text,
  p_request_hash text,p_system_instruction_hash text,p_input_classification text,p_requested_provider_id uuid,p_requested_model_id uuid,
  p_maximum_output_tokens integer,p_estimated_input_tokens integer,p_message_count integer,p_retention_category text,p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_execute_ai(p_organization_id) then raise exception 'AI execution denied' using errcode='42501'; end if;
  if (p_requested_provider_id is null) <> (p_requested_model_id is null) then raise exception 'AI provider and model must be requested together' using errcode='22023'; end if;
  if p_requested_provider_id is not null and not private.ai_provider_model_belongs_to_org(p_organization_id,p_requested_provider_id,p_requested_model_id) then raise exception 'AI requested provider or model is outside organization scope' using errcode='23503'; end if;
  if p_workflow_id is not null and not exists(select 1 from public.ai_workflows w where w.id=p_workflow_id and w.organization_id=p_organization_id) then raise exception 'AI workflow is outside organization scope' using errcode='23503'; end if;
  if p_prompt_version_id is not null and not exists(select 1 from public.ai_prompt_versions v join public.ai_prompt_templates t on t.id=v.prompt_template_id where v.id=p_prompt_version_id and t.organization_id=p_organization_id and (p_workflow_id is null or t.workflow_id=p_workflow_id)) then raise exception 'AI prompt version is outside organization scope' using errcode='23503'; end if;
  select id into result_id from public.ai_execution_requests where organization_id=p_organization_id and profile_id=auth.uid() and idempotency_key_hash=p_idempotency_key_hash;
  if result_id is not null then return result_id; end if;
  insert into public.ai_execution_requests(organization_id,profile_id,workflow_id,prompt_version_id,capability_key,trace_id,idempotency_key_hash,request_hash,system_instruction_hash,input_classification,requested_provider_id,requested_model_id,maximum_output_tokens,estimated_input_tokens,message_count,retention_category,expires_at)
  values(p_organization_id,auth.uid(),p_workflow_id,p_prompt_version_id,p_capability_key,p_trace_id,p_idempotency_key_hash,p_request_hash,p_system_instruction_hash,p_input_classification,p_requested_provider_id,p_requested_model_id,p_maximum_output_tokens,p_estimated_input_tokens,p_message_count,p_retention_category,p_expires_at)
  returning id into result_id; return result_id;
end $$;

create or replace function public.reserve_ai_budget(p_execution_request_id uuid,p_reserved_minor bigint,p_currency_code text,p_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; owner_id uuid; budget_limit bigint; spent bigint; reserved bigint; begin
  select organization_id,profile_id into org_id,owner_id from public.ai_execution_requests where id=p_execution_request_id;
  if auth.uid() is null or (auth.uid() is distinct from owner_id and not private.can_manage_ai_execution(org_id)) then raise exception 'AI budget reservation denied' using errcode='42501'; end if;
  select budget_minor into budget_limit from public.ai_usage_budgets where organization_id=org_id and period='month' and currency_code=p_currency_code and status='active' order by updated_at desc limit 1;
  if budget_limit is not null then
    select coalesce(sum(cost_minor),0) into spent from public.ai_usage_events where organization_id=org_id and currency_code=p_currency_code and occurred_at>=date_trunc('month',now());
    select coalesce(sum(reserved_minor),0) into reserved from public.ai_budget_reservations where organization_id=org_id and currency_code=p_currency_code and status='reserved' and expires_at>now();
    if spent+reserved+p_reserved_minor>budget_limit then raise exception 'AI budget limit exceeded' using errcode='P0001'; end if;
  end if;
  insert into public.ai_budget_reservations(organization_id,profile_id,execution_request_id,reserved_minor,currency_code,expires_at)
  values(org_id,owner_id,p_execution_request_id,p_reserved_minor,p_currency_code,p_expires_at)
  on conflict(execution_request_id) do update set reserved_minor=excluded.reserved_minor,currency_code=excluded.currency_code,expires_at=excluded.expires_at,status='reserved',actual_minor=null,finalized_at=null
  returning id into result_id;
  update public.ai_execution_requests set status='reserved' where id=p_execution_request_id and status='accepted'; return result_id;
end $$;

create or replace function public.record_ai_execution_policy_decision(
  p_execution_request_id uuid,p_phase text,p_decision text,p_reason_codes text[],p_policy_version integer,p_guardrail_ids uuid[]
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; owner_id uuid; begin
  select organization_id,profile_id into org_id,owner_id from public.ai_execution_requests where id=p_execution_request_id;
  if auth.uid() is null or (auth.uid() is distinct from owner_id and not private.can_read_ai_execution_audit(org_id)) then raise exception 'AI policy evidence denied' using errcode='42501'; end if;
  insert into public.ai_execution_policy_decisions(organization_id,execution_request_id,phase,decision,reason_codes,policy_version,guardrail_ids,details)
  values(org_id,p_execution_request_id,p_phase,p_decision,p_reason_codes,p_policy_version,p_guardrail_ids,'{}'::jsonb) returning id into result_id; return result_id;
end $$;

create or replace function public.record_ai_execution_redaction(
  p_execution_request_id uuid,p_direction text,p_category text,p_strategy text,p_occurrence_count integer,p_content_hash_before text,p_content_hash_after text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; owner_id uuid; begin
  select organization_id,profile_id into org_id,owner_id from public.ai_execution_requests where id=p_execution_request_id;
  if auth.uid() is null or (auth.uid() is distinct from owner_id and not private.can_read_ai_execution_audit(org_id)) then raise exception 'AI redaction evidence denied' using errcode='42501'; end if;
  insert into public.ai_execution_redactions(organization_id,execution_request_id,direction,category,strategy,occurrence_count,content_hash_before,content_hash_after)
  values(org_id,p_execution_request_id,p_direction,p_category,p_strategy,p_occurrence_count,p_content_hash_before,p_content_hash_after) returning id into result_id; return result_id;
end $$;

create or replace function public.record_ai_execution_attempt(
  p_execution_request_id uuid,p_route_id uuid,p_provider_id uuid,p_model_id uuid,p_attempt_number integer,p_status text,p_region text,
  p_started_at timestamptz,p_completed_at timestamptz,p_latency_ms integer,p_provider_request_id_hash text,p_failure_class text,p_retryable boolean,p_fallback_from_attempt_id uuid
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; owner_id uuid; begin
  select organization_id,profile_id into org_id,owner_id from public.ai_execution_requests where id=p_execution_request_id;
  if auth.uid() is null or (auth.uid() is distinct from owner_id and not private.can_read_ai_execution_audit(org_id)) then raise exception 'AI attempt evidence denied' using errcode='42501'; end if;
  if not private.ai_provider_model_belongs_to_org(org_id,p_provider_id,p_model_id) then raise exception 'AI attempt provider or model is outside organization scope' using errcode='23503'; end if;
  if p_route_id is not null and not exists(select 1 from public.ai_model_routes r where r.id=p_route_id and r.organization_id=org_id and r.provider_id=p_provider_id and r.model_id=p_model_id) then raise exception 'AI attempt route is outside organization scope' using errcode='23503'; end if;
  if p_fallback_from_attempt_id is not null and not exists(select 1 from public.ai_execution_attempts a where a.id=p_fallback_from_attempt_id and a.execution_request_id=p_execution_request_id) then raise exception 'AI fallback attempt is outside execution scope' using errcode='23503'; end if;
  insert into public.ai_execution_attempts(organization_id,execution_request_id,route_id,provider_id,model_id,attempt_number,status,region,started_at,completed_at,latency_ms,provider_request_id_hash,failure_class,retryable,fallback_from_attempt_id)
  values(org_id,p_execution_request_id,p_route_id,p_provider_id,p_model_id,p_attempt_number,p_status,p_region,p_started_at,p_completed_at,p_latency_ms,p_provider_request_id_hash,p_failure_class,p_retryable,p_fallback_from_attempt_id)
  returning id into result_id;
  update public.ai_execution_requests set status='running',started_at=coalesce(started_at,p_started_at) where id=p_execution_request_id and status in('accepted','reserved'); return result_id;
end $$;

create or replace function public.complete_ai_execution(
  p_execution_request_id uuid,p_execution_attempt_id uuid,p_provider_id uuid,p_model_id uuid,p_output_hash text,p_structured_output_hash text,
  p_finish_reason text,p_input_tokens integer,p_output_tokens integer,p_cached_tokens integer,p_latency_ms integer,p_cost_minor bigint,
  p_currency_code text,p_cache_state text,p_safety_codes text[],p_redaction_count integer
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; owner_id uuid; capability text; begin
  select organization_id,profile_id,capability_key into org_id,owner_id,capability from public.ai_execution_requests where id=p_execution_request_id;
  if auth.uid() is null or auth.uid() is distinct from owner_id then raise exception 'AI execution completion denied' using errcode='42501'; end if;
  if not exists(select 1 from public.ai_execution_attempts a where a.id=p_execution_attempt_id and a.execution_request_id=p_execution_request_id and a.provider_id=p_provider_id and a.model_id=p_model_id and a.status='completed') then raise exception 'AI completion attempt is invalid' using errcode='23503'; end if;
  if not private.ai_safe_code_array(p_safety_codes) or p_redaction_count<0 then raise exception 'AI completion metadata is invalid' using errcode='22023'; end if;
  insert into public.ai_execution_results(organization_id,execution_request_id,execution_attempt_id,provider_id,model_id,output_hash,structured_output_hash,finish_reason,input_tokens,output_tokens,total_tokens,cached_tokens,latency_ms,cost_minor,currency_code,cache_state,safety_metadata,redaction_metadata)
  values(org_id,p_execution_request_id,p_execution_attempt_id,p_provider_id,p_model_id,p_output_hash,p_structured_output_hash,p_finish_reason,p_input_tokens,p_output_tokens,p_input_tokens+p_output_tokens,p_cached_tokens,p_latency_ms,p_cost_minor,p_currency_code,p_cache_state,jsonb_build_object('codes',p_safety_codes),jsonb_build_object('count',p_redaction_count))
  returning id into result_id;
  update public.ai_execution_requests set status='completed',completed_at=now() where id=p_execution_request_id;
  update public.ai_budget_reservations set status='settled',actual_minor=p_cost_minor,finalized_at=now() where execution_request_id=p_execution_request_id and status='reserved';
  insert into public.ai_usage_events(organization_id,provider_id,capability_key,input_units,output_units,cached_units,latency_ms,cost_minor,currency_code)
  values(org_id,p_provider_id,capability,p_input_tokens,p_output_tokens,p_cached_tokens,p_latency_ms,coalesce(p_cost_minor,0),coalesce(p_currency_code,'INR'));
  return result_id;
end $$;

create or replace function public.fail_ai_execution(
  p_execution_request_id uuid,p_execution_attempt_id uuid,p_failure_class text,p_provider_error_code text,p_http_status integer,
  p_retryable boolean,p_terminal boolean,p_error_fingerprint_hash text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; org_id uuid; owner_id uuid; begin
  select organization_id,profile_id into org_id,owner_id from public.ai_execution_requests where id=p_execution_request_id;
  if auth.uid() is null or auth.uid() is distinct from owner_id then raise exception 'AI execution failure recording denied' using errcode='42501'; end if;
  if p_execution_attempt_id is not null and not exists(select 1 from public.ai_execution_attempts a where a.id=p_execution_attempt_id and a.execution_request_id=p_execution_request_id and a.status in('failed','timed_out','blocked','cancelled')) then raise exception 'AI failure attempt is invalid' using errcode='23503'; end if;
  insert into public.ai_execution_failures(organization_id,execution_request_id,execution_attempt_id,failure_class,provider_error_code,http_status,retryable,terminal,error_fingerprint_hash)
  values(org_id,p_execution_request_id,p_execution_attempt_id,p_failure_class,p_provider_error_code,p_http_status,p_retryable,p_terminal,p_error_fingerprint_hash)
  returning id into result_id;
  if p_terminal then
    update public.ai_execution_requests set status='failed',completed_at=now() where id=p_execution_request_id;
    update public.ai_budget_reservations set status='released',actual_minor=0,finalized_at=now() where execution_request_id=p_execution_request_id and status='reserved';
  end if; return result_id;
end $$;

create or replace function private.reject_ai_execution_evidence_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'AI execution evidence is immutable'; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'ai_cost_rates','ai_execution_attempts','ai_execution_results','ai_execution_failures','ai_execution_redactions','ai_execution_policy_decisions'
] loop execute format('create trigger %I before update or delete on public.%I for each row execute function private.reject_ai_execution_evidence_mutation()',table_name||'_immutable',table_name); end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'ai_execution_policies','ai_provider_health','ai_provider_circuit_states','ai_model_routes','ai_provider_fallback_rules','ai_provider_kill_switches',
  'ai_cost_rates','ai_execution_requests','ai_budget_reservations','ai_execution_attempts','ai_execution_results','ai_execution_failures',
  'ai_execution_redactions','ai_execution_policy_decisions'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from anon,authenticated',table_name);
  execute format('grant select on table public.%I to authenticated',table_name);
end loop; end $$;

create policy ai_execution_policies_context_select on public.ai_execution_policies for select to authenticated
  using(private.can_manage_ai_execution(organization_id) or (status='active' and private.can_execute_ai(organization_id)));
create policy ai_provider_health_admin_select on public.ai_provider_health for select to authenticated using(private.can_manage_ai_execution(organization_id));
create policy ai_provider_circuit_states_admin_select on public.ai_provider_circuit_states for select to authenticated using(private.can_manage_ai_execution(organization_id));
create policy ai_model_routes_context_select on public.ai_model_routes for select to authenticated using(private.can_manage_ai_execution(organization_id) or (status='active' and private.can_execute_ai(organization_id)));
create policy ai_provider_fallback_rules_context_select on public.ai_provider_fallback_rules for select to authenticated using(private.can_manage_ai_execution(organization_id) or (status='active' and private.can_execute_ai(organization_id)));
create policy ai_provider_kill_switches_context_select on public.ai_provider_kill_switches for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_ai_execution(organization_id) or private.can_execute_ai(organization_id));
create policy ai_cost_rates_admin_select on public.ai_cost_rates for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_ai_execution(organization_id));
create policy ai_execution_requests_context_select on public.ai_execution_requests for select to authenticated using(profile_id=auth.uid() or private.can_read_ai_execution_audit(organization_id));
create policy ai_budget_reservations_context_select on public.ai_budget_reservations for select to authenticated using(profile_id=auth.uid() or private.can_read_ai_execution_audit(organization_id));
create policy ai_execution_attempts_context_select on public.ai_execution_attempts for select to authenticated using(exists(select 1 from public.ai_execution_requests r where r.id=execution_request_id and (r.profile_id=auth.uid() or private.can_read_ai_execution_audit(r.organization_id))));
create policy ai_execution_results_context_select on public.ai_execution_results for select to authenticated using(exists(select 1 from public.ai_execution_requests r where r.id=execution_request_id and (r.profile_id=auth.uid() or private.can_read_ai_execution_audit(r.organization_id))));
create policy ai_execution_failures_audit_select on public.ai_execution_failures for select to authenticated using(private.can_read_ai_execution_audit(organization_id));
create policy ai_execution_redactions_audit_select on public.ai_execution_redactions for select to authenticated using(private.can_read_ai_execution_audit(organization_id));
create policy ai_execution_policy_decisions_audit_select on public.ai_execution_policy_decisions for select to authenticated using(private.can_read_ai_execution_audit(organization_id));

grant select on public.ai_provider_execution_status_projection,public.ai_model_route_projection,public.ai_execution_audit_projection,public.reporting_ai_execution_metrics,public.ai_execution_privacy_projection to authenticated;

revoke all on function private.can_manage_ai_execution(uuid) from public;
revoke all on function private.can_execute_ai(uuid) from public;
revoke all on function private.can_read_ai_execution_audit(uuid) from public;
revoke all on function private.ai_provider_model_belongs_to_org(uuid,uuid,uuid) from public;
revoke all on function private.ai_safe_code_array(text[]) from public;
grant execute on function private.can_manage_ai_execution(uuid),private.can_execute_ai(uuid),private.can_read_ai_execution_audit(uuid) to authenticated;

do $$ declare signature text; begin foreach signature in array array[
  'set_organization_ai_policy(uuid,boolean,text[],text[],text[],boolean,boolean,boolean,boolean,integer,integer,integer,integer)',
  'configure_ai_model_route(uuid,text,uuid,uuid,integer,text,integer,integer,bigint,text,text[],text[],boolean)',
  'configure_ai_fallback_rule(uuid,uuid,uuid,integer,text[],boolean,integer,text)',
  'set_ai_provider_kill_switch(uuid,uuid,uuid,text,boolean,text,timestamptz)',
  'update_ai_cost_rate(uuid,uuid,uuid,text,numeric,numeric,numeric,timestamptz,timestamptz,text)',
  'record_ai_provider_health(uuid,uuid,text,text,integer,boolean,text)',
  'begin_ai_execution(uuid,uuid,uuid,text,uuid,text,text,text,text,uuid,uuid,integer,integer,integer,text,timestamptz)',
  'reserve_ai_budget(uuid,bigint,text,timestamptz)',
  'record_ai_execution_policy_decision(uuid,text,text,text[],integer,uuid[])',
  'record_ai_execution_redaction(uuid,text,text,text,integer,text,text)',
  'record_ai_execution_attempt(uuid,uuid,uuid,uuid,integer,text,text,timestamptz,timestamptz,integer,text,text,boolean,uuid)',
  'complete_ai_execution(uuid,uuid,uuid,uuid,text,text,text,integer,integer,integer,integer,bigint,text,text,text[],integer)',
  'fail_ai_execution(uuid,uuid,text,text,integer,boolean,boolean,text)'
] loop
  execute format('revoke all on function public.%s from public',signature);
  execute format('grant execute on function public.%s to authenticated',signature);
end loop; end $$;
