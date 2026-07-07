-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-008
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S3/S4/S5 mentor assigned-cohort access; supabase/tests/007_mentor_workspace_test.sql
-- SYRA-IMMUTABLE: mentor dashboard events and assignment evidence append lifecycle rows; notes/interventions retain history
-- SYRA-SEED: deployment-reference
-- Learner-facing clients cannot select mentor data; mentor access is active assignment scoped.

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  course_id uuid references public.courses (id) on delete restrict,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint cohorts_name_check check (length(btrim(name)) between 1 and 200),
  constraint cohorts_status_check check (status in ('draft','active','paused','completed','archived')),
  constraint cohorts_dates_check check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint cohorts_version_check check (version > 0)
);
create index if not exists cohorts_org_status_idx on public.cohorts (organization_id, status) where archived_at is null;
create index if not exists cohorts_course_idx on public.cohorts (course_id);

create table if not exists public.cohort_members (
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  organization_member_id uuid not null references public.organization_members (id) on delete restrict,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  primary key (cohort_id, organization_member_id),
  constraint cohort_members_dates_check check (left_at is null or left_at >= joined_at)
);
create index if not exists cohort_members_member_idx on public.cohort_members (organization_member_id, left_at);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enrollments_cohort_id_fkey' and conrelid = 'public.enrollments'::regclass) then
    alter table public.enrollments add constraint enrollments_cohort_id_fkey foreign key (cohort_id) references public.cohorts (id) on delete restrict not valid;
  end if;
end
$$;

create table if not exists public.mentor_profiles (
  organization_member_id uuid primary key references public.organization_members (id) on delete restrict,
  status text not null default 'active',
  expertise_tags text[] not null default '{}',
  capacity integer,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  bio text,
  updated_at timestamptz not null default now(),
  constraint mentor_profiles_status_check check (status in ('pending','active','suspended','inactive')),
  constraint mentor_profiles_capacity_check check (capacity is null or capacity >= 0)
);
create index if not exists mentor_profiles_tags_idx on public.mentor_profiles using gin (expertise_tags);

create table if not exists public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  mentor_member_id uuid not null references public.organization_members (id) on delete restrict,
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  assigned_by uuid references public.profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentor_assignments_dates_check check (ends_at is null or ends_at >= starts_at)
);
create unique index if not exists mentor_assignments_active_uq on public.mentor_assignments (mentor_member_id, cohort_id) where ends_at is null;
create index if not exists mentor_assignments_mentor_date_idx on public.mentor_assignments (mentor_member_id, starts_at desc);
create index if not exists mentor_assignments_cohort_date_idx on public.mentor_assignments (cohort_id, starts_at desc);

create table if not exists public.mentor_interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  mentor_assignment_id uuid not null references public.mentor_assignments (id) on delete restrict,
  learner_profile_id uuid not null references public.profiles (id) on delete restrict,
  type text not null,
  reason text not null,
  notes_ciphertext text,
  visibility text not null default 'mentor_only',
  occurred_at timestamptz not null default now(),
  follow_up_at timestamptz,
  outcome text,
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint mentor_interventions_type_check check (type in ('note','nudge','support','risk_review','assessment_review','certificate_followup','other')),
  constraint mentor_interventions_reason_check check (length(btrim(reason)) between 2 and 500),
  constraint mentor_interventions_visibility_check check (visibility in ('mentor_only','learner_visible','organization')),
  constraint mentor_interventions_followup_check check (follow_up_at is null or follow_up_at >= occurred_at),
  constraint mentor_interventions_completed_check check (completed_at is null or completed_at >= occurred_at)
);
create index if not exists mentor_interventions_learner_time_idx on public.mentor_interventions (learner_profile_id, occurred_at desc);
create index if not exists mentor_interventions_followup_idx on public.mentor_interventions (organization_id, follow_up_at) where completed_at is null and follow_up_at is not null;
create index if not exists mentor_interventions_assignment_idx on public.mentor_interventions (mentor_assignment_id, occurred_at desc);

create table if not exists public.learner_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  mentor_assignment_id uuid not null references public.mentor_assignments (id) on delete restrict,
  learner_profile_id uuid not null references public.profiles (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'open',
  summary_ciphertext text,
  shared_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint learner_reviews_period_check check (period_end >= period_start),
  constraint learner_reviews_status_check check (status in ('open','assigned','in_review','resolved','dismissed','appealed','closed')),
  constraint learner_reviews_shared_check check (shared_at is null or shared_at >= created_at)
);
create unique index if not exists learner_reviews_period_uq on public.learner_reviews (learner_profile_id, period_start, period_end, mentor_assignment_id);
create index if not exists learner_reviews_assignment_status_idx on public.learner_reviews (mentor_assignment_id, status);

create table if not exists public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  learner_profile_id uuid not null references public.profiles (id) on delete restrict,
  enrollment_id uuid references public.enrollments (id) on delete set null,
  rule_key text not null,
  rule_version text not null,
  severity text not null,
  factors jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  constraint risk_signals_rule_key_check check (rule_key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint risk_signals_rule_version_check check (length(btrim(rule_version)) between 1 and 80),
  constraint risk_signals_severity_check check (severity in ('low','medium','high','critical')),
  constraint risk_signals_factors_check check (jsonb_typeof(factors) = 'object'),
  constraint risk_signals_resolved_check check (resolved_at is null or resolved_at >= detected_at)
);
create index if not exists risk_signals_org_severity_idx on public.risk_signals (organization_id, severity, resolved_at);
create index if not exists risk_signals_learner_time_idx on public.risk_signals (learner_profile_id, detected_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  type text not null,
  purpose text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  expires_at timestamptz,
  constraint notifications_type_check check (type in ('transactional','learning','assessment','mentor','compliance','billing','security','career','announcement')),
  constraint notifications_purpose_check check (purpose ~ '^[a-z][a-z0-9_.-]*$'),
  constraint notifications_data_check check (jsonb_typeof(data) = 'object'),
  constraint notifications_status_check check (status in ('unread','read','archived')),
  constraint notifications_dates_check check (expires_at is null or expires_at >= created_at)
);
create index if not exists notifications_profile_status_idx on public.notifications (profile_id, status, created_at desc);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  course_version_id uuid references public.course_versions (id) on delete restrict,
  cohort_id uuid references public.cohorts (id) on delete restrict,
  title text not null,
  body jsonb not null,
  audience text not null,
  status text not null default 'draft',
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_parent_check check ((course_version_id is not null)::integer + (cohort_id is not null)::integer >= 1),
  constraint announcements_title_check check (length(btrim(title)) between 1 and 200),
  constraint announcements_body_check check (jsonb_typeof(body) = 'object'),
  constraint announcements_audience_check check (audience in ('cohort','course','organization')),
  constraint announcements_status_check check (status in ('draft','scheduled','published','expired','archived')),
  constraint announcements_dates_check check (expires_at is null or expires_at >= publish_at),
  constraint announcements_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);
create index if not exists announcements_org_publish_idx on public.announcements (organization_id, status, publish_at desc);
create index if not exists announcements_cohort_idx on public.announcements (cohort_id, status);

create table if not exists public.announcement_acknowledgements (
  announcement_id uuid not null references public.announcements (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);
create index if not exists announcement_acknowledgements_profile_idx on public.announcement_acknowledgements (profile_id, acknowledged_at desc);

create or replace view public.mentor_dashboard_projections
with (security_invoker = true)
as
select
  ma.id as mentor_assignment_id,
  ma.organization_id,
  ma.mentor_member_id,
  ma.cohort_id,
  c.name as cohort_name,
  count(distinct cm.organization_member_id) filter (where cm.left_at is null) as assigned_learners,
  count(distinct rs.id) filter (where rs.resolved_at is null and rs.severity in ('high','critical')) as learners_needing_attention,
  count(distinct lr.id) filter (where lr.status in ('open','assigned','in_review')) as pending_reviews,
  count(distinct mi.id) filter (where mi.completed_at is null and mi.follow_up_at is not null) as open_tasks,
  max(greatest(coalesce(mi.occurred_at, ma.starts_at), coalesce(rs.detected_at, ma.starts_at), coalesce(lr.updated_at, ma.starts_at))) as last_activity_at
from public.mentor_assignments ma
join public.cohorts c on c.id = ma.cohort_id
left join public.cohort_members cm on cm.cohort_id = ma.cohort_id
left join public.organization_members learner_member on learner_member.id = cm.organization_member_id
left join public.risk_signals rs on rs.organization_id = ma.organization_id and rs.learner_profile_id = learner_member.profile_id
left join public.learner_reviews lr on lr.mentor_assignment_id = ma.id
left join public.mentor_interventions mi on mi.mentor_assignment_id = ma.id
where ma.ends_at is null
group by ma.id, ma.organization_id, ma.mentor_member_id, ma.cohort_id, c.name;

create or replace view public.mentor_learner_activity_summaries
with (security_invoker = true)
as
select
  ma.id as mentor_assignment_id,
  ma.organization_id,
  ma.cohort_id,
  om.profile_id as learner_profile_id,
  p.display_name as learner_display_name,
  count(distinct e.id) as enrollment_count,
  count(distinct e.id) filter (where e.status = 'completed') as completed_enrollments,
  count(distinct aa.id) as upcoming_assessments,
  count(distinct cert.id) as certificate_count,
  count(distinct rs.id) filter (where rs.resolved_at is null) as active_risk_count,
  max(greatest(coalesce(e.completed_at, e.enrolled_at), coalesce(rs.detected_at, e.enrolled_at), coalesce(cert.issued_at, e.enrolled_at))) as last_activity_at
from public.mentor_assignments ma
join public.cohort_members cm on cm.cohort_id = ma.cohort_id and cm.left_at is null
join public.organization_members om on om.id = cm.organization_member_id
join public.profiles p on p.id = om.profile_id
left join public.enrollments e on e.organization_id = ma.organization_id and e.profile_id = om.profile_id
left join public.assessment_assignments aa on aa.enrollment_id = e.id and aa.status = 'published'
left join public.certificates cert on cert.organization_id = ma.organization_id and cert.profile_id = om.profile_id
left join public.risk_signals rs on rs.organization_id = ma.organization_id and rs.learner_profile_id = om.profile_id
where ma.ends_at is null
group by ma.id, ma.organization_id, ma.cohort_id, om.profile_id, p.display_name;

create or replace view public.mentor_task_queue
with (security_invoker = true)
as
select
  mi.id,
  mi.organization_id,
  mi.mentor_assignment_id,
  mi.learner_profile_id,
  mi.type,
  mi.reason,
  mi.follow_up_at,
  mi.completed_at,
  'intervention_followup'::text as task_type
from public.mentor_interventions mi
where mi.completed_at is null and mi.follow_up_at is not null;

create or replace view public.mentor_review_queue
with (security_invoker = true)
as
select
  lr.id,
  lr.organization_id,
  lr.mentor_assignment_id,
  lr.learner_profile_id,
  lr.period_start,
  lr.period_end,
  lr.status,
  lr.updated_at
from public.learner_reviews lr
where lr.status in ('open','assigned','in_review');

create or replace function private.current_org_member_id(target_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select m.id
  from public.organization_members m
  where m.organization_id = target_organization_id
    and m.profile_id = auth.uid()
    and m.status = 'active'
  limit 1
$$;

create or replace function private.can_manage_mentor_workspace(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'mentor.workspace.manage')
    or private.has_platform_permission('mentor.workspace.manage')
$$;

create or replace function private.current_mentor_member_id(target_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select mp.organization_member_id
  from public.mentor_profiles mp
  join public.organization_members m on m.id = mp.organization_member_id
  where m.organization_id = target_organization_id
    and m.profile_id = auth.uid()
    and m.status = 'active'
    and mp.status = 'active'
  limit 1
$$;

create or replace function private.can_access_mentor_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.mentor_assignments ma
    where ma.id = target_assignment_id
      and ma.ends_at is null
      and (
        ma.mentor_member_id = private.current_mentor_member_id(ma.organization_id)
        or private.can_manage_mentor_workspace(ma.organization_id)
      )
  )
$$;

create or replace function private.can_access_cohort(target_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.cohorts c
    where c.id = target_cohort_id
      and (
        private.can_manage_mentor_workspace(c.organization_id)
        or exists (
          select 1 from public.mentor_assignments ma
          where ma.cohort_id = target_cohort_id
            and ma.ends_at is null
            and ma.mentor_member_id = private.current_mentor_member_id(ma.organization_id)
        )
      )
  )
$$;

create or replace function private.can_access_assigned_learner(target_organization_id uuid, target_learner_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.can_manage_mentor_workspace(target_organization_id)
    or exists (
      select 1
      from public.mentor_assignments ma
      join public.cohort_members cm on cm.cohort_id = ma.cohort_id and cm.left_at is null
      join public.organization_members learner_member on learner_member.id = cm.organization_member_id
      where ma.organization_id = target_organization_id
        and ma.ends_at is null
        and ma.mentor_member_id = private.current_mentor_member_id(target_organization_id)
        and learner_member.profile_id = target_learner_profile_id
    )
$$;

create or replace function private.validate_mentor_assignment_scope()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_mentor_org uuid;
  v_cohort_org uuid;
begin
  select organization_id into v_mentor_org from public.organization_members where id = new.mentor_member_id;
  select organization_id into v_cohort_org from public.cohorts where id = new.cohort_id;
  if v_mentor_org is null or v_cohort_org is null or v_mentor_org <> v_cohort_org or new.organization_id <> v_cohort_org then
    raise exception 'mentor assignment organization mismatch' using errcode = '23514';
  end if;
  return new;
end
$$;

drop trigger if exists mentor_assignments_validate_scope on public.mentor_assignments;
create trigger mentor_assignments_validate_scope before insert or update on public.mentor_assignments for each row execute function private.validate_mentor_assignment_scope();

create or replace function public.assign_cohort(p_organization_id uuid, p_name text, p_course_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_cohort_id uuid;
begin
  if not private.can_manage_mentor_workspace(p_organization_id) then raise exception 'cohort manage denied' using errcode = '42501'; end if;
  insert into public.cohorts (organization_id, name, course_id, status, created_by, updated_by)
  values (p_organization_id, p_name, p_course_id, 'active', auth.uid(), auth.uid())
  returning id into v_cohort_id;
  return v_cohort_id;
end
$$;

create or replace function public.assign_mentor(p_organization_id uuid, p_mentor_member_id uuid, p_cohort_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_assignment_id uuid;
begin
  if not private.can_manage_mentor_workspace(p_organization_id) then raise exception 'mentor assign denied' using errcode = '42501'; end if;
  insert into public.mentor_profiles (organization_member_id, status, verified_at, verified_by)
  values (p_mentor_member_id, 'active', now(), auth.uid())
  on conflict (organization_member_id) do update set status = 'active', verified_at = coalesce(public.mentor_profiles.verified_at, excluded.verified_at), verified_by = coalesce(public.mentor_profiles.verified_by, excluded.verified_by), updated_at = now();
  insert into public.mentor_assignments (organization_id, mentor_member_id, cohort_id, assigned_by, reason)
  values (p_organization_id, p_mentor_member_id, p_cohort_id, auth.uid(), p_reason)
  returning id into v_assignment_id;
  return v_assignment_id;
end
$$;

create or replace function public.record_mentor_note(p_mentor_assignment_id uuid, p_learner_profile_id uuid, p_reason text, p_notes_ciphertext text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_assignment public.mentor_assignments%rowtype; v_note_id uuid;
begin
  select * into v_assignment from public.mentor_assignments where id = p_mentor_assignment_id;
  if not found or not private.can_access_mentor_assignment(p_mentor_assignment_id) or not private.can_access_assigned_learner(v_assignment.organization_id, p_learner_profile_id) then
    raise exception 'mentor note denied' using errcode = '42501';
  end if;
  insert into public.mentor_interventions (organization_id, mentor_assignment_id, learner_profile_id, type, reason, notes_ciphertext, visibility, created_by)
  values (v_assignment.organization_id, p_mentor_assignment_id, p_learner_profile_id, 'note', p_reason, p_notes_ciphertext, 'mentor_only', auth.uid())
  returning id into v_note_id;
  return v_note_id;
end
$$;

create or replace function public.create_intervention(p_mentor_assignment_id uuid, p_learner_profile_id uuid, p_type text, p_reason text, p_follow_up_at timestamptz default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_assignment public.mentor_assignments%rowtype; v_intervention_id uuid;
begin
  select * into v_assignment from public.mentor_assignments where id = p_mentor_assignment_id;
  if not found or not private.can_access_mentor_assignment(p_mentor_assignment_id) or not private.can_access_assigned_learner(v_assignment.organization_id, p_learner_profile_id) then
    raise exception 'intervention denied' using errcode = '42501';
  end if;
  insert into public.mentor_interventions (organization_id, mentor_assignment_id, learner_profile_id, type, reason, follow_up_at, visibility, created_by)
  values (v_assignment.organization_id, p_mentor_assignment_id, p_learner_profile_id, p_type, p_reason, p_follow_up_at, 'organization', auth.uid())
  returning id into v_intervention_id;
  return v_intervention_id;
end
$$;

create or replace function public.mark_intervention_complete(p_intervention_id uuid, p_outcome text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.mentor_interventions
  set outcome = p_outcome, completed_at = now(), updated_at = now()
  where id = p_intervention_id and private.can_access_mentor_assignment(mentor_assignment_id);
  return found;
end
$$;

create or replace function public.publish_announcement(p_organization_id uuid, p_cohort_id uuid, p_title text, p_body jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_announcement_id uuid;
begin
  if not private.can_manage_mentor_workspace(p_organization_id) and not private.can_access_cohort(p_cohort_id) then raise exception 'announcement denied' using errcode = '42501'; end if;
  insert into public.announcements (organization_id, cohort_id, title, body, audience, status, published_by, content_hash)
  values (p_organization_id, p_cohort_id, p_title, p_body, 'cohort', 'published', auth.uid(), encode(extensions.digest(p_title || p_body::text, 'sha256'), 'hex'))
  returning id into v_announcement_id;
  return v_announcement_id;
end
$$;

create or replace function public.record_dashboard_event(p_organization_id uuid, p_profile_id uuid, p_purpose text, p_data jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_notification_id uuid;
begin
  if not private.can_access_assigned_learner(p_organization_id, p_profile_id) and auth.uid() <> p_profile_id then raise exception 'dashboard event denied' using errcode = '42501'; end if;
  insert into public.notifications (organization_id, profile_id, type, purpose, data, status)
  values (p_organization_id, p_profile_id, 'mentor', p_purpose, coalesce(p_data, '{}'::jsonb), 'unread')
  returning id into v_notification_id;
  return v_notification_id;
end
$$;

create or replace function public.resolve_review_item(p_review_id uuid, p_summary_ciphertext text default null)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.learner_reviews
  set status = 'resolved', summary_ciphertext = coalesce(p_summary_ciphertext, summary_ciphertext), resolved_at = now(), updated_at = now()
  where id = p_review_id and private.can_access_mentor_assignment(mentor_assignment_id);
  return found;
end
$$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values ('mentor.workspace.manage', 'Manage mentor cohorts, assignments and mentor workspace operations', 'high')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.organization_id is null
  and r.key in ('organization_admin','enterprise_admin','platform_admin','super_admin')
  and p.key = 'mentor.workspace.manage'
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'cohorts','cohort_members','mentor_profiles','mentor_assignments','mentor_interventions',
    'learner_reviews','risk_signals','notifications','announcements','announcement_acknowledgements'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

create policy cohorts_select_mentor on public.cohorts for select to authenticated using (private.can_access_cohort(id));
create policy cohorts_manage on public.cohorts for all to authenticated using (private.can_manage_mentor_workspace(organization_id)) with check (private.can_manage_mentor_workspace(organization_id));
create policy cohort_members_select_mentor on public.cohort_members for select to authenticated using (private.can_access_cohort(cohort_id));
create policy cohort_members_manage on public.cohort_members for all to authenticated using (exists (select 1 from public.cohorts c where c.id = cohort_id and private.can_manage_mentor_workspace(c.organization_id))) with check (exists (select 1 from public.cohorts c where c.id = cohort_id and private.can_manage_mentor_workspace(c.organization_id)));
create policy mentor_profiles_select on public.mentor_profiles for select to authenticated using (exists (select 1 from public.organization_members m where m.id = organization_member_id and (m.profile_id = auth.uid() or private.can_manage_mentor_workspace(m.organization_id))));
create policy mentor_profiles_manage on public.mentor_profiles for all to authenticated using (exists (select 1 from public.organization_members m where m.id = organization_member_id and private.can_manage_mentor_workspace(m.organization_id))) with check (exists (select 1 from public.organization_members m where m.id = organization_member_id and private.can_manage_mentor_workspace(m.organization_id)));
create policy mentor_assignments_select on public.mentor_assignments for select to authenticated using (private.can_access_mentor_assignment(id) or private.can_manage_mentor_workspace(organization_id));
create policy mentor_assignments_manage on public.mentor_assignments for all to authenticated using (private.can_manage_mentor_workspace(organization_id)) with check (private.can_manage_mentor_workspace(organization_id));
create policy mentor_interventions_select on public.mentor_interventions for select to authenticated using (private.can_access_mentor_assignment(mentor_assignment_id));
create policy learner_reviews_select on public.learner_reviews for select to authenticated using (private.can_access_mentor_assignment(mentor_assignment_id));
create policy risk_signals_select on public.risk_signals for select to authenticated using (private.can_access_assigned_learner(organization_id, learner_profile_id));
create policy notifications_select_self on public.notifications for select to authenticated using (profile_id = auth.uid());
create policy announcements_select_mentor on public.announcements for select to authenticated using (private.can_manage_mentor_workspace(organization_id) or (cohort_id is not null and private.can_access_cohort(cohort_id)));
create policy announcements_manage on public.announcements for all to authenticated using (private.can_manage_mentor_workspace(organization_id)) with check (private.can_manage_mentor_workspace(organization_id));
create policy announcement_acknowledgements_select on public.announcement_acknowledgements for select to authenticated using (profile_id = auth.uid() or exists (select 1 from public.announcements a where a.id = announcement_id and private.can_access_cohort(a.cohort_id)));

grant select on public.cohorts, public.cohort_members, public.mentor_profiles,
  public.mentor_assignments, public.mentor_interventions, public.learner_reviews,
  public.risk_signals, public.notifications, public.announcements,
  public.announcement_acknowledgements to authenticated;
grant insert, update, delete on public.cohorts, public.cohort_members, public.mentor_profiles,
  public.mentor_assignments, public.announcements to authenticated;
grant select on public.mentor_dashboard_projections, public.mentor_learner_activity_summaries,
  public.mentor_task_queue, public.mentor_review_queue to authenticated;

revoke all on function private.current_org_member_id(uuid) from public;
revoke all on function private.can_manage_mentor_workspace(uuid) from public;
revoke all on function private.current_mentor_member_id(uuid) from public;
revoke all on function private.can_access_mentor_assignment(uuid) from public;
revoke all on function private.can_access_cohort(uuid) from public;
revoke all on function private.can_access_assigned_learner(uuid, uuid) from public;
revoke all on function private.validate_mentor_assignment_scope() from public;
revoke all on function public.assign_cohort(uuid, text, uuid) from public;
revoke all on function public.assign_mentor(uuid, uuid, uuid, text) from public;
revoke all on function public.record_mentor_note(uuid, uuid, text, text) from public;
revoke all on function public.create_intervention(uuid, uuid, text, text, timestamptz) from public;
revoke all on function public.mark_intervention_complete(uuid, text) from public;
revoke all on function public.publish_announcement(uuid, uuid, text, jsonb) from public;
revoke all on function public.record_dashboard_event(uuid, uuid, text, jsonb) from public;
revoke all on function public.resolve_review_item(uuid, text) from public;

grant execute on function private.current_org_member_id(uuid) to authenticated;
grant execute on function private.can_manage_mentor_workspace(uuid) to authenticated;
grant execute on function private.current_mentor_member_id(uuid) to authenticated;
grant execute on function private.can_access_mentor_assignment(uuid) to authenticated;
grant execute on function private.can_access_cohort(uuid) to authenticated;
grant execute on function private.can_access_assigned_learner(uuid, uuid) to authenticated;
grant execute on function public.assign_cohort(uuid, text, uuid) to authenticated;
grant execute on function public.assign_mentor(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.record_mentor_note(uuid, uuid, text, text) to authenticated;
grant execute on function public.create_intervention(uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.mark_intervention_complete(uuid, text) to authenticated;
grant execute on function public.publish_announcement(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.record_dashboard_event(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.resolve_review_item(uuid, text) to authenticated;
