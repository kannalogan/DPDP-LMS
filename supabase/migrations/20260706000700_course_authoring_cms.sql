-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-010
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S4/S5 course authoring CMS; supabase/tests/009_course_authoring_test.sql
-- SYRA-IMMUTABLE: course publications, publishing events, and version change logs are append-only evidence
-- SYRA-SEED: deployment-reference
-- Course authoring writes are controlled by RPCs; students have no authoring permission or route access.

create table if not exists public.workflow_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  key text not null,
  label text not null,
  position integer not null default 0,
  terminal boolean not null default false,
  created_at timestamptz not null default now(),
  constraint workflow_states_key_check check (key in ('draft','review','approved','scheduled','published','archived','rejected')),
  constraint workflow_states_position_check check (position >= 0)
);
create unique index if not exists workflow_states_org_key_uq on public.workflow_states (organization_id, key) where organization_id is not null;
create unique index if not exists workflow_states_global_key_uq on public.workflow_states (key) where organization_id is null;

create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  course_category_id uuid references public.course_categories (id) on delete restrict,
  parent_id uuid references public.content_categories (id) on delete restrict,
  slug extensions.citext not null,
  name text not null,
  status text not null default 'active',
  position integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint content_categories_no_self_parent check (parent_id is null or parent_id <> id),
  constraint content_categories_slug_check check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint content_categories_status_check check (status in ('active','archived')),
  constraint content_categories_position_check check (position >= 0),
  constraint content_categories_version_check check (version > 0)
);
create unique index if not exists content_categories_tenant_slug_uq on public.content_categories (organization_id, slug) where organization_id is not null;
create unique index if not exists content_categories_global_slug_uq on public.content_categories (slug) where organization_id is null;

create table if not exists public.content_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  tag_id uuid references public.tags (id) on delete restrict,
  key text not null,
  label text not null,
  color text not null default '#334155',
  status text not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint content_labels_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint content_labels_color_check check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint content_labels_status_check check (status in ('active','archived')),
  constraint content_labels_version_check check (version > 0)
);
create unique index if not exists content_labels_tenant_key_uq on public.content_labels (organization_id, key) where organization_id is not null;
create unique index if not exists content_labels_global_key_uq on public.content_labels (key) where organization_id is null;

create table if not exists public.resource_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  parent_id uuid references public.resource_folders (id) on delete restrict,
  name text not null,
  path text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint resource_folders_no_self_parent check (parent_id is null or parent_id <> id),
  constraint resource_folders_name_check check (length(btrim(name)) between 1 and 200),
  constraint resource_folders_path_check check (path ~ '^/[A-Za-z0-9/_-]*$'),
  constraint resource_folders_version_check check (version > 0)
);
create unique index if not exists resource_folders_org_path_uq on public.resource_folders (organization_id, path) where organization_id is not null;

create table if not exists public.resource_library (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  folder_id uuid references public.resource_folders (id) on delete set null,
  storage_object_id uuid references public.storage_objects (id) on delete restrict,
  external_url text,
  title text not null,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint resource_library_exactly_one_target check ((storage_object_id is not null)::integer + (external_url is not null)::integer = 1),
  constraint resource_library_url_check check (external_url is null or external_url ~ '^https://'),
  constraint resource_library_kind_check check (kind in ('document','video','audio','image','pdf','download','external_link','embed')),
  constraint resource_library_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint resource_library_status_check check (status in ('draft','approved','published','archived')),
  constraint resource_library_version_check check (version > 0)
);
create index if not exists resource_library_org_kind_status_idx on public.resource_library (organization_id, kind, status);

create table if not exists public.course_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  course_id uuid references public.courses (id) on delete restrict,
  track_id uuid not null references public.learning_tracks (id) on delete restrict,
  category_id uuid references public.course_categories (id) on delete restrict,
  slug extensions.citext not null,
  title text not null,
  description text not null default '',
  locale text not null default 'en',
  difficulty text not null default 'introductory',
  visibility text not null default 'organization',
  workflow_state text not null default 'draft',
  body jsonb not null default '{}'::jsonb,
  outcomes jsonb not null default '[]'::jsonb,
  prerequisites jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_publish_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint course_drafts_slug_check check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint course_drafts_title_check check (length(btrim(title)) between 1 and 300),
  constraint course_drafts_locale_check check (locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint course_drafts_difficulty_check check (difficulty in ('introductory','intermediate','advanced','expert')),
  constraint course_drafts_visibility_check check (visibility in ('organization','public_catalog','private')),
  constraint course_drafts_workflow_check check (workflow_state in ('draft','review','approved','scheduled','published','archived','rejected')),
  constraint course_drafts_body_check check (jsonb_typeof(body) = 'object'),
  constraint course_drafts_outcomes_check check (jsonb_typeof(outcomes) = 'array'),
  constraint course_drafts_prerequisites_check check (jsonb_typeof(prerequisites) = 'array'),
  constraint course_drafts_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint course_drafts_lock_version_check check (lock_version > 0)
);
create unique index if not exists course_drafts_org_slug_active_uq on public.course_drafts (organization_id, slug) where archived_at is null and organization_id is not null;
create unique index if not exists course_drafts_global_slug_active_uq on public.course_drafts (slug) where archived_at is null and organization_id is null;
create index if not exists course_drafts_org_state_updated_idx on public.course_drafts (organization_id, workflow_state, updated_at desc);
create index if not exists course_drafts_owner_idx on public.course_drafts (owner_profile_id, updated_at desc);

create table if not exists public.module_drafts (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete cascade,
  course_module_id uuid references public.course_modules (id) on delete restrict,
  title text not null,
  summary text not null default '',
  position integer not null,
  completion_rule jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint module_drafts_position_check check (position > 0),
  constraint module_drafts_completion_rule_check check (jsonb_typeof(completion_rule) = 'object'),
  constraint module_drafts_lock_version_check check (lock_version > 0),
  constraint module_drafts_course_position_uq unique (course_draft_id, position)
);

create table if not exists public.lesson_drafts (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete cascade,
  module_draft_id uuid references public.module_drafts (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete restrict,
  slug extensions.citext not null,
  title text not null,
  type text not null,
  body jsonb not null default '{}'::jsonb,
  estimated_seconds integer not null default 0,
  position integer not null,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint lesson_drafts_slug_check check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint lesson_drafts_type_check check (type in ('video','reading','audio','case_study','lab','live_link','interactive')),
  constraint lesson_drafts_body_check check (jsonb_typeof(body) = 'object'),
  constraint lesson_drafts_duration_check check (estimated_seconds >= 0),
  constraint lesson_drafts_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint lesson_drafts_position_check check (position > 0),
  constraint lesson_drafts_lock_version_check check (lock_version > 0),
  constraint lesson_drafts_module_position_uq unique (module_draft_id, position)
);
create index if not exists lesson_drafts_course_idx on public.lesson_drafts (course_draft_id, position);

create table if not exists public.course_assets (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete cascade,
  resource_library_id uuid references public.resource_library (id) on delete restrict,
  asset_type text not null,
  title text not null,
  position integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint course_assets_type_check check (asset_type in ('cover','syllabus','download','embed','supplement')),
  constraint course_assets_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint course_assets_position_check check (position > 0)
);
create index if not exists course_assets_draft_type_idx on public.course_assets (course_draft_id, asset_type, position);

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  status text not null default 'open',
  requested_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  decision_notes text,
  opened_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint course_reviews_status_check check (status in ('open','approved','rejected','cancelled')),
  constraint course_reviews_decision_check check ((status = 'open' and decided_at is null) or (status <> 'open' and decided_at is not null))
);
create index if not exists course_reviews_draft_status_idx on public.course_reviews (course_draft_id, status, opened_at desc);

create table if not exists public.content_review_assignments (
  id uuid primary key default gen_random_uuid(),
  course_review_id uuid not null references public.course_reviews (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete restrict,
  reviewer_profile_id uuid not null references public.profiles (id) on delete restrict,
  role text not null default 'reviewer',
  status text not null default 'assigned',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint content_review_assignments_role_check check (role in ('reviewer','approver','publisher')),
  constraint content_review_assignments_status_check check (status in ('assigned','completed','declined','cancelled')),
  constraint content_review_assignments_review_reviewer_uq unique (course_review_id, reviewer_profile_id, role)
);
create index if not exists content_review_assignments_reviewer_idx on public.content_review_assignments (reviewer_profile_id, status, due_at);

create table if not exists public.lesson_review_comments (
  id uuid primary key default gen_random_uuid(),
  course_review_id uuid not null references public.course_reviews (id) on delete cascade,
  lesson_draft_id uuid references public.lesson_drafts (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete restrict,
  body_ciphertext text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint lesson_review_comments_status_check check (status in ('open','resolved','dismissed')),
  constraint lesson_review_comments_body_check check (length(body_ciphertext) >= 24)
);
create index if not exists lesson_review_comments_review_status_idx on public.lesson_review_comments (course_review_id, status, created_at desc);

create table if not exists public.draft_lock_sessions (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'active',
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  heartbeat_at timestamptz not null default now(),
  user_agent_hash text,
  constraint draft_lock_sessions_status_check check (status in ('active','released','expired')),
  constraint draft_lock_sessions_dates_check check (expires_at > locked_at and (released_at is null or released_at >= locked_at))
);
create unique index if not exists draft_lock_sessions_active_uq on public.draft_lock_sessions (course_draft_id) where status = 'active';
create index if not exists draft_lock_sessions_profile_idx on public.draft_lock_sessions (profile_id, status, expires_at);

create table if not exists public.editor_preferences (
  organization_id uuid references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  editor_mode text not null default 'rich_text',
  preferences jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint editor_preferences_pkey primary key (organization_id, profile_id),
  constraint editor_preferences_mode_check check (editor_mode in ('rich_text','markdown','split')),
  constraint editor_preferences_json_check check (jsonb_typeof(preferences) = 'object'),
  constraint editor_preferences_version_check check (version > 0)
);

create table if not exists public.course_publications (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  course_version_id uuid not null references public.course_versions (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  publication_status text not null default 'published',
  scheduled_for timestamptz,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  content_hash text not null,
  rollback_from_publication_id uuid references public.course_publications (id) on delete restrict,
  evidence jsonb not null default '{}'::jsonb,
  constraint course_publications_status_check check (publication_status in ('scheduled','published','archived','rollback_prepared')),
  constraint course_publications_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint course_publications_evidence_check check (jsonb_typeof(evidence) = 'object')
);
create index if not exists course_publications_course_time_idx on public.course_publications (course_id, published_at desc);
create index if not exists course_publications_org_status_idx on public.course_publications (organization_id, publication_status);

create table if not exists public.publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  job_type text not null,
  status text not null default 'queued',
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint publishing_jobs_type_check check (job_type in ('validation','publication','archive','rollback_preparation')),
  constraint publishing_jobs_status_check check (status in ('queued','running','completed','failed','cancelled')),
  constraint publishing_jobs_payload_check check (jsonb_typeof(payload) = 'object'),
  constraint publishing_jobs_dates_check check (completed_at is null or started_at is null or completed_at >= started_at)
);
create index if not exists publishing_jobs_org_status_idx on public.publishing_jobs (organization_id, status, scheduled_for);

create table if not exists public.publishing_events (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid references public.course_drafts (id) on delete restrict,
  publishing_job_id uuid references public.publishing_jobs (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint publishing_events_type_check check (event_type ~ '^[a-z][a-z0-9_.-]*$'),
  constraint publishing_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);
create index if not exists publishing_events_draft_time_idx on public.publishing_events (course_draft_id, occurred_at desc);
create index if not exists publishing_events_org_time_idx on public.publishing_events (organization_id, occurred_at desc);

create table if not exists public.version_change_logs (
  id uuid primary key default gen_random_uuid(),
  course_draft_id uuid not null references public.course_drafts (id) on delete restrict,
  course_version_id uuid references public.course_versions (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  change_type text not null,
  summary text not null,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint version_change_logs_type_check check (change_type in ('draft_created','autosave','submitted','approved','rejected','scheduled','published','archived','rollback_prepared')),
  constraint version_change_logs_diff_check check (jsonb_typeof(diff) = 'object')
);
create index if not exists version_change_logs_draft_time_idx on public.version_change_logs (course_draft_id, created_at desc);

create or replace view public.authoring_course_overview
with (security_invoker = true)
as
select
  d.id as draft_id,
  d.organization_id,
  d.course_id,
  d.track_id,
  d.slug::text as slug,
  d.title,
  d.workflow_state,
  d.visibility,
  d.updated_at,
  d.owner_profile_id,
  d.scheduled_publish_at,
  d.published_at,
  count(distinct md.id) as module_count,
  count(distinct ld.id) as lesson_count,
  count(distinct cr.id) filter (where cr.status = 'open') as open_reviews
from public.course_drafts d
left join public.module_drafts md on md.course_draft_id = d.id
left join public.lesson_drafts ld on ld.course_draft_id = d.id
left join public.course_reviews cr on cr.course_draft_id = d.id
group by d.id;

create or replace view public.authoring_publishing_queue
with (security_invoker = true)
as
select
  j.id as job_id,
  j.course_draft_id as draft_id,
  d.title,
  j.organization_id,
  j.job_type,
  j.status,
  j.scheduled_for,
  j.created_at,
  j.error_message
from public.publishing_jobs j
join public.course_drafts d on d.id = j.course_draft_id;

create or replace function private.can_author_content(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'course.authoring.manage')
    or private.has_permission(target_organization_id, 'learning.catalog.manage')
    or private.has_permission(target_organization_id, 'admin.workspace.manage')
    or private.has_permission(target_organization_id, 'mentor.workspace.manage')
    or private.has_platform_permission('course.authoring.manage')
$$;

create or replace function private.can_publish_content(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'course.authoring.manage')
    or private.has_permission(target_organization_id, 'learning.catalog.manage')
    or private.has_permission(target_organization_id, 'admin.workspace.manage')
    or private.has_platform_permission('course.authoring.manage')
$$;

create or replace function private.reject_authoring_evidence_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'authoring evidence is append-only' using errcode = '55000';
end
$$;

drop trigger if exists course_publications_reject_mutation on public.course_publications;
create trigger course_publications_reject_mutation before update or delete on public.course_publications for each row execute function private.reject_authoring_evidence_mutation();
drop trigger if exists publishing_events_reject_mutation on public.publishing_events;
create trigger publishing_events_reject_mutation before update or delete on public.publishing_events for each row execute function private.reject_authoring_evidence_mutation();
drop trigger if exists version_change_logs_reject_mutation on public.version_change_logs;
create trigger version_change_logs_reject_mutation before update or delete on public.version_change_logs for each row execute function private.reject_authoring_evidence_mutation();

create or replace function public.create_course_draft(
  p_organization_id uuid,
  p_track_id uuid,
  p_slug text,
  p_title text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_draft_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not private.can_author_content(p_organization_id) then raise exception 'course draft denied' using errcode = '42501'; end if;
  insert into public.course_drafts (organization_id, track_id, slug, title, description, owner_profile_id, created_by, updated_by)
  values (p_organization_id, p_track_id, p_slug::extensions.citext, p_title, coalesce(p_description, ''), auth.uid(), auth.uid(), auth.uid())
  returning id into v_draft_id;
  insert into public.version_change_logs (course_draft_id, organization_id, change_type, summary, created_by)
  values (v_draft_id, p_organization_id, 'draft_created', 'Draft created', auth.uid());
  return v_draft_id;
end
$$;

create or replace function public.save_course_draft(
  p_draft_id uuid,
  p_title text,
  p_description text,
  p_body jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.course_drafts where id = p_draft_id for update;
  if v_org is null or not private.can_author_content(v_org) then raise exception 'course draft save denied' using errcode = '42501'; end if;
  update public.course_drafts
  set title = p_title,
      description = coalesce(p_description, ''),
      body = coalesce(p_body, '{}'::jsonb),
      metadata = coalesce(p_metadata, '{}'::jsonb),
      lock_version = lock_version + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_draft_id and workflow_state in ('draft','rejected');
  if not found then raise exception 'draft is not editable' using errcode = '55000'; end if;
  insert into public.version_change_logs (course_draft_id, organization_id, change_type, summary, diff, created_by)
  values (p_draft_id, v_org, 'autosave', 'Draft autosaved', jsonb_build_object('title', p_title), auth.uid());
  return true;
end
$$;

create or replace function public.submit_course_review(p_draft_id uuid, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid; v_review_id uuid;
begin
  select organization_id into v_org from public.course_drafts where id = p_draft_id for update;
  if v_org is null or not private.can_author_content(v_org) then raise exception 'course review denied' using errcode = '42501'; end if;
  update public.course_drafts set workflow_state = 'review', submitted_at = now(), updated_at = now(), updated_by = auth.uid() where id = p_draft_id and workflow_state in ('draft','rejected');
  if not found then raise exception 'draft cannot be submitted' using errcode = '55000'; end if;
  insert into public.course_reviews (course_draft_id, organization_id, requested_by, decision_notes)
  values (p_draft_id, v_org, auth.uid(), p_notes)
  returning id into v_review_id;
  insert into public.version_change_logs (course_draft_id, organization_id, change_type, summary, created_by)
  values (p_draft_id, v_org, 'submitted', 'Submitted for review', auth.uid());
  return v_review_id;
end
$$;

create or replace function public.approve_course(p_review_id uuid, p_notes text default null)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_review public.course_reviews%rowtype;
begin
  select * into v_review from public.course_reviews where id = p_review_id and status = 'open' for update;
  if v_review.id is null or not private.can_publish_content(v_review.organization_id) then raise exception 'course approval denied' using errcode = '42501'; end if;
  update public.course_reviews set status = 'approved', reviewed_by = auth.uid(), decision_notes = p_notes, decided_at = now() where id = p_review_id;
  update public.course_drafts set workflow_state = 'approved', approved_at = now(), updated_at = now(), updated_by = auth.uid() where id = v_review.course_draft_id;
  insert into public.version_change_logs (course_draft_id, organization_id, change_type, summary, created_by)
  values (v_review.course_draft_id, v_review.organization_id, 'approved', 'Course approved', auth.uid());
  return true;
end
$$;

create or replace function public.reject_course(p_review_id uuid, p_notes text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_review public.course_reviews%rowtype;
begin
  select * into v_review from public.course_reviews where id = p_review_id and status = 'open' for update;
  if v_review.id is null or not private.can_publish_content(v_review.organization_id) then raise exception 'course rejection denied' using errcode = '42501'; end if;
  update public.course_reviews set status = 'rejected', reviewed_by = auth.uid(), decision_notes = p_notes, decided_at = now() where id = p_review_id;
  update public.course_drafts set workflow_state = 'rejected', updated_at = now(), updated_by = auth.uid() where id = v_review.course_draft_id;
  insert into public.version_change_logs (course_draft_id, organization_id, change_type, summary, created_by)
  values (v_review.course_draft_id, v_review.organization_id, 'rejected', 'Course rejected', auth.uid());
  return true;
end
$$;

create or replace function public.schedule_publication(p_draft_id uuid, p_scheduled_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid; v_job_id uuid;
begin
  select organization_id into v_org from public.course_drafts where id = p_draft_id for update;
  if v_org is null or not private.can_publish_content(v_org) then raise exception 'schedule denied' using errcode = '42501'; end if;
  update public.course_drafts set workflow_state = 'scheduled', scheduled_publish_at = p_scheduled_at, updated_at = now(), updated_by = auth.uid() where id = p_draft_id and workflow_state = 'approved';
  if not found then raise exception 'only approved drafts can be scheduled' using errcode = '55000'; end if;
  insert into public.publishing_jobs (course_draft_id, organization_id, job_type, status, scheduled_for, created_by)
  values (p_draft_id, v_org, 'publication', 'queued', p_scheduled_at, auth.uid())
  returning id into v_job_id;
  insert into public.version_change_logs (course_draft_id, organization_id, change_type, summary, created_by)
  values (p_draft_id, v_org, 'scheduled', 'Publication scheduled', auth.uid());
  return v_job_id;
end
$$;

create or replace function public.publish_course(p_draft_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_draft public.course_drafts%rowtype;
  v_course_id uuid;
  v_version integer;
  v_course_version_id uuid;
  v_publication_id uuid;
  v_hash text;
begin
  select * into v_draft from public.course_drafts where id = p_draft_id for update;
  if v_draft.id is null or not private.can_publish_content(v_draft.organization_id) then raise exception 'publication denied' using errcode = '42501'; end if;
  if v_draft.workflow_state not in ('approved','scheduled') then raise exception 'draft must be approved or scheduled' using errcode = '55000'; end if;
  v_hash := encode(extensions.digest(v_draft.title || v_draft.description || v_draft.body::text || v_draft.metadata::text, 'sha256'), 'hex');
  if v_draft.course_id is null then
    insert into public.courses (organization_id, track_id, category_id, slug, status, created_by, updated_by)
    values (v_draft.organization_id, v_draft.track_id, v_draft.category_id, v_draft.slug, 'published', auth.uid(), auth.uid())
    returning id into v_course_id;
  else
    v_course_id := v_draft.course_id;
    update public.courses set status = 'published', updated_at = now(), updated_by = auth.uid(), version = version + 1 where id = v_course_id;
    update public.course_versions set status = 'superseded' where course_id = v_course_id and status = 'published';
  end if;
  select coalesce(max(version), 0) + 1 into v_version from public.course_versions where course_id = v_course_id;
  insert into public.course_versions (course_id, version, title, description, locale, difficulty, outcomes, status, published_at, published_by, content_hash, created_by, updated_by)
  values (v_course_id, v_version, v_draft.title, v_draft.description, v_draft.locale, v_draft.difficulty, v_draft.outcomes, 'published', now(), auth.uid(), v_hash, auth.uid(), auth.uid())
  returning id into v_course_version_id;
  update public.course_drafts set course_id = v_course_id, workflow_state = 'published', published_at = now(), updated_at = now(), updated_by = auth.uid() where id = p_draft_id;
  insert into public.course_publications (course_draft_id, course_id, course_version_id, organization_id, publication_status, scheduled_for, published_by, content_hash, evidence)
  values (p_draft_id, v_course_id, v_course_version_id, v_draft.organization_id, 'published', v_draft.scheduled_publish_at, auth.uid(), v_hash, jsonb_build_object('workflowState', v_draft.workflow_state))
  returning id into v_publication_id;
  insert into public.publishing_events (course_draft_id, organization_id, actor_profile_id, event_type, metadata)
  values (p_draft_id, v_draft.organization_id, auth.uid(), 'course.published', jsonb_build_object('courseId', v_course_id, 'courseVersionId', v_course_version_id));
  insert into public.version_change_logs (course_draft_id, course_version_id, organization_id, change_type, summary, created_by)
  values (p_draft_id, v_course_version_id, v_draft.organization_id, 'published', 'Course published', auth.uid());
  return v_publication_id;
end
$$;

create or replace function public.archive_course(p_course_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.courses where id = p_course_id for update;
  if v_org is null or not private.can_publish_content(v_org) then raise exception 'archive denied' using errcode = '42501'; end if;
  update public.courses set status = 'archived', archived_at = now(), updated_at = now(), updated_by = auth.uid() where id = p_course_id;
  insert into public.publishing_events (course_draft_id, organization_id, actor_profile_id, event_type, metadata)
  select d.id, v_org, auth.uid(), 'course.archived', jsonb_build_object('courseId', p_course_id)
  from public.course_drafts d where d.course_id = p_course_id order by d.updated_at desc limit 1;
  return found;
end
$$;

create or replace function public.lock_editor(p_draft_id uuid, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid; v_lock_id uuid;
begin
  select organization_id into v_org from public.course_drafts where id = p_draft_id;
  if v_org is null or not private.can_author_content(v_org) then raise exception 'editor lock denied' using errcode = '42501'; end if;
  update public.draft_lock_sessions set status = 'expired', released_at = now() where course_draft_id = p_draft_id and status = 'active' and expires_at <= now();
  insert into public.draft_lock_sessions (course_draft_id, organization_id, profile_id, expires_at)
  values (p_draft_id, v_org, auth.uid(), p_expires_at)
  returning id into v_lock_id;
  return v_lock_id;
end
$$;

create or replace function public.unlock_editor(p_lock_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.draft_lock_sessions
  set status = 'released', released_at = now()
  where id = p_lock_id
    and status = 'active'
    and profile_id = auth.uid();
  return found;
end
$$;

create or replace function public.record_editor_event(p_draft_id uuid, p_event_type text, p_metadata jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid; v_event_id uuid;
begin
  select organization_id into v_org from public.course_drafts where id = p_draft_id;
  if v_org is null or not private.can_author_content(v_org) then raise exception 'editor event denied' using errcode = '42501'; end if;
  insert into public.publishing_events (course_draft_id, organization_id, actor_profile_id, event_type, metadata)
  values (p_draft_id, v_org, auth.uid(), p_event_type, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_event_id;
  return v_event_id;
end
$$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values ('course.authoring.manage', 'Manage course authoring drafts, reviews, publishing workflow, and resource library', 'critical')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.organization_id is null
  and r.key in ('mentor','instructor','organization_admin','enterprise_admin','platform_admin','super_admin')
  and p.key = 'course.authoring.manage'
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'workflow_states','content_categories','content_labels','resource_folders','resource_library',
    'course_drafts','module_drafts','lesson_drafts','course_assets','course_reviews',
    'content_review_assignments','lesson_review_comments','draft_lock_sessions',
    'editor_preferences','course_publications','publishing_jobs','publishing_events',
    'version_change_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

create policy workflow_states_authoring_select on public.workflow_states for select to authenticated using (organization_id is null or private.can_author_content(organization_id));
create policy content_categories_authoring_select on public.content_categories for select to authenticated using (organization_id is null or private.can_author_content(organization_id));
create policy content_labels_authoring_select on public.content_labels for select to authenticated using (organization_id is null or private.can_author_content(organization_id));
create policy resource_folders_authoring_select on public.resource_folders for select to authenticated using (organization_id is null or private.can_author_content(organization_id));
create policy resource_library_authoring_select on public.resource_library for select to authenticated using (organization_id is null or private.can_author_content(organization_id));
create policy course_drafts_authoring_select on public.course_drafts for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));
create policy module_drafts_authoring_select on public.module_drafts for select to authenticated using (exists (select 1 from public.course_drafts d where d.id = course_draft_id and private.can_author_content(d.organization_id)));
create policy lesson_drafts_authoring_select on public.lesson_drafts for select to authenticated using (exists (select 1 from public.course_drafts d where d.id = course_draft_id and private.can_author_content(d.organization_id)));
create policy course_assets_authoring_select on public.course_assets for select to authenticated using (exists (select 1 from public.course_drafts d where d.id = course_draft_id and private.can_author_content(d.organization_id)));
create policy course_reviews_authoring_select on public.course_reviews for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));
create policy content_review_assignments_authoring_select on public.content_review_assignments for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));
create policy lesson_review_comments_authoring_select on public.lesson_review_comments for select to authenticated using (exists (select 1 from public.course_reviews r where r.id = course_review_id and private.can_author_content(r.organization_id)));
create policy draft_lock_sessions_authoring_select on public.draft_lock_sessions for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));
create policy editor_preferences_authoring_select on public.editor_preferences for select to authenticated using (profile_id = auth.uid() or (organization_id is not null and private.can_author_content(organization_id)));
create policy course_publications_authoring_select on public.course_publications for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));
create policy publishing_jobs_authoring_select on public.publishing_jobs for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));
create policy publishing_events_authoring_select on public.publishing_events for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));
create policy version_change_logs_authoring_select on public.version_change_logs for select to authenticated using (organization_id is not null and private.can_author_content(organization_id));

grant select on public.workflow_states, public.content_categories, public.content_labels,
  public.resource_folders, public.resource_library, public.course_drafts,
  public.module_drafts, public.lesson_drafts, public.course_assets,
  public.course_reviews, public.content_review_assignments, public.lesson_review_comments,
  public.draft_lock_sessions, public.editor_preferences, public.course_publications,
  public.publishing_jobs, public.publishing_events, public.version_change_logs to authenticated;
grant select on public.authoring_course_overview, public.authoring_publishing_queue to authenticated;

revoke all on function private.can_author_content(uuid) from public;
revoke all on function private.can_publish_content(uuid) from public;
revoke all on function private.reject_authoring_evidence_mutation() from public;
revoke all on function public.create_course_draft(uuid, uuid, text, text, text) from public;
revoke all on function public.save_course_draft(uuid, text, text, jsonb, jsonb) from public;
revoke all on function public.submit_course_review(uuid, text) from public;
revoke all on function public.approve_course(uuid, text) from public;
revoke all on function public.reject_course(uuid, text) from public;
revoke all on function public.publish_course(uuid) from public;
revoke all on function public.schedule_publication(uuid, timestamptz) from public;
revoke all on function public.archive_course(uuid) from public;
revoke all on function public.lock_editor(uuid, timestamptz) from public;
revoke all on function public.unlock_editor(uuid) from public;
revoke all on function public.record_editor_event(uuid, text, jsonb) from public;

grant execute on function private.can_author_content(uuid) to authenticated;
grant execute on function private.can_publish_content(uuid) to authenticated;
grant execute on function public.create_course_draft(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.save_course_draft(uuid, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.submit_course_review(uuid, text) to authenticated;
grant execute on function public.approve_course(uuid, text) to authenticated;
grant execute on function public.reject_course(uuid, text) to authenticated;
grant execute on function public.publish_course(uuid) to authenticated;
grant execute on function public.schedule_publication(uuid, timestamptz) to authenticated;
grant execute on function public.archive_course(uuid) to authenticated;
grant execute on function public.lock_editor(uuid, timestamptz) to authenticated;
grant execute on function public.unlock_editor(uuid) to authenticated;
grant execute on function public.record_editor_event(uuid, text, jsonb) to authenticated;
