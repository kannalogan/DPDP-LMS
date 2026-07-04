-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/22-master-enum-catalog.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-002
-- SYRA-CHANGE: contract
-- SYRA-PII: P4
-- SYRA-RLS: S1-S8 deny-by-default foundation; docs/28-database-security-matrix.md
-- SYRA-IMMUTABLE: audit_events; trigger rejects UPDATE and DELETE
--
-- Forward reconciliation wave 1. The quarantined legacy migration is never replayed.
-- This migration creates no business data and no permissive RLS policies.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'risk_level'
  ) then
    create type public.risk_level as enum ('low', 'medium', 'high', 'critical');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'audit_outcome'
  ) then
    create type public.audit_outcome as enum ('succeeded', 'denied', 'failed', 'partial');
  end if;
end
$$;

-- Contract: organizations (TG, P1/E1/A1/S3/S6).
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid,
  name text not null,
  slug extensions.citext not null,
  type text not null default 'standard',
  country_code char(2) not null,
  status text not null default 'pending',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint organizations_slug_key unique (slug),
  constraint organizations_parent_id_fkey foreign key (parent_id) references public.organizations (id) on delete restrict,
  constraint organizations_parent_not_self_check check (parent_id is null or parent_id <> id),
  constraint organizations_type_check check (type in ('standard', 'enterprise', 'partner', 'platform')),
  constraint organizations_country_code_check check (country_code = upper(country_code) and length(country_code) = 2),
  constraint organizations_status_check check (status in ('pending', 'active', 'suspended', 'closed')),
  constraint organizations_version_check check (version > 0)
);

alter table public.organizations add column if not exists parent_id uuid;
alter table public.organizations add column if not exists type text not null default 'standard';
alter table public.organizations add column if not exists status text not null default 'pending';
alter table public.organizations add column if not exists archived_at timestamptz;
alter table public.organizations add column if not exists version integer not null default 1;
alter table public.organizations add column if not exists created_by uuid;
alter table public.organizations add column if not exists updated_by uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_parent_id_fkey' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations
      add constraint organizations_parent_id_fkey foreign key (parent_id) references public.organizations (id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organizations_parent_not_self_check' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations add constraint organizations_parent_not_self_check check (parent_id is null or parent_id <> id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organizations_type_check' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations add constraint organizations_type_check check (type in ('standard', 'enterprise', 'partner', 'platform')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organizations_status_check' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations add constraint organizations_status_check check (status in ('pending', 'active', 'suspended', 'closed')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organizations_country_code_check' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations add constraint organizations_country_code_check check (country_code = upper(country_code) and length(country_code) = 2) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organizations_version_check' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations add constraint organizations_version_check check (version > 0) not valid;
  end if;
end
$$;

create index if not exists organizations_parent_id_status_idx on public.organizations (parent_id, status);

-- Contract: profiles (TG, P2/E1/A1/S2). Avatar FK is added after storage_objects.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  avatar_object_id uuid,
  status text not null default 'pending',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint profiles_status_check check (status in ('pending', 'active', 'suspended', 'disabled', 'anonymized')),
  constraint profiles_locale_check check (locale ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  constraint profiles_timezone_check check (length(timezone) between 1 and 64),
  constraint profiles_version_check check (version > 0)
);

create index if not exists profiles_status_idx on public.profiles (status);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_created_by_fkey' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations add constraint organizations_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organizations_updated_by_fkey' and conrelid = 'public.organizations'::regclass) then
    alter table public.organizations add constraint organizations_updated_by_fkey foreign key (updated_by) references public.profiles (id) on delete set null not valid;
  end if;
end
$$;

-- Contract: organization_members (TT, P2/E2/A1/S2/S5).
do $$
begin
  if to_regclass('public.organization_members') is null then
    create table public.organization_members (
      id uuid primary key default gen_random_uuid(),
      organization_id uuid not null references public.organizations (id) on delete restrict,
      profile_id uuid not null references public.profiles (id) on delete restrict,
      status text not null default 'invited',
      joined_at timestamptz,
      ended_at timestamptz,
      employee_reference_hash text,
      version integer not null default 1,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      created_by uuid references public.profiles (id) on delete set null,
      updated_by uuid references public.profiles (id) on delete set null,
      constraint organization_members_organization_id_profile_id_key unique (organization_id, profile_id),
      constraint organization_members_status_check check (status in ('invited', 'active', 'suspended', 'ended')),
      constraint organization_members_dates_check check (ended_at is null or joined_at is null or ended_at >= joined_at),
      constraint organization_members_version_check check (version > 0)
    );
  else
    alter table public.organization_members add column if not exists id uuid not null default gen_random_uuid();
    alter table public.organization_members add column if not exists profile_id uuid;
    alter table public.organization_members add column if not exists status text not null default 'invited';
    alter table public.organization_members add column if not exists joined_at timestamptz;
    alter table public.organization_members add column if not exists ended_at timestamptz;
    alter table public.organization_members add column if not exists employee_reference_hash text;
    alter table public.organization_members add column if not exists version integer not null default 1;
    alter table public.organization_members add column if not exists updated_at timestamptz not null default now();
    alter table public.organization_members add column if not exists created_by uuid;
    alter table public.organization_members add column if not exists updated_by uuid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_index i
    where i.indrelid = 'public.organization_members'::regclass
      and i.indisunique
      and i.indpred is null
      and i.indnkeyatts = 1
      and i.indkey[0] = (select attnum from pg_attribute where attrelid = i.indrelid and attname = 'id')
  ) then
    create unique index organization_members_id_key on public.organization_members (id);
  end if;
end
$$;
create unique index if not exists organization_members_organization_id_profile_id_key on public.organization_members (organization_id, profile_id) where profile_id is not null;
create index if not exists organization_members_profile_id_status_idx on public.organization_members (profile_id, status);
create index if not exists organization_members_organization_id_status_idx on public.organization_members (organization_id, status);

-- Contracts: roles, permissions, role_permissions and member_role_assignments.
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  key text not null,
  name text not null,
  scope_type text not null,
  is_system boolean not null default false,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint roles_organization_id_key_key unique (organization_id, key),
  constraint roles_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint roles_scope_type_check check (scope_type in ('organization', 'enterprise', 'course', 'cohort', 'assessment', 'platform')),
  constraint roles_version_check check (version > 0)
);

create unique index if not exists roles_global_key_key on public.roles (key) where organization_id is null;
create index if not exists roles_scope_type_idx on public.roles (scope_type);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  description text not null,
  risk_level public.risk_level not null,
  deprecated_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint permissions_key_key unique (key),
  constraint permissions_key_check check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_.]*$'),
  constraint permissions_version_check check (version > 0)
);

create index if not exists permissions_risk_level_idx on public.permissions (risk_level);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint role_permissions_pkey primary key (role_id, permission_id)
);

create index if not exists role_permissions_permission_id_idx on public.role_permissions (permission_id);

create table if not exists public.member_role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  organization_member_id uuid not null,
  role_id uuid not null references public.roles (id) on delete restrict,
  scope_type text not null,
  scope_id uuid,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  granted_by uuid not null references public.profiles (id) on delete restrict,
  reason text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint member_role_assignments_scope_type_check check (scope_type in ('organization', 'enterprise', 'course', 'cohort', 'assessment', 'platform')),
  constraint member_role_assignments_dates_check check (ends_at is null or ends_at > starts_at),
  constraint member_role_assignments_version_check check (version > 0),
  constraint member_role_assignments_organization_member_id_fkey foreign key (organization_member_id) references public.organization_members (id) on delete restrict
);

create index if not exists member_role_assignments_member_ends_idx on public.member_role_assignments (organization_member_id, ends_at);
create index if not exists member_role_assignments_scope_idx on public.member_role_assignments (scope_type, scope_id);
create unique index if not exists member_role_assignments_active_key on public.member_role_assignments (organization_member_id, role_id, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)) where ends_at is null;

-- Contract: storage_objects (TT, P1-P4/E2/A1/S2-S8).
create table if not exists public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  bucket text not null,
  object_path text not null,
  content_type text not null,
  bytes bigint not null,
  sha256 text not null,
  classification text not null,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  scan_status text not null,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint storage_objects_bucket_object_path_key unique (bucket, object_path),
  constraint storage_objects_bytes_check check (bytes >= 0),
  constraint storage_objects_path_check check (object_path <> '' and object_path !~ '(^|/)\.\.(/|$)'),
  constraint storage_objects_version_check check (version > 0)
);

create index if not exists storage_objects_organization_classification_idx on public.storage_objects (organization_id, classification);
create index if not exists storage_objects_sha256_idx on public.storage_objects (sha256);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_object_id_fkey' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_avatar_object_id_fkey foreign key (avatar_object_id) references public.storage_objects (id) on delete set null;
  end if;
end
$$;

-- Contract: system_config_versions (TG, P1/E2/A1/S6/S8).
create table if not exists public.system_config_versions (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version integer not null,
  value jsonb not null,
  classification text not null,
  status text not null,
  activated_at timestamptz,
  activated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint system_config_versions_key_version_key unique (key, version),
  constraint system_config_versions_version_check check (version > 0),
  constraint system_config_versions_status_check check (status in ('draft', 'in_review', 'approved', 'scheduled', 'published', 'superseded', 'archived')),
  constraint system_config_versions_activation_check check (status <> 'published' or activated_at is not null)
);

create unique index if not exists system_config_versions_active_key on public.system_config_versions (key) where status = 'published';

-- Contract: processing_purposes (TG, P1/E0/A1/S1/S7).
create table if not exists public.processing_purposes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  key text not null,
  name text not null,
  description text not null,
  lawful_basis text not null,
  status text not null,
  effective_at timestamptz,
  retired_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint processing_purposes_organization_id_key_key unique (organization_id, key),
  constraint processing_purposes_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint processing_purposes_dates_check check (retired_at is null or effective_at is null or retired_at >= effective_at),
  constraint processing_purposes_version_check check (version > 0)
);

create unique index if not exists processing_purposes_global_key_key on public.processing_purposes (key) where organization_id is null;
create index if not exists processing_purposes_status_effective_idx on public.processing_purposes (status, effective_at);

-- Contract: audit_events (IG, P3/P4/E2/A2/S2/S7). Unpartitioned until DB-015 thresholds are approved.
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete restrict,
  actor_type text not null,
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  purpose_id uuid references public.processing_purposes (id) on delete restrict,
  outcome public.audit_outcome not null,
  correlation_id text not null,
  causation_id text,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  constraint audit_events_event_hash_key unique (event_hash),
  constraint audit_events_action_check check (action ~ '^[a-z][a-z0-9_.]*$'),
  constraint audit_events_resource_type_check check (resource_type ~ '^[a-z][a-z0-9_.]*$'),
  constraint audit_events_event_hash_check check (length(event_hash) >= 32)
);

create index if not exists audit_events_organization_occurred_idx on public.audit_events (organization_id, occurred_at desc);
create index if not exists audit_events_actor_occurred_idx on public.audit_events (actor_type, actor_id, occurred_at desc);
create index if not exists audit_events_resource_idx on public.audit_events (resource_type, resource_id, occurred_at desc);
create index if not exists audit_events_correlation_id_idx on public.audit_events (correlation_id);

create or replace function private.reject_immutable_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I is append-only; UPDATE and DELETE are prohibited', tg_table_name);
end
$$;

revoke all on function private.reject_immutable_mutation() from public;

drop trigger if exists audit_events_reject_mutation on public.audit_events;
create trigger audit_events_reject_mutation
before update or delete on public.audit_events
for each row execute function private.reject_immutable_mutation();

-- Retire only the known legacy policies on reconciled tables. New policies wait for the Auth/RBAC wave.
drop policy if exists "members can read their organizations" on public.organizations;
drop policy if exists "members can read organization memberships" on public.organization_members;
drop policy if exists "admins can manage organization memberships" on public.organization_members;

-- Placeholder-safe RLS posture: no permissive foundation policy exists after reconciliation.
alter table public.organizations enable row level security;
alter table public.organizations force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.organization_members enable row level security;
alter table public.organization_members force row level security;
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.permissions enable row level security;
alter table public.permissions force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
alter table public.member_role_assignments enable row level security;
alter table public.member_role_assignments force row level security;
alter table public.storage_objects enable row level security;
alter table public.storage_objects force row level security;
alter table public.system_config_versions enable row level security;
alter table public.system_config_versions force row level security;
alter table public.processing_purposes enable row level security;
alter table public.processing_purposes force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

revoke all on table
  public.organizations,
  public.profiles,
  public.organization_members,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.member_role_assignments,
  public.storage_objects,
  public.system_config_versions,
  public.processing_purposes,
  public.audit_events
from anon, authenticated, service_role;

comment on table public.audit_events is 'SYRA immutable audit authority; docs/23-master-table-catalog.md and ADR-002';
comment on schema private is 'SYRA protected invariant helpers; never exposed through PostgREST';
