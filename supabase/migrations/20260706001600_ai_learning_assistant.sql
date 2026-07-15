-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-019
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-PII-NOTES: learner prompts, generated artifacts, conversation titles and messages are application-encrypted; projections expose metadata only
-- SYRA-RLS: S2/S4/S6/S8 forced RLS, learner ownership, assigned-mentor reads, redacted admin audit, no public access
-- SYRA-IMMUTABLE: context, generated answers, quiz questions and attempts, revision sessions and learning events are append-only
-- SYRA-SEED: none

create table if not exists public.ai_learning_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  conversation_id uuid not null references public.ai_conversations(id) on delete restrict,
  session_type text not null,
  title_ciphertext text not null,
  title_hash text not null,
  course_id uuid references public.courses(id) on delete restrict,
  course_module_id uuid references public.course_modules(id) on delete restrict,
  lesson_id uuid references public.lessons(id) on delete restrict,
  status text not null default 'open',
  is_pinned boolean not null default false,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  closed_at timestamptz,
  expires_at timestamptz not null,
  constraint ai_learning_sessions_type_check check(session_type in('tutor','explanation','summary','quiz','flashcards','study_plan','revision','recommendation')),
  constraint ai_learning_sessions_status_check check(status in('open','closed','archived')),
  constraint ai_learning_sessions_title_hash_check check(title_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_learning_sessions_dates_check check(expires_at>started_at and (closed_at is null or closed_at>=started_at)),
  constraint ai_learning_sessions_conversation_unique unique(conversation_id)
);

create table if not exists public.ai_learning_context (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid not null references public.ai_learning_sessions(id) on delete restrict,
  context_type text not null,
  source_type text not null,
  source_id uuid,
  content_reference_hash text not null,
  token_estimate integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_learning_context_type_check check(context_type in('course','module','lesson','resource','assignment','assessment','learner_progress','conversation_memory')),
  constraint ai_learning_context_source_check check(source_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint ai_learning_context_hash_check check(content_reference_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_learning_context_token_check check(token_estimate>=0),
  constraint ai_learning_context_metadata_check check(jsonb_typeof(metadata)='object'),
  constraint ai_learning_context_unique unique(learning_session_id,context_type,source_type,source_id,content_reference_hash)
);

create table if not exists public.ai_learning_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid references public.ai_execution_requests(id) on delete restrict,
  plan_type text not null,
  title_ciphertext text not null,
  overview_ciphertext text not null,
  content_hash text not null,
  status text not null default 'active',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_learning_plans_type_check check(plan_type in('daily','weekly','roadmap','goal','revision')),
  constraint ai_learning_plans_status_check check(status in('active','completed','paused','archived')),
  constraint ai_learning_plans_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_learning_plans_dates_check check(ends_on is null or starts_on is null or ends_on>=starts_on)
);

create table if not exists public.ai_learning_plan_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_plan_id uuid not null references public.ai_learning_plans(id) on delete restrict,
  sequence_no integer not null,
  title_ciphertext text not null,
  description_ciphertext text not null,
  content_hash text not null,
  target_type text,
  target_id uuid,
  scheduled_for timestamptz,
  estimated_minutes integer not null default 0,
  priority integer not null default 100,
  status text not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_learning_plan_steps_sequence_check check(sequence_no>0),
  constraint ai_learning_plan_steps_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_learning_plan_steps_values_check check(estimated_minutes>=0 and priority between 1 and 1000),
  constraint ai_learning_plan_steps_status_check check(status in('pending','in_progress','completed','skipped')),
  constraint ai_learning_plan_steps_unique unique(learning_plan_id,sequence_no)
);

create table if not exists public.ai_flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid references public.ai_execution_requests(id) on delete restrict,
  title_ciphertext text not null,
  source_type text not null,
  source_id uuid,
  difficulty text not null default 'adaptive',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_flashcard_sets_source_check check(source_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint ai_flashcard_sets_difficulty_check check(difficulty in('introductory','intermediate','advanced','adaptive')),
  constraint ai_flashcard_sets_status_check check(status in('active','completed','archived'))
);

create table if not exists public.ai_flashcards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  flashcard_set_id uuid not null references public.ai_flashcard_sets(id) on delete restrict,
  sequence_no integer not null,
  front_ciphertext text not null,
  back_ciphertext text not null,
  explanation_ciphertext text,
  content_hash text not null,
  category text not null default 'general',
  difficulty text not null default 'adaptive',
  learning_state text not null default 'new',
  ease_factor numeric(5,2) not null default 2.50,
  interval_days integer not null default 0,
  review_count integer not null default 0,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_flashcards_sequence_check check(sequence_no>0),
  constraint ai_flashcards_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_flashcards_difficulty_check check(difficulty in('introductory','intermediate','advanced','adaptive')),
  constraint ai_flashcards_state_check check(learning_state in('new','learning','known','difficult','suspended')),
  constraint ai_flashcards_review_check check(ease_factor between 1.30 and 5.00 and interval_days>=0 and review_count>=0),
  constraint ai_flashcards_unique unique(flashcard_set_id,sequence_no)
);

create table if not exists public.ai_quiz_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid references public.ai_execution_requests(id) on delete restrict,
  title_ciphertext text not null,
  source_type text not null,
  source_id uuid,
  difficulty text not null default 'adaptive',
  question_types text[] not null default '{}',
  question_count integer not null,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  constraint ai_quiz_generations_source_check check(source_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint ai_quiz_generations_difficulty_check check(difficulty in('introductory','intermediate','advanced','adaptive')),
  constraint ai_quiz_generations_count_check check(question_count between 1 and 100),
  constraint ai_quiz_generations_status_check check(status in('ready','completed','archived'))
);

create table if not exists public.ai_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  quiz_generation_id uuid not null references public.ai_quiz_generations(id) on delete restrict,
  sequence_no integer not null,
  question_type text not null,
  prompt_ciphertext text not null,
  options_ciphertext text,
  answer_ciphertext text not null,
  explanation_ciphertext text not null,
  content_hash text not null,
  difficulty text not null default 'adaptive',
  created_at timestamptz not null default now(),
  constraint ai_quiz_questions_sequence_check check(sequence_no>0),
  constraint ai_quiz_questions_type_check check(question_type in('mcq','multiple_select','true_false','short_answer','scenario')),
  constraint ai_quiz_questions_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_quiz_questions_difficulty_check check(difficulty in('introductory','intermediate','advanced','adaptive')),
  constraint ai_quiz_questions_unique unique(quiz_generation_id,sequence_no)
);

create table if not exists public.ai_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  quiz_generation_id uuid not null references public.ai_quiz_generations(id) on delete restrict,
  attempt_number integer not null,
  response_ciphertext text not null,
  response_hash text not null,
  correct_count integer not null,
  question_count integer not null,
  score_percent numeric(5,2) not null,
  incorrect_question_ids uuid[] not null default '{}',
  started_at timestamptz not null,
  completed_at timestamptz not null,
  constraint ai_quiz_attempts_number_check check(attempt_number>0),
  constraint ai_quiz_attempts_hash_check check(response_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_quiz_attempts_score_check check(correct_count>=0 and question_count>0 and correct_count<=question_count and score_percent between 0 and 100),
  constraint ai_quiz_attempts_dates_check check(completed_at>=started_at),
  constraint ai_quiz_attempts_unique unique(quiz_generation_id,attempt_number)
);

create table if not exists public.ai_learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid references public.ai_execution_requests(id) on delete restrict,
  recommendation_type text not null,
  target_type text not null,
  target_id uuid,
  title_ciphertext text not null,
  reason_ciphertext text not null,
  content_hash text not null,
  priority integer not null default 100,
  confidence numeric(5,4),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  acted_at timestamptz,
  constraint ai_learning_recommendations_type_check check(recommendation_type in('continue_learning','revision','assignment','assessment','certificate','popular','role_based','organization','risk_intervention')),
  constraint ai_learning_recommendations_target_check check(target_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint ai_learning_recommendations_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_learning_recommendations_values_check check(priority between 1 and 1000 and (confidence is null or confidence between 0 and 1)),
  constraint ai_learning_recommendations_status_check check(status in('active','accepted','dismissed','expired'))
);

create table if not exists public.ai_revision_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid references public.ai_execution_requests(id) on delete restrict,
  title_ciphertext text not null,
  rationale_ciphertext text not null,
  content_hash text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_revision_plans_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_revision_plans_dates_check check(ends_on>=starts_on),
  constraint ai_revision_plans_status_check check(status in('active','completed','paused','archived'))
);

create table if not exists public.ai_revision_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  revision_plan_id uuid not null references public.ai_revision_plans(id) on delete restrict,
  session_number integer not null,
  scheduled_for timestamptz not null,
  focus_ciphertext text not null,
  content_hash text not null,
  estimated_minutes integer not null default 0,
  status text not null default 'scheduled',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ai_revision_sessions_number_check check(session_number>0),
  constraint ai_revision_sessions_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_revision_sessions_duration_check check(estimated_minutes>=0),
  constraint ai_revision_sessions_status_check check(status in('scheduled','completed','skipped')),
  constraint ai_revision_sessions_unique unique(revision_plan_id,session_number)
);

create table if not exists public.ai_concept_explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid not null references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  source_type text not null,
  source_id uuid,
  concept_ciphertext text not null,
  question_ciphertext text not null,
  explanation_ciphertext text not null,
  content_hash text not null,
  difficulty text not null default 'adaptive',
  created_at timestamptz not null default now(),
  constraint ai_concept_explanations_source_check check(source_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint ai_concept_explanations_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_concept_explanations_difficulty_check check(difficulty in('introductory','intermediate','advanced','adaptive'))
);

create table if not exists public.ai_summary_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid not null references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid not null references public.ai_execution_requests(id) on delete restrict,
  scope_type text not null,
  scope_id uuid not null,
  source_content_hash text not null,
  summary_ciphertext text not null,
  summary_hash text not null,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  constraint ai_summary_requests_scope_check check(scope_type in('lesson','module','course')),
  constraint ai_summary_requests_hash_check check(source_content_hash ~ '^[a-f0-9]{64}$' and summary_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_summary_requests_status_check check(status in('completed','blocked','failed'))
);

create table if not exists public.ai_learning_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid references public.ai_learning_sessions(id) on delete restrict,
  memory_type text not null,
  subject_type text,
  subject_id uuid,
  value_ciphertext text not null,
  value_hash text not null,
  classification text not null default 'confidential',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint ai_learning_memory_type_check check(memory_type in('preference','goal','bookmark','conversation_summary','learning_style','knowledge_gap')),
  constraint ai_learning_memory_hash_check check(value_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_learning_memory_classification_check check(classification in('internal','confidential','restricted','pii')),
  constraint ai_learning_memory_status_check check(status in('active','superseded','archived'))
);

create table if not exists public.ai_student_strengths (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  concept_key text not null,
  source_type text,
  source_id uuid,
  score numeric(5,4) not null,
  confidence numeric(5,4) not null,
  evidence_count integer not null default 0,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  constraint ai_student_strengths_key_check check(concept_key ~ '^[A-Za-z][A-Za-z0-9_.:-]{0,199}$'),
  constraint ai_student_strengths_values_check check(score between 0 and 1 and confidence between 0 and 1 and evidence_count>=0),
  constraint ai_student_strengths_unique unique(organization_id,profile_id,concept_key)
);

create table if not exists public.ai_student_weaknesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  concept_key text not null,
  source_type text,
  source_id uuid,
  severity numeric(5,4) not null,
  confidence numeric(5,4) not null,
  evidence_count integer not null default 0,
  intervention_status text not null default 'observed',
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  constraint ai_student_weaknesses_key_check check(concept_key ~ '^[A-Za-z][A-Za-z0-9_.:-]{0,199}$'),
  constraint ai_student_weaknesses_values_check check(severity between 0 and 1 and confidence between 0 and 1 and evidence_count>=0),
  constraint ai_student_weaknesses_status_check check(intervention_status in('observed','recommended','in_progress','resolved')),
  constraint ai_student_weaknesses_unique unique(organization_id,profile_id,concept_key)
);

create table if not exists public.ai_study_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  title_ciphertext text not null,
  description_ciphertext text,
  content_hash text not null,
  target_type text,
  target_id uuid,
  target_date date,
  progress_percent numeric(5,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_study_goals_hash_check check(content_hash ~ '^[a-f0-9]{64}$'),
  constraint ai_study_goals_progress_check check(progress_percent between 0 and 100),
  constraint ai_study_goals_status_check check(status in('active','completed','paused','archived'))
);

create table if not exists public.ai_learning_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_style text not null default 'adaptive',
  preferred_difficulty text not null default 'adaptive',
  session_minutes integer not null default 30,
  explanation_depth text not null default 'balanced',
  content_formats text[] not null default array['text']::text[],
  quiz_question_types text[] not null default array['mcq','true_false']::text[],
  flashcard_batch_size integer not null default 12,
  allow_learning_memory boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint ai_learning_preferences_style_check check(learning_style in('adaptive','visual','reading','practice','mixed')),
  constraint ai_learning_preferences_difficulty_check check(preferred_difficulty in('introductory','intermediate','advanced','adaptive')),
  constraint ai_learning_preferences_depth_check check(explanation_depth in('concise','balanced','detailed')),
  constraint ai_learning_preferences_values_check check(session_minutes between 5 and 240 and flashcard_batch_size between 1 and 100),
  constraint ai_learning_preferences_unique unique(organization_id,profile_id)
);

create table if not exists public.ai_learning_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  learning_session_id uuid references public.ai_learning_sessions(id) on delete restrict,
  execution_request_id uuid references public.ai_execution_requests(id) on delete restrict,
  event_type text not null,
  subject_type text,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint ai_learning_events_type_check check(event_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint ai_learning_events_subject_check check(subject_type is null or subject_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint ai_learning_events_metadata_check check(jsonb_typeof(metadata)='object')
);

create index if not exists ai_learning_sessions_profile_idx on public.ai_learning_sessions(profile_id,status,last_active_at desc);
create index if not exists ai_learning_sessions_org_type_idx on public.ai_learning_sessions(organization_id,session_type,started_at desc);
create index if not exists ai_learning_context_session_idx on public.ai_learning_context(learning_session_id,created_at);
create index if not exists ai_learning_plans_profile_idx on public.ai_learning_plans(profile_id,status,starts_on);
create index if not exists ai_learning_plan_steps_plan_idx on public.ai_learning_plan_steps(learning_plan_id,status,sequence_no);
create index if not exists ai_flashcard_sets_profile_idx on public.ai_flashcard_sets(profile_id,status,created_at desc);
create index if not exists ai_flashcards_review_idx on public.ai_flashcards(profile_id,learning_state,next_review_at);
create index if not exists ai_quiz_generations_profile_idx on public.ai_quiz_generations(profile_id,created_at desc);
create index if not exists ai_quiz_attempts_quiz_idx on public.ai_quiz_attempts(quiz_generation_id,attempt_number desc);
create index if not exists ai_learning_recommendations_profile_idx on public.ai_learning_recommendations(profile_id,status,priority,created_at desc);
create index if not exists ai_revision_plans_profile_idx on public.ai_revision_plans(profile_id,status,starts_on);
create index if not exists ai_revision_sessions_schedule_idx on public.ai_revision_sessions(profile_id,status,scheduled_for);
create index if not exists ai_learning_memory_profile_idx on public.ai_learning_memory(profile_id,memory_type,status,updated_at desc);
create index if not exists ai_student_strengths_profile_idx on public.ai_student_strengths(profile_id,score desc);
create index if not exists ai_student_weaknesses_profile_idx on public.ai_student_weaknesses(profile_id,severity desc,intervention_status);
create index if not exists ai_study_goals_profile_idx on public.ai_study_goals(profile_id,status,target_date);
create index if not exists ai_learning_events_org_time_idx on public.ai_learning_events(organization_id,occurred_at desc,event_type);
create index if not exists ai_learning_events_profile_time_idx on public.ai_learning_events(profile_id,occurred_at desc,event_type);

create or replace function private.can_read_ai_learning_content(target_organization_id uuid,target_profile_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and target_profile_id is not null and (
    auth.uid()=target_profile_id or private.can_access_assigned_learner(target_organization_id,target_profile_id)
  )
$$;

create or replace function private.can_read_ai_learning_audit(target_organization_id uuid,target_profile_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select private.can_read_ai_learning_content(target_organization_id,target_profile_id)
    or private.can_read_ai_audit(target_organization_id)
$$;

create or replace function private.owns_ai_learning_session(target_session_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.ai_learning_sessions s where s.id=target_session_id and s.profile_id=auth.uid() and private.can_use_ai(s.organization_id))
$$;

create or replace function private.completed_ai_learning_execution(target_execution_id uuid,target_session_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.ai_execution_requests r join public.ai_learning_sessions s on s.id=target_session_id
    where r.id=target_execution_id and r.organization_id=s.organization_id and r.profile_id=s.profile_id
      and r.profile_id=auth.uid() and r.status='completed'
  )
$$;

create or replace view public.student_ai_dashboard_projection with(security_invoker=true) as
select s.organization_id,s.profile_id,
  count(*) filter(where s.status='open')::integer as open_sessions,
  count(*) filter(where s.is_pinned)::integer as pinned_sessions,
  max(s.last_active_at) as last_active_at,
  (select count(*)::integer from public.ai_learning_plans p where p.organization_id=s.organization_id and p.profile_id=s.profile_id and p.status='active') as active_plans,
  (select count(*)::integer from public.ai_flashcards f where f.organization_id=s.organization_id and f.profile_id=s.profile_id and f.learning_state in('new','learning','difficult')) as cards_due,
  (select count(*)::integer from public.ai_learning_recommendations r where r.organization_id=s.organization_id and r.profile_id=s.profile_id and r.status='active') as active_recommendations,
  (select count(*)::integer from public.ai_study_goals g where g.organization_id=s.organization_id and g.profile_id=s.profile_id and g.status='active') as active_goals
from public.ai_learning_sessions s group by s.organization_id,s.profile_id;

create or replace view public.student_ai_progress_projection with(security_invoker=true) as
select p.organization_id,p.profile_id,
  (select count(*)::integer from public.ai_student_strengths x where x.organization_id=p.organization_id and x.profile_id=p.profile_id) as strength_count,
  (select count(*)::integer from public.ai_student_weaknesses x where x.organization_id=p.organization_id and x.profile_id=p.profile_id and x.intervention_status<>'resolved') as open_weakness_count,
  (select coalesce(avg(a.score_percent),0)::numeric(5,2) from public.ai_quiz_attempts a where a.organization_id=p.organization_id and a.profile_id=p.profile_id) as quiz_average,
  (select count(*)::integer from public.ai_flashcards f where f.organization_id=p.organization_id and f.profile_id=p.profile_id and f.learning_state='known') as known_flashcards,
  (select count(*)::integer from public.ai_learning_plan_steps s where s.organization_id=p.organization_id and s.profile_id=p.profile_id and s.status='completed') as completed_plan_steps
from public.ai_learning_preferences p;

create or replace view public.mentor_ai_student_projection with(security_invoker=true) as
select s.organization_id,s.profile_id,
  count(distinct s.id)::integer as session_count,
  max(s.last_active_at) as last_active_at,
  count(distinct w.id) filter(where w.intervention_status<>'resolved')::integer as open_weaknesses,
  coalesce(max(w.severity),0)::numeric(5,4) as highest_risk,
  count(distinct r.id) filter(where r.status='active')::integer as active_recommendations
from public.ai_learning_sessions s
left join public.ai_student_weaknesses w on w.organization_id=s.organization_id and w.profile_id=s.profile_id
left join public.ai_learning_recommendations r on r.organization_id=s.organization_id and r.profile_id=s.profile_id
group by s.organization_id,s.profile_id;

create or replace view public.reporting_ai_learning_projection with(security_invoker=true) as
select organization_id,date_trunc('day',occurred_at) as activity_day,event_type,
  count(*)::integer as event_count,count(distinct profile_id)::integer as learner_count,
  count(distinct learning_session_id)::integer as session_count
from public.ai_learning_events group by organization_id,date_trunc('day',occurred_at),event_type;

create or replace view public.ai_learning_usage_projection with(security_invoker=true) as
select e.organization_id,e.profile_id,date_trunc('day',e.occurred_at) as usage_day,
  count(*)::integer as event_count,
  count(*) filter(where e.event_type like 'generation.%')::integer as generation_count,
  count(*) filter(where e.event_type='feedback.recorded')::integer as feedback_count,
  count(distinct e.execution_request_id)::integer as execution_count
from public.ai_learning_events e group by e.organization_id,e.profile_id,date_trunc('day',e.occurred_at);

create or replace function public.create_learning_session(
  p_organization_id uuid,p_session_type text,p_title_ciphertext text,p_title_hash text,
  p_course_id uuid default null,p_course_module_id uuid default null,p_lesson_id uuid default null,p_retention_days integer default 30
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; conversation_result uuid; begin
  if auth.uid() is null or not private.can_use_ai(p_organization_id) or p_retention_days not between 1 and 365 then
    raise exception 'AI learning session denied' using errcode='42501';
  end if;
  conversation_result:=public.create_ai_conversation(p_organization_id,'learning.'||p_session_type,p_retention_days);
  insert into public.ai_learning_sessions(
    organization_id,profile_id,conversation_id,session_type,title_ciphertext,title_hash,course_id,course_module_id,lesson_id,expires_at
  ) values(
    p_organization_id,auth.uid(),conversation_result,p_session_type,p_title_ciphertext,p_title_hash,p_course_id,p_course_module_id,p_lesson_id,now()+make_interval(days=>p_retention_days)
  ) returning id into result_id;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,event_type)
  values(p_organization_id,auth.uid(),result_id,'session.created');
  return result_id;
end $$;

create or replace function public.save_learning_context(
  p_learning_session_id uuid,p_context_type text,p_source_type text,p_source_id uuid,p_content_reference_hash text,
  p_token_estimate integer default 0,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.owns_ai_learning_session(p_learning_session_id) then raise exception 'AI learning context denied' using errcode='42501'; end if;
  insert into public.ai_learning_context(organization_id,profile_id,learning_session_id,context_type,source_type,source_id,content_reference_hash,token_estimate,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_context_type,p_source_type,p_source_id,p_content_reference_hash,p_token_estimate,p_metadata)
  returning id into result_id;
  return result_id;
end $$;

create or replace function public.append_learning_message(
  p_learning_session_id uuid,p_role text,p_content_ciphertext text,p_content_hash text,p_classification text default 'confidential'
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; next_sequence integer; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id for update;
  if not private.owns_ai_learning_session(p_learning_session_id) or session_row.status<>'open' then raise exception 'AI learning message denied' using errcode='42501'; end if;
  select coalesce(max(sequence_no),0)+1 into next_sequence from public.ai_messages where conversation_id=session_row.conversation_id;
  insert into public.ai_messages(organization_id,conversation_id,profile_id,sequence_no,role,content_ciphertext,classification,source_manifest,expires_at)
  values(session_row.organization_id,session_row.conversation_id,case when p_role='user' then auth.uid() else null end,next_sequence,p_role,p_content_ciphertext,p_classification,jsonb_build_object('contentHash',p_content_hash,'learningSessionId',p_learning_session_id),session_row.expires_at)
  returning id into result_id;
  update public.ai_learning_sessions set last_active_at=now() where id=p_learning_session_id;
  return result_id;
end $$;

create or replace function public.generate_flashcards(
  p_learning_session_id uuid,p_execution_request_id uuid,p_title_ciphertext text,p_source_type text,p_source_id uuid,
  p_difficulty text,p_cards jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id) or jsonb_typeof(p_cards)<>'array' or jsonb_array_length(p_cards) not between 1 and 100 then
    raise exception 'AI flashcard generation denied' using errcode='42501';
  end if;
  insert into public.ai_flashcard_sets(organization_id,profile_id,learning_session_id,execution_request_id,title_ciphertext,source_type,source_id,difficulty)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,p_title_ciphertext,p_source_type,p_source_id,p_difficulty)
  returning id into result_id;
  insert into public.ai_flashcards(organization_id,profile_id,flashcard_set_id,sequence_no,front_ciphertext,back_ciphertext,explanation_ciphertext,content_hash,category,difficulty)
  select session_row.organization_id,session_row.profile_id,result_id,item.ordinality::integer,item.value->>'frontCiphertext',item.value->>'backCiphertext',nullif(item.value->>'explanationCiphertext',''),item.value->>'contentHash',coalesce(nullif(item.value->>'category',''),'general'),coalesce(nullif(item.value->>'difficulty',''),p_difficulty)
  from jsonb_array_elements(p_cards) with ordinality as item(value,ordinality);
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,subject_type,subject_id,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.flashcards','flashcard_set',result_id,jsonb_build_object('count',jsonb_array_length(p_cards)));
  return result_id;
end $$;

create or replace function public.generate_quiz(
  p_learning_session_id uuid,p_execution_request_id uuid,p_title_ciphertext text,p_source_type text,p_source_id uuid,
  p_difficulty text,p_questions jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; question_types text[]; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id) or jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions) not between 1 and 100 then
    raise exception 'AI quiz generation denied' using errcode='42501';
  end if;
  select coalesce(array_agg(distinct value->>'questionType'),'{}') into question_types from jsonb_array_elements(p_questions);
  insert into public.ai_quiz_generations(organization_id,profile_id,learning_session_id,execution_request_id,title_ciphertext,source_type,source_id,difficulty,question_types,question_count)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,p_title_ciphertext,p_source_type,p_source_id,p_difficulty,question_types,jsonb_array_length(p_questions))
  returning id into result_id;
  insert into public.ai_quiz_questions(organization_id,profile_id,quiz_generation_id,sequence_no,question_type,prompt_ciphertext,options_ciphertext,answer_ciphertext,explanation_ciphertext,content_hash,difficulty)
  select session_row.organization_id,session_row.profile_id,result_id,item.ordinality::integer,item.value->>'questionType',item.value->>'promptCiphertext',nullif(item.value->>'optionsCiphertext',''),item.value->>'answerCiphertext',item.value->>'explanationCiphertext',item.value->>'contentHash',coalesce(nullif(item.value->>'difficulty',''),p_difficulty)
  from jsonb_array_elements(p_questions) with ordinality as item(value,ordinality);
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,subject_type,subject_id,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.quiz','quiz',result_id,jsonb_build_object('count',jsonb_array_length(p_questions)));
  return result_id;
end $$;

create or replace function public.generate_summary(
  p_learning_session_id uuid,p_execution_request_id uuid,p_scope_type text,p_scope_id uuid,p_source_content_hash text,
  p_summary_ciphertext text,p_summary_hash text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id) then raise exception 'AI summary generation denied' using errcode='42501'; end if;
  insert into public.ai_summary_requests(organization_id,profile_id,learning_session_id,execution_request_id,scope_type,scope_id,source_content_hash,summary_ciphertext,summary_hash)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,p_scope_type,p_scope_id,p_source_content_hash,p_summary_ciphertext,p_summary_hash)
  returning id into result_id;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,subject_type,subject_id)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.summary',p_scope_type,result_id);
  return result_id;
end $$;

create or replace function public.generate_explanation(
  p_learning_session_id uuid,p_execution_request_id uuid,p_source_type text,p_source_id uuid,p_concept_ciphertext text,
  p_question_ciphertext text,p_explanation_ciphertext text,p_content_hash text,p_difficulty text default 'adaptive'
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id) then raise exception 'AI explanation generation denied' using errcode='42501'; end if;
  insert into public.ai_concept_explanations(organization_id,profile_id,learning_session_id,execution_request_id,source_type,source_id,concept_ciphertext,question_ciphertext,explanation_ciphertext,content_hash,difficulty)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,p_source_type,p_source_id,p_concept_ciphertext,p_question_ciphertext,p_explanation_ciphertext,p_content_hash,p_difficulty)
  returning id into result_id;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,subject_type,subject_id)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.explanation','explanation',result_id);
  return result_id;
end $$;

create or replace function public.generate_learning_plan(
  p_learning_session_id uuid,p_execution_request_id uuid,p_plan_type text,p_title_ciphertext text,p_overview_ciphertext text,
  p_content_hash text,p_starts_on date,p_ends_on date,p_steps jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id) or jsonb_typeof(p_steps)<>'array' then raise exception 'AI learning plan generation denied' using errcode='42501'; end if;
  insert into public.ai_learning_plans(organization_id,profile_id,learning_session_id,execution_request_id,plan_type,title_ciphertext,overview_ciphertext,content_hash,starts_on,ends_on)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,p_plan_type,p_title_ciphertext,p_overview_ciphertext,p_content_hash,p_starts_on,p_ends_on)
  returning id into result_id;
  insert into public.ai_learning_plan_steps(organization_id,profile_id,learning_plan_id,sequence_no,title_ciphertext,description_ciphertext,content_hash,target_type,target_id,scheduled_for,estimated_minutes,priority)
  select session_row.organization_id,session_row.profile_id,result_id,item.ordinality::integer,item.value->>'titleCiphertext',item.value->>'descriptionCiphertext',item.value->>'contentHash',nullif(item.value->>'targetType',''),nullif(item.value->>'targetId','')::uuid,nullif(item.value->>'scheduledFor','')::timestamptz,coalesce((item.value->>'estimatedMinutes')::integer,0),coalesce((item.value->>'priority')::integer,100)
  from jsonb_array_elements(p_steps) with ordinality as item(value,ordinality);
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,subject_type,subject_id,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.learning_plan','learning_plan',result_id,jsonb_build_object('steps',jsonb_array_length(p_steps)));
  return result_id;
end $$;

create or replace function public.generate_revision_plan(
  p_learning_session_id uuid,p_execution_request_id uuid,p_title_ciphertext text,p_rationale_ciphertext text,p_content_hash text,
  p_starts_on date,p_ends_on date,p_sessions jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id) or jsonb_typeof(p_sessions)<>'array' then raise exception 'AI revision plan generation denied' using errcode='42501'; end if;
  insert into public.ai_revision_plans(organization_id,profile_id,learning_session_id,execution_request_id,title_ciphertext,rationale_ciphertext,content_hash,starts_on,ends_on)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,p_title_ciphertext,p_rationale_ciphertext,p_content_hash,p_starts_on,p_ends_on)
  returning id into result_id;
  insert into public.ai_revision_sessions(organization_id,profile_id,revision_plan_id,session_number,scheduled_for,focus_ciphertext,content_hash,estimated_minutes)
  select session_row.organization_id,session_row.profile_id,result_id,item.ordinality::integer,(item.value->>'scheduledFor')::timestamptz,item.value->>'focusCiphertext',item.value->>'contentHash',coalesce((item.value->>'estimatedMinutes')::integer,0)
  from jsonb_array_elements(p_sessions) with ordinality as item(value,ordinality);
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,subject_type,subject_id,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.revision_plan','revision_plan',result_id,jsonb_build_object('sessions',jsonb_array_length(p_sessions)));
  return result_id;
end $$;

create or replace function public.record_learning_feedback(
  p_learning_session_id uuid,p_subject_type text,p_subject_id uuid,p_rating integer,p_helpful boolean,
  p_reason_codes text[] default '{}',p_comment_ciphertext text default null
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.owns_ai_learning_session(p_learning_session_id) or p_rating not between 1 and 5 then raise exception 'AI learning feedback denied' using errcode='42501'; end if;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,event_type,subject_type,subject_id,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,'feedback.recorded',p_subject_type,p_subject_id,
    jsonb_build_object('rating',p_rating,'helpful',p_helpful,'reasonCodes',p_reason_codes,'commentCiphertext',p_comment_ciphertext))
  returning id into result_id;
  return result_id;
end $$;

create or replace function public.generate_learning_recommendations(
  p_learning_session_id uuid,p_execution_request_id uuid,p_recommendations jsonb
) returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare inserted_count integer; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id) or jsonb_typeof(p_recommendations)<>'array' or jsonb_array_length(p_recommendations)>50 then
    raise exception 'AI learning recommendation generation denied' using errcode='42501';
  end if;
  insert into public.ai_learning_recommendations(
    organization_id,profile_id,learning_session_id,execution_request_id,recommendation_type,target_type,target_id,
    title_ciphertext,reason_ciphertext,content_hash,priority,confidence,expires_at
  )
  select session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,
    item.value->>'recommendationType',item.value->>'targetType',nullif(item.value->>'targetId','')::uuid,
    item.value->>'titleCiphertext',item.value->>'reasonCiphertext',item.value->>'contentHash',
    coalesce((item.value->>'priority')::integer,100),nullif(item.value->>'confidence','')::numeric,
    nullif(item.value->>'expiresAt','')::timestamptz
  from jsonb_array_elements(p_recommendations) as item(value);
  get diagnostics inserted_count=row_count;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.recommendations',jsonb_build_object('count',inserted_count));
  return inserted_count;
end $$;

create or replace function public.record_learning_insights(
  p_learning_session_id uuid,p_execution_request_id uuid,p_strengths jsonb,p_weaknesses jsonb
) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.completed_ai_learning_execution(p_execution_request_id,p_learning_session_id)
    or jsonb_typeof(p_strengths)<>'array' or jsonb_typeof(p_weaknesses)<>'array'
    or jsonb_array_length(p_strengths)>100 or jsonb_array_length(p_weaknesses)>100 then
    raise exception 'AI learning insight recording denied' using errcode='42501';
  end if;
  insert into public.ai_student_strengths(organization_id,profile_id,concept_key,source_type,source_id,score,confidence,evidence_count)
  select session_row.organization_id,session_row.profile_id,item.value->>'conceptKey',nullif(item.value->>'sourceType',''),nullif(item.value->>'sourceId','')::uuid,(item.value->>'score')::numeric,(item.value->>'confidence')::numeric,coalesce((item.value->>'evidenceCount')::integer,1)
  from jsonb_array_elements(p_strengths) as item(value)
  on conflict(organization_id,profile_id,concept_key) do update set score=excluded.score,confidence=excluded.confidence,evidence_count=public.ai_student_strengths.evidence_count+excluded.evidence_count,last_observed_at=now();
  insert into public.ai_student_weaknesses(organization_id,profile_id,concept_key,source_type,source_id,severity,confidence,evidence_count)
  select session_row.organization_id,session_row.profile_id,item.value->>'conceptKey',nullif(item.value->>'sourceType',''),nullif(item.value->>'sourceId','')::uuid,(item.value->>'severity')::numeric,(item.value->>'confidence')::numeric,coalesce((item.value->>'evidenceCount')::integer,1)
  from jsonb_array_elements(p_weaknesses) as item(value)
  on conflict(organization_id,profile_id,concept_key) do update set severity=excluded.severity,confidence=excluded.confidence,evidence_count=public.ai_student_weaknesses.evidence_count+excluded.evidence_count,last_observed_at=now();
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,execution_request_id,event_type,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_execution_request_id,'generation.learning_insights',jsonb_build_object('strengths',jsonb_array_length(p_strengths),'weaknesses',jsonb_array_length(p_weaknesses)));
end $$;

create or replace function public.record_learning_event(
  p_learning_session_id uuid,p_event_type text,p_subject_type text default null,p_subject_id uuid default null,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id;
  if not private.owns_ai_learning_session(p_learning_session_id) then raise exception 'AI learning event denied' using errcode='42501'; end if;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,event_type,subject_type,subject_id,metadata)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,p_event_type,p_subject_type,p_subject_id,p_metadata)
  returning id into result_id;
  return result_id;
end $$;

create or replace function public.close_learning_session(p_learning_session_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare session_row public.ai_learning_sessions%rowtype; begin
  select * into session_row from public.ai_learning_sessions where id=p_learning_session_id for update;
  if not private.owns_ai_learning_session(p_learning_session_id) then raise exception 'AI learning session close denied' using errcode='42501'; end if;
  update public.ai_learning_sessions set status='closed',closed_at=now(),last_active_at=now() where id=p_learning_session_id and status='open';
  update public.ai_conversations set status='closed',ended_at=now() where id=session_row.conversation_id and status='open';
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,event_type)
  values(session_row.organization_id,session_row.profile_id,p_learning_session_id,'session.closed');
end $$;

create or replace function public.update_learning_session_state(p_learning_session_id uuid,p_status text,p_is_pinned boolean)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  if not private.owns_ai_learning_session(p_learning_session_id) or p_status not in('open','closed','archived') then raise exception 'AI learning session update denied' using errcode='42501'; end if;
  update public.ai_learning_sessions set status=p_status,is_pinned=p_is_pinned,last_active_at=now(),closed_at=case when p_status='closed' then coalesce(closed_at,now()) else closed_at end where id=p_learning_session_id;
end $$;

create or replace function public.record_flashcard_review(p_flashcard_id uuid,p_learning_state text,p_ease_factor numeric,p_interval_days integer,p_next_review_at timestamptz)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare card_row public.ai_flashcards%rowtype; session_id uuid; begin
  select * into card_row from public.ai_flashcards where id=p_flashcard_id;
  if card_row.profile_id is distinct from auth.uid() or not private.can_use_ai(card_row.organization_id) then raise exception 'AI flashcard review denied' using errcode='42501'; end if;
  update public.ai_flashcards set learning_state=p_learning_state,ease_factor=p_ease_factor,interval_days=p_interval_days,review_count=review_count+1,next_review_at=p_next_review_at,last_reviewed_at=now(),updated_at=now() where id=p_flashcard_id;
  select learning_session_id into session_id from public.ai_flashcard_sets where id=card_row.flashcard_set_id;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,event_type,subject_type,subject_id,metadata)
  values(card_row.organization_id,card_row.profile_id,session_id,'flashcard.reviewed','flashcard',p_flashcard_id,jsonb_build_object('state',p_learning_state,'intervalDays',p_interval_days));
end $$;

create or replace function public.record_quiz_attempt(
  p_quiz_generation_id uuid,p_response_ciphertext text,p_response_hash text,p_correct_count integer,p_score_percent numeric,
  p_incorrect_question_ids uuid[],p_started_at timestamptz
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; quiz_row public.ai_quiz_generations%rowtype; next_attempt integer; begin
  select * into quiz_row from public.ai_quiz_generations where id=p_quiz_generation_id for update;
  if quiz_row.profile_id is distinct from auth.uid() or not private.can_use_ai(quiz_row.organization_id) then raise exception 'AI quiz attempt denied' using errcode='42501'; end if;
  select coalesce(max(attempt_number),0)+1 into next_attempt from public.ai_quiz_attempts where quiz_generation_id=p_quiz_generation_id;
  insert into public.ai_quiz_attempts(organization_id,profile_id,quiz_generation_id,attempt_number,response_ciphertext,response_hash,correct_count,question_count,score_percent,incorrect_question_ids,started_at,completed_at)
  values(quiz_row.organization_id,quiz_row.profile_id,p_quiz_generation_id,next_attempt,p_response_ciphertext,p_response_hash,p_correct_count,quiz_row.question_count,p_score_percent,p_incorrect_question_ids,p_started_at,now())
  returning id into result_id;
  insert into public.ai_learning_events(organization_id,profile_id,learning_session_id,event_type,subject_type,subject_id,metadata)
  values(quiz_row.organization_id,quiz_row.profile_id,quiz_row.learning_session_id,'quiz.completed','quiz_attempt',result_id,jsonb_build_object('scorePercent',p_score_percent,'attempt',next_attempt));
  return result_id;
end $$;

create or replace function public.update_learning_preferences(
  p_organization_id uuid,p_learning_style text,p_preferred_difficulty text,p_session_minutes integer,p_explanation_depth text,
  p_content_formats text[],p_quiz_question_types text[],p_flashcard_batch_size integer,p_allow_learning_memory boolean
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare result_id uuid; begin
  if auth.uid() is null or not private.can_use_ai(p_organization_id) then raise exception 'AI learning preferences denied' using errcode='42501'; end if;
  insert into public.ai_learning_preferences(organization_id,profile_id,learning_style,preferred_difficulty,session_minutes,explanation_depth,content_formats,quiz_question_types,flashcard_batch_size,allow_learning_memory)
  values(p_organization_id,auth.uid(),p_learning_style,p_preferred_difficulty,p_session_minutes,p_explanation_depth,p_content_formats,p_quiz_question_types,p_flashcard_batch_size,p_allow_learning_memory)
  on conflict(organization_id,profile_id) do update set learning_style=excluded.learning_style,preferred_difficulty=excluded.preferred_difficulty,session_minutes=excluded.session_minutes,explanation_depth=excluded.explanation_depth,content_formats=excluded.content_formats,quiz_question_types=excluded.quiz_question_types,flashcard_batch_size=excluded.flashcard_batch_size,allow_learning_memory=excluded.allow_learning_memory,updated_at=now()
  returning id into result_id;
  return result_id;
end $$;

create or replace function private.reject_ai_learning_evidence_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'AI learning evidence is immutable'; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'ai_learning_context','ai_quiz_questions','ai_quiz_attempts','ai_concept_explanations','ai_summary_requests','ai_revision_sessions','ai_learning_events'
] loop
  execute format('create trigger %I before update or delete on public.%I for each row execute function private.reject_ai_learning_evidence_mutation()',table_name||'_immutable',table_name);
end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'ai_learning_sessions','ai_learning_context','ai_learning_plans','ai_learning_plan_steps','ai_flashcard_sets','ai_flashcards',
  'ai_quiz_generations','ai_quiz_questions','ai_quiz_attempts','ai_learning_recommendations','ai_revision_plans','ai_revision_sessions',
  'ai_concept_explanations','ai_summary_requests','ai_learning_memory','ai_student_strengths','ai_student_weaknesses','ai_study_goals',
  'ai_learning_preferences','ai_learning_events'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from anon,authenticated',table_name);
end loop; end $$;

create policy ai_learning_sessions_content_select on public.ai_learning_sessions for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_learning_context_content_select on public.ai_learning_context for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_learning_plans_content_select on public.ai_learning_plans for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_learning_plan_steps_content_select on public.ai_learning_plan_steps for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_flashcard_sets_content_select on public.ai_flashcard_sets for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_flashcards_content_select on public.ai_flashcards for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_quiz_generations_content_select on public.ai_quiz_generations for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_quiz_questions_content_select on public.ai_quiz_questions for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_quiz_attempts_content_select on public.ai_quiz_attempts for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_learning_recommendations_content_select on public.ai_learning_recommendations for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_revision_plans_content_select on public.ai_revision_plans for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_revision_sessions_content_select on public.ai_revision_sessions for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_concept_explanations_content_select on public.ai_concept_explanations for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_summary_requests_content_select on public.ai_summary_requests for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_learning_memory_content_select on public.ai_learning_memory for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_student_strengths_content_select on public.ai_student_strengths for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_student_weaknesses_content_select on public.ai_student_weaknesses for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_study_goals_content_select on public.ai_study_goals for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_learning_preferences_content_select on public.ai_learning_preferences for select to authenticated using(private.can_read_ai_learning_content(organization_id,profile_id));
create policy ai_learning_events_audit_select on public.ai_learning_events for select to authenticated using(private.can_read_ai_learning_audit(organization_id,profile_id));

grant select on public.ai_learning_sessions,public.ai_learning_context,public.ai_learning_plans,public.ai_learning_plan_steps,public.ai_flashcard_sets,public.ai_flashcards,public.ai_quiz_generations,public.ai_quiz_questions,public.ai_quiz_attempts,public.ai_learning_recommendations,public.ai_revision_plans,public.ai_revision_sessions,public.ai_concept_explanations,public.ai_summary_requests,public.ai_learning_memory,public.ai_student_strengths,public.ai_student_weaknesses,public.ai_study_goals,public.ai_learning_preferences,public.ai_learning_events to authenticated;
grant select on public.student_ai_dashboard_projection,public.student_ai_progress_projection,public.mentor_ai_student_projection,public.reporting_ai_learning_projection,public.ai_learning_usage_projection to authenticated;

revoke all on function private.can_read_ai_learning_content(uuid,uuid) from public;
revoke all on function private.can_read_ai_learning_audit(uuid,uuid) from public;
revoke all on function private.owns_ai_learning_session(uuid) from public;
revoke all on function private.completed_ai_learning_execution(uuid,uuid) from public;
grant execute on function private.can_read_ai_learning_content(uuid,uuid),private.can_read_ai_learning_audit(uuid,uuid),private.owns_ai_learning_session(uuid),private.completed_ai_learning_execution(uuid,uuid) to authenticated;

do $$ declare signature text; begin foreach signature in array array[
  'create_learning_session(uuid,text,text,text,uuid,uuid,uuid,integer)',
  'save_learning_context(uuid,text,text,uuid,text,integer,jsonb)',
  'append_learning_message(uuid,text,text,text,text)',
  'generate_flashcards(uuid,uuid,text,text,uuid,text,jsonb)',
  'generate_quiz(uuid,uuid,text,text,uuid,text,jsonb)',
  'generate_summary(uuid,uuid,text,uuid,text,text,text)',
  'generate_explanation(uuid,uuid,text,uuid,text,text,text,text,text)',
  'generate_learning_plan(uuid,uuid,text,text,text,text,date,date,jsonb)',
  'generate_revision_plan(uuid,uuid,text,text,text,date,date,jsonb)',
  'record_learning_feedback(uuid,text,uuid,integer,boolean,text[],text)',
  'generate_learning_recommendations(uuid,uuid,jsonb)',
  'record_learning_insights(uuid,uuid,jsonb,jsonb)',
  'record_learning_event(uuid,text,text,uuid,jsonb)',
  'close_learning_session(uuid)',
  'update_learning_session_state(uuid,text,boolean)',
  'record_flashcard_review(uuid,text,numeric,integer,timestamptz)',
  'record_quiz_attempt(uuid,text,text,integer,numeric,uuid[],timestamptz)',
  'update_learning_preferences(uuid,text,text,integer,text,text[],text[],integer,boolean)'
] loop
  execute format('revoke all on function public.%s from public',signature);
  execute format('grant execute on function public.%s to authenticated',signature);
end loop; end $$;
