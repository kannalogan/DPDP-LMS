-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-007
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S2/S4/S9 certificate lifecycle; supabase/tests/006_certificate_engine_test.sql
-- SYRA-IMMUTABLE: published certificate templates and issued certificates reject update/delete; status changes append events
-- SYRA-SEED: deployment-reference
-- Anonymous access never touches public.certificates; exact-token verification resolves public.certificate_public_views only.

create table if not exists public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  track_id uuid references public.learning_tracks (id) on delete restrict,
  name text not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint certificate_templates_name_check check (length(btrim(name)) between 1 and 200),
  constraint certificate_templates_status_check check (status in ('draft','in_review','published','retired','archived')),
  constraint certificate_templates_version_check check (version > 0)
);
create unique index if not exists certificate_templates_tenant_name_uq on public.certificate_templates (organization_id, lower(name)) where organization_id is not null and archived_at is null;
create unique index if not exists certificate_templates_global_name_uq on public.certificate_templates (lower(name)) where organization_id is null and archived_at is null;
create index if not exists certificate_templates_status_idx on public.certificate_templates (organization_id, status);

create table if not exists public.certificate_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.certificate_templates (id) on delete restrict,
  version integer not null,
  layout jsonb not null default '{}'::jsonb,
  validity_days integer,
  signatory jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  published_at timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint certificate_template_versions_template_version_uq unique (template_id, version),
  constraint certificate_template_versions_version_check check (version > 0),
  constraint certificate_template_versions_layout_check check (jsonb_typeof(layout) = 'object'),
  constraint certificate_template_versions_signatory_check check (jsonb_typeof(signatory) = 'object'),
  constraint certificate_template_versions_validity_check check (validity_days is null or validity_days > 0),
  constraint certificate_template_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint certificate_template_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint certificate_template_versions_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);
create index if not exists certificate_template_versions_status_idx on public.certificate_template_versions (status, published_at desc);

create table if not exists public.certificate_eligibility_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid references public.profiles (id) on delete restrict,
  course_version_id uuid not null references public.course_versions (id) on delete restrict,
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  evaluation_id uuid references public.evaluations (id) on delete restrict,
  policy_version text not null,
  eligible boolean not null,
  decision_facts jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint certificate_eligibility_policy_version_check check (length(btrim(policy_version)) between 1 and 120),
  constraint certificate_eligibility_decision_facts_check check (jsonb_typeof(decision_facts) = 'object'),
  constraint certificate_eligibility_idempotency_key_check check (length(btrim(idempotency_key)) between 16 and 160),
  constraint certificate_eligibility_org_idempotency_uq unique (organization_id, idempotency_key)
);
create index if not exists certificate_eligibility_profile_course_idx on public.certificate_eligibility_records (profile_id, course_version_id, created_at desc);
create index if not exists certificate_eligibility_org_time_idx on public.certificate_eligibility_records (organization_id, created_at desc);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid references public.profiles (id) on delete restrict,
  course_version_id uuid not null references public.course_versions (id) on delete restrict,
  template_version_id uuid not null references public.certificate_template_versions (id) on delete restrict,
  eligibility_record_id uuid not null references public.certificate_eligibility_records (id) on delete restrict,
  certificate_number text not null,
  display_name_snapshot text not null,
  achievement_snapshot jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  artifact_object_id uuid references public.storage_objects (id) on delete restrict,
  public_token_hash text not null,
  current_status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint certificates_number_check check (certificate_number ~ '^[A-Z0-9][A-Z0-9._/-]{5,80}$'),
  constraint certificates_display_name_check check (length(btrim(display_name_snapshot)) between 1 and 200),
  constraint certificates_achievement_snapshot_check check (jsonb_typeof(achievement_snapshot) = 'object'),
  constraint certificates_date_check check (expires_at is null or expires_at > issued_at),
  constraint certificates_token_hash_check check (public_token_hash ~ '^[a-f0-9]{64}$'),
  constraint certificates_status_check check (current_status in ('pending','active','expired','revoked','superseded')),
  constraint certificates_public_token_uq unique (public_token_hash),
  constraint certificates_eligibility_uq unique (eligibility_record_id),
  constraint certificates_number_uq unique (organization_id, certificate_number)
);
create index if not exists certificates_profile_time_idx on public.certificates (profile_id, issued_at desc);
create index if not exists certificates_org_status_idx on public.certificates (organization_id, current_status, issued_at desc);

create table if not exists public.certificate_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  certificate_id uuid not null references public.certificates (id) on delete restrict,
  status text not null,
  reason_code text not null,
  reason text,
  evidence jsonb not null default '{}'::jsonb,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint certificate_status_events_status_check check (status in ('pending','active','expired','revoked','superseded')),
  constraint certificate_status_events_reason_code_check check (reason_code ~ '^[a-z0-9_.-]{2,80}$'),
  constraint certificate_status_events_evidence_check check (jsonb_typeof(evidence) = 'object')
);
create index if not exists certificate_status_events_certificate_time_idx on public.certificate_status_events (certificate_id, effective_at desc);
create index if not exists certificate_status_events_org_status_idx on public.certificate_status_events (organization_id, status, effective_at desc);

create table if not exists public.certificate_verification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  certificate_id uuid references public.certificates (id) on delete set null,
  outcome text not null,
  token_prefix_hash text,
  network_fingerprint_hash text,
  request_id text not null,
  country_code text,
  created_at timestamptz not null default now(),
  constraint certificate_verification_events_outcome_check check (outcome in ('valid','expired','revoked','not_found','download_recorded','rate_limited')),
  constraint certificate_verification_events_token_prefix_hash_check check (token_prefix_hash is null or token_prefix_hash ~ '^[a-f0-9]{64}$'),
  constraint certificate_verification_events_network_hash_check check (network_fingerprint_hash is null or network_fingerprint_hash ~ '^[a-f0-9]{64}$'),
  constraint certificate_verification_events_request_id_check check (length(btrim(request_id)) between 8 and 160),
  constraint certificate_verification_events_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint certificate_verification_events_request_uq unique (request_id)
);
create index if not exists certificate_verification_events_certificate_time_idx on public.certificate_verification_events (certificate_id, created_at desc);
create index if not exists certificate_verification_events_outcome_time_idx on public.certificate_verification_events (outcome, created_at desc);

create or replace view public.certificate_public_views
with (security_invoker = true)
as
select
  c.public_token_hash as verification_token,
  c.display_name_snapshot as holder_display_name,
  coalesce(c.achievement_snapshot ->> 'courseTitle', cv.title) as course_title,
  o.name as issuer_name,
  c.issued_at::date as issued_on,
  c.expires_at::date as expires_on,
  c.current_status as status,
  greatest(c.created_at, coalesce(max(cse.created_at), c.created_at)) as updated_at
from public.certificates c
join public.organizations o on o.id = c.organization_id
join public.course_versions cv on cv.id = c.course_version_id
left join public.certificate_status_events cse on cse.certificate_id = c.id
group by c.id, o.name, cv.title;

create or replace function private.can_manage_certificate_templates()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$ select private.has_platform_permission('certificate.template.manage') $$;

create or replace function private.can_issue_certificates(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'certificate.issue')
    or private.has_platform_permission('certificate.template.manage')
$$;

create or replace function private.can_read_certificate(target_certificate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.certificates c
    where c.id = target_certificate_id
      and (c.profile_id = auth.uid() or private.can_read_organization_learning(c.organization_id))
  )
$$;

create or replace function private.reject_published_certificate_template_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if old.status in ('published','superseded') then
    raise exception 'published certificate templates are immutable' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create or replace function private.reject_certificate_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'UPDATE'
    and new.current_status <> old.current_status
    and new.id = old.id
    and new.organization_id = old.organization_id
    and new.profile_id is not distinct from old.profile_id
    and new.course_version_id = old.course_version_id
    and new.template_version_id = old.template_version_id
    and new.eligibility_record_id = old.eligibility_record_id
    and new.certificate_number = old.certificate_number
    and new.display_name_snapshot = old.display_name_snapshot
    and new.achievement_snapshot = old.achievement_snapshot
    and new.issued_at = old.issued_at
    and new.expires_at is not distinct from old.expires_at
    and new.artifact_object_id is not distinct from old.artifact_object_id
    and new.public_token_hash = old.public_token_hash
    and new.created_at = old.created_at
    and new.created_by is not distinct from old.created_by then
    return new;
  end if;
  raise exception 'issued certificates are immutable; append status events instead' using errcode = '55000';
end
$$;

create or replace function private.reject_certificate_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'certificate lifecycle evidence is append-only' using errcode = '55000';
end
$$;

create or replace function private.record_certificate_event(
  p_certificate_id uuid,
  p_status text,
  p_reason_code text,
  p_reason text,
  p_evidence jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_certificate public.certificates%rowtype;
  v_event_id uuid;
begin
  select * into v_certificate from public.certificates where id = p_certificate_id for update;
  if not found then raise exception 'certificate not found' using errcode = '02000'; end if;
  if not private.can_issue_certificates(v_certificate.organization_id) then raise exception 'certificate status denied' using errcode = '42501'; end if;
  insert into public.certificate_status_events (organization_id, certificate_id, status, reason_code, reason, evidence, created_by)
  values (v_certificate.organization_id, p_certificate_id, p_status, p_reason_code, p_reason, coalesce(p_evidence, '{}'::jsonb), auth.uid())
  returning id into v_event_id;
  update public.certificates set current_status = p_status where id = p_certificate_id;
  return v_event_id;
end
$$;

create or replace function public.issue_certificate(
  p_eligibility_record_id uuid,
  p_template_version_id uuid,
  p_certificate_number text,
  p_public_token text,
  p_artifact_object_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_eligibility public.certificate_eligibility_records%rowtype;
  v_template public.certificate_template_versions%rowtype;
  v_profile_name text;
  v_course_title text;
  v_certificate_id uuid;
begin
  select * into v_eligibility from public.certificate_eligibility_records where id = p_eligibility_record_id;
  if not found or not v_eligibility.eligible then raise exception 'certificate eligibility denied' using errcode = '42501'; end if;
  if not private.can_issue_certificates(v_eligibility.organization_id) then raise exception 'certificate issue denied' using errcode = '42501'; end if;
  select * into v_template from public.certificate_template_versions where id = p_template_version_id and status = 'published';
  if not found then raise exception 'published certificate template required' using errcode = '22023'; end if;
  select coalesce(nullif(display_name, ''), email, id::text) into v_profile_name from public.profiles where id = v_eligibility.profile_id;
  select title into v_course_title from public.course_versions where id = v_eligibility.course_version_id;
  insert into public.certificates (
    organization_id, profile_id, course_version_id, template_version_id, eligibility_record_id,
    certificate_number, display_name_snapshot, achievement_snapshot, issued_at, expires_at,
    artifact_object_id, public_token_hash, current_status, created_by
  )
  values (
    v_eligibility.organization_id, v_eligibility.profile_id, v_eligibility.course_version_id,
    p_template_version_id, p_eligibility_record_id, p_certificate_number, v_profile_name,
    jsonb_build_object('courseTitle', v_course_title, 'policyVersion', v_eligibility.policy_version),
    now(), case when v_template.validity_days is null then null else now() + make_interval(days => v_template.validity_days) end,
    p_artifact_object_id, encode(extensions.digest(p_public_token, 'sha256'), 'hex'), 'active', auth.uid()
  )
  returning id into v_certificate_id;
  insert into public.certificate_status_events (organization_id, certificate_id, status, reason_code, reason, evidence, created_by)
  values (v_eligibility.organization_id, v_certificate_id, 'active', 'issued', 'Certificate issued', jsonb_build_object('eligibilityRecordId', p_eligibility_record_id), auth.uid());
  return v_certificate_id;
end
$$;

create or replace function public.verify_certificate(
  p_verification_code text,
  p_request_id text,
  p_network_fingerprint_hash text default null,
  p_country_code text default null
)
returns table (
  holder_display_name text,
  course_title text,
  issuer_name text,
  issued_on date,
  expires_on date,
  status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_token_hash text := encode(extensions.digest(p_verification_code, 'sha256'), 'hex');
  v_certificate_id uuid;
  v_outcome text := 'not_found';
begin
  select c.id, case
      when c.current_status = 'revoked' then 'revoked'
      when c.expires_at is not null and c.expires_at <= now() then 'expired'
      else c.current_status
    end
  into v_certificate_id, v_outcome
  from public.certificates c
  where c.public_token_hash = v_token_hash;

  insert into public.certificate_verification_events (organization_id, certificate_id, outcome, token_prefix_hash, network_fingerprint_hash, request_id, country_code)
  select c.organization_id, c.id, coalesce(v_outcome, 'not_found'), encode(extensions.digest(left(p_verification_code, 8), 'sha256'), 'hex'), p_network_fingerprint_hash, p_request_id, p_country_code
  from public.certificates c
  where c.id = v_certificate_id
  union all
  select null, null, 'not_found', encode(extensions.digest(left(p_verification_code, 8), 'sha256'), 'hex'), p_network_fingerprint_hash, p_request_id, p_country_code
  where v_certificate_id is null
  on conflict (request_id) do nothing;

  return query
  select cpv.holder_display_name, cpv.course_title, cpv.issuer_name, cpv.issued_on, cpv.expires_on,
    case when cpv.expires_on is not null and cpv.expires_on <= current_date and cpv.status = 'active' then 'expired' else cpv.status end,
    cpv.updated_at
  from public.certificate_public_views cpv
  where cpv.verification_token = v_token_hash
    and cpv.status <> 'pending';
end
$$;

create or replace function public.download_certificate(p_certificate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_certificate public.certificates%rowtype;
  v_storage public.storage_objects%rowtype;
begin
  select * into v_certificate from public.certificates where id = p_certificate_id;
  if not found or v_certificate.profile_id <> auth.uid() then raise exception 'certificate download denied' using errcode = '42501'; end if;
  if v_certificate.current_status = 'revoked' then raise exception 'revoked certificate cannot be downloaded' using errcode = '42501'; end if;
  select * into v_storage from public.storage_objects where id = v_certificate.artifact_object_id;
  perform public.record_certificate_download(p_certificate_id, 'download-' || extensions.gen_random_uuid()::text);
  return jsonb_build_object('bucket', v_storage.bucket, 'objectPath', v_storage.object_path, 'contentType', v_storage.content_type, 'bytes', v_storage.bytes, 'sha256', v_storage.sha256);
end
$$;

create or replace function public.record_certificate_download(p_certificate_id uuid, p_request_id text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_certificate public.certificates%rowtype;
  v_event_id uuid;
begin
  select * into v_certificate from public.certificates where id = p_certificate_id;
  if not found or v_certificate.profile_id <> auth.uid() then raise exception 'certificate download denied' using errcode = '42501'; end if;
  insert into public.certificate_verification_events (organization_id, certificate_id, outcome, request_id)
  values (v_certificate.organization_id, p_certificate_id, 'download_recorded', p_request_id)
  on conflict (request_id) do update set request_id = excluded.request_id
  returning id into v_event_id;
  return v_event_id;
end
$$;

create or replace function public.revoke_certificate(p_certificate_id uuid, p_reason_code text, p_reason text, p_evidence jsonb default '{}'::jsonb)
returns uuid
language sql
security definer
set search_path = pg_catalog
as $$ select private.record_certificate_event(p_certificate_id, 'revoked', p_reason_code, p_reason, p_evidence) $$;

create or replace function public.record_verification_event(p_certificate_id uuid, p_outcome text, p_request_id text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_certificate public.certificates%rowtype;
  v_event_id uuid;
begin
  select * into v_certificate from public.certificates where id = p_certificate_id;
  if not found or not private.can_read_certificate(p_certificate_id) then raise exception 'certificate event denied' using errcode = '42501'; end if;
  insert into public.certificate_verification_events (organization_id, certificate_id, outcome, request_id)
  values (v_certificate.organization_id, p_certificate_id, p_outcome, p_request_id)
  on conflict (request_id) do update set request_id = excluded.request_id
  returning id into v_event_id;
  return v_event_id;
end
$$;

drop trigger if exists certificate_template_versions_reject_published_mutation on public.certificate_template_versions;
create trigger certificate_template_versions_reject_published_mutation before update or delete on public.certificate_template_versions for each row execute function private.reject_published_certificate_template_mutation();
drop trigger if exists certificates_reject_mutation on public.certificates;
create trigger certificates_reject_mutation before update or delete on public.certificates for each row execute function private.reject_certificate_mutation();
drop trigger if exists certificate_status_events_reject_mutation on public.certificate_status_events;
create trigger certificate_status_events_reject_mutation before update or delete on public.certificate_status_events for each row execute function private.reject_certificate_event_mutation();
drop trigger if exists certificate_verification_events_reject_mutation on public.certificate_verification_events;
create trigger certificate_verification_events_reject_mutation before update or delete on public.certificate_verification_events for each row execute function private.reject_certificate_event_mutation();
drop trigger if exists certificate_eligibility_records_reject_mutation on public.certificate_eligibility_records;
create trigger certificate_eligibility_records_reject_mutation before update or delete on public.certificate_eligibility_records for each row execute function private.reject_certificate_event_mutation();

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values
  ('certificate.template.manage', 'Create and publish certificate templates', 'high'),
  ('certificate.issue', 'Issue and revoke organization certificates', 'critical')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.organization_id is null
  and (
    (r.key in ('platform_admin','super_admin') and p.key = 'certificate.template.manage')
    or (r.key in ('organization_admin','enterprise_admin','platform_admin','super_admin') and p.key = 'certificate.issue')
  )
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'certificate_templates','certificate_template_versions','certificate_eligibility_records',
    'certificates','certificate_status_events','certificate_verification_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

create policy certificate_templates_select on public.certificate_templates for select to authenticated using (private.can_manage_certificate_templates() or (organization_id is not null and private.can_read_organization_learning(organization_id)));
create policy certificate_templates_manage on public.certificate_templates for all to authenticated using (private.can_manage_certificate_templates()) with check (private.can_manage_certificate_templates());
create policy certificate_template_versions_select on public.certificate_template_versions for select to authenticated using (private.can_manage_certificate_templates() or exists (select 1 from public.certificate_templates ct where ct.id = template_id and ct.organization_id is not null and private.can_read_organization_learning(ct.organization_id)));
create policy certificate_template_versions_manage on public.certificate_template_versions for all to authenticated using (private.can_manage_certificate_templates()) with check (private.can_manage_certificate_templates());
create policy certificate_eligibility_records_select on public.certificate_eligibility_records for select to authenticated using (profile_id = auth.uid() or private.can_read_organization_learning(organization_id));
create policy certificate_eligibility_records_insert on public.certificate_eligibility_records for insert to authenticated with check (private.can_issue_certificates(organization_id));
create policy certificates_select on public.certificates for select to authenticated using (private.can_read_certificate(id));
create policy certificate_status_events_select on public.certificate_status_events for select to authenticated using (private.can_read_certificate(certificate_id));
create policy certificate_verification_events_select on public.certificate_verification_events for select to authenticated using (certificate_id is not null and private.can_read_certificate(certificate_id));

grant select on public.certificate_templates, public.certificate_template_versions,
  public.certificate_eligibility_records, public.certificates, public.certificate_status_events,
  public.certificate_verification_events to authenticated;
grant insert on public.certificate_eligibility_records to authenticated;
grant select on public.certificate_public_views to anon, authenticated;
revoke all on public.certificate_public_views from public;

revoke all on function private.can_manage_certificate_templates() from public;
revoke all on function private.can_issue_certificates(uuid) from public;
revoke all on function private.can_read_certificate(uuid) from public;
revoke all on function private.reject_published_certificate_template_mutation() from public;
revoke all on function private.reject_certificate_mutation() from public;
revoke all on function private.reject_certificate_event_mutation() from public;
revoke all on function private.record_certificate_event(uuid, text, text, text, jsonb) from public;
revoke all on function public.issue_certificate(uuid, uuid, text, text, uuid) from public;
revoke all on function public.verify_certificate(text, text, text, text) from public;
revoke all on function public.download_certificate(uuid) from public;
revoke all on function public.record_certificate_download(uuid, text) from public;
revoke all on function public.revoke_certificate(uuid, text, text, jsonb) from public;
revoke all on function public.record_verification_event(uuid, text, text) from public;

grant execute on function private.can_manage_certificate_templates() to authenticated;
grant execute on function private.can_issue_certificates(uuid) to authenticated;
grant execute on function private.can_read_certificate(uuid) to authenticated;
grant execute on function public.issue_certificate(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function public.verify_certificate(text, text, text, text) to anon, authenticated;
grant execute on function public.download_certificate(uuid) to authenticated;
grant execute on function public.record_certificate_download(uuid, text) to authenticated;
grant execute on function public.revoke_certificate(uuid, text, text, jsonb) to authenticated;
grant execute on function public.record_verification_event(uuid, text, text) to authenticated;
