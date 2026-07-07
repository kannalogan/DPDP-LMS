-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-009
-- SYRA-CHANGE: additive
-- SYRA-PII: P4
-- SYRA-RLS: S5/S6 admin workspace; supabase/tests/008_admin_workspace_test.sql
-- SYRA-IMMUTABLE: admin dashboard events and usage snapshots are append-only evidence
-- SYRA-SEED: deployment-reference
-- Admin writes are controlled by RPCs; no client-side service-role or direct table mutation path is approved.

create table if not exists public.organization_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  domain citext not null,
  verification_token_hash text not null,
  verification_status text not null default 'pending',
  verified_at timestamptz,
  expires_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint organization_domains_domain_key unique (domain),
  constraint organization_domains_status_check check (verification_status in ('pending','active','failed','expired','revoked')),
  constraint organization_domains_domain_check check (domain::text ~ '^[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
  constraint organization_domains_token_hash_check check (verification_token_hash ~ '^[a-f0-9]{64}$'),
  constraint organization_domains_version_check check (version > 0)
);
create index if not exists organization_domains_org_status_idx on public.organization_domains (organization_id, verification_status);

create table if not exists public.organization_branding (
  organization_id uuid primary key references public.organizations (id) on delete restrict,
  display_name text not null,
  logo_object_id uuid references public.storage_objects (id) on delete set null,
  theme jsonb not null default '{}'::jsonb,
  support_url text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint organization_branding_name_check check (length(btrim(display_name)) between 1 and 200),
  constraint organization_branding_theme_check check (jsonb_typeof(theme) = 'object'),
  constraint organization_branding_version_check check (version > 0)
);

create table if not exists public.organization_audit_preferences (
  organization_id uuid primary key references public.organizations (id) on delete restrict,
  retention_days integer not null default 365,
  export_enabled boolean not null default false,
  alert_recipients jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint organization_audit_preferences_retention_check check (retention_days between 30 and 3650),
  constraint organization_audit_preferences_recipients_check check (jsonb_typeof(alert_recipients) = 'array'),
  constraint organization_audit_preferences_version_check check (version > 0)
);

create table if not exists public.organization_security_settings (
  organization_id uuid primary key references public.organizations (id) on delete restrict,
  mfa_required boolean not null default false,
  allowed_email_domains text[] not null default '{}',
  session_timeout_minutes integer not null default 480,
  password_policy jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint organization_security_settings_timeout_check check (session_timeout_minutes between 15 and 43200),
  constraint organization_security_settings_password_policy_check check (jsonb_typeof(password_policy) = 'object'),
  constraint organization_security_settings_version_check check (version > 0)
);

create table if not exists public.organization_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  provider_key text not null,
  status text not null default 'disabled',
  config jsonb not null default '{}'::jsonb,
  secret_reference text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint organization_integrations_provider_check check (provider_key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint organization_integrations_status_check check (status in ('disabled','pending','active','error','archived')),
  constraint organization_integrations_config_check check (jsonb_typeof(config) = 'object'),
  constraint organization_integrations_org_provider_uq unique (organization_id, provider_key),
  constraint organization_integrations_version_check check (version > 0)
);
create index if not exists organization_integrations_org_status_idx on public.organization_integrations (organization_id, status);

create table if not exists public.admin_dashboard_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  request_id text,
  constraint admin_dashboard_events_type_check check (event_type ~ '^[a-z][a-z0-9_.-]*$'),
  constraint admin_dashboard_events_severity_check check (severity in ('info','warning','critical')),
  constraint admin_dashboard_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);
create index if not exists admin_dashboard_events_org_time_idx on public.admin_dashboard_events (organization_id, occurred_at desc);

create table if not exists public.organization_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint organization_usage_snapshots_period_check check (period_end >= period_start),
  constraint organization_usage_snapshots_metrics_check check (jsonb_typeof(metrics) = 'object'),
  constraint organization_usage_snapshots_org_period_uq unique (organization_id, period_start, period_end)
);
create index if not exists organization_usage_snapshots_org_period_idx on public.organization_usage_snapshots (organization_id, period_end desc);

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body jsonb not null,
  audience text not null default 'admins',
  status text not null default 'draft',
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  content_hash text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_announcements_title_check check (length(btrim(title)) between 1 and 200),
  constraint platform_announcements_body_check check (jsonb_typeof(body) = 'object'),
  constraint platform_announcements_audience_check check (audience in ('admins','organization_admins','platform_admins')),
  constraint platform_announcements_status_check check (status in ('draft','scheduled','published','archived')),
  constraint platform_announcements_dates_check check (expires_at is null or expires_at >= publish_at),
  constraint platform_announcements_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint platform_announcements_version_check check (version > 0)
);
create index if not exists platform_announcements_status_publish_idx on public.platform_announcements (status, publish_at desc);

create or replace view public.admin_organization_overview
with (security_invoker = true)
as
select
  o.id as organization_id,
  o.name,
  o.slug::text as slug,
  o.type,
  o.status,
  count(distinct om.id) filter (where om.status = 'active') as active_members,
  count(distinct oi.id) filter (where oi.status = 'pending') as pending_invitations,
  count(distinct od.id) filter (where od.verification_status = 'active') as verified_domains,
  max(ade.occurred_at) as last_admin_event_at
from public.organizations o
left join public.organization_members om on om.organization_id = o.id
left join public.organization_invitations oi on oi.organization_id = o.id
left join public.organization_domains od on od.organization_id = o.id
left join public.admin_dashboard_events ade on ade.organization_id = o.id
group by o.id;

create or replace view public.admin_dashboard_projection
with (security_invoker = true)
as
select
  o.id as organization_id,
  count(distinct om.id) filter (where om.status = 'active') as active_members,
  count(distinct oi.id) filter (where oi.status = 'pending') as pending_invitations,
  count(distinct od.id) filter (where od.verification_status = 'pending') as pending_domains,
  count(distinct ade.id) filter (where ade.severity = 'critical') as critical_events,
  max(ade.occurred_at) as last_event_at
from public.organizations o
left join public.organization_members om on om.organization_id = o.id
left join public.organization_invitations oi on oi.organization_id = o.id
left join public.organization_domains od on od.organization_id = o.id
left join public.admin_dashboard_events ade on ade.organization_id = o.id
group by o.id;

create or replace function private.can_administer_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'admin.workspace.manage')
    or private.has_permission(target_organization_id, 'organization.update')
    or private.has_permission(target_organization_id, 'organization.member.manage')
    or private.has_platform_permission('admin.workspace.manage')
$$;

create or replace function private.can_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$ select private.has_platform_permission('admin.workspace.manage') $$;

create or replace function private.reject_admin_evidence_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'admin evidence is append-only' using errcode = '55000';
end
$$;

drop trigger if exists admin_dashboard_events_reject_mutation on public.admin_dashboard_events;
create trigger admin_dashboard_events_reject_mutation before update or delete on public.admin_dashboard_events for each row execute function private.reject_admin_evidence_mutation();
drop trigger if exists organization_usage_snapshots_reject_mutation on public.organization_usage_snapshots;
create trigger organization_usage_snapshots_reject_mutation before update or delete on public.organization_usage_snapshots for each row execute function private.reject_admin_evidence_mutation();

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
  p_email_hash text,
  p_email_ciphertext text,
  p_token_hash text,
  p_initial_role_id uuid,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_invitation_id uuid;
begin
  if not private.can_administer_organization(p_organization_id) then raise exception 'invitation denied' using errcode = '42501'; end if;
  insert into public.organization_invitations (organization_id, email_hash, email_ciphertext, token_hash, initial_role_id, status, expires_at, invited_by, created_by, updated_by)
  values (p_organization_id, p_email_hash, p_email_ciphertext, p_token_hash, p_initial_role_id, 'pending', p_expires_at, auth.uid(), auth.uid(), auth.uid())
  returning id into v_invitation_id;
  return v_invitation_id;
end
$$;

create or replace function public.revoke_organization_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.organization_invitations
  set status = 'revoked', updated_at = now(), updated_by = auth.uid()
  where id = p_invitation_id and private.can_administer_organization(organization_id) and status = 'pending';
  return found;
end
$$;

create or replace function public.activate_domain(p_organization_id uuid, p_domain text, p_verification_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_domain_id uuid;
begin
  if not private.can_administer_organization(p_organization_id) then raise exception 'domain activation denied' using errcode = '42501'; end if;
  insert into public.organization_domains (organization_id, domain, verification_token_hash, verification_status, expires_at, created_by, updated_by)
  values (p_organization_id, p_domain::extensions.citext, p_verification_token_hash, 'pending', now() + interval '7 days', auth.uid(), auth.uid())
  returning id into v_domain_id;
  return v_domain_id;
end
$$;

create or replace function public.verify_domain(p_domain_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.organization_domains
  set verification_status = 'active', verified_at = now(), updated_at = now(), updated_by = auth.uid()
  where id = p_domain_id and private.can_administer_organization(organization_id);
  return found;
end
$$;

create or replace function public.update_branding(p_organization_id uuid, p_display_name text, p_theme jsonb, p_logo_object_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not private.can_administer_organization(p_organization_id) then raise exception 'branding denied' using errcode = '42501'; end if;
  insert into public.organization_branding (organization_id, display_name, theme, logo_object_id, updated_by)
  values (p_organization_id, p_display_name, coalesce(p_theme, '{}'::jsonb), p_logo_object_id, auth.uid())
  on conflict (organization_id) do update set display_name = excluded.display_name, theme = excluded.theme, logo_object_id = excluded.logo_object_id, version = public.organization_branding.version + 1, updated_at = now(), updated_by = auth.uid();
  return true;
end
$$;

create or replace function public.update_security_settings(p_organization_id uuid, p_mfa_required boolean, p_session_timeout_minutes integer, p_password_policy jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not private.can_administer_organization(p_organization_id) then raise exception 'security settings denied' using errcode = '42501'; end if;
  insert into public.organization_security_settings (organization_id, mfa_required, session_timeout_minutes, password_policy, updated_by)
  values (p_organization_id, p_mfa_required, p_session_timeout_minutes, coalesce(p_password_policy, '{}'::jsonb), auth.uid())
  on conflict (organization_id) do update set mfa_required = excluded.mfa_required, session_timeout_minutes = excluded.session_timeout_minutes, password_policy = excluded.password_policy, version = public.organization_security_settings.version + 1, updated_at = now(), updated_by = auth.uid();
  return true;
end
$$;

create or replace function public.record_admin_dashboard_event(p_organization_id uuid, p_event_type text, p_severity text, p_metadata jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_event_id uuid;
begin
  if not private.can_administer_organization(p_organization_id) then raise exception 'admin event denied' using errcode = '42501'; end if;
  insert into public.admin_dashboard_events (organization_id, actor_profile_id, event_type, severity, metadata)
  values (p_organization_id, auth.uid(), p_event_type, p_severity, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_event_id;
  return v_event_id;
end
$$;

create or replace function public.record_dashboard_event(p_organization_id uuid, p_event_type text, p_severity text, p_metadata jsonb default '{}'::jsonb)
returns uuid
language sql
security definer
set search_path = pg_catalog
as $$ select public.record_admin_dashboard_event(p_organization_id, p_event_type, p_severity, p_metadata) $$;

create or replace function public.publish_platform_announcement(p_title text, p_body jsonb, p_audience text default 'admins')
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_announcement_id uuid;
begin
  if not private.can_platform_admin() then raise exception 'platform announcement denied' using errcode = '42501'; end if;
  insert into public.platform_announcements (title, body, audience, status, published_by, content_hash)
  values (p_title, coalesce(p_body, '{}'::jsonb), p_audience, 'published', auth.uid(), encode(extensions.digest(p_title || coalesce(p_body, '{}'::jsonb)::text, 'sha256'), 'hex'))
  returning id into v_announcement_id;
  return v_announcement_id;
end
$$;

create or replace function public.archive_platform_announcement(p_announcement_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not private.can_platform_admin() then raise exception 'platform announcement denied' using errcode = '42501'; end if;
  update public.platform_announcements set status = 'archived', archived_at = now(), updated_at = now() where id = p_announcement_id;
  return found;
end
$$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values ('admin.workspace.manage', 'Manage organization administration workspace and platform admin operations', 'critical')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.organization_id is null
  and r.key in ('organization_admin','enterprise_admin','platform_admin','super_admin')
  and p.key = 'admin.workspace.manage'
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organization_domains','organization_branding','organization_audit_preferences',
    'organization_security_settings','organization_integrations','admin_dashboard_events',
    'organization_usage_snapshots','platform_announcements'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

drop policy if exists organization_settings_admin_select on public.organization_settings;
create policy organization_settings_admin_select on public.organization_settings for select to authenticated using (private.can_administer_organization(organization_id));
drop policy if exists organization_invitations_admin_select on public.organization_invitations;
create policy organization_invitations_admin_select on public.organization_invitations for select to authenticated using (private.can_administer_organization(organization_id));

create policy organization_domains_select_admin on public.organization_domains for select to authenticated using (private.can_administer_organization(organization_id));
create policy organization_branding_select_admin on public.organization_branding for select to authenticated using (private.can_administer_organization(organization_id));
create policy organization_audit_preferences_select_admin on public.organization_audit_preferences for select to authenticated using (private.can_administer_organization(organization_id));
create policy organization_security_settings_select_admin on public.organization_security_settings for select to authenticated using (private.can_administer_organization(organization_id));
create policy organization_integrations_select_admin on public.organization_integrations for select to authenticated using (private.can_administer_organization(organization_id));
create policy admin_dashboard_events_select_admin on public.admin_dashboard_events for select to authenticated using (organization_id is not null and private.can_administer_organization(organization_id));
create policy organization_usage_snapshots_select_admin on public.organization_usage_snapshots for select to authenticated using (private.can_administer_organization(organization_id));
create policy platform_announcements_select_admin on public.platform_announcements for select to authenticated using (status = 'published' or private.can_platform_admin());

grant select on public.organization_invitations to authenticated;
grant select on public.organization_domains, public.organization_branding,
  public.organization_audit_preferences, public.organization_security_settings,
  public.organization_integrations, public.admin_dashboard_events,
  public.organization_usage_snapshots, public.platform_announcements to authenticated;
grant select on public.admin_organization_overview, public.admin_dashboard_projection to authenticated;

revoke all on function private.can_administer_organization(uuid) from public;
revoke all on function private.can_platform_admin() from public;
revoke all on function private.reject_admin_evidence_mutation() from public;
revoke all on function public.create_organization_invitation(uuid, text, text, text, uuid, timestamptz) from public;
revoke all on function public.revoke_organization_invitation(uuid) from public;
revoke all on function public.activate_domain(uuid, text, text) from public;
revoke all on function public.verify_domain(uuid) from public;
revoke all on function public.update_branding(uuid, text, jsonb, uuid) from public;
revoke all on function public.update_security_settings(uuid, boolean, integer, jsonb) from public;
revoke all on function public.record_admin_dashboard_event(uuid, text, text, jsonb) from public;
revoke all on function public.record_dashboard_event(uuid, text, text, jsonb) from public;
revoke all on function public.publish_platform_announcement(text, jsonb, text) from public;
revoke all on function public.archive_platform_announcement(uuid) from public;

grant execute on function private.can_administer_organization(uuid) to authenticated;
grant execute on function private.can_platform_admin() to authenticated;
grant execute on function public.create_organization_invitation(uuid, text, text, text, uuid, timestamptz) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;
grant execute on function public.activate_domain(uuid, text, text) to authenticated;
grant execute on function public.verify_domain(uuid) to authenticated;
grant execute on function public.update_branding(uuid, text, jsonb, uuid) to authenticated;
grant execute on function public.update_security_settings(uuid, boolean, integer, jsonb) to authenticated;
grant execute on function public.record_admin_dashboard_event(uuid, text, text, jsonb) to authenticated;
grant execute on function public.record_dashboard_event(uuid, text, text, jsonb) to authenticated;
grant execute on function public.publish_platform_announcement(text, jsonb, text) to authenticated;
grant execute on function public.archive_platform_announcement(uuid) to authenticated;
