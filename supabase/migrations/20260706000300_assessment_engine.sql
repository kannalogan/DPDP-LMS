-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-006
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S2/S4/S8 assessment delivery; supabase/tests/005_assessment_engine_test.sql
-- SYRA-IMMUTABLE: published assessment artifacts and submitted attempts/responses reject mutation
-- SYRA-SEED: deployment-reference

create table if not exists public.question_banks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  name text not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint question_banks_name_check check (length(btrim(name)) between 1 and 200),
  constraint question_banks_status_check check (status in ('draft','in_review','published','retired','archived')),
  constraint question_banks_version_check check (version > 0)
);
create unique index if not exists question_banks_tenant_name_uq on public.question_banks (organization_id, lower(name)) where organization_id is not null and archived_at is null;
create unique index if not exists question_banks_global_name_uq on public.question_banks (lower(name)) where organization_id is null and archived_at is null;
create index if not exists question_banks_status_idx on public.question_banks (status, organization_id);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_bank_id uuid not null references public.question_banks (id) on delete restrict,
  type text not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint questions_type_check check (type in ('single_choice','multiple_choice','true_false','short_text','long_text','numeric','matching','ordering','file_upload')),
  constraint questions_status_check check (status in ('draft','in_review','published','retired','archived')),
  constraint questions_version_check check (version > 0)
);
create index if not exists questions_bank_status_type_idx on public.questions (question_bank_id, status, type) where archived_at is null;

create table if not exists public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete restrict,
  version integer not null,
  prompt jsonb not null,
  difficulty text not null default 'intermediate',
  locale text not null default 'en',
  tags text[] not null default '{}',
  max_score numeric(8,2) not null,
  status text not null default 'draft',
  content_hash text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint question_versions_question_version_uq unique (question_id, version),
  constraint question_versions_version_check check (version > 0),
  constraint question_versions_prompt_check check (jsonb_typeof(prompt) = 'object'),
  constraint question_versions_difficulty_check check (difficulty in ('introductory','intermediate','advanced','expert')),
  constraint question_versions_locale_check check (locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint question_versions_score_check check (max_score >= 0),
  constraint question_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint question_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint question_versions_content_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);
create index if not exists question_versions_status_published_idx on public.question_versions (status, published_at desc);
create index if not exists question_versions_tags_idx on public.question_versions using gin (tags);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions (id) on delete restrict,
  position integer not null,
  content jsonb not null,
  stable_key text not null,
  created_at timestamptz not null default now(),
  constraint question_options_version_position_uq unique (question_version_id, position),
  constraint question_options_version_stable_key_uq unique (question_version_id, stable_key),
  constraint question_options_position_check check (position > 0),
  constraint question_options_content_check check (jsonb_typeof(content) = 'object'),
  constraint question_options_stable_key_check check (stable_key ~ '^[A-Za-z0-9_-]{1,80}$')
);

create table if not exists public.question_answer_keys (
  question_version_id uuid primary key references public.question_versions (id) on delete restrict,
  key_ciphertext text not null,
  explanation jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_answer_keys_ciphertext_check check (length(key_ciphertext) >= 24),
  constraint question_answer_keys_explanation_check check (explanation is null or jsonb_typeof(explanation) = 'object')
);

create table if not exists public.rubrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  name text not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint rubrics_name_check check (length(btrim(name)) between 1 and 200),
  constraint rubrics_status_check check (status in ('draft','in_review','published','retired','archived')),
  constraint rubrics_version_check check (version > 0)
);
create unique index if not exists rubrics_tenant_name_uq on public.rubrics (organization_id, lower(name)) where organization_id is not null and archived_at is null;
create unique index if not exists rubrics_global_name_uq on public.rubrics (lower(name)) where organization_id is null and archived_at is null;

create table if not exists public.rubric_versions (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubrics (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  max_score numeric(8,2) not null,
  published_at timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint rubric_versions_rubric_version_uq unique (rubric_id, version),
  constraint rubric_versions_version_check check (version > 0),
  constraint rubric_versions_score_check check (max_score >= 0),
  constraint rubric_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint rubric_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint rubric_versions_content_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_version_id uuid not null references public.rubric_versions (id) on delete restrict,
  name text not null,
  description text not null default '',
  weight numeric(8,2) not null,
  position integer not null,
  levels jsonb not null,
  created_at timestamptz not null default now(),
  constraint rubric_criteria_version_position_uq unique (rubric_version_id, position),
  constraint rubric_criteria_weight_check check (weight > 0 and weight <= 100),
  constraint rubric_criteria_position_check check (position > 0),
  constraint rubric_criteria_levels_check check (jsonb_typeof(levels) = 'array')
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  kind text not null,
  status text not null default 'draft',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint assessments_kind_check check (kind in ('quiz','exam','assignment','practical','survey','diagnostic','mock_interview')),
  constraint assessments_status_check check (status in ('draft','in_review','published','retired','archived')),
  constraint assessments_version_check check (version > 0)
);
create index if not exists assessments_course_status_kind_idx on public.assessments (course_id, status, kind) where archived_at is null;
create index if not exists assessments_org_status_idx on public.assessments (organization_id, status);

create table if not exists public.assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete restrict,
  version integer not null,
  title text not null,
  instructions jsonb not null default '{}'::jsonb,
  passing_score numeric(8,2) not null,
  duration_seconds integer,
  attempt_limit integer not null default 1,
  cooldown_seconds integer not null default 0,
  integrity_policy jsonb not null default '{}'::jsonb,
  rubric_version_id uuid references public.rubric_versions (id) on delete restrict,
  status text not null default 'draft',
  published_at timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint assessment_versions_assessment_version_uq unique (assessment_id, version),
  constraint assessment_versions_version_check check (version > 0),
  constraint assessment_versions_title_check check (length(btrim(title)) between 1 and 300),
  constraint assessment_versions_instructions_check check (jsonb_typeof(instructions) = 'object'),
  constraint assessment_versions_passing_score_check check (passing_score between 0 and 100),
  constraint assessment_versions_duration_check check (duration_seconds is null or duration_seconds > 0),
  constraint assessment_versions_attempt_limit_check check (attempt_limit > 0),
  constraint assessment_versions_cooldown_check check (cooldown_seconds >= 0),
  constraint assessment_versions_integrity_policy_check check (jsonb_typeof(integrity_policy) = 'object'),
  constraint assessment_versions_status_check check (status in ('draft','in_review','approved','scheduled','published','superseded','archived')),
  constraint assessment_versions_publication_check check ((status not in ('published','superseded')) or published_at is not null),
  constraint assessment_versions_content_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);
create index if not exists assessment_versions_status_published_idx on public.assessment_versions (status, published_at desc);

create table if not exists public.assessment_sections (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.assessment_versions (id) on delete restrict,
  title text not null,
  position integer not null,
  instructions jsonb,
  randomization_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint assessment_sections_version_position_uq unique (assessment_version_id, position),
  constraint assessment_sections_position_check check (position > 0),
  constraint assessment_sections_instructions_check check (instructions is null or jsonb_typeof(instructions) = 'object'),
  constraint assessment_sections_randomization_check check (jsonb_typeof(randomization_policy) = 'object')
);

create table if not exists public.assessment_form_items (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.assessment_versions (id) on delete restrict,
  section_id uuid references public.assessment_sections (id) on delete restrict,
  question_version_id uuid not null references public.question_versions (id) on delete restrict,
  position integer not null,
  points numeric(8,2) not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint assessment_form_items_assessment_position_uq unique (assessment_version_id, position),
  constraint assessment_form_items_position_check check (position > 0),
  constraint assessment_form_items_points_check check (points > 0)
);
create index if not exists assessment_form_items_section_idx on public.assessment_form_items (section_id, position);
create index if not exists assessment_form_items_question_idx on public.assessment_form_items (question_version_id);

create table if not exists public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  assessment_version_id uuid not null references public.assessment_versions (id) on delete restrict,
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null default 'assigned',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint assessment_assignments_version_enrollment_uq unique (assessment_version_id, enrollment_id),
  constraint assessment_assignments_dates_check check (opens_at is null or closes_at is null or closes_at > opens_at),
  constraint assessment_assignments_status_check check (status in ('assigned','available','locked','expired','withdrawn')),
  constraint assessment_assignments_version_check check (version > 0)
);
create index if not exists assessment_assignments_enrollment_window_idx on public.assessment_assignments (enrollment_id, status, opens_at, closes_at) where archived_at is null;
create index if not exists assessment_assignments_org_status_idx on public.assessment_assignments (organization_id, status);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  assessment_assignment_id uuid not null references public.assessment_assignments (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  attempt_number integer not null,
  status text not null default 'created',
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  form_seed uuid not null default gen_random_uuid(),
  score numeric(8,2),
  passed boolean,
  idempotency_key uuid not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_attempts_assignment_profile_number_uq unique (assessment_assignment_id, profile_id, attempt_number),
  constraint assessment_attempts_idempotency_uq unique (profile_id, idempotency_key),
  constraint assessment_attempts_number_check check (attempt_number > 0),
  constraint assessment_attempts_status_check check (status in ('created','active','submitted','expired','evaluating','evaluated','voided')),
  constraint assessment_attempts_score_check check (score is null or score between 0 and 100),
  constraint assessment_attempts_dates_check check (submitted_at is null or started_at is null or submitted_at >= started_at),
  constraint assessment_attempts_version_check check (version > 0)
);
create index if not exists assessment_attempts_profile_status_idx on public.assessment_attempts (profile_id, status, updated_at desc);
create index if not exists assessment_attempts_org_time_idx on public.assessment_attempts (organization_id, created_at desc);

create table if not exists public.attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete restrict,
  question_version_id uuid not null references public.question_versions (id) on delete restrict,
  section_id uuid references public.assessment_sections (id) on delete restrict,
  position integer not null,
  option_order uuid[] not null default '{}',
  points numeric(8,2) not null,
  created_at timestamptz not null default now(),
  constraint attempt_items_attempt_position_uq unique (attempt_id, position),
  constraint attempt_items_position_check check (position > 0),
  constraint attempt_items_points_check check (points > 0)
);
create index if not exists attempt_items_question_idx on public.attempt_items (question_version_id);

create table if not exists public.attempt_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_item_id uuid not null unique references public.attempt_items (id) on delete restrict,
  response jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  client_version integer not null default 1,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_responses_response_check check (jsonb_typeof(response) = 'object'),
  constraint attempt_responses_client_version_check check (client_version > 0),
  constraint attempt_responses_version_check check (version > 0)
);
create index if not exists attempt_responses_saved_idx on public.attempt_responses (saved_at desc) where submitted_at is null;

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete restrict,
  evaluator_type text not null default 'system',
  evaluator_profile_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending',
  score numeric(8,2),
  feedback_ciphertext text,
  ai_interaction_id uuid,
  completed_at timestamptz,
  released_at timestamptz,
  supersedes_id uuid references public.evaluations (id) on delete restrict,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluations_no_self_supersede check (supersedes_id is null or supersedes_id <> id),
  constraint evaluations_evaluator_type_check check (evaluator_type in ('system','human','external')),
  constraint evaluations_status_check check (status in ('pending','in_progress','review_required','completed','released','superseded')),
  constraint evaluations_score_check check (score is null or score between 0 and 100),
  constraint evaluations_version_check check (version > 0)
);
create index if not exists evaluations_attempt_status_idx on public.evaluations (attempt_id, status, updated_at desc);
create unique index if not exists evaluations_active_final_uq on public.evaluations (attempt_id) where status in ('completed','released');

create table if not exists public.evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations (id) on delete restrict,
  attempt_item_id uuid references public.attempt_items (id) on delete restrict,
  rubric_criterion_id uuid references public.rubric_criteria (id) on delete restrict,
  score numeric(8,2) not null,
  feedback text,
  created_at timestamptz not null default now(),
  constraint evaluation_scores_exactly_one_target check ((attempt_item_id is not null)::integer + (rubric_criterion_id is not null)::integer = 1),
  constraint evaluation_scores_score_check check (score >= 0)
);
create unique index if not exists evaluation_scores_item_uq on public.evaluation_scores (evaluation_id, attempt_item_id) where attempt_item_id is not null;
create unique index if not exists evaluation_scores_criterion_uq on public.evaluation_scores (evaluation_id, rubric_criterion_id) where rubric_criterion_id is not null;

create or replace function private.can_manage_assessment_catalog()
returns boolean language sql stable security definer set search_path = pg_catalog
as $$ select private.has_platform_permission('assessment.catalog.manage') $$;

create or replace function private.can_read_assessment_assignment(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.assessment_assignments aa
    join public.enrollments e on e.id = aa.enrollment_id
    where aa.id = p_assignment_id and aa.archived_at is null
      and (e.profile_id = auth.uid() or private.can_read_organization_learning(aa.organization_id))
  )
$$;

create or replace function private.owns_assessment_attempt(p_attempt_id uuid, p_require_active boolean default false)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.assessment_attempts a
    where a.id = p_attempt_id and a.profile_id = auth.uid()
      and private.is_active_org_member(a.organization_id)
      and (not p_require_active or (a.status = 'active' and (a.expires_at is null or a.expires_at > now())))
  )
$$;

create or replace function private.can_read_attempt(p_attempt_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.assessment_attempts a
    where a.id = p_attempt_id
      and (a.profile_id = auth.uid() or private.can_read_organization_learning(a.organization_id))
  )
$$;

create or replace function private.can_read_question_version(p_question_version_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select private.can_manage_assessment_catalog() or exists (
    select 1 from public.attempt_items ai
    join public.assessment_attempts a on a.id = ai.attempt_id
    where ai.question_version_id = p_question_version_id
      and a.profile_id = auth.uid()
      and a.status in ('active','submitted','evaluating','evaluated')
  )
$$;

create or replace function private.record_assessment_audit(
  p_organization_id uuid, p_action text, p_resource_type text, p_resource_id uuid, p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_event_id uuid; v_time timestamptz := now(); v_correlation text := extensions.gen_random_uuid()::text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_action !~ '^assessment\.[a-z0-9_.]+$' then raise exception 'invalid assessment audit action' using errcode = '22023'; end if;
  if not private.is_active_org_member(p_organization_id) then raise exception 'organization access denied' using errcode = '42501'; end if;
  insert into public.audit_events (organization_id, actor_profile_id, actor_type, actor_id, action, resource_type, resource_id, outcome, correlation_id, metadata, event_hash, occurred_at)
  values (p_organization_id, auth.uid(), 'profile', auth.uid(), p_action, p_resource_type, p_resource_id, 'succeeded', v_correlation, p_metadata,
    encode(extensions.digest(concat_ws(':', auth.uid()::text, p_action, p_resource_id::text, v_correlation, v_time::text), 'sha256'), 'hex'), v_time)
  returning id into v_event_id;
  return v_event_id;
end
$$;

create or replace function private.reject_published_assessment_mutation()
returns trigger language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if old.status in ('published','superseded') then raise exception 'published assessment artifacts are immutable' using errcode = '55000'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create or replace function private.reject_submitted_response_mutation()
returns trigger language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if old.submitted_at is not null then raise exception 'submitted assessment responses are immutable' using errcode = '55000'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

drop trigger if exists question_versions_reject_published_mutation on public.question_versions;
create trigger question_versions_reject_published_mutation before update or delete on public.question_versions for each row execute function private.reject_published_assessment_mutation();
drop trigger if exists rubric_versions_reject_published_mutation on public.rubric_versions;
create trigger rubric_versions_reject_published_mutation before update or delete on public.rubric_versions for each row execute function private.reject_published_assessment_mutation();
drop trigger if exists assessment_versions_reject_published_mutation on public.assessment_versions;
create trigger assessment_versions_reject_published_mutation before update or delete on public.assessment_versions for each row execute function private.reject_published_assessment_mutation();
drop trigger if exists attempt_responses_reject_submitted_mutation on public.attempt_responses;
create trigger attempt_responses_reject_submitted_mutation before update or delete on public.attempt_responses for each row execute function private.reject_submitted_response_mutation();

create or replace function public.syra_start_assessment(p_assignment_id uuid, p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_assignment public.assessment_assignments%rowtype; v_version public.assessment_versions%rowtype; v_enrollment public.enrollments%rowtype; v_attempt_id uuid; v_attempt_number integer; v_seed uuid := extensions.gen_random_uuid();
begin
  select * into strict v_assignment from public.assessment_assignments where id = p_assignment_id and archived_at is null;
  select * into strict v_enrollment from public.enrollments where id = v_assignment.enrollment_id;
  select * into strict v_version from public.assessment_versions where id = v_assignment.assessment_version_id;
  if v_enrollment.profile_id <> auth.uid() or not private.is_active_org_member(v_assignment.organization_id) then raise exception 'assignment access denied' using errcode = '42501'; end if;
  select id into v_attempt_id from public.assessment_attempts where profile_id = auth.uid() and idempotency_key = p_idempotency_key;
  if v_attempt_id is not null then return v_attempt_id; end if;
  if v_assignment.status not in ('assigned','available') or (v_assignment.opens_at is not null and v_assignment.opens_at > now()) or (v_assignment.closes_at is not null and v_assignment.closes_at <= now()) then raise exception 'assessment unavailable' using errcode = '55000'; end if;
  if v_version.status <> 'published' then raise exception 'assessment version unavailable' using errcode = '55000'; end if;
  if not exists (
    select 1 from public.assessments a
    where a.id = v_version.assessment_id
      and (
        (v_enrollment.course_version_id is not null and exists (select 1 from public.course_versions cv where cv.id = v_enrollment.course_version_id and cv.course_id = a.course_id))
        or
        (v_enrollment.learning_path_version_id is not null and exists (select 1 from public.learning_path_items lpi where lpi.learning_path_version_id = v_enrollment.learning_path_version_id and lpi.course_id = a.course_id))
      )
  ) then raise exception 'assessment is outside enrollment' using errcode = '42501'; end if;
  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number from public.assessment_attempts where assessment_assignment_id = p_assignment_id and profile_id = auth.uid();
  if v_attempt_number > v_version.attempt_limit then raise exception 'attempt limit reached' using errcode = '54000'; end if;
  insert into public.assessment_attempts (organization_id, assessment_assignment_id, profile_id, attempt_number, status, started_at, expires_at, form_seed, idempotency_key)
  values (v_assignment.organization_id, p_assignment_id, auth.uid(), v_attempt_number, 'active', now(), case when v_version.duration_seconds is null then v_assignment.closes_at else least(coalesce(v_assignment.closes_at, 'infinity'::timestamptz), now() + make_interval(secs => v_version.duration_seconds)) end, v_seed, p_idempotency_key)
  returning id into v_attempt_id;
  if not exists (select 1 from public.attempt_items where attempt_id = v_attempt_id) then
    insert into public.attempt_items (attempt_id, question_version_id, section_id, position, option_order, points)
    select v_attempt_id, afi.question_version_id, afi.section_id,
      row_number() over (order by encode(extensions.digest(v_seed::text || afi.id::text, 'sha256'), 'hex'))::integer,
      coalesce((select array_agg(qo.id order by encode(extensions.digest(v_seed::text || qo.id::text, 'sha256'), 'hex')) from public.question_options qo where qo.question_version_id = afi.question_version_id), '{}'), afi.points
    from public.assessment_form_items afi where afi.assessment_version_id = v_version.id;
  end if;
  perform private.record_assessment_audit(v_assignment.organization_id, 'assessment.attempt.started', 'assessment_attempt', v_attempt_id, jsonb_build_object('assignmentId', p_assignment_id));
  return v_attempt_id;
end
$$;

create or replace function public.syra_resume_assessment(p_attempt_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog
as $$
begin
  if not private.owns_assessment_attempt(p_attempt_id, true) then raise exception 'active attempt unavailable' using errcode = '42501'; end if;
  update public.assessment_attempts set updated_at = now(), version = version + 1 where id = p_attempt_id;
  return true;
end
$$;

create or replace function public.syra_save_assessment_response(p_attempt_id uuid, p_attempt_item_id uuid, p_response jsonb, p_client_version integer)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_response_id uuid;
begin
  if jsonb_typeof(p_response) <> 'object' then raise exception 'response must be an object' using errcode = '22023'; end if;
  if p_client_version < 1 then raise exception 'invalid client version' using errcode = '22023'; end if;
  if not private.owns_assessment_attempt(p_attempt_id, true) then raise exception 'active attempt unavailable' using errcode = '42501'; end if;
  if not exists (select 1 from public.attempt_items where id = p_attempt_item_id and attempt_id = p_attempt_id) then raise exception 'question is outside attempt' using errcode = '42501'; end if;
  insert into public.attempt_responses (attempt_item_id, response, client_version)
  values (p_attempt_item_id, p_response, p_client_version)
  on conflict (attempt_item_id) do update set response = excluded.response, client_version = excluded.client_version, saved_at = now(), updated_at = now(), version = public.attempt_responses.version + 1
  returning id into v_response_id;
  update public.assessment_attempts set updated_at = now(), version = version + 1 where id = p_attempt_id;
  return v_response_id;
end
$$;

create or replace function public.syra_clear_assessment_response(p_attempt_id uuid, p_attempt_item_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog
as $$
begin
  if not private.owns_assessment_attempt(p_attempt_id, true) then raise exception 'active attempt unavailable' using errcode = '42501'; end if;
  delete from public.attempt_responses ar using public.attempt_items ai where ar.attempt_item_id = ai.id and ai.id = p_attempt_item_id and ai.attempt_id = p_attempt_id and ar.submitted_at is null;
  return found;
end
$$;

create or replace function public.syra_mark_assessment_review(p_attempt_id uuid, p_attempt_item_id uuid, p_marked boolean)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_current jsonb; v_version integer; v_response_id uuid;
begin
  if not private.owns_assessment_attempt(p_attempt_id, true) then raise exception 'active attempt unavailable' using errcode = '42501'; end if;
  if not exists (select 1 from public.attempt_items where id = p_attempt_item_id and attempt_id = p_attempt_id) then raise exception 'question is outside attempt' using errcode = '42501'; end if;
  select response, client_version into v_current, v_version from public.attempt_responses where attempt_item_id = p_attempt_item_id;
  insert into public.attempt_responses (attempt_item_id, response, client_version)
  values (p_attempt_item_id, jsonb_set(coalesce(v_current, '{}'::jsonb), '{markedForReview}', to_jsonb(p_marked)), coalesce(v_version, 1))
  on conflict (attempt_item_id) do update set response = jsonb_set(public.attempt_responses.response, '{markedForReview}', to_jsonb(p_marked)), saved_at = now(), updated_at = now(), version = public.attempt_responses.version + 1
  returning id into v_response_id;
  return v_response_id;
end
$$;

create or replace function public.syra_submit_assessment(p_attempt_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_org uuid; v_evaluation_id uuid;
begin
  if not private.owns_assessment_attempt(p_attempt_id, true) then raise exception 'active attempt unavailable' using errcode = '42501'; end if;
  update public.attempt_responses ar set submitted_at = now(), updated_at = now(), version = version + 1 from public.attempt_items ai where ar.attempt_item_id = ai.id and ai.attempt_id = p_attempt_id and ar.submitted_at is null;
  update public.assessment_attempts set status = 'evaluating', submitted_at = now(), updated_at = now(), version = version + 1 where id = p_attempt_id returning organization_id into v_org;
  insert into public.evaluations (attempt_id, evaluator_type, status) values (p_attempt_id, 'system', 'pending') returning id into v_evaluation_id;
  perform private.record_assessment_audit(v_org, 'assessment.attempt.submitted', 'assessment_attempt', p_attempt_id, jsonb_build_object('evaluationId', v_evaluation_id));
  return v_evaluation_id;
end
$$;

create or replace function public.syra_abandon_assessment(p_attempt_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog
as $$
declare v_org uuid;
begin
  if not private.owns_assessment_attempt(p_attempt_id, true) then raise exception 'active attempt unavailable' using errcode = '42501'; end if;
  update public.assessment_attempts set status = 'voided', updated_at = now(), version = version + 1 where id = p_attempt_id returning organization_id into v_org;
  perform private.record_assessment_audit(v_org, 'assessment.attempt.abandoned', 'assessment_attempt', p_attempt_id, '{}'::jsonb);
  return true;
end
$$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions (key, description, risk_level)
values ('assessment.catalog.manage', 'Create and manage global assessment catalog content', 'high')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.organization_id is null and r.key in ('platform_admin','super_admin') and p.key = 'assessment.catalog.manage'
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$
declare v_table text;
begin
  foreach v_table in array array['question_banks','questions','question_versions','question_options','question_answer_keys','rubrics','rubric_versions','rubric_criteria','assessments','assessment_versions','assessment_sections','assessment_form_items','assessment_assignments','assessment_attempts','attempt_items','attempt_responses','evaluations','evaluation_scores'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from anon, authenticated', v_table);
  end loop;
end
$$;

create policy question_banks_manage on public.question_banks for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy questions_manage on public.questions for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy question_versions_manage on public.question_versions for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy question_options_manage on public.question_options for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy rubrics_manage on public.rubrics for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy rubric_versions_manage on public.rubric_versions for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy rubric_criteria_manage on public.rubric_criteria for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy assessments_manage on public.assessments for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy assessment_versions_manage on public.assessment_versions for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy assessment_sections_manage on public.assessment_sections for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy assessment_form_items_manage on public.assessment_form_items for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());
create policy assessment_assignments_manage on public.assessment_assignments for all to authenticated using (private.can_manage_assessment_catalog()) with check (private.can_manage_assessment_catalog());

create policy question_versions_attempt_select on public.question_versions for select to authenticated using (private.can_read_question_version(id));
create policy questions_attempt_select on public.questions for select to authenticated using (exists (select 1 from public.question_versions qv where qv.question_id = questions.id and private.can_read_question_version(qv.id)));
create policy question_options_attempt_select on public.question_options for select to authenticated using (private.can_read_question_version(question_version_id));
create policy assessments_assignment_select on public.assessments for select to authenticated using (private.can_manage_assessment_catalog() or exists (select 1 from public.assessment_versions av join public.assessment_assignments aa on aa.assessment_version_id = av.id where av.assessment_id = assessments.id and private.can_read_assessment_assignment(aa.id)));
create policy assessment_versions_assignment_select on public.assessment_versions for select to authenticated using (private.can_manage_assessment_catalog() or exists (select 1 from public.assessment_assignments aa where aa.assessment_version_id = assessment_versions.id and private.can_read_assessment_assignment(aa.id)));
create policy assessment_sections_assignment_select on public.assessment_sections for select to authenticated using (private.can_manage_assessment_catalog() or exists (select 1 from public.assessment_assignments aa where aa.assessment_version_id = assessment_sections.assessment_version_id and private.can_read_assessment_assignment(aa.id)));
create policy assessment_form_items_assignment_select on public.assessment_form_items for select to authenticated using (private.can_manage_assessment_catalog() or exists (select 1 from public.assessment_assignments aa where aa.assessment_version_id = assessment_form_items.assessment_version_id and private.can_read_assessment_assignment(aa.id)));
create policy assessment_assignments_select on public.assessment_assignments for select to authenticated using (private.can_read_assessment_assignment(id) or private.can_manage_assessment_catalog());
create policy assessment_attempts_select on public.assessment_attempts for select to authenticated using (private.can_read_attempt(id));
create policy attempt_items_select on public.attempt_items for select to authenticated using (private.can_read_attempt(attempt_id));
create policy attempt_responses_select on public.attempt_responses for select to authenticated using (exists (select 1 from public.attempt_items ai where ai.id = attempt_responses.attempt_item_id and private.can_read_attempt(ai.attempt_id)));
create policy evaluations_select on public.evaluations for select to authenticated using (private.can_read_attempt(attempt_id));
create policy evaluation_scores_select on public.evaluation_scores for select to authenticated using (exists (select 1 from public.evaluations e where e.id = evaluation_scores.evaluation_id and e.status = 'released' and private.can_read_attempt(e.attempt_id)));

grant select on public.questions, public.question_versions, public.question_options, public.assessments, public.assessment_versions, public.assessment_sections, public.assessment_form_items, public.assessment_assignments, public.assessment_attempts, public.attempt_items, public.attempt_responses, public.evaluations, public.evaluation_scores to authenticated;
grant select, insert, update, delete on public.question_banks, public.questions, public.question_versions, public.question_options, public.rubrics, public.rubric_versions, public.rubric_criteria, public.assessments, public.assessment_versions, public.assessment_sections, public.assessment_form_items, public.assessment_assignments to authenticated;

do $$
declare v_signature text;
begin
  foreach v_signature in array array['public.syra_start_assessment(uuid,uuid)','public.syra_resume_assessment(uuid)','public.syra_save_assessment_response(uuid,uuid,jsonb,integer)','public.syra_clear_assessment_response(uuid,uuid)','public.syra_mark_assessment_review(uuid,uuid,boolean)','public.syra_submit_assessment(uuid)','public.syra_abandon_assessment(uuid)'] loop
    execute format('revoke all on function %s from public, anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end
$$;

revoke all on table public.question_answer_keys from anon, authenticated;
revoke all on function private.can_manage_assessment_catalog() from public;
revoke all on function private.can_read_assessment_assignment(uuid) from public;
revoke all on function private.owns_assessment_attempt(uuid, boolean) from public;
revoke all on function private.can_read_attempt(uuid) from public;
revoke all on function private.can_read_question_version(uuid) from public;
revoke all on function private.record_assessment_audit(uuid, text, text, uuid, jsonb) from public;

comment on table public.question_answer_keys is 'S8 service-only evaluation authority; never learner-readable.';
comment on function public.syra_save_assessment_response(uuid, uuid, jsonb, integer) is 'Controlled optimistic autosave for an owned active attempt; never accepts score or answer-key fields.';
