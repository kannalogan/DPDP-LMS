-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-015
-- SYRA-CHANGE: additive
-- SYRA-PII: P4
-- SYRA-RLS: S2/S7/S8 forced RLS, subject ownership, compliance authorization, no public access
-- SYRA-IMMUTABLE: published controls/policies and all evidence, consent, retention, privacy and governance events are append-only
-- SYRA-SEED: deployment-reference

create table if not exists public.control_frameworks (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  key text not null, name text not null, jurisdiction text, status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint control_frameworks_key_check check(key ~ '^[a-z][a-z0-9_.-]*$'), constraint control_frameworks_status_check check(status in ('draft','active','archived')),
  constraint control_frameworks_unique unique nulls not distinct(organization_id,key)
);
create table if not exists public.governance_controls (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  control_key text not null, title text not null, category text not null, owner_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft', created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint governance_controls_key_check check(control_key ~ '^[A-Z0-9.-]+$'), constraint governance_controls_status_check check(status in ('draft','review','published','retired')),
  constraint governance_controls_unique unique(organization_id,control_key)
);
create table if not exists public.governance_control_versions (
  id uuid primary key default gen_random_uuid(), control_id uuid not null references public.governance_controls(id) on delete restrict,
  version integer not null, objective text not null, procedure jsonb not null default '{}'::jsonb, test_method jsonb not null default '{}'::jsonb,
  status text not null default 'draft', content_hash text not null, published_at timestamptz, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint governance_control_versions_version_check check(version>0), constraint governance_control_versions_json_check check(jsonb_typeof(procedure)='object' and jsonb_typeof(test_method)='object'),
  constraint governance_control_versions_status_check check(status in ('draft','review','published','retired')), constraint governance_control_versions_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint governance_control_versions_unique unique(control_id,version)
);
create table if not exists public.control_framework_mappings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  framework_id uuid not null references public.control_frameworks(id) on delete restrict, control_id uuid not null references public.governance_controls(id) on delete restrict,
  framework_reference text not null, mapping_notes text not null default '', created_at timestamptz not null default now(),
  constraint control_framework_mappings_unique unique(framework_id,control_id,framework_reference)
);
create table if not exists public.control_evidence (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  control_id uuid not null references public.governance_controls(id) on delete restrict, evidence_type text not null, title text not null,
  status text not null default 'draft', valid_from timestamptz, valid_until timestamptz, owner_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint control_evidence_status_check check(status in ('draft','submitted','verified','rejected','expired')), constraint control_evidence_dates_check check(valid_until is null or valid_from is null or valid_until>=valid_from)
);
create table if not exists public.control_evidence_versions (
  id uuid primary key default gen_random_uuid(), evidence_id uuid not null references public.control_evidence(id) on delete restrict,
  version integer not null, description text not null, evidence_hash text not null, metadata jsonb not null default '{}'::jsonb,
  recorded_by uuid references public.profiles(id) on delete set null, recorded_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id) on delete set null, verified_at timestamptz, verification_status text not null default 'pending',
  constraint control_evidence_versions_hash_check check(evidence_hash ~ '^[a-f0-9]{64}$'), constraint control_evidence_versions_metadata_check check(jsonb_typeof(metadata)='object'),
  constraint control_evidence_versions_status_check check(verification_status in ('pending','verified','rejected')), constraint control_evidence_versions_unique unique(evidence_id,version)
);
create table if not exists public.evidence_artifacts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  evidence_version_id uuid not null references public.control_evidence_versions(id) on delete restrict, artifact_type text not null,
  name text not null, mime_type text, byte_size bigint, checksum_sha256 text, created_at timestamptz not null default now(),
  constraint evidence_artifacts_size_check check(byte_size is null or byte_size>=0), constraint evidence_artifacts_checksum_check check(checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$')
);
create table if not exists public.evidence_storage (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  artifact_id uuid not null references public.evidence_artifacts(id) on delete restrict, storage_object_id uuid references public.storage_objects(id) on delete restrict,
  storage_class text not null default 'private', quarantine_status text not null default 'pending', created_at timestamptz not null default now(),
  constraint evidence_storage_class_check check(storage_class in ('private','archive','legal_hold')), constraint evidence_storage_quarantine_check check(quarantine_status in ('pending','clean','quarantined')),
  constraint evidence_storage_artifact_unique unique(artifact_id)
);
create table if not exists public.audit_sessions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  framework_id uuid references public.control_frameworks(id) on delete restrict, title text not null, scope jsonb not null default '{}'::jsonb,
  status text not null default 'planned', starts_at timestamptz, ends_at timestamptz, lead_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), closed_at timestamptz,
  constraint audit_sessions_scope_check check(jsonb_typeof(scope)='object'), constraint audit_sessions_status_check check(status in ('planned','active','fieldwork','closing','closed','cancelled')),
  constraint audit_sessions_dates_check check(ends_at is null or starts_at is null or ends_at>=starts_at)
);
create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  audit_session_id uuid not null references public.audit_sessions(id) on delete restrict, control_id uuid references public.governance_controls(id) on delete restrict,
  finding_number text not null, title text not null, severity text not null, status text not null default 'open', due_at timestamptz,
  owner_profile_id uuid references public.profiles(id) on delete set null, resolution_summary text, resolved_at timestamptz, created_at timestamptz not null default now(),
  constraint audit_findings_severity_check check(severity in ('low','medium','high','critical')), constraint audit_findings_status_check check(status in ('open','accepted','remediation','resolved','closed')),
  constraint audit_findings_unique unique(organization_id,finding_number)
);
create table if not exists public.audit_observations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  audit_session_id uuid not null references public.audit_sessions(id) on delete restrict, control_id uuid references public.governance_controls(id) on delete restrict,
  observation text not null, outcome text not null, observed_by uuid references public.profiles(id) on delete set null, observed_at timestamptz not null default now(),
  constraint audit_observations_outcome_check check(outcome in ('effective','partially_effective','ineffective','not_tested'))
);
create table if not exists public.audit_actions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  finding_id uuid not null references public.audit_findings(id) on delete restrict, title text not null, owner_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open', due_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(),
  constraint audit_actions_status_check check(status in ('open','in_progress','blocked','completed','verified'))
);
create table if not exists public.audit_action_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  audit_action_id uuid not null references public.audit_actions(id) on delete restrict, event_type text not null, actor_profile_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(), constraint audit_action_events_details_check check(jsonb_typeof(details)='object')
);
create table if not exists public.compliance_reviews (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null, review_type text not null, status text not null default 'draft', period_start date, period_end date,
  owner_profile_id uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), completed_at timestamptz,
  constraint compliance_reviews_status_check check(status in ('draft','active','review','completed','archived')), constraint compliance_reviews_period_check check(period_end is null or period_start is null or period_end>=period_start)
);
create table if not exists public.compliance_review_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  review_id uuid not null references public.compliance_reviews(id) on delete restrict, control_id uuid references public.governance_controls(id) on delete restrict,
  status text not null default 'pending', score numeric, notes text not null default '', reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz,
  constraint compliance_review_items_status_check check(status in ('pending','compliant','partial','non_compliant','not_applicable')), constraint compliance_review_items_score_check check(score is null or score between 0 and 100)
);
create table if not exists public.policy_documents (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  policy_key text not null, title text not null, category text not null, owner_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft', created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint policy_documents_key_check check(policy_key ~ '^[A-Z0-9.-]+$'), constraint policy_documents_status_check check(status in ('draft','review','published','retired')),
  constraint policy_documents_unique unique nulls not distinct(organization_id,policy_key)
);
create table if not exists public.policy_versions (
  id uuid primary key default gen_random_uuid(), policy_id uuid not null references public.policy_documents(id) on delete restrict,
  version integer not null, content jsonb not null default '{}'::jsonb, summary text not null default '', status text not null default 'draft',
  content_hash text not null, effective_at timestamptz, published_at timestamptz, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint policy_versions_version_check check(version>0), constraint policy_versions_content_check check(jsonb_typeof(content)='object'),
  constraint policy_versions_status_check check(status in ('draft','review','published','retired')), constraint policy_versions_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint policy_versions_unique unique(policy_id,version)
);
create table if not exists public.policy_assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict, profile_id uuid references public.profiles(id) on delete restrict,
  role_id uuid references public.roles(id) on delete restrict, assigned_at timestamptz not null default now(), due_at timestamptz, mandatory boolean not null default true,
  constraint policy_assignments_target_check check((profile_id is not null)::integer+(role_id is not null)::integer=1)
);
create table if not exists public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  acknowledgement_hash text not null, acknowledged_at timestamptz not null default now(), ip_hash text, user_agent_hash text,
  constraint policy_acknowledgements_hash_check check(acknowledgement_hash ~ '^[a-f0-9]{64}$'), constraint policy_acknowledgements_unique unique(policy_version_id,profile_id)
);
create table if not exists public.risk_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  key text not null, name text not null, appetite integer not null default 10, created_at timestamptz not null default now(),
  constraint risk_categories_appetite_check check(appetite between 1 and 25), constraint risk_categories_unique unique(organization_id,key)
);
create table if not exists public.risk_register (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  category_id uuid references public.risk_categories(id) on delete restrict, risk_number text not null, title text not null, description text not null,
  owner_profile_id uuid references public.profiles(id) on delete set null, status text not null default 'open', likelihood integer not null, impact integer not null,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint risk_register_score_check check(likelihood between 1 and 5 and impact between 1 and 5), constraint risk_register_status_check check(status in ('open','assessed','treating','accepted','closed')),
  constraint risk_register_unique unique(organization_id,risk_number)
);
create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  risk_id uuid not null references public.risk_register(id) on delete restrict, likelihood integer not null, impact integer not null,
  inherent_score integer generated always as(likelihood*impact) stored, residual_score integer, rationale text not null,
  assessed_by uuid references public.profiles(id) on delete set null, assessed_at timestamptz not null default now(),
  constraint risk_assessments_score_check check(likelihood between 1 and 5 and impact between 1 and 5 and (residual_score is null or residual_score between 1 and 25))
);
create table if not exists public.risk_treatments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  risk_id uuid not null references public.risk_register(id) on delete restrict, treatment_type text not null, plan text not null,
  owner_profile_id uuid references public.profiles(id) on delete set null, due_at timestamptz, status text not null default 'planned', completed_at timestamptz,
  constraint risk_treatments_type_check check(treatment_type in ('mitigate','avoid','transfer','accept')), constraint risk_treatments_status_check check(status in ('planned','active','completed','cancelled'))
);
create table if not exists public.risk_reviews (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  risk_id uuid not null references public.risk_register(id) on delete restrict, outcome text not null, residual_score integer,
  notes text not null default '', reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz not null default now(),
  constraint risk_reviews_score_check check(residual_score is null or residual_score between 1 and 25), constraint risk_reviews_outcome_check check(outcome in ('continue','escalate','accept','close'))
);
create table if not exists public.exceptions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  exception_number text not null, control_id uuid references public.governance_controls(id) on delete restrict, policy_id uuid references public.policy_documents(id) on delete restrict,
  title text not null, justification text not null, status text not null default 'draft', requested_by uuid references public.profiles(id) on delete set null,
  starts_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now(),
  constraint exceptions_parent_check check(control_id is not null or policy_id is not null), constraint exceptions_status_check check(status in ('draft','review','approved','rejected','expired','revoked')),
  constraint exceptions_dates_check check(expires_at is null or starts_at is null or expires_at>=starts_at), constraint exceptions_unique unique(organization_id,exception_number)
);
create table if not exists public.exception_reviews (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  exception_id uuid not null references public.exceptions(id) on delete restrict, recommendation text not null, notes text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz not null default now(), constraint exception_reviews_recommendation_check check(recommendation in ('approve','reject','revise'))
);
create table if not exists public.exception_approvals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  exception_id uuid not null references public.exceptions(id) on delete restrict, decision text not null, conditions jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id) on delete set null, decided_at timestamptz not null default now(),
  constraint exception_approvals_decision_check check(decision in ('approved','rejected','revoked')), constraint exception_approvals_conditions_check check(jsonb_typeof(conditions)='object')
);
create table if not exists public.retention_policies (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  data_category text not null, purpose_key text, duration_days integer not null, trigger_event text not null, action text not null,
  jurisdiction text not null default 'IN', version integer not null default 1, status text not null default 'draft', effective_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint retention_policies_duration_check check(duration_days>0), constraint retention_policies_action_check check(action in ('review','archive','anonymize','restrict')),
  constraint retention_policies_status_check check(status in ('draft','active','retired')), constraint retention_policies_unique unique nulls not distinct(organization_id,data_category,purpose_key,jurisdiction,version)
);
create table if not exists public.retention_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  policy_id uuid not null references public.retention_policies(id) on delete restrict, batch_id uuid not null default gen_random_uuid(),
  status text not null default 'queued', candidate_count integer not null default 0, processed_count integer not null default 0,
  requested_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), completed_at timestamptz,
  constraint retention_jobs_status_check check(status in ('queued','running','completed','failed','cancelled'))
);
create table if not exists public.retention_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  retention_job_id uuid not null references public.retention_jobs(id) on delete restrict, entity_type text not null, entity_reference_hash text not null,
  action text not null, outcome text not null, evidence_hash text not null, exception_code text, occurred_at timestamptz not null default now(),
  constraint retention_events_hash_check check(length(entity_reference_hash)>=32 and length(evidence_hash)>=32)
);
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  requester_profile_id uuid references public.profiles(id) on delete restrict, requester_contact_ciphertext text, request_type text not null,
  jurisdiction text not null default 'IN-DPDP', status text not null default 'submitted', case_number text not null,
  details_ciphertext text, received_at timestamptz not null default now(), due_at timestamptz not null, verified_at timestamptz,
  approved_at timestamptz, completed_at timestamptz, closed_at timestamptz, assigned_to uuid references public.profiles(id) on delete set null,
  constraint privacy_requests_type_check check(request_type in ('access','correction','erasure','grievance','consent_withdrawal')), constraint privacy_requests_status_check check(status in ('submitted','verification','review','approved','processing','completed','rejected','closed')),
  constraint privacy_requests_due_check check(due_at>=received_at), constraint privacy_requests_case_unique unique(case_number)
);
create table if not exists public.privacy_request_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  request_id uuid not null references public.privacy_requests(id) on delete restrict, event_type text not null, actor_profile_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(), constraint privacy_request_events_details_check check(jsonb_typeof(details)='object')
);
create table if not exists public.privacy_request_documents (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  request_id uuid not null references public.privacy_requests(id) on delete restrict, storage_object_id uuid references public.storage_objects(id) on delete restrict,
  document_type text not null, checksum_sha256 text not null, uploaded_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint privacy_request_documents_checksum_check check(checksum_sha256 ~ '^[a-f0-9]{64}$')
);
create table if not exists public.consent_withdrawals (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, purpose_key text not null, consent_reference_hash text not null,
  reason text, withdrawn_at timestamptz not null default now(), effective_at timestamptz not null default now(), recorded_by uuid references public.profiles(id) on delete set null,
  constraint consent_withdrawals_hash_check check(length(consent_reference_hash)>=32), constraint consent_withdrawals_dates_check check(effective_at>=withdrawn_at)
);
create table if not exists public.legal_holds (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  name text not null, scope jsonb not null default '{}'::jsonb, reason_ciphertext text not null, starts_at timestamptz not null default now(), ends_at timestamptz,
  status text not null default 'active', created_by uuid references public.profiles(id) on delete set null, released_by uuid references public.profiles(id) on delete set null, released_at timestamptz,
  constraint legal_holds_scope_check check(jsonb_typeof(scope)='object'), constraint legal_holds_status_check check(status in ('active','released')), constraint legal_holds_dates_check check(ends_at is null or ends_at>=starts_at)
);
create table if not exists public.compliance_dashboards (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict, name text not null, layout jsonb not null default '[]'::jsonb,
  is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint compliance_dashboards_layout_check check(jsonb_typeof(layout)='array')
);
create table if not exists public.governance_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null, event_type text not null, entity_type text not null, entity_id uuid,
  correlation_id uuid not null default gen_random_uuid(), metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint governance_events_metadata_check check(jsonb_typeof(metadata)='object')
);

create index if not exists governance_controls_org_status_idx on public.governance_controls(organization_id,status,updated_at desc);
create index if not exists control_evidence_org_status_idx on public.control_evidence(organization_id,status,updated_at desc);
create index if not exists audit_sessions_org_status_idx on public.audit_sessions(organization_id,status,created_at desc);
create index if not exists audit_findings_org_status_idx on public.audit_findings(organization_id,status,severity,due_at);
create index if not exists policy_assignments_profile_idx on public.policy_assignments(profile_id,due_at);
create index if not exists risk_register_org_score_idx on public.risk_register(organization_id,status,(likelihood*impact) desc);
create index if not exists privacy_requests_org_due_idx on public.privacy_requests(organization_id,status,due_at);
create index if not exists retention_jobs_org_status_idx on public.retention_jobs(organization_id,status,created_at desc);

create or replace function private.can_manage_governance(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and (
    private.has_permission(target_organization_id,'governance.manage')
    or private.has_permission(target_organization_id,'compliance.review')
    or private.can_administer_organization(target_organization_id)
  )
$$;
create or replace function private.can_manage_privacy(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and (
    private.has_permission(target_organization_id,'privacy.request.manage')
    or private.can_manage_governance(target_organization_id)
  )
$$;

create or replace view public.governance_dashboard_projection with(security_invoker=true) as
select o.id as organization_id,
  (select count(*) from public.governance_controls c where c.organization_id=o.id and c.status='published')::integer as published_controls,
  (select count(*) from public.audit_findings f where f.organization_id=o.id and f.status not in('resolved','closed'))::integer as open_findings,
  (select count(*) from public.risk_register r where r.organization_id=o.id and r.status not in('accepted','closed'))::integer as open_risks,
  (select count(*) from public.privacy_requests p where p.organization_id=o.id and p.status not in('completed','rejected','closed'))::integer as open_privacy_requests
from public.organizations o;
create or replace view public.control_evidence_projection with(security_invoker=true) as
select e.id,e.organization_id,e.control_id,c.control_key,c.title as control_title,e.title,e.evidence_type,e.status,e.valid_from,e.valid_until,
  count(v.id)::integer as version_count,max(v.recorded_at) as last_recorded_at
from public.control_evidence e join public.governance_controls c on c.id=e.control_id left join public.control_evidence_versions v on v.evidence_id=e.id
group by e.id,c.control_key,c.title;
create or replace view public.audit_findings_projection with(security_invoker=true) as
select f.id,f.organization_id,f.audit_session_id,s.title as audit_title,f.finding_number,f.title,f.severity,f.status,f.due_at,f.resolved_at,
  count(a.id) filter(where a.status not in('completed','verified'))::integer as open_actions
from public.audit_findings f join public.audit_sessions s on s.id=f.audit_session_id left join public.audit_actions a on a.finding_id=f.id group by f.id,s.title;
create or replace view public.policy_assignment_projection with(security_invoker=true) as
select a.id,a.organization_id,a.profile_id,a.policy_version_id,d.title,v.version,a.due_at,a.mandatory,
  exists(select 1 from public.policy_acknowledgements x where x.policy_version_id=a.policy_version_id and x.profile_id=a.profile_id) as acknowledged
from public.policy_assignments a join public.policy_versions v on v.id=a.policy_version_id join public.policy_documents d on d.id=v.policy_id;
create or replace view public.risk_register_projection with(security_invoker=true) as
select r.id,r.organization_id,r.risk_number,r.title,r.status,r.likelihood,r.impact,(r.likelihood*r.impact)::integer as risk_score,c.name as category,
  (select max(a.residual_score) from public.risk_assessments a where a.risk_id=r.id) as residual_score
from public.risk_register r left join public.risk_categories c on c.id=r.category_id;
create or replace view public.privacy_request_projection with(security_invoker=true) as
select p.id,p.organization_id,p.requester_profile_id,p.request_type,p.jurisdiction,p.status,p.case_number,p.received_at,p.due_at,p.completed_at,
  (p.status not in('completed','rejected','closed') and p.due_at<now()) as overdue
from public.privacy_requests p;
create or replace view public.retention_status_projection with(security_invoker=true) as
select j.id,j.organization_id,j.policy_id,p.data_category,p.action,j.status,j.candidate_count,j.processed_count,j.created_at,j.completed_at,
  exists(select 1 from public.legal_holds h where (h.organization_id=j.organization_id or h.organization_id is null) and h.status='active') as legal_hold_active
from public.retention_jobs j join public.retention_policies p on p.id=j.policy_id;
create or replace view public.reporting_governance_metrics with(security_invoker=true) as
select d.organization_id,d.published_controls,d.open_findings,d.open_risks,d.open_privacy_requests,
  (select count(*) from public.control_evidence e where e.organization_id=d.organization_id and e.status='verified')::integer as verified_evidence,
  (select count(*) from public.policy_acknowledgements a where a.organization_id=d.organization_id)::integer as policy_acknowledgements
from public.governance_dashboard_projection d;

create or replace function public.create_control(p_organization_id uuid,p_control_key text,p_title text,p_category text,p_objective text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare control_id uuid; begin
  if not private.can_manage_governance(p_organization_id) then raise exception 'control denied' using errcode='42501'; end if;
  insert into public.governance_controls(organization_id,control_key,title,category,created_by,updated_by) values(p_organization_id,p_control_key,btrim(p_title),p_category,auth.uid(),auth.uid()) returning id into control_id;
  insert into public.governance_control_versions(control_id,version,objective,content_hash,created_by) values(control_id,1,p_objective,encode(extensions.digest(p_objective,'sha256'),'hex'),auth.uid()); return control_id;
end $$;
create or replace function public.publish_control(p_control_version_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; control_identity uuid; begin
  select c.organization_id,c.id into org_id,control_identity from public.governance_control_versions v join public.governance_controls c on c.id=v.control_id where v.id=p_control_version_id;
  if not private.can_manage_governance(org_id) then raise exception 'control denied' using errcode='42501'; end if;
  update public.governance_control_versions set status='published',published_at=now() where id=p_control_version_id and status in('draft','review'); if not found then raise exception 'control cannot be published'; end if;
  update public.governance_controls set status='published',updated_by=auth.uid(),updated_at=now() where id=control_identity;
end $$;
create or replace function public.record_evidence(p_control_id uuid,p_title text,p_evidence_type text,p_description text,p_evidence_hash text,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; evidence_id uuid; begin
  select organization_id into org_id from public.governance_controls where id=p_control_id; if not private.can_manage_governance(org_id) then raise exception 'evidence denied' using errcode='42501'; end if;
  insert into public.control_evidence(organization_id,control_id,evidence_type,title,status,created_by) values(org_id,p_control_id,p_evidence_type,p_title,'submitted',auth.uid()) returning id into evidence_id;
  insert into public.control_evidence_versions(evidence_id,version,description,evidence_hash,metadata,recorded_by) values(evidence_id,1,p_description,p_evidence_hash,p_metadata,auth.uid()); return evidence_id;
end $$;
create or replace function public.verify_evidence(p_evidence_version_id uuid,p_decision text)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; evidence_identity uuid; begin
  select e.organization_id,e.id into org_id,evidence_identity from public.control_evidence_versions v join public.control_evidence e on e.id=v.evidence_id where v.id=p_evidence_version_id;
  if not private.can_manage_governance(org_id) then raise exception 'evidence denied' using errcode='42501'; end if;
  update public.control_evidence_versions set verification_status=p_decision,verified_by=auth.uid(),verified_at=now() where id=p_evidence_version_id and verification_status='pending';
  update public.control_evidence set status=case when p_decision='verified' then 'verified' else 'rejected' end,updated_at=now() where id=evidence_identity;
end $$;
create or replace function public.start_audit(p_organization_id uuid,p_title text,p_scope jsonb,p_starts_at timestamptz default now())
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare audit_id uuid; begin if not private.can_manage_governance(p_organization_id) then raise exception 'audit denied' using errcode='42501'; end if; insert into public.audit_sessions(organization_id,title,scope,status,starts_at,lead_profile_id,created_by) values(p_organization_id,p_title,p_scope,'active',p_starts_at,auth.uid(),auth.uid()) returning id into audit_id; return audit_id; end $$;
create or replace function public.close_audit(p_audit_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin update public.audit_sessions set status='closed',closed_at=now(),ends_at=coalesce(ends_at,now()) where id=p_audit_id and private.can_manage_governance(organization_id) and status not in('closed','cancelled'); if not found then raise exception 'audit denied' using errcode='42501'; end if; end $$;
create or replace function public.record_finding(p_audit_id uuid,p_title text,p_severity text,p_due_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; finding_id uuid; finding_no text; begin select organization_id into org_id from public.audit_sessions where id=p_audit_id; if not private.can_manage_governance(org_id) then raise exception 'finding denied' using errcode='42501'; end if; finding_no:='F-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)); insert into public.audit_findings(organization_id,audit_session_id,finding_number,title,severity,due_at,owner_profile_id) values(org_id,p_audit_id,finding_no,p_title,p_severity,p_due_at,auth.uid()) returning id into finding_id; return finding_id; end $$;
create or replace function public.resolve_finding(p_finding_id uuid,p_resolution_summary text)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin update public.audit_findings set status='resolved',resolution_summary=p_resolution_summary,resolved_at=now() where id=p_finding_id and private.can_manage_governance(organization_id) and status not in('resolved','closed'); if not found then raise exception 'finding denied' using errcode='42501'; end if; end $$;
create or replace function public.create_policy(p_organization_id uuid,p_policy_key text,p_title text,p_category text,p_content jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare policy_id uuid; begin if not private.can_manage_governance(p_organization_id) then raise exception 'policy denied' using errcode='42501'; end if; insert into public.policy_documents(organization_id,policy_key,title,category,created_by) values(p_organization_id,p_policy_key,p_title,p_category,auth.uid()) returning id into policy_id; insert into public.policy_versions(policy_id,version,content,content_hash,created_by) values(policy_id,1,p_content,encode(extensions.digest(p_content::text,'sha256'),'hex'),auth.uid()); return policy_id; end $$;
create or replace function public.publish_policy(p_policy_version_id uuid,p_effective_at timestamptz default now())
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; policy_identity uuid; begin select d.organization_id,d.id into org_id,policy_identity from public.policy_versions v join public.policy_documents d on d.id=v.policy_id where v.id=p_policy_version_id; if not private.can_manage_governance(org_id) then raise exception 'policy denied' using errcode='42501'; end if; update public.policy_versions set status='published',published_at=now(),effective_at=p_effective_at where id=p_policy_version_id and status in('draft','review'); if not found then raise exception 'policy cannot be published'; end if; update public.policy_documents set status='published',updated_at=now() where id=policy_identity; end $$;
create or replace function public.acknowledge_policy(p_policy_version_id uuid,p_acknowledgement_hash text,p_ip_hash text default null,p_user_agent_hash text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; acknowledgement_id uuid; begin select d.organization_id into org_id from public.policy_versions v join public.policy_documents d on d.id=v.policy_id where v.id=p_policy_version_id and v.status='published'; if auth.uid() is null or (org_id is not null and not private.is_active_org_member(org_id)) then raise exception 'acknowledgement denied' using errcode='42501'; end if; insert into public.policy_acknowledgements(organization_id,policy_version_id,profile_id,acknowledgement_hash,ip_hash,user_agent_hash) values(org_id,p_policy_version_id,auth.uid(),p_acknowledgement_hash,p_ip_hash,p_user_agent_hash) returning id into acknowledgement_id; return acknowledgement_id; end $$;
create or replace function public.create_risk(p_organization_id uuid,p_title text,p_description text,p_likelihood integer,p_impact integer,p_category_id uuid default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare risk_id uuid; risk_no text; begin if not private.can_manage_governance(p_organization_id) then raise exception 'risk denied' using errcode='42501'; end if; risk_no:='R-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)); insert into public.risk_register(organization_id,category_id,risk_number,title,description,owner_profile_id,likelihood,impact,created_by) values(p_organization_id,p_category_id,risk_no,p_title,p_description,auth.uid(),p_likelihood,p_impact,auth.uid()) returning id into risk_id; return risk_id; end $$;
create or replace function public.review_risk(p_risk_id uuid,p_outcome text,p_residual_score integer,p_notes text default '')
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; review_id uuid; begin select organization_id into org_id from public.risk_register where id=p_risk_id; if not private.can_manage_governance(org_id) then raise exception 'risk denied' using errcode='42501'; end if; insert into public.risk_reviews(organization_id,risk_id,outcome,residual_score,notes,reviewed_by) values(org_id,p_risk_id,p_outcome,p_residual_score,p_notes,auth.uid()) returning id into review_id; update public.risk_register set status=case when p_outcome='close' then 'closed' when p_outcome='accept' then 'accepted' else 'assessed' end,updated_at=now() where id=p_risk_id; return review_id; end $$;
create or replace function public.approve_exception(p_exception_id uuid,p_decision text,p_conditions jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; approval_id uuid; begin select organization_id into org_id from public.exceptions where id=p_exception_id; if not private.can_manage_governance(org_id) then raise exception 'exception denied' using errcode='42501'; end if; insert into public.exception_approvals(organization_id,exception_id,decision,conditions,approved_by) values(org_id,p_exception_id,p_decision,p_conditions,auth.uid()) returning id into approval_id; update public.exceptions set status=case when p_decision='approved' then 'approved' when p_decision='rejected' then 'rejected' else 'revoked' end where id=p_exception_id; return approval_id; end $$;
create or replace function public.submit_privacy_request(p_organization_id uuid,p_request_type text,p_details_ciphertext text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare request_id uuid; case_no text; begin if auth.uid() is null or p_organization_id is null or not private.is_active_org_member(p_organization_id) then raise exception 'privacy request denied' using errcode='42501'; end if; case_no:='PR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)); insert into public.privacy_requests(organization_id,requester_profile_id,request_type,case_number,details_ciphertext,due_at) values(p_organization_id,auth.uid(),p_request_type,case_no,p_details_ciphertext,now()+interval '30 days') returning id into request_id; insert into public.privacy_request_events(organization_id,request_id,actor_profile_id,event_type) values(p_organization_id,request_id,auth.uid(),'submitted'); return request_id; end $$;
create or replace function public.approve_privacy_request(p_request_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin update public.privacy_requests set status='approved',approved_at=now(),assigned_to=coalesce(assigned_to,auth.uid()) where id=p_request_id and private.can_manage_privacy(organization_id) and status in('submitted','verification','review'); if not found then raise exception 'privacy request denied' using errcode='42501'; end if; insert into public.privacy_request_events(organization_id,request_id,actor_profile_id,event_type) select organization_id,id,auth.uid(),'approved' from public.privacy_requests where id=p_request_id; end $$;
create or replace function public.complete_privacy_request(p_request_id uuid,p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin update public.privacy_requests set status='completed',completed_at=now(),closed_at=now() where id=p_request_id and private.can_manage_privacy(organization_id) and status in('approved','processing'); if not found then raise exception 'privacy request denied' using errcode='42501'; end if; insert into public.privacy_request_events(organization_id,request_id,actor_profile_id,event_type,details) select organization_id,id,auth.uid(),'completed',p_details from public.privacy_requests where id=p_request_id; end $$;
create or replace function public.run_retention_job(p_policy_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; job_id uuid; begin select organization_id into org_id from public.retention_policies where id=p_policy_id and status='active'; if org_id is null or not private.can_manage_governance(org_id) then raise exception 'retention denied' using errcode='42501'; end if; insert into public.retention_jobs(organization_id,policy_id,requested_by) values(org_id,p_policy_id,auth.uid()) returning id into job_id; return job_id; end $$;
create or replace function public.record_governance_event(p_organization_id uuid,p_event_type text,p_entity_type text,p_entity_id uuid,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare event_id uuid; begin if not private.can_manage_governance(p_organization_id) then raise exception 'governance event denied' using errcode='42501'; end if; insert into public.governance_events(organization_id,actor_profile_id,event_type,entity_type,entity_id,metadata) values(p_organization_id,auth.uid(),p_event_type,p_entity_type,p_entity_id,p_metadata) returning id into event_id; return event_id; end $$;

create or replace function private.reject_governance_evidence_mutation() returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'governance evidence is immutable'; end $$;
create or replace function private.protect_published_governance_version() returns trigger language plpgsql set search_path=pg_catalog as $$ begin if old.status='published' then raise exception 'published governance version is immutable'; end if; return new; end $$;
create trigger governance_control_versions_published_immutable before update or delete on public.governance_control_versions for each row execute function private.protect_published_governance_version();
create trigger policy_versions_published_immutable before update or delete on public.policy_versions for each row execute function private.protect_published_governance_version();
do $$ declare table_name text; begin foreach table_name in array array['control_evidence_versions','audit_action_events','policy_acknowledgements','risk_assessments','risk_reviews','exception_reviews','exception_approvals','retention_events','privacy_request_events','privacy_request_documents','consent_withdrawals','governance_events'] loop execute format('create trigger %I before update or delete on public.%I for each row execute function private.reject_governance_evidence_mutation()',table_name||'_immutable',table_name); end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'governance_controls','governance_control_versions','control_frameworks','control_framework_mappings','control_evidence','control_evidence_versions','evidence_artifacts','evidence_storage','audit_sessions','audit_findings','audit_observations','audit_actions','audit_action_events','compliance_reviews','compliance_review_items','policy_documents','policy_versions','policy_acknowledgements','policy_assignments','risk_register','risk_categories','risk_assessments','risk_treatments','risk_reviews','exceptions','exception_reviews','exception_approvals','retention_policies','retention_jobs','retention_events','privacy_requests','privacy_request_events','privacy_request_documents','consent_withdrawals','legal_holds','compliance_dashboards','governance_events'
] loop execute format('alter table public.%I enable row level security',table_name); execute format('alter table public.%I force row level security',table_name); execute format('revoke all on table public.%I from anon,authenticated',table_name); end loop; end $$;

create policy governance_controls_admin_select on public.governance_controls for select to authenticated using(private.can_manage_governance(organization_id));
create policy governance_control_versions_admin_select on public.governance_control_versions for select to authenticated using(exists(select 1 from public.governance_controls c where c.id=control_id and private.can_manage_governance(c.organization_id)));
create policy control_frameworks_admin_select on public.control_frameworks for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_governance(organization_id));
create policy control_framework_mappings_admin_select on public.control_framework_mappings for select to authenticated using(private.can_manage_governance(organization_id));
create policy control_evidence_admin_select on public.control_evidence for select to authenticated using(private.can_manage_governance(organization_id));
create policy control_evidence_versions_admin_select on public.control_evidence_versions for select to authenticated using(exists(select 1 from public.control_evidence e where e.id=evidence_id and private.can_manage_governance(e.organization_id)));
create policy evidence_artifacts_admin_select on public.evidence_artifacts for select to authenticated using(private.can_manage_governance(organization_id));
create policy evidence_storage_admin_select on public.evidence_storage for select to authenticated using(private.can_manage_governance(organization_id));
create policy audit_sessions_admin_select on public.audit_sessions for select to authenticated using(private.can_manage_governance(organization_id));
create policy audit_findings_admin_select on public.audit_findings for select to authenticated using(private.can_manage_governance(organization_id));
create policy audit_observations_admin_select on public.audit_observations for select to authenticated using(private.can_manage_governance(organization_id));
create policy audit_actions_admin_select on public.audit_actions for select to authenticated using(private.can_manage_governance(organization_id));
create policy audit_action_events_admin_select on public.audit_action_events for select to authenticated using(private.can_manage_governance(organization_id));
create policy compliance_reviews_admin_select on public.compliance_reviews for select to authenticated using(private.can_manage_governance(organization_id));
create policy compliance_review_items_admin_select on public.compliance_review_items for select to authenticated using(private.can_manage_governance(organization_id));
create policy policy_documents_member_select on public.policy_documents for select to authenticated using((status='published' and (organization_id is null or private.is_active_org_member(organization_id))) or private.can_manage_governance(organization_id));
create policy policy_versions_member_select on public.policy_versions for select to authenticated using(exists(select 1 from public.policy_documents d where d.id=policy_id and ((policy_versions.status='published' and (d.organization_id is null or private.is_active_org_member(d.organization_id))) or private.can_manage_governance(d.organization_id))));
create policy policy_acknowledgements_context_select on public.policy_acknowledgements for select to authenticated using(profile_id=auth.uid() or (organization_id is not null and private.can_manage_governance(organization_id)) or (organization_id is null and private.can_platform_admin()));
create policy policy_assignments_context_select on public.policy_assignments for select to authenticated using(profile_id=auth.uid() or private.can_manage_governance(organization_id));
create policy risk_register_admin_select on public.risk_register for select to authenticated using(private.can_manage_governance(organization_id));
create policy risk_categories_admin_select on public.risk_categories for select to authenticated using(private.can_manage_governance(organization_id));
create policy risk_assessments_admin_select on public.risk_assessments for select to authenticated using(private.can_manage_governance(organization_id));
create policy risk_treatments_admin_select on public.risk_treatments for select to authenticated using(private.can_manage_governance(organization_id));
create policy risk_reviews_admin_select on public.risk_reviews for select to authenticated using(private.can_manage_governance(organization_id));
create policy exceptions_admin_select on public.exceptions for select to authenticated using(private.can_manage_governance(organization_id));
create policy exception_reviews_admin_select on public.exception_reviews for select to authenticated using(private.can_manage_governance(organization_id));
create policy exception_approvals_admin_select on public.exception_approvals for select to authenticated using(private.can_manage_governance(organization_id));
create policy retention_policies_admin_select on public.retention_policies for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_governance(organization_id));
create policy retention_jobs_admin_select on public.retention_jobs for select to authenticated using(organization_id is not null and private.can_manage_governance(organization_id));
create policy retention_events_admin_select on public.retention_events for select to authenticated using(organization_id is not null and private.can_manage_governance(organization_id));
create policy privacy_requests_context_select on public.privacy_requests for select to authenticated using(requester_profile_id=auth.uid() or (organization_id is not null and private.can_manage_privacy(organization_id)));
create policy privacy_request_events_context_select on public.privacy_request_events for select to authenticated using(exists(select 1 from public.privacy_requests r where r.id=request_id and (r.requester_profile_id=auth.uid() or (r.organization_id is not null and private.can_manage_privacy(r.organization_id)))));
create policy privacy_request_documents_context_select on public.privacy_request_documents for select to authenticated using(exists(select 1 from public.privacy_requests r where r.id=request_id and (r.requester_profile_id=auth.uid() or (r.organization_id is not null and private.can_manage_privacy(r.organization_id)))));
create policy consent_withdrawals_context_select on public.consent_withdrawals for select to authenticated using(profile_id=auth.uid() or (organization_id is not null and private.can_manage_privacy(organization_id)));
create policy legal_holds_admin_select on public.legal_holds for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_governance(organization_id));
create policy compliance_dashboards_admin_select on public.compliance_dashboards for select to authenticated using(owner_profile_id=auth.uid() and private.can_manage_governance(organization_id));
create policy governance_events_admin_select on public.governance_events for select to authenticated using(organization_id is not null and private.can_manage_governance(organization_id));

grant select on public.governance_controls,public.governance_control_versions,public.control_frameworks,public.control_framework_mappings,public.control_evidence,public.control_evidence_versions,public.evidence_artifacts,public.evidence_storage,public.audit_sessions,public.audit_findings,public.audit_observations,public.audit_actions,public.audit_action_events,public.compliance_reviews,public.compliance_review_items,public.policy_documents,public.policy_versions,public.policy_acknowledgements,public.policy_assignments,public.risk_register,public.risk_categories,public.risk_assessments,public.risk_treatments,public.risk_reviews,public.exceptions,public.exception_reviews,public.exception_approvals,public.retention_policies,public.retention_jobs,public.retention_events,public.privacy_requests,public.privacy_request_events,public.privacy_request_documents,public.consent_withdrawals,public.legal_holds,public.compliance_dashboards,public.governance_events to authenticated;
grant select on public.governance_dashboard_projection,public.control_evidence_projection,public.audit_findings_projection,public.policy_assignment_projection,public.risk_register_projection,public.privacy_request_projection,public.retention_status_projection,public.reporting_governance_metrics to authenticated;
revoke all on function private.can_manage_governance(uuid) from public; revoke all on function private.can_manage_privacy(uuid) from public;
grant execute on function private.can_manage_governance(uuid) to authenticated; grant execute on function private.can_manage_privacy(uuid) to authenticated;
do $$ declare signature text; begin foreach signature in array array[
  'create_control(uuid,text,text,text,text)','publish_control(uuid)','record_evidence(uuid,text,text,text,text,jsonb)','verify_evidence(uuid,text)','start_audit(uuid,text,jsonb,timestamptz)','close_audit(uuid)','record_finding(uuid,text,text,timestamptz)','resolve_finding(uuid,text)','create_policy(uuid,text,text,text,jsonb)','publish_policy(uuid,timestamptz)','acknowledge_policy(uuid,text,text,text)','create_risk(uuid,text,text,integer,integer,uuid)','review_risk(uuid,text,integer,text)','approve_exception(uuid,text,jsonb)','submit_privacy_request(uuid,text,text)','approve_privacy_request(uuid)','complete_privacy_request(uuid,jsonb)','run_retention_job(uuid)','record_governance_event(uuid,text,text,uuid,jsonb)'
] loop execute format('revoke all on function public.%s from public',signature); execute format('grant execute on function public.%s to authenticated',signature); end loop; end $$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions(key,description,risk_level) values
 ('governance.manage','Manage governance, controls, risk and audit operations','critical'),
 ('compliance.review','Perform compliance reviews and evidence verification','high'),
 ('privacy.request.manage','Manage DPDP privacy request operations','critical')
on conflict(key) do update set description=excluded.description,risk_level=excluded.risk_level;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.organization_id is null
and r.key in('organization_admin','enterprise_admin','platform_admin','super_admin')
and p.key in('governance.manage','compliance.review','privacy.request.manage') on conflict do nothing;
-- SYRA-REFERENCE-DATA-END
