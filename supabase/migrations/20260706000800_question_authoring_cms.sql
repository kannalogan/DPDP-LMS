-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-011
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S4/S5 question and assessment authoring CMS; supabase/tests/010_question_authoring_test.sql
-- SYRA-IMMUTABLE: question publications, authoring events, and question change logs are append-only evidence
-- SYRA-SEED: deployment-reference
-- Assessment runtime tables are reused; learner assessment routes and attempt logic are not modified.

create table if not exists public.assessment_workflow_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  key text not null,
  label text not null,
  position integer not null default 0,
  terminal boolean not null default false,
  created_at timestamptz not null default now(),
  constraint assessment_workflow_states_key_check check (key in ('draft','review','approved','scheduled','published','archived','rejected')),
  constraint assessment_workflow_states_position_check check (position >= 0)
);
create unique index if not exists assessment_workflow_states_org_key_uq on public.assessment_workflow_states (organization_id, key) where organization_id is not null;
create unique index if not exists assessment_workflow_states_global_key_uq on public.assessment_workflow_states (key) where organization_id is null;

create table if not exists public.question_bank_members (
  id uuid primary key default gen_random_uuid(),
  question_bank_id uuid not null references public.question_banks (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'author',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint question_bank_members_role_check check (role in ('owner','author','reviewer','publisher')),
  constraint question_bank_members_status_check check (status in ('active','suspended','ended')),
  constraint question_bank_members_unique unique (question_bank_id, profile_id, role)
);
create index if not exists question_bank_members_profile_idx on public.question_bank_members (profile_id, status);

create table if not exists public.question_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  parent_id uuid references public.question_categories (id) on delete restrict,
  slug extensions.citext not null,
  name text not null,
  status text not null default 'active',
  position integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint question_categories_no_self_parent check (parent_id is null or parent_id <> id),
  constraint question_categories_slug_check check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint question_categories_status_check check (status in ('active','archived')),
  constraint question_categories_position_check check (position >= 0),
  constraint question_categories_version_check check (version > 0)
);
create unique index if not exists question_categories_tenant_slug_uq on public.question_categories (organization_id, slug) where organization_id is not null;
create unique index if not exists question_categories_global_slug_uq on public.question_categories (slug) where organization_id is null;

create table if not exists public.question_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  key text not null,
  label text not null,
  category text not null default 'general',
  status text not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint question_tags_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint question_tags_status_check check (status in ('active','archived')),
  constraint question_tags_version_check check (version > 0)
);
create unique index if not exists question_tags_tenant_key_uq on public.question_tags (organization_id, key) where organization_id is not null;
create unique index if not exists question_tags_global_key_uq on public.question_tags (key) where organization_id is null;

create table if not exists public.question_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  question_bank_id uuid not null references public.question_banks (id) on delete restrict,
  question_id uuid references public.questions (id) on delete restrict,
  category_id uuid references public.question_categories (id) on delete restrict,
  type text not null,
  prompt jsonb not null default '{}'::jsonb,
  choices jsonb not null default '[]'::jsonb,
  answer_key_ciphertext text,
  difficulty text not null default 'intermediate',
  estimated_seconds integer not null default 60,
  bloom_level text not null default 'understand',
  learning_outcomes jsonb not null default '[]'::jsonb,
  locale text not null default 'en',
  workflow_state text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  lock_version integer not null default 1,
  owner_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint question_drafts_type_check check (type in ('single_choice','multiple_choice','true_false','fill_blank','matching','ordering','essay','file_upload','coding','scenario','case_study','practical_lab_reference')),
  constraint question_drafts_prompt_check check (jsonb_typeof(prompt) = 'object'),
  constraint question_drafts_choices_check check (jsonb_typeof(choices) = 'array'),
  constraint question_drafts_difficulty_check check (difficulty in ('introductory','intermediate','advanced','expert')),
  constraint question_drafts_duration_check check (estimated_seconds > 0),
  constraint question_drafts_bloom_check check (bloom_level in ('remember','understand','apply','analyze','evaluate','create')),
  constraint question_drafts_outcomes_check check (jsonb_typeof(learning_outcomes) = 'array'),
  constraint question_drafts_locale_check check (locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint question_drafts_workflow_check check (workflow_state in ('draft','review','approved','scheduled','published','archived','rejected')),
  constraint question_drafts_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint question_drafts_lock_version_check check (lock_version > 0)
);
create index if not exists question_drafts_org_state_idx on public.question_drafts (organization_id, workflow_state, updated_at desc);
create index if not exists question_drafts_bank_type_idx on public.question_drafts (question_bank_id, type, workflow_state);

create table if not exists public.question_tag_assignments (
  question_draft_id uuid not null references public.question_drafts (id) on delete cascade,
  question_tag_id uuid not null references public.question_tags (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint question_tag_assignments_pkey primary key (question_draft_id, question_tag_id)
);
create index if not exists question_tag_assignments_tag_idx on public.question_tag_assignments (question_tag_id);

create table if not exists public.question_collections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  question_bank_id uuid references public.question_banks (id) on delete restrict,
  name text not null,
  description text not null default '',
  status text not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint question_collections_name_check check (length(btrim(name)) between 1 and 200),
  constraint question_collections_status_check check (status in ('draft','published','archived')),
  constraint question_collections_version_check check (version > 0)
);
create index if not exists question_collections_org_status_idx on public.question_collections (organization_id, status);

create table if not exists public.collection_questions (
  collection_id uuid not null references public.question_collections (id) on delete cascade,
  question_draft_id uuid not null references public.question_drafts (id) on delete restrict,
  position integer not null,
  points numeric(8,2) not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint collection_questions_pkey primary key (collection_id, question_draft_id),
  constraint collection_questions_position_uq unique (collection_id, position),
  constraint collection_questions_position_check check (position > 0),
  constraint collection_questions_points_check check (points > 0)
);

create table if not exists public.question_review_comments (
  id uuid primary key default gen_random_uuid(),
  question_draft_id uuid not null references public.question_drafts (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete restrict,
  author_profile_id uuid not null references public.profiles (id) on delete restrict,
  body_ciphertext text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint question_review_comments_status_check check (status in ('open','resolved','dismissed')),
  constraint question_review_comments_body_check check (length(body_ciphertext) >= 24)
);
create index if not exists question_review_comments_draft_status_idx on public.question_review_comments (question_draft_id, status, created_at desc);

create table if not exists public.question_publications (
  id uuid primary key default gen_random_uuid(),
  question_draft_id uuid not null references public.question_drafts (id) on delete restrict,
  question_id uuid not null references public.questions (id) on delete restrict,
  question_version_id uuid not null references public.question_versions (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  publication_status text not null default 'published',
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  content_hash text not null,
  evidence jsonb not null default '{}'::jsonb,
  constraint question_publications_status_check check (publication_status in ('published','archived','rollback_prepared')),
  constraint question_publications_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint question_publications_evidence_check check (jsonb_typeof(evidence) = 'object')
);
create index if not exists question_publications_question_time_idx on public.question_publications (question_id, published_at desc);

create table if not exists public.question_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  question_bank_id uuid not null references public.question_banks (id) on delete restrict,
  source_type text not null,
  status text not null default 'queued',
  dry_run boolean not null default true,
  file_object_id uuid references public.storage_objects (id) on delete restrict,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint question_import_jobs_source_check check (source_type in ('csv','json','question_package')),
  constraint question_import_jobs_status_check check (status in ('queued','validating','validated','imported','failed','cancelled')),
  constraint question_import_jobs_summary_check check (jsonb_typeof(summary) = 'object')
);
create index if not exists question_import_jobs_org_status_idx on public.question_import_jobs (organization_id, status, created_at desc);

create table if not exists public.question_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.question_import_jobs (id) on delete cascade,
  row_number integer not null,
  raw_payload jsonb not null,
  validation_status text not null default 'pending',
  validation_errors jsonb not null default '[]'::jsonb,
  duplicate_of_question_id uuid references public.questions (id) on delete restrict,
  created_question_draft_id uuid references public.question_drafts (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint question_import_rows_row_check check (row_number > 0),
  constraint question_import_rows_payload_check check (jsonb_typeof(raw_payload) = 'object'),
  constraint question_import_rows_status_check check (validation_status in ('pending','valid','invalid','duplicate','imported')),
  constraint question_import_rows_errors_check check (jsonb_typeof(validation_errors) = 'array'),
  constraint question_import_rows_job_row_uq unique (import_job_id, row_number)
);

create table if not exists public.assessment_blueprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  course_id uuid references public.courses (id) on delete restrict,
  name text not null,
  kind text not null default 'quiz',
  rules jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint assessment_blueprints_name_check check (length(btrim(name)) between 1 and 200),
  constraint assessment_blueprints_kind_check check (kind in ('quiz','exam','assignment','practical','survey','diagnostic','mock_interview')),
  constraint assessment_blueprints_rules_check check (jsonb_typeof(rules) = 'object'),
  constraint assessment_blueprints_status_check check (status in ('draft','review','approved','published','archived')),
  constraint assessment_blueprints_version_check check (version > 0)
);
create index if not exists assessment_blueprints_org_status_idx on public.assessment_blueprints (organization_id, status);

create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  assessment_blueprint_id uuid references public.assessment_blueprints (id) on delete restrict,
  assessment_id uuid references public.assessments (id) on delete restrict,
  title text not null,
  instructions jsonb not null default '{}'::jsonb,
  randomization_policy jsonb not null default '{}'::jsonb,
  workflow_state text not null default 'draft',
  version integer not null default 1,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint assessment_templates_title_check check (length(btrim(title)) between 1 and 300),
  constraint assessment_templates_instructions_check check (jsonb_typeof(instructions) = 'object'),
  constraint assessment_templates_randomization_check check (jsonb_typeof(randomization_policy) = 'object'),
  constraint assessment_templates_workflow_check check (workflow_state in ('draft','review','approved','scheduled','published','archived','rejected')),
  constraint assessment_templates_version_check check (version > 0)
);
create index if not exists assessment_templates_org_state_idx on public.assessment_templates (organization_id, workflow_state, updated_at desc);

create table if not exists public.assessment_section_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_template_id uuid not null references public.assessment_templates (id) on delete cascade,
  question_draft_id uuid not null references public.question_drafts (id) on delete restrict,
  section_key text not null,
  position integer not null,
  points numeric(8,2) not null default 1,
  required boolean not null default true,
  randomization_group text,
  created_at timestamptz not null default now(),
  constraint assessment_section_questions_key_check check (section_key ~ '^[a-z][a-z0-9_-]*$'),
  constraint assessment_section_questions_position_check check (position > 0),
  constraint assessment_section_questions_points_check check (points > 0),
  constraint assessment_section_questions_template_position_uq unique (assessment_template_id, section_key, position)
);
create index if not exists assessment_section_questions_question_idx on public.assessment_section_questions (question_draft_id);

create table if not exists public.assessment_review_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  reviewer_profile_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'assigned',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint assessment_review_assignments_target_check check (target_type in ('question_draft','assessment_template')),
  constraint assessment_review_assignments_status_check check (status in ('assigned','completed','declined','cancelled')),
  constraint assessment_review_assignments_target_reviewer_uq unique (target_type, target_id, reviewer_profile_id)
);
create index if not exists assessment_review_assignments_reviewer_idx on public.assessment_review_assignments (reviewer_profile_id, status, due_at);

create table if not exists public.assessment_authoring_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  target_type text not null,
  target_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint assessment_authoring_events_target_check check (target_type in ('question_draft','assessment_template','import_job','collection')),
  constraint assessment_authoring_events_type_check check (event_type ~ '^[a-z][a-z0-9_.-]*$'),
  constraint assessment_authoring_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);
create index if not exists assessment_authoring_events_org_time_idx on public.assessment_authoring_events (organization_id, occurred_at desc);

create table if not exists public.question_change_logs (
  id uuid primary key default gen_random_uuid(),
  question_draft_id uuid not null references public.question_drafts (id) on delete restrict,
  question_version_id uuid references public.question_versions (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  change_type text not null,
  summary text not null,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint question_change_logs_type_check check (change_type in ('draft_created','autosave','submitted','approved','rejected','published','archived','cloned','imported')),
  constraint question_change_logs_diff_check check (jsonb_typeof(diff) = 'object')
);
create index if not exists question_change_logs_draft_time_idx on public.question_change_logs (question_draft_id, created_at desc);

create table if not exists public.question_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  question_draft_id uuid not null references public.question_drafts (id) on delete cascade,
  storage_object_id uuid references public.storage_objects (id) on delete restrict,
  external_url text,
  media_type text not null,
  alt_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint question_media_target_check check ((storage_object_id is not null)::integer + (external_url is not null)::integer = 1),
  constraint question_media_url_check check (external_url is null or external_url ~ '^https://'),
  constraint question_media_type_check check (media_type in ('image','audio','video','document','dataset','code_fixture')),
  constraint question_media_metadata_check check (jsonb_typeof(metadata) = 'object')
);
create index if not exists question_media_draft_type_idx on public.question_media (question_draft_id, media_type);

create table if not exists public.question_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  question_draft_id uuid not null references public.question_drafts (id) on delete cascade,
  asset_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint question_assets_type_check check (asset_type in ('starter_code','test_case','rubric','lab_reference','download','external_link')),
  constraint question_assets_payload_check check (jsonb_typeof(payload) = 'object')
);
create index if not exists question_assets_draft_type_idx on public.question_assets (question_draft_id, asset_type);

create or replace view public.question_authoring_overview
with (security_invoker = true)
as
select
  d.id as question_draft_id,
  d.organization_id,
  d.question_bank_id,
  d.question_id,
  b.name as bank_name,
  d.type,
  d.workflow_state,
  d.difficulty,
  d.bloom_level,
  d.locale,
  d.estimated_seconds,
  d.updated_at,
  d.owner_profile_id,
  coalesce(jsonb_array_length(d.learning_outcomes), 0) as outcome_count,
  count(distinct c.id) filter (where c.status = 'open') as open_comments
from public.question_drafts d
join public.question_banks b on b.id = d.question_bank_id
left join public.question_review_comments c on c.question_draft_id = d.id
group by d.id, b.name;

create or replace view public.assessment_template_authoring_overview
with (security_invoker = true)
as
select
  t.id as assessment_template_id,
  t.organization_id,
  t.assessment_id,
  t.title,
  t.workflow_state,
  t.version,
  t.updated_at,
  t.owner_profile_id,
  count(distinct sq.id) as question_count,
  count(distinct sq.section_key) as section_count
from public.assessment_templates t
left join public.assessment_section_questions sq on sq.assessment_template_id = t.id
group by t.id;

create or replace function private.can_author_assessment_content(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'question.authoring.manage')
    or private.has_permission(target_organization_id, 'assessment.catalog.manage')
    or private.has_permission(target_organization_id, 'admin.workspace.manage')
    or private.has_permission(target_organization_id, 'mentor.workspace.manage')
    or private.has_platform_permission('question.authoring.manage')
$$;

create or replace function private.can_publish_assessment_content(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.has_permission(target_organization_id, 'question.authoring.manage')
    or private.has_permission(target_organization_id, 'assessment.catalog.manage')
    or private.has_permission(target_organization_id, 'admin.workspace.manage')
    or private.has_platform_permission('question.authoring.manage')
$$;

create or replace function private.reject_question_authoring_evidence_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'question authoring evidence is append-only' using errcode = '55000';
end
$$;

create or replace function private.validate_question_authoring_payload(p_type text, p_prompt jsonb, p_choices jsonb)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select p_type in ('single_choice','multiple_choice','true_false','fill_blank','matching','ordering','essay','file_upload','coding','scenario','case_study','practical_lab_reference')
    and jsonb_typeof(coalesce(p_prompt, '{}'::jsonb)) = 'object'
    and jsonb_typeof(coalesce(p_choices, '[]'::jsonb)) = 'array'
$$;

drop trigger if exists question_publications_reject_mutation on public.question_publications;
create trigger question_publications_reject_mutation before update or delete on public.question_publications for each row execute function private.reject_question_authoring_evidence_mutation();
drop trigger if exists assessment_authoring_events_reject_mutation on public.assessment_authoring_events;
create trigger assessment_authoring_events_reject_mutation before update or delete on public.assessment_authoring_events for each row execute function private.reject_question_authoring_evidence_mutation();
drop trigger if exists question_change_logs_reject_mutation on public.question_change_logs;
create trigger question_change_logs_reject_mutation before update or delete on public.question_change_logs for each row execute function private.reject_question_authoring_evidence_mutation();

create or replace function public.create_question(p_organization_id uuid, p_question_bank_id uuid, p_type text, p_prompt jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_draft_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not private.can_author_assessment_content(p_organization_id) then raise exception 'question creation denied' using errcode = '42501'; end if;
  insert into public.question_drafts (organization_id, question_bank_id, type, prompt, owner_profile_id, created_by, updated_by)
  values (p_organization_id, p_question_bank_id, p_type, coalesce(p_prompt, '{}'::jsonb), auth.uid(), auth.uid(), auth.uid())
  returning id into v_draft_id;
  insert into public.question_change_logs (question_draft_id, organization_id, change_type, summary, created_by)
  values (v_draft_id, p_organization_id, 'draft_created', 'Question draft created', auth.uid());
  return v_draft_id;
end
$$;

create or replace function public.save_question(p_question_draft_id uuid, p_prompt jsonb, p_choices jsonb, p_metadata jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.question_drafts where id = p_question_draft_id for update;
  if v_org is null or not private.can_author_assessment_content(v_org) then raise exception 'question save denied' using errcode = '42501'; end if;
  update public.question_drafts
  set prompt = coalesce(p_prompt, '{}'::jsonb),
      choices = coalesce(p_choices, '[]'::jsonb),
      metadata = coalesce(p_metadata, '{}'::jsonb),
      lock_version = lock_version + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_question_draft_id and workflow_state in ('draft','rejected');
  if not found then raise exception 'question draft is not editable' using errcode = '55000'; end if;
  insert into public.question_change_logs (question_draft_id, organization_id, change_type, summary, created_by)
  values (p_question_draft_id, v_org, 'autosave', 'Question draft autosaved', auth.uid());
  return true;
end
$$;

create or replace function public.approve_question(p_question_draft_id uuid, p_notes text default null)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.question_drafts where id = p_question_draft_id for update;
  if v_org is null or not private.can_publish_assessment_content(v_org) then raise exception 'question approval denied' using errcode = '42501'; end if;
  update public.question_drafts set workflow_state = 'approved', approved_at = now(), updated_at = now(), updated_by = auth.uid() where id = p_question_draft_id and workflow_state in ('review','draft');
  insert into public.question_change_logs (question_draft_id, organization_id, change_type, summary, diff, created_by)
  values (p_question_draft_id, v_org, 'approved', 'Question approved', jsonb_build_object('notes', p_notes), auth.uid());
  return found;
end
$$;

create or replace function public.reject_question(p_question_draft_id uuid, p_notes text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.question_drafts where id = p_question_draft_id for update;
  if v_org is null or not private.can_publish_assessment_content(v_org) then raise exception 'question rejection denied' using errcode = '42501'; end if;
  update public.question_drafts set workflow_state = 'rejected', updated_at = now(), updated_by = auth.uid() where id = p_question_draft_id and workflow_state in ('review','draft');
  insert into public.question_change_logs (question_draft_id, organization_id, change_type, summary, diff, created_by)
  values (p_question_draft_id, v_org, 'rejected', 'Question rejected', jsonb_build_object('notes', p_notes), auth.uid());
  return found;
end
$$;

create or replace function public.publish_question(p_question_draft_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_draft public.question_drafts%rowtype;
  v_question_id uuid;
  v_version integer;
  v_question_version_id uuid;
  v_publication_id uuid;
  v_hash text;
  v_runtime_type text;
begin
  select * into v_draft from public.question_drafts where id = p_question_draft_id for update;
  if v_draft.id is null or not private.can_publish_assessment_content(v_draft.organization_id) then raise exception 'question publication denied' using errcode = '42501'; end if;
  if v_draft.workflow_state not in ('approved','scheduled') then raise exception 'question must be approved or scheduled' using errcode = '55000'; end if;
  v_runtime_type := case v_draft.type
    when 'fill_blank' then 'short_text'
    when 'essay' then 'long_text'
    when 'coding' then 'file_upload'
    when 'scenario' then 'long_text'
    when 'case_study' then 'long_text'
    when 'practical_lab_reference' then 'file_upload'
    else v_draft.type
  end;
  v_hash := encode(extensions.digest(v_draft.prompt::text || v_draft.choices::text || v_draft.metadata::text, 'sha256'), 'hex');
  if v_draft.question_id is null then
    insert into public.questions (question_bank_id, type, status, created_by, updated_by)
    values (v_draft.question_bank_id, v_runtime_type, 'published', auth.uid(), auth.uid())
    returning id into v_question_id;
  else
    v_question_id := v_draft.question_id;
    update public.questions set status = 'published', updated_at = now(), updated_by = auth.uid(), version = version + 1 where id = v_question_id;
    update public.question_versions set status = 'superseded' where question_id = v_question_id and status = 'published';
  end if;
  select coalesce(max(version), 0) + 1 into v_version from public.question_versions where question_id = v_question_id;
  insert into public.question_versions (question_id, version, prompt, difficulty, locale, tags, max_score, status, published_at, content_hash, created_by, updated_by)
  values (v_question_id, v_version, v_draft.prompt || jsonb_build_object('authoringType', v_draft.type, 'choices', v_draft.choices), v_draft.difficulty, v_draft.locale, '{}', 1, 'published', now(), v_hash, auth.uid(), auth.uid())
  returning id into v_question_version_id;
  update public.question_drafts set question_id = v_question_id, workflow_state = 'published', published_at = now(), updated_at = now(), updated_by = auth.uid() where id = p_question_draft_id;
  insert into public.question_publications (question_draft_id, question_id, question_version_id, organization_id, published_by, content_hash, evidence)
  values (p_question_draft_id, v_question_id, v_question_version_id, v_draft.organization_id, auth.uid(), v_hash, jsonb_build_object('authoringType', v_draft.type, 'runtimeType', v_runtime_type))
  returning id into v_publication_id;
  insert into public.question_change_logs (question_draft_id, question_version_id, organization_id, change_type, summary, created_by)
  values (p_question_draft_id, v_question_version_id, v_draft.organization_id, 'published', 'Question published', auth.uid());
  return v_publication_id;
end
$$;

create or replace function public.archive_question(p_question_draft_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid; v_question_id uuid;
begin
  select organization_id, question_id into v_org, v_question_id from public.question_drafts where id = p_question_draft_id for update;
  if v_org is null or not private.can_publish_assessment_content(v_org) then raise exception 'question archive denied' using errcode = '42501'; end if;
  update public.question_drafts set workflow_state = 'archived', archived_at = now(), updated_at = now(), updated_by = auth.uid() where id = p_question_draft_id;
  if v_question_id is not null then update public.questions set status = 'archived', archived_at = now(), updated_at = now(), updated_by = auth.uid() where id = v_question_id; end if;
  insert into public.question_change_logs (question_draft_id, organization_id, change_type, summary, created_by)
  values (p_question_draft_id, v_org, 'archived', 'Question archived', auth.uid());
  return true;
end
$$;

create or replace function public.clone_question(p_question_draft_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_source public.question_drafts%rowtype; v_clone_id uuid;
begin
  select * into v_source from public.question_drafts where id = p_question_draft_id;
  if v_source.id is null or not private.can_author_assessment_content(v_source.organization_id) then raise exception 'question clone denied' using errcode = '42501'; end if;
  insert into public.question_drafts (organization_id, question_bank_id, category_id, type, prompt, choices, difficulty, estimated_seconds, bloom_level, learning_outcomes, locale, metadata, owner_profile_id, created_by, updated_by)
  values (v_source.organization_id, v_source.question_bank_id, v_source.category_id, v_source.type, v_source.prompt, v_source.choices, v_source.difficulty, v_source.estimated_seconds, v_source.bloom_level, v_source.learning_outcomes, v_source.locale, v_source.metadata, auth.uid(), auth.uid(), auth.uid())
  returning id into v_clone_id;
  insert into public.question_change_logs (question_draft_id, organization_id, change_type, summary, created_by)
  values (v_clone_id, v_source.organization_id, 'cloned', 'Question cloned', auth.uid());
  return v_clone_id;
end
$$;

create or replace function public.create_collection(p_organization_id uuid, p_question_bank_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_collection_id uuid;
begin
  if not private.can_author_assessment_content(p_organization_id) then raise exception 'collection creation denied' using errcode = '42501'; end if;
  insert into public.question_collections (organization_id, question_bank_id, name, created_by, updated_by)
  values (p_organization_id, p_question_bank_id, p_name, auth.uid(), auth.uid())
  returning id into v_collection_id;
  return v_collection_id;
end
$$;

create or replace function public.add_question_to_collection(p_collection_id uuid, p_question_draft_id uuid, p_position integer, p_points numeric default 1)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.question_collections where id = p_collection_id;
  if v_org is null or not private.can_author_assessment_content(v_org) then raise exception 'collection update denied' using errcode = '42501'; end if;
  insert into public.collection_questions (collection_id, question_draft_id, position, points, created_by)
  values (p_collection_id, p_question_draft_id, p_position, coalesce(p_points, 1), auth.uid())
  on conflict (collection_id, question_draft_id) do update set position = excluded.position, points = excluded.points;
  return true;
end
$$;

create or replace function public.remove_question_from_collection(p_collection_id uuid, p_question_draft_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.question_collections where id = p_collection_id;
  if v_org is null or not private.can_author_assessment_content(v_org) then raise exception 'collection removal denied' using errcode = '42501'; end if;
  delete from public.collection_questions where collection_id = p_collection_id and question_draft_id = p_question_draft_id;
  return found;
end
$$;

create or replace function public.create_assessment_template(p_organization_id uuid, p_title text, p_blueprint_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_template_id uuid;
begin
  if not private.can_author_assessment_content(p_organization_id) then raise exception 'assessment template creation denied' using errcode = '42501'; end if;
  insert into public.assessment_templates (organization_id, assessment_blueprint_id, title, owner_profile_id, created_by, updated_by)
  values (p_organization_id, p_blueprint_id, p_title, auth.uid(), auth.uid(), auth.uid())
  returning id into v_template_id;
  return v_template_id;
end
$$;

create or replace function public.save_assessment_template(p_template_id uuid, p_title text, p_instructions jsonb, p_randomization_policy jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.assessment_templates where id = p_template_id for update;
  if v_org is null or not private.can_author_assessment_content(v_org) then raise exception 'assessment template save denied' using errcode = '42501'; end if;
  update public.assessment_templates
  set title = p_title, instructions = coalesce(p_instructions, '{}'::jsonb), randomization_policy = coalesce(p_randomization_policy, '{}'::jsonb), version = version + 1, updated_at = now(), updated_by = auth.uid()
  where id = p_template_id and workflow_state in ('draft','rejected');
  return found;
end
$$;

create or replace function public.publish_assessment_template(p_template_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.assessment_templates where id = p_template_id for update;
  if v_org is null or not private.can_publish_assessment_content(v_org) then raise exception 'assessment template publish denied' using errcode = '42501'; end if;
  update public.assessment_templates set workflow_state = 'published', published_at = now(), updated_at = now(), updated_by = auth.uid() where id = p_template_id and workflow_state in ('approved','scheduled','draft');
  insert into public.assessment_authoring_events (organization_id, actor_profile_id, target_type, target_id, event_type)
  values (v_org, auth.uid(), 'assessment_template', p_template_id, 'assessment_template.published');
  return found;
end
$$;

create or replace function public.assign_reviewer(p_organization_id uuid, p_target_type text, p_target_id uuid, p_reviewer_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_assignment_id uuid;
begin
  if not private.can_publish_assessment_content(p_organization_id) then raise exception 'review assignment denied' using errcode = '42501'; end if;
  insert into public.assessment_review_assignments (organization_id, target_type, target_id, reviewer_profile_id, created_by)
  values (p_organization_id, p_target_type, p_target_id, p_reviewer_profile_id, auth.uid())
  returning id into v_assignment_id;
  return v_assignment_id;
end
$$;

create or replace function public.record_authoring_event(p_organization_id uuid, p_target_type text, p_target_id uuid, p_event_type text, p_metadata jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_event_id uuid;
begin
  if not private.can_author_assessment_content(p_organization_id) then raise exception 'authoring event denied' using errcode = '42501'; end if;
  insert into public.assessment_authoring_events (organization_id, actor_profile_id, target_type, target_id, event_type, metadata)
  values (p_organization_id, auth.uid(), p_target_type, p_target_id, p_event_type, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_event_id;
  return v_event_id;
end
$$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values ('question.authoring.manage', 'Manage question bank and assessment authoring drafts, imports, reviews, and publishing', 'critical')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.organization_id is null
  and r.key in ('mentor','instructor','organization_admin','enterprise_admin','platform_admin','super_admin')
  and p.key = 'question.authoring.manage'
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'assessment_workflow_states','question_bank_members','question_categories','question_tags',
    'question_drafts','question_tag_assignments','question_collections','collection_questions',
    'question_review_comments','question_publications','question_import_jobs','question_import_rows',
    'assessment_blueprints','assessment_templates','assessment_section_questions',
    'assessment_review_assignments','assessment_authoring_events','question_change_logs',
    'question_media','question_assets'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

create policy assessment_workflow_states_author_select on public.assessment_workflow_states for select to authenticated using (organization_id is null or private.can_author_assessment_content(organization_id));
create policy question_bank_members_author_select on public.question_bank_members for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_categories_author_select on public.question_categories for select to authenticated using (organization_id is null or private.can_author_assessment_content(organization_id));
create policy question_tags_author_select on public.question_tags for select to authenticated using (organization_id is null or private.can_author_assessment_content(organization_id));
create policy question_drafts_author_select on public.question_drafts for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_tag_assignments_author_select on public.question_tag_assignments for select to authenticated using (exists (select 1 from public.question_drafts d where d.id = question_draft_id and private.can_author_assessment_content(d.organization_id)));
create policy question_collections_author_select on public.question_collections for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy collection_questions_author_select on public.collection_questions for select to authenticated using (exists (select 1 from public.question_collections c where c.id = collection_id and private.can_author_assessment_content(c.organization_id)));
create policy question_review_comments_author_select on public.question_review_comments for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_publications_author_select on public.question_publications for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_import_jobs_author_select on public.question_import_jobs for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_import_rows_author_select on public.question_import_rows for select to authenticated using (exists (select 1 from public.question_import_jobs j where j.id = import_job_id and private.can_author_assessment_content(j.organization_id)));
create policy assessment_blueprints_author_select on public.assessment_blueprints for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy assessment_templates_author_select on public.assessment_templates for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy assessment_section_questions_author_select on public.assessment_section_questions for select to authenticated using (exists (select 1 from public.assessment_templates t where t.id = assessment_template_id and private.can_author_assessment_content(t.organization_id)));
create policy assessment_review_assignments_author_select on public.assessment_review_assignments for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy assessment_authoring_events_author_select on public.assessment_authoring_events for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_change_logs_author_select on public.question_change_logs for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_media_author_select on public.question_media for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));
create policy question_assets_author_select on public.question_assets for select to authenticated using (organization_id is not null and private.can_author_assessment_content(organization_id));

grant select on public.assessment_workflow_states, public.question_bank_members,
  public.question_categories, public.question_tags, public.question_drafts,
  public.question_tag_assignments, public.question_collections, public.collection_questions,
  public.question_review_comments, public.question_publications, public.question_import_jobs,
  public.question_import_rows, public.assessment_blueprints, public.assessment_templates,
  public.assessment_section_questions, public.assessment_review_assignments,
  public.assessment_authoring_events, public.question_change_logs, public.question_media,
  public.question_assets to authenticated;
grant select on public.question_authoring_overview, public.assessment_template_authoring_overview to authenticated;

revoke all on function private.can_author_assessment_content(uuid) from public;
revoke all on function private.can_publish_assessment_content(uuid) from public;
revoke all on function private.reject_question_authoring_evidence_mutation() from public;
revoke all on function private.validate_question_authoring_payload(text, jsonb, jsonb) from public;
revoke all on function public.create_question(uuid, uuid, text, jsonb) from public;
revoke all on function public.save_question(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.publish_question(uuid) from public;
revoke all on function public.archive_question(uuid) from public;
revoke all on function public.clone_question(uuid) from public;
revoke all on function public.create_collection(uuid, uuid, text) from public;
revoke all on function public.add_question_to_collection(uuid, uuid, integer, numeric) from public;
revoke all on function public.remove_question_from_collection(uuid, uuid) from public;
revoke all on function public.create_assessment_template(uuid, text, uuid) from public;
revoke all on function public.save_assessment_template(uuid, text, jsonb, jsonb) from public;
revoke all on function public.publish_assessment_template(uuid) from public;
revoke all on function public.assign_reviewer(uuid, text, uuid, uuid) from public;
revoke all on function public.approve_question(uuid, text) from public;
revoke all on function public.reject_question(uuid, text) from public;
revoke all on function public.record_authoring_event(uuid, text, uuid, text, jsonb) from public;

grant execute on function private.can_author_assessment_content(uuid) to authenticated;
grant execute on function private.can_publish_assessment_content(uuid) to authenticated;
grant execute on function private.validate_question_authoring_payload(text, jsonb, jsonb) to authenticated;
grant execute on function public.create_question(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.save_question(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.publish_question(uuid) to authenticated;
grant execute on function public.archive_question(uuid) to authenticated;
grant execute on function public.clone_question(uuid) to authenticated;
grant execute on function public.create_collection(uuid, uuid, text) to authenticated;
grant execute on function public.add_question_to_collection(uuid, uuid, integer, numeric) to authenticated;
grant execute on function public.remove_question_from_collection(uuid, uuid) to authenticated;
grant execute on function public.create_assessment_template(uuid, text, uuid) to authenticated;
grant execute on function public.save_assessment_template(uuid, text, jsonb, jsonb) to authenticated;
grant execute on function public.publish_assessment_template(uuid) to authenticated;
grant execute on function public.assign_reviewer(uuid, text, uuid, uuid) to authenticated;
grant execute on function public.approve_question(uuid, text) to authenticated;
grant execute on function public.reject_question(uuid, text) to authenticated;
grant execute on function public.record_authoring_event(uuid, text, uuid, text, jsonb) to authenticated;
