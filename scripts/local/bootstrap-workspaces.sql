\set ON_ERROR_STOP on

begin;
set local lock_timeout = '10s';
set local statement_timeout = '90s';

select set_config('syra.bootstrap.local_guard', :'bootstrap_local_guard', true) as local_guard \gset
select set_config('syra.bootstrap.student_email', :'student_email', true) as student_email_setting \gset
select set_config('syra.bootstrap.mentor_email', :'mentor_email', true) as mentor_email_setting \gset
select set_config('syra.bootstrap.admin_email', :'admin_email', true) as admin_email_setting \gset

create temporary table local_bootstrap_state (
  organization_id uuid,
  student_profile_id uuid,
  mentor_profile_id uuid,
  admin_profile_id uuid,
  student_member_id uuid,
  mentor_member_id uuid,
  admin_member_id uuid,
  course_id uuid,
  course_version_id uuid,
  cohort_id uuid,
  enrollment_id uuid,
  assignment_id uuid,
  organization_created boolean not null default false,
  branding_created boolean not null default false,
  settings_created boolean not null default false,
  student_membership_created boolean not null default false,
  mentor_membership_created boolean not null default false,
  course_created boolean not null default false,
  cohort_created boolean not null default false,
  mentor_assignment_created boolean not null default false,
  enrollment_created boolean not null default false,
  assignment_created boolean not null default false,
  announcement_created boolean not null default false
);
insert into local_bootstrap_state default values;

do $bootstrap$
declare
  v_student uuid;
  v_mentor uuid;
  v_admin uuid;
  v_org uuid;
  v_student_member uuid;
  v_mentor_member uuid;
  v_admin_member uuid;
  v_student_role uuid;
  v_mentor_role uuid;
  v_admin_role uuid;
  v_token_hash text;
  v_track uuid;
  v_course uuid;
  v_course_version uuid;
  v_course_draft uuid;
  v_course_review uuid;
  v_module uuid;
  v_lesson_one uuid;
  v_lesson_two uuid;
  v_cohort uuid;
  v_enrollment uuid;
  v_assignment uuid;
  v_assignment_version uuid;
  v_assignment_delivery uuid;
  v_body_one jsonb := '{"type":"doc","content":[{"type":"paragraph","text":"Understand the local acceptance learning workflow."}]}'::jsonb;
  v_body_two jsonb := '{"type":"doc","content":[{"type":"paragraph","text":"Review tenant-scoped progress and authorization."}]}'::jsonb;
begin
  if current_setting('syra.bootstrap.local_guard', true) <> 'syra-local' then
    raise exception 'local bootstrap guard missing' using errcode = '42501';
  end if;

  select id into v_student from auth.users where lower(email) = lower(current_setting('syra.bootstrap.student_email')) and deleted_at is null;
  if v_student is null then raise exception 'student user is missing'; end if;
  select id into v_mentor from auth.users where lower(email) = lower(current_setting('syra.bootstrap.mentor_email')) and deleted_at is null;
  if v_mentor is null then raise exception 'mentor user is missing'; end if;
  select id into v_admin from auth.users where lower(email) = lower(current_setting('syra.bootstrap.admin_email')) and deleted_at is null;
  if v_admin is null then raise exception 'organization admin user is missing'; end if;
  if v_student = v_mentor or v_student = v_admin or v_mentor = v_admin then
    raise exception 'bootstrap identities must be distinct';
  end if;
  if exists(select 1 from auth.users where id in (v_student, v_mentor, v_admin) and email_confirmed_at is null) then
    raise exception 'all bootstrap users must be email verified';
  end if;
  if (select count(*) from public.profiles where id in (v_student, v_mentor, v_admin)) <> 3 then
    raise exception 'all bootstrap users must have profiles';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_student::text, 'role', 'authenticated')::text, true);
  perform public.syra_mark_profile_verified();
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_mentor::text, 'role', 'authenticated')::text, true);
  perform public.syra_mark_profile_verified();
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
  perform public.syra_mark_profile_verified();

  select id into v_student_role from public.roles where organization_id is null and key = 'student' and archived_at is null;
  select id into v_mentor_role from public.roles where organization_id is null and key = 'mentor' and archived_at is null;
  select id into v_admin_role from public.roles where organization_id is null and key = 'organization_admin' and archived_at is null;
  if v_student_role is null or v_mentor_role is null or v_admin_role is null then
    raise exception 'required frozen system roles are missing';
  end if;

  select id into v_org from public.organizations where slug = 'syra-local-acceptance'::extensions.citext;
  if v_org is null then
    v_org := public.syra_create_organization('SYRA Local Acceptance', 'syra-local-acceptance', 'IN');
    update local_bootstrap_state set organization_created = true;
  elsif not exists (
    select 1 from public.organization_members om
    join public.member_role_assignments mra on mra.organization_member_id = om.id and mra.ends_at is null
    where om.organization_id = v_org and om.profile_id = v_admin and om.status = 'active' and om.ended_at is null
      and mra.role_id = v_admin_role and mra.scope_type = 'organization'
  ) then
    raise exception 'existing local acceptance organization belongs to another admin';
  end if;

  select id into strict v_admin_member from public.organization_members
  where organization_id = v_org and profile_id = v_admin and status = 'active' and ended_at is null;

  if not exists(select 1 from public.organization_branding where organization_id = v_org) then
    perform public.update_branding(v_org, 'SYRA Local Acceptance', '{"primaryColor":"#0f766e","accentColor":"#f59e0b"}'::jsonb, null);
    update local_bootstrap_state set branding_created = true;
  end if;
  insert into public.organization_settings (organization_id, key, value, classification, updated_by)
  values (v_org, 'local.acceptance.enabled', '{"enabled":true}'::jsonb, 'internal', v_admin)
  on conflict (organization_id, key) do nothing;
  if found then update local_bootstrap_state set settings_created = true; end if;
  if not exists(select 1 from public.organization_security_settings where organization_id = v_org) then
    perform public.update_security_settings(v_org, false, 480, '{"localAcceptance":true}'::jsonb);
  end if;

  select id into v_student_member from public.organization_members
  where organization_id = v_org and profile_id = v_student and status = 'active' and ended_at is null;
  if v_student_member is null or not exists (
    select 1 from public.member_role_assignments
    where organization_member_id = v_student_member and role_id = v_student_role and scope_type = 'organization' and ends_at is null
  ) then
    v_token_hash := encode(extensions.digest(v_org::text || v_student::text || ':student', 'sha256'), 'hex');
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
    perform public.create_organization_invitation(
      v_org,
      encode(extensions.digest(lower(current_setting('syra.bootstrap.student_email')), 'sha256'), 'hex'),
      'local-acceptance-identity',
      v_token_hash,
      v_student_role,
      now() + interval '1 hour'
    );
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_student::text, 'role', 'authenticated')::text, true);
    perform public.syra_accept_invitation(v_token_hash);
    update local_bootstrap_state set student_membership_created = true;
  end if;
  select id into strict v_student_member from public.organization_members
  where organization_id = v_org and profile_id = v_student and status = 'active' and ended_at is null;

  select id into v_mentor_member from public.organization_members
  where organization_id = v_org and profile_id = v_mentor and status = 'active' and ended_at is null;
  if v_mentor_member is null or not exists (
    select 1 from public.member_role_assignments
    where organization_member_id = v_mentor_member and role_id = v_mentor_role and scope_type = 'organization' and ends_at is null
  ) then
    v_token_hash := encode(extensions.digest(v_org::text || v_mentor::text || ':mentor', 'sha256'), 'hex');
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
    perform public.create_organization_invitation(
      v_org,
      encode(extensions.digest(lower(current_setting('syra.bootstrap.mentor_email')), 'sha256'), 'hex'),
      'local-acceptance-identity',
      v_token_hash,
      v_mentor_role,
      now() + interval '1 hour'
    );
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_mentor::text, 'role', 'authenticated')::text, true);
    perform public.syra_accept_invitation(v_token_hash);
    update local_bootstrap_state set mentor_membership_created = true;
  end if;
  select id into strict v_mentor_member from public.organization_members
  where organization_id = v_org and profile_id = v_mentor and status = 'active' and ended_at is null;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);

  select id into v_track from public.learning_tracks
  where owner_organization_id = v_org and slug = 'local-acceptance'::extensions.citext;
  if v_track is null then
    insert into public.learning_tracks (owner_organization_id, slug, name, domain, status, published_at, created_by, updated_by)
    values (v_org, 'local-acceptance', 'Local Acceptance', 'enterprise-learning', 'published', now(), v_admin, v_admin)
    returning id into v_track;
  end if;

  select id into v_course from public.courses
  where organization_id = v_org and slug = 'local-acceptance-course'::extensions.citext and archived_at is null;
  if v_course is null then
    v_course_draft := public.create_course_draft(v_org, v_track, 'local-acceptance-course', 'Local Acceptance Course', 'Minimal tenant-scoped course for local workspace verification.');
    perform public.save_course_draft(
      v_course_draft,
      'Local Acceptance Course',
      'Minimal tenant-scoped course for local workspace verification.',
      '{"summary":"Local acceptance content"}'::jsonb,
      '{"localOnly":true}'::jsonb
    );
    v_course_review := public.submit_course_review(v_course_draft, 'Local acceptance review');
    perform public.approve_course(v_course_review, 'Approved for local acceptance');
    perform public.publish_course(v_course_draft);
    select course_id into strict v_course from public.course_drafts where id = v_course_draft;
    update local_bootstrap_state set course_created = true;
  end if;
  select id into strict v_course_version from public.course_versions
  where course_id = v_course and status = 'published'
  order by version desc limit 1;

  select id into v_module from public.course_modules where course_version_id = v_course_version and position = 1;
  if v_module is null then
    insert into public.course_modules (course_version_id, title, position, completion_rule, created_by, updated_by)
    values (v_course_version, 'Acceptance Foundations', 1, '{"mode":"all_lessons"}'::jsonb, v_admin, v_admin)
    returning id into v_module;
  end if;
  select id into v_lesson_one from public.lessons where course_module_id = v_module and slug = 'tenant-context'::extensions.citext;
  if v_lesson_one is null then
    insert into public.lessons (course_module_id, slug, position, type, created_by, updated_by)
    values (v_module, 'tenant-context', 1, 'reading', v_admin, v_admin) returning id into v_lesson_one;
    insert into public.lesson_versions (lesson_id, version, title, body, estimated_seconds, status, published_at, content_hash, created_by, updated_by)
    values (v_lesson_one, 1, 'Tenant Context', v_body_one, 300, 'published', now(), encode(extensions.digest(v_body_one::text, 'sha256'), 'hex'), v_admin, v_admin);
  end if;
  select id into v_lesson_two from public.lessons where course_module_id = v_module and slug = 'workspace-access'::extensions.citext;
  if v_lesson_two is null then
    insert into public.lessons (course_module_id, slug, position, type, created_by, updated_by)
    values (v_module, 'workspace-access', 2, 'reading', v_admin, v_admin) returning id into v_lesson_two;
    insert into public.lesson_versions (lesson_id, version, title, body, estimated_seconds, status, published_at, content_hash, created_by, updated_by)
    values (v_lesson_two, 1, 'Workspace Access', v_body_two, 300, 'published', now(), encode(extensions.digest(v_body_two::text, 'sha256'), 'hex'), v_admin, v_admin);
  end if;

  select id into v_cohort from public.cohorts
  where organization_id = v_org and course_id = v_course and name = 'Local Acceptance Cohort' and archived_at is null;
  if v_cohort is null then
    v_cohort := public.assign_cohort(v_org, 'Local Acceptance Cohort', v_course);
    update local_bootstrap_state set cohort_created = true;
  end if;
  insert into public.cohort_members (cohort_id, organization_member_id, created_by)
  values (v_cohort, v_student_member, v_admin)
  on conflict (cohort_id, organization_member_id) do nothing;
  if exists(select 1 from public.cohort_members where cohort_id = v_cohort and organization_member_id = v_student_member and left_at is not null) then
    raise exception 'bootstrap student has a closed membership in the local cohort';
  end if;

  if not exists(select 1 from public.mentor_assignments where mentor_member_id = v_mentor_member and cohort_id = v_cohort and ends_at is null) then
    perform public.assign_mentor(v_org, v_mentor_member, v_cohort, 'Local acceptance workspace');
    update local_bootstrap_state set mentor_assignment_created = true;
  end if;

  select id into v_enrollment from public.enrollments
  where organization_id = v_org and profile_id = v_student and course_version_id = v_course_version and archived_at is null
    and status in ('pending','active','paused','completed')
  order by created_at limit 1;
  if v_enrollment is null then
    insert into public.enrollments (organization_id, profile_id, course_version_id, cohort_id, status, due_at, source, created_by, updated_by)
    values (v_org, v_student, v_course_version, v_cohort, 'pending', now() + interval '30 days', 'local.acceptance', v_admin, v_admin)
    returning id into v_enrollment;
    update local_bootstrap_state set enrollment_created = true;
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_student::text, 'role', 'authenticated')::text, true);
  if exists(select 1 from public.enrollments where id = v_enrollment and status in ('pending','paused')) then
    perform public.syra_start_course(v_enrollment);
  end if;
  if not exists(select 1 from public.lesson_progress where enrollment_id = v_enrollment and lesson_id = v_lesson_one) then
    perform public.syra_update_lesson_progress(v_enrollment, v_lesson_one, 35);
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
  select id into v_assignment from public.assignments
  where organization_id = v_org and title = 'Local Acceptance Reflection' and archived_at is null;
  if v_assignment is null then
    v_assignment := public.create_assignment(v_org, 'Local Acceptance Reflection', 'text_response');
    v_assignment_version := public.save_assignment_draft(
      v_assignment,
      'Local Acceptance Reflection',
      '{"description":{"type":"doc","content":[]},"instructions":{"type":"doc","content":[]},"learningOutcomes":["Explain tenant-scoped access"],"submissionType":"text_response","maximumAttempts":2,"acceptedFileTypes":[],"maximumFileBytes":1048576,"maximumFiles":1,"gradingMode":"points","passingScore":60,"totalMarks":100,"anonymousGrading":false}'::jsonb
    );
    perform public.submit_assignment_review(v_assignment_version);
    perform public.approve_assignment(v_assignment_version);
    perform public.publish_assignment(v_assignment_version);
    update local_bootstrap_state set assignment_created = true;
  else
    select id into strict v_assignment_version from public.assignment_versions
    where assignment_id = v_assignment and status = 'published' order by version desc limit 1;
  end if;
  insert into public.assignment_course_links (organization_id, assignment_id, course_id, created_by)
  values (v_org, v_assignment, v_course, v_admin) on conflict (assignment_id, course_id) do nothing;
  select id into v_assignment_delivery from public.assignment_assignments
  where organization_id = v_org and assignment_version_id = v_assignment_version and enrollment_id = v_enrollment and archived_at is null;
  if v_assignment_delivery is null then
    insert into public.assignment_assignments (organization_id, assignment_version_id, enrollment_id, due_at, created_by, updated_by)
    values (v_org, v_assignment_version, v_enrollment, now() + interval '14 days', v_admin, v_admin)
    returning id into v_assignment_delivery;
  end if;

  if not exists(select 1 from public.announcements where organization_id = v_org and cohort_id = v_cohort and title = 'Welcome to local acceptance') then
    perform public.publish_announcement(v_org, v_cohort, 'Welcome to local acceptance', '{"type":"doc","content":[{"type":"paragraph","text":"Your local tenant workspace is ready."}]}'::jsonb);
    update local_bootstrap_state set announcement_created = true;
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_student::text, 'role', 'authenticated')::text, true);
  if not public.syra_authorize(v_org, 'organization.read') or public.syra_authorize(v_org, 'admin.workspace.manage') then
    raise exception 'student role authorization is invalid';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_mentor::text, 'role', 'authenticated')::text, true);
  if not public.syra_authorize(v_org, 'organization.read') or public.syra_authorize(v_org, 'admin.workspace.manage') then
    raise exception 'mentor role authorization is invalid';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
  if not public.syra_authorize(v_org, 'admin.workspace.manage') then
    raise exception 'organization admin authorization is invalid';
  end if;

  update local_bootstrap_state set
    organization_id = v_org,
    student_profile_id = v_student,
    mentor_profile_id = v_mentor,
    admin_profile_id = v_admin,
    student_member_id = v_student_member,
    mentor_member_id = v_mentor_member,
    admin_member_id = v_admin_member,
    course_id = v_course,
    course_version_id = v_course_version,
    cohort_id = v_cohort,
    enrollment_id = v_enrollment,
    assignment_id = v_assignment;
end
$bootstrap$;

grant select on local_bootstrap_state to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', student_profile_id::text, 'role', 'authenticated')::text, true) as student_claims from local_bootstrap_state \gset
do $student_rls$
begin
  if (select count(*) from public.organization_members where organization_id = (select organization_id from local_bootstrap_state)) <> 1 then
    raise exception 'student organization RLS verification failed';
  end if;
  if (select count(*) from public.mentor_assignments where organization_id = (select organization_id from local_bootstrap_state)) <> 0 then
    raise exception 'student mentor-assignment isolation failed';
  end if;
  if (select count(*) from public.enrollments where id = (select enrollment_id from local_bootstrap_state)) <> 1 then
    raise exception 'student enrollment RLS verification failed';
  end if;
  if (select count(*) from public.student_assignment_projection where assignment_id = (select assignment_id from local_bootstrap_state)) <> 1 then
    raise exception 'student assignment projection verification failed';
  end if;
end
$student_rls$;

select set_config('request.jwt.claims', jsonb_build_object('sub', mentor_profile_id::text, 'role', 'authenticated')::text, true) as mentor_claims from local_bootstrap_state \gset
do $mentor_rls$
begin
  if (select count(*) from public.mentor_assignments where cohort_id = (select cohort_id from local_bootstrap_state)) <> 1 then
    raise exception 'mentor assignment RLS verification failed';
  end if;
end
$mentor_rls$;
reset role;

commit;

select jsonb_build_object(
  'organization', jsonb_build_object('id', organization_id, 'state', case when organization_created then 'created' else 'reused' end),
  'branding', case when branding_created then 'created' else 'reused' end,
  'settings', case when settings_created then 'created' else 'reused' end,
  'studentMembership', jsonb_build_object('id', student_member_id, 'role', 'student', 'state', case when student_membership_created then 'created' else 'reused' end),
  'mentorMembership', jsonb_build_object('id', mentor_member_id, 'role', 'mentor', 'state', case when mentor_membership_created then 'created' else 'reused' end),
  'adminMembership', jsonb_build_object('id', admin_member_id, 'role', 'organization_admin', 'state', 'reused'),
  'course', jsonb_build_object('id', course_id, 'state', case when course_created then 'created' else 'reused' end),
  'cohort', jsonb_build_object('id', cohort_id, 'state', case when cohort_created then 'created' else 'reused' end),
  'mentorAssignment', case when mentor_assignment_created then 'created' else 'reused' end,
  'enrollment', jsonb_build_object('id', enrollment_id, 'state', case when enrollment_created then 'created' else 'reused' end),
  'assignment', jsonb_build_object('id', assignment_id, 'state', case when assignment_created then 'created' else 'reused' end),
  'announcement', case when announcement_created then 'created' else 'reused' end
) from local_bootstrap_state;
