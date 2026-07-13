-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-013
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S4/S5/S8 assignment delivery, private submissions, grading and gradebook evidence
-- SYRA-IMMUTABLE: published versions and all submitted, grading, resubmission, gradebook and audit evidence are append-only
-- SYRA-SEED: deployment-reference

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  title text not null, assignment_type text not null, status text not null default 'draft', archived_at timestamptz,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
  constraint assignments_type_check check (assignment_type in ('text_response','rich_text_response','file_upload','multi_file_upload','url_submission','case_study','project_submission','practical_evidence','portfolio_submission','offline_completion','code_submission','lab_evidence')),
  constraint assignments_status_check check (status in ('draft','review','approved','published','assigned','archived')), constraint assignments_version_check check (version > 0)
);
create index if not exists assignments_org_status_idx on public.assignments(organization_id,status,updated_at desc);

create table if not exists public.assignment_versions (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict, version integer not null, title text not null,
  description jsonb not null default '{}'::jsonb, instructions jsonb not null default '{}'::jsonb, learning_outcomes jsonb not null default '[]'::jsonb,
  submission_type text not null, due_date_policy jsonb not null default '{}'::jsonb, late_policy jsonb not null default '{}'::jsonb,
  resubmission_policy jsonb not null default '{}'::jsonb, maximum_attempts integer not null default 1, accepted_file_types text[] not null default '{}',
  maximum_file_bytes bigint not null default 10485760, maximum_files integer not null default 1, grading_mode text not null default 'points',
  rubric_version_id uuid references public.rubric_versions(id) on delete restrict, passing_score numeric(8,2), total_marks numeric(8,2) not null,
  anonymous_grading boolean not null default false, status text not null default 'draft', published_at timestamptz, content_hash text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null, constraint assignment_versions_unique unique(assignment_id,version),
  constraint assignment_versions_submission_type_check check (submission_type in ('text_response','rich_text_response','file_upload','multi_file_upload','url_submission','case_study','project_submission','practical_evidence','portfolio_submission','offline_completion','code_submission','lab_evidence')),
  constraint assignment_versions_status_check check (status in ('draft','review','approved','scheduled','published','superseded','archived','rejected')),
  constraint assignment_versions_attempts_check check (maximum_attempts > 0), constraint assignment_versions_files_check check (maximum_file_bytes > 0 and maximum_files > 0),
  constraint assignment_versions_marks_check check (total_marks > 0 and (passing_score is null or passing_score between 0 and total_marks)),
  constraint assignment_versions_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);
create index if not exists assignment_versions_status_idx on public.assignment_versions(organization_id,status,published_at desc);

create table if not exists public.assignment_publications (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict, published_by uuid references public.profiles(id) on delete set null,
  publication_status text not null default 'published', content_hash text not null, evidence jsonb not null default '{}'::jsonb, published_at timestamptz not null default now(),
  constraint assignment_publications_status_check check (publication_status in ('published','superseded','archived')), constraint assignment_publications_hash_check check (content_hash ~ '^[a-f0-9]{64}$')
);
create table if not exists public.assignment_course_links (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict, course_id uuid not null references public.courses(id) on delete restrict,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null, constraint assignment_course_links_unique unique(assignment_id,course_id)
);
create table if not exists public.assignment_module_links (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict, course_module_id uuid not null references public.course_modules(id) on delete restrict,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null, constraint assignment_module_links_unique unique(assignment_id,course_module_id)
);
create table if not exists public.assignment_lesson_links (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict, lesson_id uuid not null references public.lessons(id) on delete restrict,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null, constraint assignment_lesson_links_unique unique(assignment_id,lesson_id)
);
create table if not exists public.assignment_windows (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict, opens_at timestamptz, due_at timestamptz, closes_at timestamptz,
  timezone text not null default 'UTC', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
  constraint assignment_windows_dates_check check ((opens_at is null or due_at is null or due_at > opens_at) and (due_at is null or closes_at is null or closes_at >= due_at))
);
create table if not exists public.assignment_rules (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict, rule_type text not null, configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null, constraint assignment_rules_unique unique(assignment_version_id,rule_type)
);
create table if not exists public.assignment_assets (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict, storage_object_id uuid not null references public.storage_objects(id) on delete restrict,
  asset_type text not null, display_name text not null, created_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null
);
create table if not exists public.assignment_attachments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict, storage_object_id uuid not null references public.storage_objects(id) on delete restrict,
  visibility text not null default 'learner', position integer not null default 1, created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null, constraint assignment_attachments_visibility_check check (visibility in ('learner','grader','author')),
  constraint assignment_attachments_unique unique(assignment_version_id,position)
);

create table if not exists public.assignment_assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict, enrollment_id uuid references public.enrollments(id) on delete restrict,
  cohort_id uuid references public.cohorts(id) on delete restrict, learner_profile_id uuid references public.profiles(id) on delete restrict,
  status text not null default 'assigned', assigned_at timestamptz not null default now(), due_at timestamptz, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint assignment_assignments_target_check check ((enrollment_id is not null)::integer + (cohort_id is not null)::integer + (learner_profile_id is not null)::integer = 1),
  constraint assignment_assignments_status_check check (status in ('assigned','in_progress','submitted','under_review','graded','returned','resubmission_requested','resubmitted','finalized','archived'))
);
create index if not exists assignment_assignments_learner_status_idx on public.assignment_assignments(learner_profile_id,status,due_at);
create index if not exists assignment_assignments_org_status_idx on public.assignment_assignments(organization_id,status,assigned_at desc);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assignment_assignment_id uuid not null references public.assignment_assignments(id) on delete restrict, assessment_attempt_id uuid references public.assessment_attempts(id) on delete restrict,
  learner_profile_id uuid not null references public.profiles(id) on delete restrict, current_version integer not null default 1, status text not null default 'draft',
  started_at timestamptz not null default now(), submitted_at timestamptz, finalized_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint assignment_submissions_unique unique(assignment_assignment_id,learner_profile_id),
  constraint assignment_submissions_status_check check (status in ('draft','submitted','under_review','graded','returned','resubmission_requested','resubmitted','finalized','archived'))
);
create index if not exists assignment_submissions_learner_status_idx on public.assignment_submissions(learner_profile_id,status,updated_at desc);
create table if not exists public.submission_versions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_id uuid not null references public.assignment_submissions(id) on delete restrict, assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict,
  rubric_version_id uuid references public.rubric_versions(id) on delete restrict, version integer not null, attempt_number integer not null, status text not null default 'draft',
  submitted_at timestamptz, content_hash text, late boolean not null default false, created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null, constraint submission_versions_unique unique(submission_id,version),
  constraint submission_versions_status_check check (status in ('draft','submitted','superseded','withdrawn')), constraint submission_versions_attempt_check check (attempt_number > 0)
);
create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_version_id uuid not null references public.submission_versions(id) on delete restrict, storage_object_id uuid not null references public.storage_objects(id) on delete restrict,
  display_name text not null, content_type text not null, bytes bigint not null, sha256 text not null, scan_status text not null default 'pending',
  quarantine_status text not null default 'clear', created_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete set null,
  constraint submission_files_bytes_check check (bytes >= 0), constraint submission_files_sha_check check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint submission_files_quarantine_check check (quarantine_status in ('clear','pending','quarantined','released'))
);
create table if not exists public.submission_text_entries (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_version_id uuid not null references public.submission_versions(id) on delete restrict, entry_type text not null, body_ciphertext text not null,
  content_hash text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint submission_text_entries_unique unique(submission_version_id,entry_type)
);
create table if not exists public.submission_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_id uuid not null references public.assignment_submissions(id) on delete restrict, submission_version_id uuid references public.submission_versions(id) on delete restrict,
  event_type text not null, actor_profile_id uuid references public.profiles(id) on delete set null, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
create table if not exists public.submission_status_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_id uuid not null references public.assignment_submissions(id) on delete restrict, from_status text, to_status text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null, reason text, occurred_at timestamptz not null default now()
);

create table if not exists public.grading_queue_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_version_id uuid not null references public.submission_versions(id) on delete restrict, status text not null default 'available',
  priority integer not null default 0, available_at timestamptz not null default now(), due_at timestamptz, created_at timestamptz not null default now(),
  constraint grading_queue_items_unique unique(submission_version_id), constraint grading_queue_items_status_check check (status in ('available','assigned','claimed','in_progress','completed','cancelled'))
);
create table if not exists public.grading_assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  grading_queue_item_id uuid not null references public.grading_queue_items(id) on delete restrict, grader_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'assigned', assigned_at timestamptz not null default now(), claimed_at timestamptz, completed_at timestamptz,
  assigned_by uuid references public.profiles(id) on delete set null, constraint grading_assignments_status_check check (status in ('assigned','claimed','in_progress','completed','released','revoked'))
);
create index if not exists grading_assignments_grader_status_idx on public.grading_assignments(grader_profile_id,status,assigned_at desc);
create table if not exists public.grading_results (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_version_id uuid not null references public.submission_versions(id) on delete restrict, grading_assignment_id uuid references public.grading_assignments(id) on delete restrict,
  grader_profile_id uuid not null references public.profiles(id) on delete restrict, status text not null default 'draft', score numeric(8,2),
  passed boolean, overall_feedback_ciphertext text, finalized_at timestamptz, released_at timestamptz, supersedes_id uuid references public.grading_results(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint grading_results_status_check check (status in ('draft','finalized','released','superseded','reopened')),
  constraint grading_results_score_check check (score is null or score >= 0)
);
create unique index if not exists grading_results_active_final_idx on public.grading_results(submission_version_id) where status in ('finalized','released');
create table if not exists public.grading_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  grading_result_id uuid not null references public.grading_results(id) on delete restrict, event_type text not null, actor_profile_id uuid references public.profiles(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
create table if not exists public.grading_comments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  grading_result_id uuid not null references public.grading_results(id) on delete restrict, rubric_criterion_id uuid references public.rubric_criteria(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict, body_ciphertext text not null, visibility text not null default 'learner',
  created_at timestamptz not null default now(), constraint grading_comments_visibility_check check (visibility in ('learner','grader','internal'))
);
create table if not exists public.rubric_scores (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  grading_result_id uuid not null references public.grading_results(id) on delete restrict, rubric_criterion_id uuid not null references public.rubric_criteria(id) on delete restrict,
  score numeric(8,2) not null, level_key text, feedback_ciphertext text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint rubric_scores_unique unique(grading_result_id,rubric_criterion_id), constraint rubric_scores_check check (score >= 0)
);
create table if not exists public.rubric_score_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  rubric_score_id uuid not null references public.rubric_scores(id) on delete restrict, score numeric(8,2) not null, level_key text,
  actor_profile_id uuid references public.profiles(id) on delete set null, occurred_at timestamptz not null default now()
);

create table if not exists public.feedback_threads (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_id uuid not null references public.assignment_submissions(id) on delete restrict, status text not null default 'open',
  learner_reply_allowed boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint feedback_threads_unique unique(submission_id), constraint feedback_threads_status_check check (status in ('open','closed','archived'))
);
create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  feedback_thread_id uuid not null references public.feedback_threads(id) on delete restrict, author_profile_id uuid not null references public.profiles(id) on delete restrict,
  body_ciphertext text not null, visibility text not null default 'participants', released_at timestamptz, created_at timestamptz not null default now(),
  constraint feedback_messages_visibility_check check (visibility in ('participants','grader','internal'))
);
create table if not exists public.resubmission_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_id uuid not null references public.assignment_submissions(id) on delete restrict, grading_result_id uuid references public.grading_results(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict, reason_ciphertext text not null, due_at timestamptz, status text not null default 'open',
  requested_at timestamptz not null default now(), completed_at timestamptz, constraint resubmission_requests_status_check check (status in ('open','started','submitted','cancelled','completed'))
);
create table if not exists public.resubmission_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  resubmission_request_id uuid not null references public.resubmission_requests(id) on delete restrict, event_type text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null, occurred_at timestamptz not null default now()
);
create table if not exists public.gradebook_entries (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  learner_profile_id uuid not null references public.profiles(id) on delete restrict, assignment_assignment_id uuid not null references public.assignment_assignments(id) on delete restrict,
  submission_version_id uuid not null references public.submission_versions(id) on delete restrict, grading_result_id uuid not null references public.grading_results(id) on delete restrict,
  score numeric(8,2), final_grade text, status text not null default 'graded', attempt_count integer not null default 1, late boolean not null default false,
  released boolean not null default false, released_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint gradebook_entries_unique unique(assignment_assignment_id,learner_profile_id), constraint gradebook_entries_attempts_check check (attempt_count > 0)
);
create index if not exists gradebook_entries_learner_idx on public.gradebook_entries(learner_profile_id,released,updated_at desc);
create table if not exists public.gradebook_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  gradebook_entry_id uuid not null references public.gradebook_entries(id) on delete restrict, event_type text not null, previous_value jsonb,
  current_value jsonb not null, actor_profile_id uuid references public.profiles(id) on delete set null, occurred_at timestamptz not null default now()
);
create table if not exists public.assignment_authoring_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict, assignment_version_id uuid references public.assignment_versions(id) on delete restrict,
  event_type text not null, actor_profile_id uuid references public.profiles(id) on delete set null, details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
create table if not exists public.assignment_change_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  assignment_version_id uuid not null references public.assignment_versions(id) on delete restrict, changed_by uuid references public.profiles(id) on delete set null,
  from_hash text, to_hash text not null, change_summary jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);

create or replace view public.assignment_catalog_projection
with (security_invoker = true) as
select a.id assignment_id, a.organization_id, av.id assignment_version_id, av.title, av.description, av.submission_type, av.total_marks, av.passing_score, av.rubric_version_id, aw.opens_at, aw.due_at, aw.closes_at, av.published_at
from public.assignments a join public.assignment_versions av on av.assignment_id=a.id and av.status='published' left join public.assignment_windows aw on aw.assignment_version_id=av.id where a.status='published' and a.archived_at is null;
create or replace view public.student_assignment_projection
with (security_invoker = true) as
with learner_deliveries as (
  select aa.*, coalesce(aa.learner_profile_id,e.profile_id) resolved_learner_profile_id
  from public.assignment_assignments aa
  left join public.enrollments e on e.id=aa.enrollment_id
  where aa.cohort_id is null
  union all
  select aa.*, om.profile_id resolved_learner_profile_id
  from public.assignment_assignments aa
  join public.cohort_members cm on cm.cohort_id=aa.cohort_id and cm.left_at is null
  join public.organization_members om on om.id=cm.organization_member_id and om.status='active'
  where aa.cohort_id is not null
)
select aa.id assignment_assignment_id, aa.organization_id, aa.resolved_learner_profile_id learner_profile_id, aa.status, aa.due_at, av.assignment_id, av.id assignment_version_id, av.title, av.submission_type, av.total_marks, s.id submission_id, s.status submission_status, s.current_version
from learner_deliveries aa join public.assignment_versions av on av.id=aa.assignment_version_id left join public.assignment_submissions s on s.assignment_assignment_id=aa.id and s.learner_profile_id=aa.resolved_learner_profile_id;
create or replace view public.grading_queue_projection
with (security_invoker = true) as
select q.id grading_queue_item_id, q.organization_id, q.status, q.priority, q.due_at, sv.id submission_version_id, s.learner_profile_id, av.title assignment_title, ga.grader_profile_id
from public.grading_queue_items q join public.submission_versions sv on sv.id=q.submission_version_id join public.assignment_submissions s on s.id=sv.submission_id join public.assignment_versions av on av.id=sv.assignment_version_id left join public.grading_assignments ga on ga.grading_queue_item_id=q.id and ga.status not in ('completed','revoked');
create or replace view public.assignment_gradebook_projection
with (security_invoker = true) as
select ge.id gradebook_entry_id, ge.organization_id, ge.learner_profile_id, ge.assignment_assignment_id, av.title assignment_title, ge.score, ge.final_grade, ge.status, ge.attempt_count, ge.late, ge.released, ge.released_at
from public.gradebook_entries ge join public.assignment_assignments aa on aa.id=ge.assignment_assignment_id join public.assignment_versions av on av.id=aa.assignment_version_id;
create or replace view public.assignment_reporting_projection
with (security_invoker = true) as
select aa.organization_id, av.assignment_id, av.id assignment_version_id, count(distinct aa.id)::integer assigned_count,
count(distinct s.id) filter(where s.status in ('submitted','under_review','graded','returned','resubmission_requested','resubmitted','finalized'))::integer submitted_count,
count(distinct ge.id) filter(where ge.released)::integer graded_count, avg(ge.score) filter(where ge.released) average_score
from public.assignment_assignments aa join public.assignment_versions av on av.id=aa.assignment_version_id left join public.assignment_submissions s on s.assignment_assignment_id=aa.id left join public.gradebook_entries ge on ge.assignment_assignment_id=aa.id group by aa.organization_id,av.assignment_id,av.id;

create or replace function private.can_author_assignment(p_organization_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog
as $$ select private.has_permission(p_organization_id,'assignment.authoring.manage') or private.has_permission(p_organization_id,'admin.workspace.manage') or private.has_permission(p_organization_id,'mentor.workspace.manage') $$;
create or replace function private.can_grade_assignment(p_organization_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog
as $$ select private.has_permission(p_organization_id,'assignment.grade.manage') or private.has_permission(p_organization_id,'admin.workspace.manage') or private.has_permission(p_organization_id,'mentor.workspace.manage') $$;
create or replace function private.owns_assignment_submission(p_submission_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog
as $$ select exists(select 1 from public.assignment_submissions s where s.id=p_submission_id and s.learner_profile_id=auth.uid() and private.is_active_org_member(s.organization_id)) $$;
create or replace function private.reject_assignment_evidence_mutation() returns trigger language plpgsql as $$ begin raise exception 'assignment evidence is immutable'; end $$;
create or replace function private.reject_published_assignment_mutation() returns trigger language plpgsql as $$ begin if old.status in ('published','superseded') then raise exception 'published assignment version is immutable'; end if; return new; end $$;

create trigger assignment_versions_reject_published_mutation before update or delete on public.assignment_versions for each row execute function private.reject_published_assignment_mutation();
create trigger assignment_publications_immutable before update or delete on public.assignment_publications for each row execute function private.reject_assignment_evidence_mutation();
create trigger submission_versions_immutable before update or delete on public.submission_versions for each row when (old.status <> 'draft') execute function private.reject_assignment_evidence_mutation();
create trigger submission_events_immutable before update or delete on public.submission_events for each row execute function private.reject_assignment_evidence_mutation();
create trigger submission_status_events_immutable before update or delete on public.submission_status_events for each row execute function private.reject_assignment_evidence_mutation();
create trigger grading_events_immutable before update or delete on public.grading_events for each row execute function private.reject_assignment_evidence_mutation();
create trigger rubric_score_events_immutable before update or delete on public.rubric_score_events for each row execute function private.reject_assignment_evidence_mutation();
create trigger resubmission_events_immutable before update or delete on public.resubmission_events for each row execute function private.reject_assignment_evidence_mutation();
create trigger gradebook_events_immutable before update or delete on public.gradebook_events for each row execute function private.reject_assignment_evidence_mutation();
create trigger assignment_authoring_events_immutable before update or delete on public.assignment_authoring_events for each row execute function private.reject_assignment_evidence_mutation();
create trigger assignment_change_logs_immutable before update or delete on public.assignment_change_logs for each row execute function private.reject_assignment_evidence_mutation();

create or replace function public.create_assignment(p_organization_id uuid,p_title text,p_assignment_type text) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_id uuid; begin if not private.can_author_assignment(p_organization_id) then raise exception 'not authorized'; end if; insert into public.assignments(organization_id,title,assignment_type,created_by,updated_by) values(p_organization_id,btrim(p_title),p_assignment_type,auth.uid(),auth.uid()) returning id into v_id; return v_id; end $$;
create or replace function public.save_assignment_draft(p_assignment_id uuid,p_title text,p_payload jsonb) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_assignment public.assignments%rowtype; v_version integer; v_id uuid; begin select * into strict v_assignment from public.assignments where id=p_assignment_id; if not private.can_author_assignment(v_assignment.organization_id) then raise exception 'not authorized'; end if; select coalesce(max(version),0)+1 into v_version from public.assignment_versions where assignment_id=p_assignment_id; insert into public.assignment_versions(organization_id,assignment_id,version,title,description,instructions,learning_outcomes,submission_type,due_date_policy,late_policy,resubmission_policy,maximum_attempts,accepted_file_types,maximum_file_bytes,maximum_files,grading_mode,passing_score,total_marks,anonymous_grading,status,content_hash,created_by,updated_by) values(v_assignment.organization_id,p_assignment_id,v_version,p_title,coalesce(p_payload->'description','{}'),coalesce(p_payload->'instructions','{}'),coalesce(p_payload->'learningOutcomes','[]'),coalesce(p_payload->>'submissionType',v_assignment.assignment_type),coalesce(p_payload->'dueDatePolicy','{}'),coalesce(p_payload->'latePolicy','{}'),coalesce(p_payload->'resubmissionPolicy','{}'),coalesce((p_payload->>'maximumAttempts')::integer,1),coalesce(array(select jsonb_array_elements_text(p_payload->'acceptedFileTypes')),'{}'),coalesce((p_payload->>'maximumFileBytes')::bigint,10485760),coalesce((p_payload->>'maximumFiles')::integer,1),coalesce(p_payload->>'gradingMode','points'),(p_payload->>'passingScore')::numeric,coalesce((p_payload->>'totalMarks')::numeric,100),coalesce((p_payload->>'anonymousGrading')::boolean,false),'draft',encode(extensions.digest(p_payload::text,'sha256'),'hex'),auth.uid(),auth.uid()) returning id into v_id; return v_id; end $$;
create or replace function public.submit_assignment_review(p_assignment_version_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; begin select organization_id into v_org from public.assignment_versions where id=p_assignment_version_id; if not private.can_author_assignment(v_org) then raise exception 'not authorized'; end if; update public.assignment_versions set status='review',updated_by=auth.uid(),updated_at=now() where id=p_assignment_version_id and status='draft'; end $$;
create or replace function public.approve_assignment(p_assignment_version_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; begin select organization_id into v_org from public.assignment_versions where id=p_assignment_version_id; if not private.can_author_assignment(v_org) then raise exception 'not authorized'; end if; update public.assignment_versions set status='approved',updated_by=auth.uid(),updated_at=now() where id=p_assignment_version_id and status='review'; end $$;
create or replace function public.reject_assignment(p_assignment_version_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_assignment uuid; begin select organization_id,assignment_id into v_org,v_assignment from public.assignment_versions where id=p_assignment_version_id; if not private.can_author_assignment(v_org) then raise exception 'not authorized'; end if; update public.assignment_versions set status='rejected',updated_by=auth.uid(),updated_at=now() where id=p_assignment_version_id and status='review'; insert into public.assignment_authoring_events(organization_id,assignment_id,assignment_version_id,event_type,actor_profile_id,details) values(v_org,v_assignment,p_assignment_version_id,'assignment.rejected',auth.uid(),jsonb_build_object('reason',p_reason)); end $$;
create or replace function public.publish_assignment(p_assignment_version_id uuid) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v public.assignment_versions%rowtype; v_pub uuid; begin select * into strict v from public.assignment_versions where id=p_assignment_version_id; if not private.can_author_assignment(v.organization_id) or v.status<>'approved' then raise exception 'not authorized or not approved'; end if; update public.assignment_versions set status='published',published_at=now(),updated_by=auth.uid(),updated_at=now() where id=v.id; update public.assignments set status='published',title=v.title,updated_by=auth.uid(),updated_at=now() where id=v.assignment_id; insert into public.assignment_publications(organization_id,assignment_version_id,published_by,content_hash) values(v.organization_id,v.id,auth.uid(),v.content_hash) returning id into v_pub; return v_pub; end $$;
create or replace function public.archive_assignment(p_assignment_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; begin select organization_id into v_org from public.assignments where id=p_assignment_id; if not private.can_author_assignment(v_org) then raise exception 'not authorized'; end if; update public.assignments set status='archived',archived_at=now(),updated_by=auth.uid(),updated_at=now() where id=p_assignment_id; end $$;
create or replace function public.create_rubric(p_organization_id uuid,p_name text) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_id uuid; begin if not private.can_author_assignment(p_organization_id) then raise exception 'not authorized'; end if; insert into public.rubrics(organization_id,name,created_by,updated_by) values(p_organization_id,btrim(p_name),auth.uid(),auth.uid()) returning id into v_id; return v_id; end $$;
create or replace function public.save_rubric_draft(p_rubric_id uuid,p_max_score numeric,p_criteria jsonb) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_version integer; v_id uuid; begin select organization_id into v_org from public.rubrics where id=p_rubric_id; if not private.can_author_assignment(v_org) then raise exception 'not authorized'; end if; select coalesce(max(version),0)+1 into v_version from public.rubric_versions where rubric_id=p_rubric_id; insert into public.rubric_versions(rubric_id,version,max_score,content_hash,created_by,updated_by) values(p_rubric_id,v_version,p_max_score,encode(extensions.digest(p_criteria::text,'sha256'),'hex'),auth.uid(),auth.uid()) returning id into v_id; insert into public.rubric_criteria(rubric_version_id,name,description,weight,position,levels) select v_id,x->>'name',coalesce(x->>'description',''),(x->>'weight')::numeric,ordinality::integer,coalesce(x->'levels','[]') from jsonb_array_elements(p_criteria) with ordinality as t(x,ordinality); return v_id; end $$;
create or replace function public.publish_rubric(p_rubric_version_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_rubric uuid; begin select r.organization_id,rv.rubric_id into v_org,v_rubric from public.rubric_versions rv join public.rubrics r on r.id=rv.rubric_id where rv.id=p_rubric_version_id; if not private.can_author_assignment(v_org) then raise exception 'not authorized'; end if; update public.rubric_versions set status='published',published_at=now(),updated_by=auth.uid(),updated_at=now() where id=p_rubric_version_id and status in ('draft','approved'); update public.rubrics set status='published',updated_by=auth.uid(),updated_at=now() where id=v_rubric; end $$;
create or replace function public.clone_rubric(p_rubric_id uuid,p_name text) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; begin select organization_id into v_org from public.rubrics where id=p_rubric_id; return public.create_rubric(v_org,p_name); end $$;
create or replace function public.start_assignment_submission(p_assignment_assignment_id uuid) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_assignment public.assignment_assignments%rowtype; v_profile uuid; v_id uuid; v_version_id uuid; begin
  select * into strict v_assignment from public.assignment_assignments where id=p_assignment_assignment_id;
  select resolved_profile_id into v_profile from (
    select coalesce(v_assignment.learner_profile_id,e.profile_id) resolved_profile_id
    from public.enrollments e where e.id=v_assignment.enrollment_id
    union all
    select om.profile_id from public.cohort_members cm join public.organization_members om on om.id=cm.organization_member_id
    where cm.cohort_id=v_assignment.cohort_id and cm.left_at is null and om.status='active' and om.profile_id=auth.uid()
    union all
    select v_assignment.learner_profile_id where v_assignment.learner_profile_id is not null
  ) resolved where resolved_profile_id=auth.uid() limit 1;
  if v_profile is null or not private.is_active_org_member(v_assignment.organization_id) then raise exception 'not authorized'; end if;
  insert into public.assignment_submissions(organization_id,assignment_assignment_id,learner_profile_id) values(v_assignment.organization_id,v_assignment.id,auth.uid()) on conflict(assignment_assignment_id,learner_profile_id) do update set updated_at=now() returning id into v_id;
  insert into public.submission_versions(organization_id,submission_id,assignment_version_id,rubric_version_id,version,attempt_number,created_by) select v_assignment.organization_id,v_id,v_assignment.assignment_version_id,av.rubric_version_id,coalesce(max(sv.version),0)+1,coalesce(max(sv.attempt_number),0)+1,auth.uid() from public.assignment_versions av left join public.submission_versions sv on sv.submission_id=v_id where av.id=v_assignment.assignment_version_id group by av.rubric_version_id returning id into v_version_id;
  return v_id;
end $$;
create or replace function public.save_submission_draft(p_submission_version_id uuid,p_entry_type text,p_body_ciphertext text,p_content_hash text) returns void language plpgsql security definer set search_path=public,private as $$ declare v_submission uuid; begin select submission_id into v_submission from public.submission_versions where id=p_submission_version_id and status='draft'; if not private.owns_assignment_submission(v_submission) then raise exception 'not authorized'; end if; insert into public.submission_text_entries(organization_id,submission_version_id,entry_type,body_ciphertext,content_hash) select organization_id,id,p_entry_type,p_body_ciphertext,p_content_hash from public.submission_versions where id=p_submission_version_id on conflict(submission_version_id,entry_type) do update set body_ciphertext=excluded.body_ciphertext,content_hash=excluded.content_hash,updated_at=now(); end $$;
create or replace function public.attach_submission_file(p_submission_version_id uuid,p_storage_object_id uuid,p_display_name text) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_submission uuid; v_file uuid; begin select submission_id into v_submission from public.submission_versions where id=p_submission_version_id and status='draft'; if not private.owns_assignment_submission(v_submission) then raise exception 'not authorized'; end if; insert into public.submission_files(organization_id,submission_version_id,storage_object_id,display_name,content_type,bytes,sha256,scan_status,created_by) select so.organization_id,p_submission_version_id,so.id,p_display_name,so.content_type,so.bytes,so.sha256,so.scan_status,auth.uid() from public.storage_objects so where so.id=p_storage_object_id and so.owner_profile_id=auth.uid() and so.bucket='assignment-private' returning id into v_file; return v_file; end $$;
create or replace function public.remove_submission_file(p_submission_file_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ declare v_submission uuid; begin select sv.submission_id into v_submission from public.submission_files sf join public.submission_versions sv on sv.id=sf.submission_version_id where sf.id=p_submission_file_id and sv.status='draft'; if not private.owns_assignment_submission(v_submission) then raise exception 'not authorized'; end if; delete from public.submission_files where id=p_submission_file_id; end $$;
create or replace function public.submit_assignment(p_submission_version_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ declare v_submission uuid; v_org uuid; begin select submission_id,organization_id into v_submission,v_org from public.submission_versions where id=p_submission_version_id and status='draft'; if not private.owns_assignment_submission(v_submission) then raise exception 'not authorized'; end if; update public.submission_versions set status='submitted',submitted_at=now(),content_hash=coalesce(content_hash,encode(extensions.digest(id::text||now()::text,'sha256'),'hex')) where id=p_submission_version_id; update public.assignment_submissions set status='submitted',submitted_at=now(),updated_at=now() where id=v_submission; insert into public.submission_status_events(organization_id,submission_id,from_status,to_status,actor_profile_id) values(v_org,v_submission,'draft','submitted',auth.uid()); insert into public.grading_queue_items(organization_id,submission_version_id) values(v_org,p_submission_version_id); end $$;
create or replace function public.request_resubmission(p_grading_result_id uuid,p_reason_ciphertext text,p_due_at timestamptz) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_submission uuid; v_id uuid; begin select gr.organization_id,sv.submission_id into v_org,v_submission from public.grading_results gr join public.submission_versions sv on sv.id=gr.submission_version_id where gr.id=p_grading_result_id; if not private.can_grade_assignment(v_org) then raise exception 'not authorized'; end if; insert into public.resubmission_requests(organization_id,submission_id,grading_result_id,requested_by,reason_ciphertext,due_at) values(v_org,v_submission,p_grading_result_id,auth.uid(),p_reason_ciphertext,p_due_at) returning id into v_id; update public.assignment_submissions set status='resubmission_requested',updated_at=now() where id=v_submission; return v_id; end $$;
create or replace function public.start_resubmission(p_resubmission_request_id uuid) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_submission uuid; v_delivery uuid; begin select submission_id into v_submission from public.resubmission_requests where id=p_resubmission_request_id and status='open'; if not private.owns_assignment_submission(v_submission) then raise exception 'not authorized'; end if; update public.resubmission_requests set status='started' where id=p_resubmission_request_id; select assignment_assignment_id into v_delivery from public.assignment_submissions where id=v_submission; perform public.start_assignment_submission(v_delivery); return v_submission; end $$;
create or replace function public.claim_grading_item(p_grading_queue_item_id uuid) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_id uuid; begin select organization_id into v_org from public.grading_queue_items where id=p_grading_queue_item_id and status='available'; if not private.can_grade_assignment(v_org) then raise exception 'not authorized'; end if; insert into public.grading_assignments(organization_id,grading_queue_item_id,grader_profile_id,status,claimed_at,assigned_by) values(v_org,p_grading_queue_item_id,auth.uid(),'claimed',now(),auth.uid()) returning id into v_id; update public.grading_queue_items set status='claimed' where id=p_grading_queue_item_id; return v_id; end $$;
create or replace function public.save_grading_draft(p_grading_assignment_id uuid,p_score numeric,p_feedback_ciphertext text) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_sv uuid; v_id uuid; begin select ga.organization_id,q.submission_version_id into v_org,v_sv from public.grading_assignments ga join public.grading_queue_items q on q.id=ga.grading_queue_item_id where ga.id=p_grading_assignment_id and ga.grader_profile_id=auth.uid(); if not private.can_grade_assignment(v_org) then raise exception 'not authorized'; end if; insert into public.grading_results(organization_id,submission_version_id,grading_assignment_id,grader_profile_id,score,overall_feedback_ciphertext) values(v_org,v_sv,p_grading_assignment_id,auth.uid(),p_score,p_feedback_ciphertext) returning id into v_id; return v_id; end $$;
create or replace function public.score_rubric_criterion(p_grading_result_id uuid,p_rubric_criterion_id uuid,p_score numeric,p_level_key text,p_feedback_ciphertext text) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_id uuid; begin select organization_id into v_org from public.grading_results where id=p_grading_result_id and grader_profile_id=auth.uid() and status='draft'; if not private.can_grade_assignment(v_org) then raise exception 'not authorized'; end if; insert into public.rubric_scores(organization_id,grading_result_id,rubric_criterion_id,score,level_key,feedback_ciphertext) values(v_org,p_grading_result_id,p_rubric_criterion_id,p_score,p_level_key,p_feedback_ciphertext) on conflict(grading_result_id,rubric_criterion_id) do update set score=excluded.score,level_key=excluded.level_key,feedback_ciphertext=excluded.feedback_ciphertext,updated_at=now() returning id into v_id; insert into public.rubric_score_events(organization_id,rubric_score_id,score,level_key,actor_profile_id) values(v_org,v_id,p_score,p_level_key,auth.uid()); return v_id; end $$;
create or replace function public.finalize_grade(p_grading_result_id uuid) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v public.grading_results%rowtype; v_submission uuid; v_delivery uuid; v_learner uuid; v_gradebook uuid; begin select * into strict v from public.grading_results where id=p_grading_result_id and grader_profile_id=auth.uid() and status='draft'; if not private.can_grade_assignment(v.organization_id) then raise exception 'not authorized'; end if; update public.grading_results set status='finalized',finalized_at=now(),updated_at=now() where id=v.id; select s.id,s.assignment_assignment_id,s.learner_profile_id into v_submission,v_delivery,v_learner from public.assignment_submissions s join public.submission_versions sv on sv.submission_id=s.id where sv.id=v.submission_version_id; insert into public.gradebook_entries(organization_id,learner_profile_id,assignment_assignment_id,submission_version_id,grading_result_id,score,status,attempt_count,late) select v.organization_id,v_learner,v_delivery,v.submission_version_id,v.id,v.score,'graded',sv.attempt_number,sv.late from public.submission_versions sv where sv.id=v.submission_version_id on conflict(assignment_assignment_id,learner_profile_id) do update set submission_version_id=excluded.submission_version_id,grading_result_id=excluded.grading_result_id,score=excluded.score,status='graded',attempt_count=excluded.attempt_count,late=excluded.late,updated_at=now() returning id into v_gradebook; insert into public.grading_events(organization_id,grading_result_id,event_type,actor_profile_id) values(v.organization_id,v.id,'grade.finalized',auth.uid()); return v_gradebook; end $$;
create or replace function public.release_feedback(p_grading_result_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ declare v_org uuid; v_gradebook uuid; begin select organization_id into v_org from public.grading_results where id=p_grading_result_id and status='finalized'; if not private.can_grade_assignment(v_org) then raise exception 'not authorized'; end if; update public.grading_results set status='released',released_at=now(),updated_at=now() where id=p_grading_result_id; update public.gradebook_entries set released=true,released_at=now(),status='released',updated_at=now() where grading_result_id=p_grading_result_id returning id into v_gradebook; insert into public.gradebook_events(organization_id,gradebook_entry_id,event_type,current_value,actor_profile_id) values(v_org,v_gradebook,'grade.released',jsonb_build_object('released',true),auth.uid()); end $$;
create or replace function public.record_assignment_event(p_organization_id uuid,p_assignment_id uuid,p_event_type text,p_details jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path=public,private as $$ declare v_id uuid; begin if not private.can_author_assignment(p_organization_id) then raise exception 'not authorized'; end if; insert into public.assignment_authoring_events(organization_id,assignment_id,event_type,actor_profile_id,details) values(p_organization_id,p_assignment_id,p_event_type,auth.uid(),p_details) returning id into v_id; return v_id; end $$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions(key,description,risk_level) values
('assignment.authoring.manage','Manage assignment and rubric authoring','high'),
('assignment.grade.manage','Grade and release assignment evidence','high')
on conflict(key) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key in ('assignment.authoring.manage','assignment.grade.manage')
where r.organization_id is null and r.key in ('mentor','instructor','organization_admin','enterprise_admin','platform_admin','super_admin')
on conflict do nothing;
-- SYRA-REFERENCE-DATA-END

do $$ declare n text; begin foreach n in array array['assignments','assignment_versions','assignment_publications','assignment_course_links','assignment_module_links','assignment_lesson_links','assignment_windows','assignment_rules','assignment_assets','assignment_attachments','assignment_assignments','assignment_submissions','submission_versions','submission_files','submission_text_entries','submission_events','submission_status_events','grading_queue_items','grading_assignments','grading_results','grading_events','grading_comments','rubric_scores','rubric_score_events','feedback_threads','feedback_messages','resubmission_requests','resubmission_events','gradebook_entries','gradebook_events','assignment_authoring_events','assignment_change_logs'] loop execute format('alter table public.%I enable row level security',n); execute format('alter table public.%I force row level security',n); end loop; end $$;
create policy assignments_member_select on public.assignments for select to authenticated using (organization_id is null or private.is_active_org_member(organization_id));
create policy assignment_versions_member_select on public.assignment_versions for select to authenticated using ((status='published' and private.is_active_org_member(organization_id)) or private.can_author_assignment(organization_id));
create policy assignment_publications_author_select on public.assignment_publications for select to authenticated using (private.can_author_assignment(organization_id));
create policy assignment_links_member_select on public.assignment_course_links for select to authenticated using (private.is_active_org_member(organization_id));
create policy assignment_module_links_member_select on public.assignment_module_links for select to authenticated using (private.is_active_org_member(organization_id));
create policy assignment_lesson_links_member_select on public.assignment_lesson_links for select to authenticated using (private.is_active_org_member(organization_id));
create policy assignment_windows_member_select on public.assignment_windows for select to authenticated using (private.is_active_org_member(organization_id));
create policy assignment_rules_author_select on public.assignment_rules for select to authenticated using (private.can_author_assignment(organization_id));
create policy assignment_assets_member_select on public.assignment_assets for select to authenticated using (private.is_active_org_member(organization_id));
create policy assignment_attachments_member_select on public.assignment_attachments for select to authenticated using ((visibility='learner' and private.is_active_org_member(organization_id)) or private.can_author_assignment(organization_id));
create policy assignment_assignments_context_select on public.assignment_assignments for select to authenticated using (
  learner_profile_id=auth.uid()
  or exists(select 1 from public.enrollments e where e.id=enrollment_id and e.profile_id=auth.uid())
  or exists(select 1 from public.cohort_members cm join public.organization_members om on om.id=cm.organization_member_id where cm.cohort_id=cohort_id and cm.left_at is null and om.profile_id=auth.uid() and om.status='active')
  or private.can_grade_assignment(organization_id)
  or private.can_author_assignment(organization_id)
);
create policy assignment_submissions_context_select on public.assignment_submissions for select to authenticated using (learner_profile_id=auth.uid() or private.can_grade_assignment(organization_id));
create policy submission_versions_context_select on public.submission_versions for select to authenticated using (exists(select 1 from public.assignment_submissions s where s.id=submission_id and (s.learner_profile_id=auth.uid() or private.can_grade_assignment(s.organization_id))));
create policy submission_files_context_select on public.submission_files for select to authenticated using (exists(select 1 from public.submission_versions sv join public.assignment_submissions s on s.id=sv.submission_id where sv.id=submission_version_id and (s.learner_profile_id=auth.uid() or private.can_grade_assignment(s.organization_id))));
create policy submission_text_context_select on public.submission_text_entries for select to authenticated using (exists(select 1 from public.submission_versions sv join public.assignment_submissions s on s.id=sv.submission_id where sv.id=submission_version_id and (s.learner_profile_id=auth.uid() or private.can_grade_assignment(s.organization_id))));
create policy submission_events_context_select on public.submission_events for select to authenticated using (private.owns_assignment_submission(submission_id) or private.can_grade_assignment(organization_id));
create policy submission_status_events_context_select on public.submission_status_events for select to authenticated using (private.owns_assignment_submission(submission_id) or private.can_grade_assignment(organization_id));
create policy grading_queue_grader_select on public.grading_queue_items for select to authenticated using (private.can_grade_assignment(organization_id));
create policy grading_assignments_grader_select on public.grading_assignments for select to authenticated using (grader_profile_id=auth.uid() or private.can_grade_assignment(organization_id));
create policy grading_results_secure_select on public.grading_results for select to authenticated using (private.can_grade_assignment(organization_id) or (status='released' and exists(select 1 from public.submission_versions sv join public.assignment_submissions s on s.id=sv.submission_id where sv.id=submission_version_id and s.learner_profile_id=auth.uid())));
create policy grading_events_grader_select on public.grading_events for select to authenticated using (private.can_grade_assignment(organization_id));
create policy grading_comments_secure_select on public.grading_comments for select to authenticated using (private.can_grade_assignment(organization_id) or (visibility='learner' and exists(select 1 from public.grading_results gr join public.submission_versions sv on sv.id=gr.submission_version_id join public.assignment_submissions s on s.id=sv.submission_id where gr.id=grading_result_id and gr.status='released' and s.learner_profile_id=auth.uid())));
create policy rubric_scores_secure_select on public.rubric_scores for select to authenticated using (private.can_grade_assignment(organization_id) or exists(select 1 from public.grading_results gr join public.submission_versions sv on sv.id=gr.submission_version_id join public.assignment_submissions s on s.id=sv.submission_id where gr.id=grading_result_id and gr.status='released' and s.learner_profile_id=auth.uid()));
create policy rubric_score_events_grader_select on public.rubric_score_events for select to authenticated using (private.can_grade_assignment(organization_id));
create policy feedback_threads_participant_select on public.feedback_threads for select to authenticated using (private.owns_assignment_submission(submission_id) or private.can_grade_assignment(organization_id));
create policy feedback_messages_participant_select on public.feedback_messages for select to authenticated using (private.can_grade_assignment(organization_id) or (visibility='participants' and released_at is not null and exists(select 1 from public.feedback_threads ft where ft.id=feedback_thread_id and private.owns_assignment_submission(ft.submission_id))));
create policy resubmission_requests_context_select on public.resubmission_requests for select to authenticated using (private.owns_assignment_submission(submission_id) or private.can_grade_assignment(organization_id));
create policy resubmission_events_context_select on public.resubmission_events for select to authenticated using (private.can_grade_assignment(organization_id) or exists(select 1 from public.resubmission_requests rr where rr.id=resubmission_request_id and private.owns_assignment_submission(rr.submission_id)));
create policy gradebook_entries_secure_select on public.gradebook_entries for select to authenticated using ((learner_profile_id=auth.uid() and released) or private.can_grade_assignment(organization_id) or private.can_author_assignment(organization_id));
create policy gradebook_events_secure_select on public.gradebook_events for select to authenticated using (private.can_grade_assignment(organization_id) or private.can_author_assignment(organization_id));
create policy assignment_authoring_events_author_select on public.assignment_authoring_events for select to authenticated using (private.can_author_assignment(organization_id));
create policy assignment_change_logs_author_select on public.assignment_change_logs for select to authenticated using (private.can_author_assignment(organization_id));

create policy assignment_storage_metadata_select on public.storage_objects for select to authenticated using (bucket='assignment-private' and (owner_profile_id=auth.uid() or private.can_grade_assignment(organization_id) or private.can_author_assignment(organization_id)));
create policy assignment_storage_metadata_insert on public.storage_objects for insert to authenticated with check (bucket='assignment-private' and owner_profile_id=auth.uid() and private.is_active_org_member(organization_id) and scan_status in ('pending','clean','quarantined'));
create policy assignment_objects_select on storage.objects for select to authenticated using (bucket_id='assignment-private' and exists(select 1 from public.storage_objects so where so.bucket=storage.objects.bucket_id and so.object_path=storage.objects.name and so.deleted_at is null and (so.owner_profile_id=auth.uid() or private.can_grade_assignment(so.organization_id) or private.can_author_assignment(so.organization_id))));
create policy assignment_objects_insert on storage.objects for insert to authenticated with check (bucket_id='assignment-private' and (storage.foldername(name))[2]=auth.uid()::text);
create policy assignment_objects_delete_draft on storage.objects for delete to authenticated using (bucket_id='assignment-private' and (storage.foldername(name))[2]=auth.uid()::text and not exists(select 1 from public.storage_objects so join public.submission_files sf on sf.storage_object_id=so.id join public.submission_versions sv on sv.id=sf.submission_version_id where so.bucket=storage.objects.bucket_id and so.object_path=storage.objects.name and sv.status<>'draft'));

grant execute on function private.can_author_assignment(uuid) to authenticated;
grant execute on function private.can_grade_assignment(uuid) to authenticated;
grant execute on function private.owns_assignment_submission(uuid) to authenticated;
grant execute on function public.create_assignment(uuid,text,text) to authenticated;
grant execute on function public.save_assignment_draft(uuid,text,jsonb) to authenticated;
grant execute on function public.submit_assignment_review(uuid) to authenticated;
grant execute on function public.approve_assignment(uuid) to authenticated;
grant execute on function public.reject_assignment(uuid,text) to authenticated;
grant execute on function public.publish_assignment(uuid) to authenticated;
grant execute on function public.archive_assignment(uuid) to authenticated;
grant execute on function public.create_rubric(uuid,text) to authenticated;
grant execute on function public.save_rubric_draft(uuid,numeric,jsonb) to authenticated;
grant execute on function public.publish_rubric(uuid) to authenticated;
grant execute on function public.clone_rubric(uuid,text) to authenticated;
grant execute on function public.start_assignment_submission(uuid) to authenticated;
grant execute on function public.save_submission_draft(uuid,text,text,text) to authenticated;
grant execute on function public.attach_submission_file(uuid,uuid,text) to authenticated;
grant execute on function public.remove_submission_file(uuid) to authenticated;
grant execute on function public.submit_assignment(uuid) to authenticated;
grant execute on function public.request_resubmission(uuid,text,timestamptz) to authenticated;
grant execute on function public.start_resubmission(uuid) to authenticated;
grant execute on function public.claim_grading_item(uuid) to authenticated;
grant execute on function public.save_grading_draft(uuid,numeric,text) to authenticated;
grant execute on function public.score_rubric_criterion(uuid,uuid,numeric,text,text) to authenticated;
grant execute on function public.finalize_grade(uuid) to authenticated;
grant execute on function public.release_feedback(uuid) to authenticated;
grant execute on function public.record_assignment_event(uuid,uuid,text,jsonb) to authenticated;
