-- SYRA-CONTRACT: docs/21-master-database-contract.md
-- SYRA-ADR: ADR-004
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S0/S1/S2/S4/S5/S6; supabase/tests/003_learning_domain_test.sql
-- SYRA-IMMUTABLE: published version rows reject UPDATE and DELETE; progress snapshots remain versioned mutable projections
-- SYRA-SEED: deployment-reference

create table if not exists public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid references public.organizations (id) on delete restrict,
  slug extensions.citext not null,
  name text not null,
  domain text not null,
  status text not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint learning_tracks_slug_check check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint learning_tracks_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint learning_tracks_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint learning_tracks_version_check check (version > 0)
);

create unique index if not exists learning_tracks_tenant_slug_uq on public.learning_tracks (owner_organization_id, slug) where owner_organization_id is not null;
create unique index if not exists learning_tracks_global_slug_uq on public.learning_tracks (slug) where owner_organization_id is null;
create index if not exists learning_tracks_domain_status_idx on public.learning_tracks (domain, status);

create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  parent_id uuid references public.course_categories (id) on delete restrict,
  slug extensions.citext not null,
  name text not null,
  status text not null default 'draft',
  position integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint course_categories_no_self_parent check (parent_id is null or parent_id <> id),
  constraint course_categories_position_check check (position >= 0),
  constraint course_categories_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint course_categories_version_check check (version > 0)
);

create unique index if not exists course_categories_tenant_slug_uq on public.course_categories (organization_id, slug) where organization_id is not null;
create unique index if not exists course_categories_global_slug_uq on public.course_categories (slug) where organization_id is null;
create index if not exists course_categories_parent_position_idx on public.course_categories (parent_id, position);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  track_id uuid not null references public.learning_tracks (id) on delete restrict,
  category_id uuid references public.course_categories (id) on delete restrict,
  slug extensions.citext not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint courses_slug_check check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint courses_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint courses_version_check check (version > 0)
);

create unique index if not exists courses_tenant_slug_uq on public.courses (organization_id, slug) where organization_id is not null;
create unique index if not exists courses_global_slug_uq on public.courses (slug) where organization_id is null;
create index if not exists courses_track_status_idx on public.courses (track_id, status);
create index if not exists courses_category_idx on public.courses (category_id);

create table if not exists public.course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  version integer not null,
  title text not null,
  description text not null default '',
  locale text not null default 'en',
  difficulty text not null default 'introductory',
  outcomes jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint course_versions_course_version_uq unique (course_id, version),
  constraint course_versions_version_check check (version > 0),
  constraint course_versions_locale_check check (locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint course_versions_difficulty_check check (difficulty in ('introductory','intermediate','advanced','expert')),
  constraint course_versions_outcomes_check check (jsonb_typeof(outcomes) = 'array'),
  constraint course_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint course_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint course_versions_content_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists course_versions_status_published_idx on public.course_versions (status, published_at desc);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references public.course_versions (id) on delete restrict,
  title text not null,
  position integer not null,
  completion_rule jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint course_modules_course_position_uq unique (course_version_id, position),
  constraint course_modules_position_check check (position > 0),
  constraint course_modules_completion_rule_check check (jsonb_typeof(completion_rule) = 'object'),
  constraint course_modules_version_check check (version > 0)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_module_id uuid not null references public.course_modules (id) on delete restrict,
  slug extensions.citext not null,
  position integer not null,
  type text not null,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint lessons_module_slug_uq unique (course_module_id, slug),
  constraint lessons_module_position_uq unique (course_module_id, position),
  constraint lessons_position_check check (position > 0),
  constraint lessons_type_check check (type in ('video','reading','audio','case_study','lab','live_link','interactive')),
  constraint lessons_version_check check (version > 0)
);

create table if not exists public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  version integer not null,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  estimated_seconds integer not null default 0,
  status text not null default 'draft',
  published_at timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint lesson_versions_lesson_version_uq unique (lesson_id, version),
  constraint lesson_versions_version_check check (version > 0),
  constraint lesson_versions_body_check check (jsonb_typeof(body) = 'object'),
  constraint lesson_versions_duration_check check (estimated_seconds >= 0),
  constraint lesson_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint lesson_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint lesson_versions_content_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists lesson_versions_status_idx on public.lesson_versions (status, published_at desc);

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  lesson_version_id uuid references public.lesson_versions (id) on delete restrict,
  course_version_id uuid references public.course_versions (id) on delete restrict,
  kind text not null,
  title text not null,
  position integer not null,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint learning_resources_exactly_one_parent check ((lesson_version_id is not null)::integer + (course_version_id is not null)::integer = 1),
  constraint learning_resources_kind_check check (kind in ('document','video','audio','image','transcript','caption','link','archive','dataset')),
  constraint learning_resources_position_check check (position > 0),
  constraint learning_resources_version_check check (version > 0)
);

create unique index if not exists learning_resources_lesson_position_uq on public.learning_resources (lesson_version_id, position) where lesson_version_id is not null;
create unique index if not exists learning_resources_course_position_uq on public.learning_resources (course_version_id, position) where course_version_id is not null;
create index if not exists learning_resources_org_kind_idx on public.learning_resources (organization_id, kind);

create table if not exists public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.learning_resources (id) on delete restrict,
  version integer not null,
  storage_object_id uuid references public.storage_objects (id) on delete restrict,
  external_url text,
  storage_type text not null,
  accessibility jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  published_at timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint resource_versions_resource_version_uq unique (resource_id, version),
  constraint resource_versions_exactly_one_target check ((storage_object_id is not null)::integer + (external_url is not null)::integer = 1),
  constraint resource_versions_storage_type_check check (storage_type in ('supabase_private','supabase_public','external_url','generated')),
  constraint resource_versions_external_url_check check (external_url is null or external_url ~ '^https://'),
  constraint resource_versions_accessibility_check check (jsonb_typeof(accessibility) = 'object'),
  constraint resource_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint resource_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint resource_versions_content_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  key text not null,
  label text not null,
  category text not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint tags_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint tags_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint tags_version_check check (version > 0)
);

create unique index if not exists tags_tenant_key_uq on public.tags (organization_id, key) where organization_id is not null;
create unique index if not exists tags_global_key_uq on public.tags (key) where organization_id is null;
create index if not exists tags_category_status_idx on public.tags (category, status);

create table if not exists public.course_tags (
  course_id uuid not null references public.courses (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint course_tags_pkey primary key (course_id, tag_id)
);

create index if not exists course_tags_tag_course_idx on public.course_tags (tag_id, course_id);

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  track_id uuid references public.learning_tracks (id) on delete restrict,
  slug extensions.citext not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint learning_paths_slug_check check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint learning_paths_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint learning_paths_version_check check (version > 0)
);

create unique index if not exists learning_paths_tenant_slug_uq on public.learning_paths (organization_id, slug) where organization_id is not null;
create unique index if not exists learning_paths_global_slug_uq on public.learning_paths (slug) where organization_id is null;
create index if not exists learning_paths_track_status_idx on public.learning_paths (track_id, status);

create table if not exists public.learning_path_versions (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.learning_paths (id) on delete restrict,
  version integer not null,
  title text not null,
  description text not null default '',
  status text not null default 'draft',
  published_at timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint learning_path_versions_path_version_uq unique (learning_path_id, version),
  constraint learning_path_versions_version_check check (version > 0),
  constraint learning_path_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint learning_path_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint learning_path_versions_content_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists learning_path_versions_status_idx on public.learning_path_versions (status, published_at desc);

create table if not exists public.learning_path_items (
  id uuid primary key default gen_random_uuid(),
  learning_path_version_id uuid not null references public.learning_path_versions (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  position integer not null,
  required boolean not null default true,
  prerequisite_item_id uuid references public.learning_path_items (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_path_items_path_position_uq unique (learning_path_version_id, position),
  constraint learning_path_items_path_course_uq unique (learning_path_version_id, course_id),
  constraint learning_path_items_no_self_prerequisite check (prerequisite_item_id is null or prerequisite_item_id <> id),
  constraint learning_path_items_position_check check (position > 0)
);

create index if not exists learning_path_items_prerequisite_idx on public.learning_path_items (prerequisite_item_id);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  course_version_id uuid references public.course_versions (id) on delete restrict,
  learning_path_version_id uuid references public.learning_path_versions (id) on delete restrict,
  cohort_id uuid,
  status text not null default 'pending',
  enrolled_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  source text not null,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint enrollments_exactly_one_target check ((course_version_id is not null)::integer + (learning_path_version_id is not null)::integer = 1),
  constraint enrollments_status_check check (status in ('pending','active','paused','completed','withdrawn','expired','cancelled')),
  constraint enrollments_dates_check check ((due_at is null or due_at >= enrolled_at) and (completed_at is null or completed_at >= enrolled_at)),
  constraint enrollments_source_check check (source ~ '^[a-z][a-z0-9_.-]*$'),
  constraint enrollments_version_check check (version > 0)
);

create unique index if not exists enrollments_active_course_uq on public.enrollments (organization_id, profile_id, course_version_id) where course_version_id is not null and status in ('pending','active','paused');
create unique index if not exists enrollments_active_path_uq on public.enrollments (organization_id, profile_id, learning_path_version_id) where learning_path_version_id is not null and status in ('pending','active','paused');
create index if not exists enrollments_profile_status_idx on public.enrollments (profile_id, status);
create index if not exists enrollments_org_due_idx on public.enrollments (organization_id, due_at) where archived_at is null;

create table if not exists public.lesson_progress (
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  status text not null default 'not_started',
  progress numeric(5,2) not null default 0,
  first_started_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  last_event_id uuid,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint lesson_progress_pkey primary key (enrollment_id, lesson_id),
  constraint lesson_progress_status_check check (status in ('not_started','in_progress','completed','waived','blocked')),
  constraint lesson_progress_value_check check (progress between 0 and 100),
  constraint lesson_progress_dates_check check (completed_at is null or first_started_at is null or completed_at >= first_started_at),
  constraint lesson_progress_version_check check (version > 0)
);

create index if not exists lesson_progress_activity_status_idx on public.lesson_progress (last_activity_at desc, status);

create table if not exists public.module_progress (
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete restrict,
  status text not null default 'not_started',
  progress numeric(5,2) not null default 0,
  completed_at timestamptz,
  last_event_id uuid,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint module_progress_pkey primary key (enrollment_id, module_id),
  constraint module_progress_status_check check (status in ('not_started','in_progress','completed','waived','blocked')),
  constraint module_progress_value_check check (progress between 0 and 100),
  constraint module_progress_version_check check (version > 0)
);

create index if not exists module_progress_status_updated_idx on public.module_progress (status, updated_at desc);

create table if not exists public.course_progress (
  enrollment_id uuid primary key references public.enrollments (id) on delete cascade,
  status text not null default 'not_started',
  progress numeric(5,2) not null default 0,
  mastery numeric(5,2),
  completed_at timestamptz,
  last_event_id uuid,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint course_progress_status_check check (status in ('not_started','in_progress','completed','waived','blocked')),
  constraint course_progress_value_check check (progress between 0 and 100 and (mastery is null or mastery between 0 and 100)),
  constraint course_progress_version_check check (version > 0)
);

create index if not exists course_progress_status_completed_idx on public.course_progress (status, completed_at desc);

create table if not exists public.learner_bookmarks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  resource_version_id uuid references public.resource_versions (id) on delete cascade,
  position jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_bookmarks_exactly_one_target check ((lesson_id is not null)::integer + (resource_version_id is not null)::integer = 1),
  constraint learner_bookmarks_position_check check (jsonb_typeof(position) = 'object')
);

create unique index if not exists learner_bookmarks_lesson_uq on public.learner_bookmarks (profile_id, lesson_id) where lesson_id is not null;
create unique index if not exists learner_bookmarks_resource_uq on public.learner_bookmarks (profile_id, resource_version_id) where resource_version_id is not null;
create index if not exists learner_bookmarks_org_profile_idx on public.learner_bookmarks (organization_id, profile_id);

create table if not exists public.learner_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  body_ciphertext text not null,
  visibility text not null default 'private',
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_notes_visibility_check check (visibility in ('private','self','assigned')),
  constraint learner_notes_version_check check (version > 0)
);

create index if not exists learner_notes_profile_lesson_idx on public.learner_notes (profile_id, lesson_id);
create index if not exists learner_notes_org_idx on public.learner_notes (organization_id);

create table if not exists public.learner_favorites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint learner_favorites_entity_type_check check (entity_type in ('course','learning_path','lesson','resource')),
  constraint learner_favorites_profile_entity_uq unique (profile_id, entity_type, entity_id)
);

create index if not exists learner_favorites_entity_idx on public.learner_favorites (entity_type, entity_id);
create index if not exists learner_favorites_org_profile_idx on public.learner_favorites (organization_id, profile_id);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  goal text not null,
  status text not null default 'active',
  starts_on date,
  ends_on date,
  source text not null default 'learner',
  ai_interaction_id uuid,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plans_status_check check (status in ('draft','active','completed','paused','archived')),
  constraint study_plans_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on),
  constraint study_plans_source_check check (source in ('learner','mentor','ai_recommendation','organization')),
  constraint study_plans_version_check check (version > 0)
);

create index if not exists study_plans_profile_status_idx on public.study_plans (profile_id, status);
create index if not exists study_plans_org_profile_idx on public.study_plans (organization_id, profile_id);

create or replace function private.has_platform_permission(required_permission text)
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
    where m.profile_id = auth.uid()
      and m.status = 'active'
      and m.ended_at is null
      and r.scope_type = 'platform'
      and p.key = required_permission
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
  )
$$;

create or replace function private.learning_scope_visible(target_organization_id uuid, target_status text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null
    and target_status = 'published'
    and (target_organization_id is null or private.is_active_org_member(target_organization_id))
$$;

create or replace function private.can_manage_learning_catalog()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$ select private.has_platform_permission('learning.catalog.manage') $$;

create or replace function private.can_read_organization_learning(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'organization.member.read')
    or private.has_platform_permission('learning.catalog.manage')
$$;

create or replace function private.can_read_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.courses c
    join public.learning_tracks t on t.id = c.track_id
    where c.id = target_course_id
      and c.archived_at is null
      and private.learning_scope_visible(c.organization_id, c.status)
      and private.learning_scope_visible(t.owner_organization_id, t.status)
  )
$$;

create or replace function private.can_read_course_version(target_course_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.course_versions cv
    where cv.id = target_course_version_id
      and cv.status = 'published'
      and private.can_read_course(cv.course_id)
  )
$$;

create or replace function private.can_read_lesson(target_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.course_module_id
    where l.id = target_lesson_id
      and l.archived_at is null
      and m.archived_at is null
      and private.can_read_course_version(m.course_version_id)
  )
$$;

create or replace function private.can_read_resource_version(target_resource_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.resource_versions rv
    join public.learning_resources r on r.id = rv.resource_id
    where rv.id = target_resource_version_id
      and rv.status = 'published'
      and r.archived_at is null
      and (
        (r.course_version_id is not null and private.can_read_course_version(r.course_version_id))
        or (r.lesson_version_id is not null and exists (
          select 1 from public.lesson_versions lv
          where lv.id = r.lesson_version_id and lv.status = 'published' and private.can_read_lesson(lv.lesson_id)
        ))
      )
  )
$$;

create or replace function private.can_read_learning_path_version(target_path_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.learning_path_versions lpv
    join public.learning_paths lp on lp.id = lpv.learning_path_id
    where lpv.id = target_path_version_id
      and lpv.status = 'published'
      and lp.archived_at is null
      and private.learning_scope_visible(lp.organization_id, lp.status)
  )
$$;

create or replace function private.can_read_enrollment(target_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.enrollments e
    where e.id = target_enrollment_id
      and (e.profile_id = auth.uid() or private.can_read_organization_learning(e.organization_id))
  )
$$;

create or replace function private.reject_published_version_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if old.status in ('published','superseded') then
    raise exception 'published learning versions are immutable' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

drop trigger if exists course_versions_reject_published_mutation on public.course_versions;
create trigger course_versions_reject_published_mutation before update or delete on public.course_versions for each row execute function private.reject_published_version_mutation();
drop trigger if exists lesson_versions_reject_published_mutation on public.lesson_versions;
create trigger lesson_versions_reject_published_mutation before update or delete on public.lesson_versions for each row execute function private.reject_published_version_mutation();
drop trigger if exists resource_versions_reject_published_mutation on public.resource_versions;
create trigger resource_versions_reject_published_mutation before update or delete on public.resource_versions for each row execute function private.reject_published_version_mutation();
drop trigger if exists learning_path_versions_reject_published_mutation on public.learning_path_versions;
create trigger learning_path_versions_reject_published_mutation before update or delete on public.learning_path_versions for each row execute function private.reject_published_version_mutation();

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values ('learning.catalog.manage', 'Create and manage global learning catalog content', 'high')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.organization_id is null
  and r.key in ('platform_admin','super_admin')
  and p.key = 'learning.catalog.manage'
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'learning_tracks','course_categories','courses','course_versions','course_modules','lessons',
    'lesson_versions','learning_resources','resource_versions','tags','course_tags','learning_paths',
    'learning_path_versions','learning_path_items','enrollments','lesson_progress','module_progress',
    'course_progress','learner_bookmarks','learner_notes','learner_favorites','study_plans'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

create policy learning_tracks_select on public.learning_tracks for select to authenticated using (private.learning_scope_visible(owner_organization_id, status) or private.can_manage_learning_catalog());
create policy course_categories_select on public.course_categories for select to authenticated using (private.learning_scope_visible(organization_id, status) or private.can_manage_learning_catalog());
create policy courses_select on public.courses for select to authenticated using (private.can_read_course(id) or private.can_manage_learning_catalog());
create policy course_versions_select on public.course_versions for select to authenticated using (private.can_read_course_version(id) or private.can_manage_learning_catalog());
create policy course_modules_select on public.course_modules for select to authenticated using (private.can_read_course_version(course_version_id) or private.can_manage_learning_catalog());
create policy lessons_select on public.lessons for select to authenticated using (private.can_read_lesson(id) or private.can_manage_learning_catalog());
create policy lesson_versions_select on public.lesson_versions for select to authenticated using ((status = 'published' and private.can_read_lesson(lesson_id)) or private.can_manage_learning_catalog());
create policy learning_resources_select on public.learning_resources for select to authenticated using ((course_version_id is not null and private.can_read_course_version(course_version_id)) or (lesson_version_id is not null and exists (select 1 from public.lesson_versions lv where lv.id = lesson_version_id and lv.status = 'published' and private.can_read_lesson(lv.lesson_id))) or private.can_manage_learning_catalog());
create policy resource_versions_select on public.resource_versions for select to authenticated using (private.can_read_resource_version(id) or private.can_manage_learning_catalog());
create policy tags_select on public.tags for select to authenticated using (private.learning_scope_visible(organization_id, status) or private.can_manage_learning_catalog());
create policy course_tags_select on public.course_tags for select to authenticated using (private.can_read_course(course_id) or private.can_manage_learning_catalog());
create policy learning_paths_select on public.learning_paths for select to authenticated using (private.learning_scope_visible(organization_id, status) or private.can_manage_learning_catalog());
create policy learning_path_versions_select on public.learning_path_versions for select to authenticated using (private.can_read_learning_path_version(id) or private.can_manage_learning_catalog());
create policy learning_path_items_select on public.learning_path_items for select to authenticated using (private.can_read_learning_path_version(learning_path_version_id) or private.can_manage_learning_catalog());

create policy learning_tracks_manage on public.learning_tracks for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy course_categories_manage on public.course_categories for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy courses_manage on public.courses for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy course_versions_manage on public.course_versions for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy course_modules_manage on public.course_modules for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy lessons_manage on public.lessons for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy lesson_versions_manage on public.lesson_versions for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy learning_resources_manage on public.learning_resources for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy resource_versions_manage on public.resource_versions for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy tags_manage on public.tags for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy course_tags_manage on public.course_tags for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy learning_paths_manage on public.learning_paths for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy learning_path_versions_manage on public.learning_path_versions for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());
create policy learning_path_items_manage on public.learning_path_items for all to authenticated using (private.can_manage_learning_catalog()) with check (private.can_manage_learning_catalog());

create policy enrollments_select on public.enrollments for select to authenticated using (profile_id = auth.uid() or private.can_read_organization_learning(organization_id));
create policy lesson_progress_select on public.lesson_progress for select to authenticated using (private.can_read_enrollment(enrollment_id));
create policy module_progress_select on public.module_progress for select to authenticated using (private.can_read_enrollment(enrollment_id));
create policy course_progress_select on public.course_progress for select to authenticated using (private.can_read_enrollment(enrollment_id));

create policy learner_bookmarks_select_self on public.learner_bookmarks for select to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_bookmarks_insert_self on public.learner_bookmarks for insert to authenticated with check (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_bookmarks_update_self on public.learner_bookmarks for update to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id)) with check (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_bookmarks_delete_self on public.learner_bookmarks for delete to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));

create policy learner_notes_select_self on public.learner_notes for select to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_notes_insert_self on public.learner_notes for insert to authenticated with check (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_notes_update_self on public.learner_notes for update to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id)) with check (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_notes_delete_self on public.learner_notes for delete to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));

create policy learner_favorites_select_self on public.learner_favorites for select to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_favorites_insert_self on public.learner_favorites for insert to authenticated with check (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_favorites_update_self on public.learner_favorites for update to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id)) with check (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy learner_favorites_delete_self on public.learner_favorites for delete to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));

create policy study_plans_select_self on public.study_plans for select to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));
create policy study_plans_insert_self on public.study_plans for insert to authenticated with check (profile_id = auth.uid() and private.is_active_org_member(organization_id) and source = 'learner' and ai_interaction_id is null);
create policy study_plans_update_self on public.study_plans for update to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id)) with check (profile_id = auth.uid() and private.is_active_org_member(organization_id) and source = 'learner' and ai_interaction_id is null);
create policy study_plans_delete_self on public.study_plans for delete to authenticated using (profile_id = auth.uid() and private.is_active_org_member(organization_id));

grant select on public.learning_tracks, public.course_categories, public.courses, public.course_versions,
  public.course_modules, public.lessons, public.lesson_versions, public.learning_resources,
  public.resource_versions, public.tags, public.course_tags, public.learning_paths,
  public.learning_path_versions, public.learning_path_items, public.enrollments,
  public.lesson_progress, public.module_progress, public.course_progress to authenticated;

grant insert, update, delete on public.learning_tracks, public.course_categories, public.courses,
  public.course_versions, public.course_modules, public.lessons, public.lesson_versions,
  public.learning_resources, public.resource_versions, public.tags, public.course_tags,
  public.learning_paths, public.learning_path_versions, public.learning_path_items to authenticated;

grant select, insert, update, delete on public.learner_bookmarks, public.learner_notes,
  public.learner_favorites, public.study_plans to authenticated;

revoke all on function private.has_platform_permission(text) from public;
revoke all on function private.learning_scope_visible(uuid, text) from public;
revoke all on function private.can_manage_learning_catalog() from public;
revoke all on function private.can_read_organization_learning(uuid) from public;
revoke all on function private.can_read_course(uuid) from public;
revoke all on function private.can_read_course_version(uuid) from public;
revoke all on function private.can_read_lesson(uuid) from public;
revoke all on function private.can_read_resource_version(uuid) from public;
revoke all on function private.can_read_learning_path_version(uuid) from public;
revoke all on function private.can_read_enrollment(uuid) from public;

grant execute on function private.has_platform_permission(text) to authenticated;
grant execute on function private.learning_scope_visible(uuid, text) to authenticated;
grant execute on function private.can_manage_learning_catalog() to authenticated;
grant execute on function private.can_read_organization_learning(uuid) to authenticated;
grant execute on function private.can_read_course(uuid) to authenticated;
grant execute on function private.can_read_course_version(uuid) to authenticated;
grant execute on function private.can_read_lesson(uuid) to authenticated;
grant execute on function private.can_read_resource_version(uuid) to authenticated;
grant execute on function private.can_read_learning_path_version(uuid) to authenticated;
grant execute on function private.can_read_enrollment(uuid) to authenticated;
