-- SYRA-CONTRACT: docs/23-master-table-catalog.md identity foundation; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-003
-- SYRA-CHANGE: additive
-- SYRA-PII: P4
-- SYRA-RLS: S1-S8 identity and authorization policies; docs/28-database-security-matrix.md
-- SYRA-IMMUTABLE: user_sessions; trigger rejects UPDATE and DELETE
-- SYRA-SEED: deployment-reference

create table if not exists public.user_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'system',
  accessibility jsonb not null default '{}'::jsonb,
  learning jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint user_settings_theme_check check (theme in ('system', 'light', 'dark')),
  constraint user_settings_version_check check (version > 0)
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  auth_session_id_hash text not null,
  assurance text not null default 'aal1',
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  ip_hash text,
  user_agent_hash text,
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  constraint user_sessions_auth_session_id_hash_key unique (auth_session_id_hash),
  constraint user_sessions_assurance_check check (assurance in ('aal1', 'aal2', 'aal3')),
  constraint user_sessions_dates_check check (ended_at is null or ended_at >= started_at)
);

create index if not exists user_sessions_profile_last_seen_idx on public.user_sessions (profile_id, last_seen_at desc);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  device_key_hash text not null,
  display_name text,
  trust_status text not null default 'unknown',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint devices_profile_id_device_key_hash_key unique (profile_id, device_key_hash),
  constraint devices_trust_status_check check (trust_status in ('unknown', 'trusted', 'challenged', 'blocked')),
  constraint devices_version_check check (version > 0)
);

create index if not exists devices_organization_trust_idx on public.devices (organization_id, trust_status);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  email_hash text not null,
  email_ciphertext text not null,
  token_hash text not null,
  initial_role_id uuid references public.roles (id) on delete restrict,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint organization_invitations_token_hash_key unique (token_hash),
  constraint organization_invitations_status_check check (status in ('pending', 'accepted', 'expired', 'revoked')),
  constraint organization_invitations_expiry_check check (expires_at > created_at),
  constraint organization_invitations_version_check check (version > 0)
);

create index if not exists organization_invitations_org_expiry_idx on public.organization_invitations (organization_id, expires_at);
create index if not exists organization_invitations_email_hash_idx on public.organization_invitations (email_hash);

create table if not exists public.organization_settings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null,
  value jsonb not null,
  classification text not null,
  version integer not null default 1,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_settings_pkey primary key (organization_id, key),
  constraint organization_settings_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint organization_settings_version_check check (version > 0)
);

create or replace function private.current_profile_id()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog
as $$ select auth.uid() $$;

create or replace function private.is_active_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.ended_at is null
  )
$$;

create or replace function private.has_permission(
  target_organization_id uuid,
  required_permission text,
  required_scope_type text default 'organization',
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.member_role_assignments a on a.organization_member_id = m.id
    join public.roles r on r.id = a.role_id and r.archived_at is null
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id and p.deprecated_at is null
    where m.organization_id = target_organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.ended_at is null
      and p.key = required_permission
      and a.organization_id = target_organization_id
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and (a.scope_type = 'organization' or a.scope_type = required_scope_type)
      and (a.scope_id is null or a.scope_id = required_scope_id)
  )
$$;

create or replace function private.bootstrap_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.profiles (id, display_name, locale, timezone, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'User'), '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en'),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC'),
    case when new.email_confirmed_at is null then 'pending' else 'active' end
  ) on conflict (id) do nothing;

  insert into public.user_settings (profile_id) values (new.id) on conflict (profile_id) do nothing;
  return new;
end
$$;

create or replace function private.ensure_active_membership(target_organization_id uuid, target_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare member_id uuid; has_legacy_user_id boolean;
begin
  select exists (
    select 1 from pg_attribute
    where attrelid = 'public.organization_members'::regclass
      and attname = 'user_id' and not attisdropped
  ) into has_legacy_user_id;

  select id into member_id from public.organization_members
  where organization_id = target_organization_id and profile_id = target_profile_id
  for update;

  if member_id is null then
    if has_legacy_user_id then
      execute 'insert into public.organization_members (organization_id, profile_id, user_id, status, joined_at, created_by, updated_by) values ($1,$2,$2,''active'',now(),$2,$2) returning id'
      into member_id using target_organization_id, target_profile_id;
    else
      insert into public.organization_members (organization_id, profile_id, status, joined_at, created_by, updated_by)
      values (target_organization_id, target_profile_id, 'active', now(), target_profile_id, target_profile_id)
      returning id into member_id;
    end if;
  else
    update public.organization_members set status = 'active', joined_at = coalesce(joined_at, now()), ended_at = null, updated_at = now(), updated_by = target_profile_id
    where id = member_id;
  end if;
  return member_id;
end
$$;

drop trigger if exists syra_auth_user_bootstrap on auth.users;
create trigger syra_auth_user_bootstrap
after insert on auth.users
for each row execute function private.bootstrap_profile();

create or replace function private.create_organization(
  organization_name text,
  organization_slug text,
  organization_country_code text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_organization_id uuid;
  new_member_id uuid;
  admin_role_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;

  insert into public.organizations (name, slug, country_code, type, status, created_by, updated_by)
  values (trim(organization_name), trim(organization_slug)::extensions.citext, upper(organization_country_code), 'standard', 'active', auth.uid(), auth.uid())
  returning id into new_organization_id;

  new_member_id := private.ensure_active_membership(new_organization_id, auth.uid());

  select id into strict admin_role_id from public.roles where organization_id is null and key = 'organization_admin';
  insert into public.member_role_assignments (organization_id, organization_member_id, role_id, scope_type, starts_at, granted_by, reason, created_by, updated_by)
  values (new_organization_id, new_member_id, admin_role_id, 'organization', now(), auth.uid(), 'organization creator', auth.uid(), auth.uid());

  perform public.syra_record_identity_audit(new_organization_id, 'organization.created', 'organization', new_organization_id, gen_random_uuid()::text, '{}'::jsonb);

  return new_organization_id;
end
$$;

create or replace function private.accept_organization_invitation(invitation_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  invitation public.organization_invitations%rowtype;
  member_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;

  select * into strict invitation from public.organization_invitations
  where token_hash = invitation_token_hash and status = 'pending' and expires_at > now()
  for update;

  if invitation.email_hash <> encode(extensions.digest(lower((select email from auth.users where id = auth.uid())), 'sha256'), 'hex') then
    raise exception 'invitation identity mismatch' using errcode = '42501';
  end if;

  member_id := private.ensure_active_membership(invitation.organization_id, auth.uid());

  if invitation.initial_role_id is not null then
    insert into public.member_role_assignments (organization_id, organization_member_id, role_id, scope_type, starts_at, granted_by, reason, created_by, updated_by)
    values (invitation.organization_id, member_id, invitation.initial_role_id, 'organization', now(), invitation.invited_by, 'accepted invitation', invitation.invited_by, invitation.invited_by)
    on conflict do nothing;
  end if;

  update public.organization_invitations set status = 'accepted', accepted_at = now(), updated_at = now(), updated_by = auth.uid()
  where id = invitation.id;
  perform public.syra_record_identity_audit(invitation.organization_id, 'organization.invitation_accepted', 'organization_invitation', invitation.id, gen_random_uuid()::text, '{}'::jsonb);
  return invitation.organization_id;
end
$$;

create or replace function public.syra_authorize(
  organization_id uuid,
  permission_key text,
  scope_type text default 'organization',
  scope_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$ select private.has_permission(organization_id, permission_key, scope_type, scope_id) $$;

create or replace function public.syra_create_organization(name text, slug text, country_code text)
returns uuid
language sql
security invoker
set search_path = pg_catalog
as $$ select private.create_organization(name, slug, country_code) $$;

create or replace function public.syra_accept_invitation(token_hash text)
returns uuid
language sql
security invoker
set search_path = pg_catalog
as $$ select private.accept_organization_invitation(token_hash) $$;

create or replace function public.syra_record_identity_audit(
  organization_id uuid,
  action text,
  resource_type text,
  resource_id uuid,
  correlation_id text,
  metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare event_id uuid; event_time timestamptz := now();
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if action !~ '^(identity|profile|organization|authorization|session)\.[a-z0-9_.]+$' then raise exception 'invalid identity audit action'; end if;
  if organization_id is not null and not private.is_active_org_member(organization_id) then raise exception 'organization access denied' using errcode = '42501'; end if;

  insert into public.audit_events (
    organization_id, actor_profile_id, actor_type, actor_id, action, resource_type,
    resource_id, outcome, correlation_id, metadata, event_hash
  ) values (
    organization_id, auth.uid(), 'profile', auth.uid(), action, resource_type,
    resource_id, 'succeeded', correlation_id, metadata,
    encode(extensions.digest(concat_ws(':', auth.uid()::text, action, resource_type, coalesce(resource_id::text, ''), correlation_id, event_time::text), 'sha256'), 'hex')
  ) returning id into event_id;
  return event_id;
end
$$;

create or replace function public.syra_record_session(
  organization_id uuid,
  session_id_hash text,
  assurance text,
  ip_hash text,
  user_agent_hash text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare session_record_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if organization_id is not null and not private.is_active_org_member(organization_id) then raise exception 'organization access denied' using errcode = '42501'; end if;
  insert into public.user_sessions (organization_id, profile_id, auth_session_id_hash, assurance, ip_hash, user_agent_hash, actor_profile_id)
  values (organization_id, auth.uid(), session_id_hash, assurance, ip_hash, user_agent_hash, auth.uid())
  on conflict (auth_session_id_hash) do nothing
  returning id into session_record_id;
  return session_record_id;
end
$$;

create or replace function public.syra_mark_profile_verified()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if auth.uid() is null or not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    return false;
  end if;
  update public.profiles set status = 'active', updated_at = now(), updated_by = auth.uid()
  where id = auth.uid() and status = 'pending';
  return true;
end
$$;

revoke all on function private.current_profile_id() from public;
revoke all on function private.is_active_org_member(uuid) from public;
revoke all on function private.has_permission(uuid, text, text, uuid) from public;
revoke all on function private.bootstrap_profile() from public;
revoke all on function private.ensure_active_membership(uuid, uuid) from public;
revoke all on function private.create_organization(text, text, text) from public;
revoke all on function private.accept_organization_invitation(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_org_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text, text, uuid) to authenticated;
grant execute on function private.create_organization(text, text, text) to authenticated;
grant execute on function private.accept_organization_invitation(text) to authenticated;
revoke all on function public.syra_authorize(uuid, text, text, uuid) from public;
revoke all on function public.syra_create_organization(text, text, text) from public;
revoke all on function public.syra_accept_invitation(text) from public;
revoke all on function public.syra_record_identity_audit(uuid, text, text, uuid, text, jsonb) from public;
revoke all on function public.syra_record_session(uuid, text, text, text, text) from public;
revoke all on function public.syra_mark_profile_verified() from public;
grant execute on function public.syra_authorize(uuid, text, text, uuid) to authenticated;
grant execute on function public.syra_create_organization(text, text, text) to authenticated;
grant execute on function public.syra_accept_invitation(text) to authenticated;
grant execute on function public.syra_record_identity_audit(uuid, text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.syra_record_session(uuid, text, text, text, text) to authenticated;
grant execute on function public.syra_mark_profile_verified() to authenticated;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values
  ('profile.read_self', 'Read own profile', 'low'),
  ('profile.update_self', 'Update own profile', 'medium'),
  ('organization.read', 'Read active organization', 'low'),
  ('organization.update', 'Update organization settings', 'high'),
  ('organization.invite', 'Create and revoke invitations', 'high'),
  ('organization.member.read', 'Read organization members', 'medium'),
  ('organization.member.manage', 'Manage organization members', 'high'),
  ('authorization.role.read', 'Read roles and permissions', 'medium'),
  ('authorization.role.manage', 'Manage tenant roles', 'critical'),
  ('authorization.assignment.manage', 'Manage scoped assignments', 'critical'),
  ('platform.access', 'Access platform operations', 'critical')
on conflict (key) do nothing;

insert into public.roles (organization_id, key, name, scope_type, is_system)
values
  (null, 'student', 'Student', 'organization', true),
  (null, 'mentor', 'Mentor', 'organization', true),
  (null, 'instructor', 'Instructor', 'organization', true),
  (null, 'organization_admin', 'Organization Admin', 'organization', true),
  (null, 'enterprise_admin', 'Enterprise Admin', 'enterprise', true),
  (null, 'platform_admin', 'Platform Admin', 'platform', true),
  (null, 'super_admin', 'Super Admin', 'platform', true),
  (null, 'hiring_partner', 'Hiring Partner', 'organization', true),
  (null, 'tpo', 'Training and Placement Officer', 'organization', true)
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and (
    (r.key in ('student', 'mentor', 'instructor', 'hiring_partner', 'tpo') and p.key in ('profile.read_self', 'profile.update_self', 'organization.read', 'authorization.role.read'))
    or (r.key = 'organization_admin' and p.key <> 'platform.access')
    or (r.key = 'enterprise_admin' and p.key <> 'platform.access')
    or (r.key in ('platform_admin', 'super_admin'))
  )
on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- SYRA-REFERENCE-DATA-END

alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;
alter table public.user_sessions enable row level security;
alter table public.user_sessions force row level security;
alter table public.devices enable row level security;
alter table public.devices force row level security;
alter table public.organization_invitations enable row level security;
alter table public.organization_invitations force row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_settings force row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy user_settings_self on public.user_settings for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy organizations_member_select on public.organizations for select to authenticated using (private.is_active_org_member(id));
create policy organization_members_self_select on public.organization_members for select to authenticated using (profile_id = auth.uid() or private.has_permission(organization_id, 'organization.member.read'));
create policy roles_member_select on public.roles for select to authenticated using (organization_id is null or private.is_active_org_member(organization_id));
create policy permissions_authenticated_select on public.permissions for select to authenticated using (true);
create policy role_permissions_member_select on public.role_permissions for select to authenticated using (exists (select 1 from public.roles r where r.id = role_id and (r.organization_id is null or private.is_active_org_member(r.organization_id))));
create policy assignments_self_select on public.member_role_assignments for select to authenticated using (exists (select 1 from public.organization_members m where m.id = organization_member_id and m.profile_id = auth.uid()));
create policy devices_self on public.devices for all to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id)) with check (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy invitations_accept_lookup on public.organization_invitations for select to authenticated using (false);
create policy organization_settings_member_select on public.organization_settings for select to authenticated using (private.is_active_org_member(organization_id));
create policy storage_objects_avatar_self on public.storage_objects for all to authenticated
using (owner_profile_id = auth.uid() and bucket = 'avatars' and private.is_active_org_member(organization_id))
with check (owner_profile_id = auth.uid() and bucket = 'avatars' and private.is_active_org_member(organization_id));
create policy avatars_owner_select on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[3] = auth.uid()::text);
create policy avatars_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[3] = auth.uid()::text);
create policy avatars_owner_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[3] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[3] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[3] = auth.uid()::text);

grant select on public.profiles to authenticated;
grant update (display_name, locale, timezone, avatar_object_id, updated_at, version) on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select on public.organizations, public.organization_members, public.roles, public.permissions, public.role_permissions, public.member_role_assignments to authenticated;
grant select, insert, update, delete on public.devices to authenticated;
grant select on public.organization_settings to authenticated;
grant select, insert, update on public.storage_objects to authenticated;

create trigger user_sessions_reject_mutation
before update or delete on public.user_sessions
for each row execute function private.reject_immutable_mutation();

comment on table public.user_sessions is 'Security observation ledger; Supabase Auth remains session authority';
