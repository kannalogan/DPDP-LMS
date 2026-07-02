create extension if not exists pgcrypto;

create type public.organization_role as enum ('student', 'mentor', 'instructor', 'admin', 'owner');
create type public.course_difficulty as enum ('introductory', 'intermediate', 'advanced', 'expert');
create type public.assessment_status as enum ('draft', 'published', 'archived');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'student',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  domain text not null,
  is_regulatory boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  learning_track_id uuid not null references public.learning_tracks(id),
  title text not null,
  slug text not null,
  description text not null,
  difficulty public.course_difficulty not null default 'introductory',
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  estimated_minutes integer not null default 10,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, position)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  status public.assessment_status not null default 'draft',
  passing_score integer not null default 80 check (passing_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  prompt text not null,
  choices jsonb not null,
  answer_key jsonb not null,
  explanation text,
  position integer not null,
  created_at timestamptz not null default now()
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  responses jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issued_at timestamptz not null default now(),
  verification_code text not null unique
);

create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  purpose text not null,
  input jsonb not null,
  output jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_id_idx on public.organization_members(user_id);
create index courses_learning_track_id_idx on public.courses(learning_track_id);
create index enrollments_user_id_idx on public.enrollments(user_id);
create index assessment_attempts_user_id_idx on public.assessment_attempts(user_id);
create index ai_interactions_organization_id_idx on public.ai_interactions(organization_id);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles public.organization_role[])
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = (select auth.uid())
      and member.role = any(allowed_roles)
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.learning_tracks enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.ai_interactions enable row level security;

create policy "members can read their organizations"
on public.organizations for select
to authenticated
using (public.is_org_member(id));

create policy "members can read organization memberships"
on public.organization_members for select
to authenticated
using (public.is_org_member(organization_id));

create policy "admins can manage organization memberships"
on public.organization_members for all
to authenticated
using (public.has_org_role(organization_id, array['admin', 'owner']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['admin', 'owner']::public.organization_role[]));

create policy "authenticated users can read learning tracks"
on public.learning_tracks for select
to authenticated
using (true);

create policy "members can read organization courses"
on public.courses for select
to authenticated
using (organization_id is null or public.is_org_member(organization_id));

create policy "instructors can manage organization courses"
on public.courses for all
to authenticated
using (organization_id is not null and public.has_org_role(organization_id, array['instructor', 'admin', 'owner']::public.organization_role[]))
with check (organization_id is not null and public.has_org_role(organization_id, array['instructor', 'admin', 'owner']::public.organization_role[]));

create policy "members can read course modules"
on public.course_modules for select
to authenticated
using (
  exists (
    select 1 from public.courses course
    where course.id = course_modules.course_id
      and (course.organization_id is null or public.is_org_member(course.organization_id))
  )
);

create policy "members can read lessons"
on public.lessons for select
to authenticated
using (
  exists (
    select 1
    from public.course_modules module
    join public.courses course on course.id = module.course_id
    where module.id = lessons.module_id
      and (course.organization_id is null or public.is_org_member(course.organization_id))
  )
);

create policy "students can read own enrollments"
on public.enrollments for select
to authenticated
using (user_id = (select auth.uid()) and public.is_org_member(organization_id));

create policy "members can read published assessments"
on public.assessments for select
to authenticated
using (
  status = 'published'
  and exists (
    select 1 from public.courses course
    where course.id = assessments.course_id
      and (course.organization_id is null or public.is_org_member(course.organization_id))
  )
);

create policy "members can read published questions"
on public.assessment_questions for select
to authenticated
using (
  exists (
    select 1
    from public.assessments assessment
    join public.courses course on course.id = assessment.course_id
    where assessment.id = assessment_questions.assessment_id
      and assessment.status = 'published'
      and (course.organization_id is null or public.is_org_member(course.organization_id))
  )
);

create policy "students can read own attempts"
on public.assessment_attempts for select
to authenticated
using (user_id = (select auth.uid()));

create policy "students can create own attempts"
on public.assessment_attempts for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "members can read own certificates"
on public.certificates for select
to authenticated
using (user_id = (select auth.uid()) and public.is_org_member(organization_id));

create policy "members can read own ai interactions"
on public.ai_interactions for select
to authenticated
using (user_id = (select auth.uid()) and public.is_org_member(organization_id));

create policy "members can create own ai interactions"
on public.ai_interactions for insert
to authenticated
with check (user_id = (select auth.uid()) and public.is_org_member(organization_id));

insert into public.learning_tracks (slug, name, description, domain, is_regulatory)
values
  ('dpdp', 'DPDP Compliance', 'India Digital Personal Data Protection Act readiness and operations.', 'data-privacy', true),
  ('gdpr', 'GDPR', 'EU privacy compliance and data processing governance.', 'data-privacy', true),
  ('soc2', 'SOC 2', 'Trust services criteria readiness for SaaS teams.', 'security-compliance', true),
  ('iso27001', 'ISO 27001', 'Information security management system training.', 'security-compliance', true),
  ('ai', 'AI', 'Responsible AI, governance, and productivity enablement.', 'technology', false)
on conflict (slug) do nothing;

