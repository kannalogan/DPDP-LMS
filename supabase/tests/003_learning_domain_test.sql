begin;

select plan(88);

select has_table('public', table_name, format('%s table exists', table_name))
from (
  values
    ('learning_tracks'), ('course_categories'), ('courses'), ('course_versions'),
    ('course_modules'), ('lessons'), ('lesson_versions'), ('learning_resources'),
    ('resource_versions'), ('tags'), ('course_tags'), ('learning_paths'),
    ('learning_path_versions'), ('learning_path_items'), ('enrollments'),
    ('lesson_progress'), ('module_progress'), ('course_progress'),
    ('learner_bookmarks'), ('learner_notes'), ('learner_favorites'), ('study_plans')
) as expected(table_name);

select ok(c.relrowsecurity, format('%s has RLS enabled', c.relname))
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'learning_tracks','course_categories','courses','course_versions','course_modules','lessons',
    'lesson_versions','learning_resources','resource_versions','tags','course_tags','learning_paths',
    'learning_path_versions','learning_path_items','enrollments','lesson_progress','module_progress',
    'course_progress','learner_bookmarks','learner_notes','learner_favorites','study_plans'
  ]);

select ok(c.relforcerowsecurity, format('%s has FORCE RLS enabled', c.relname))
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'learning_tracks','course_categories','courses','course_versions','course_modules','lessons',
    'lesson_versions','learning_resources','resource_versions','tags','course_tags','learning_paths',
    'learning_path_versions','learning_path_items','enrollments','lesson_progress','module_progress',
    'course_progress','learner_bookmarks','learner_notes','learner_favorites','study_plans'
  ]);

select has_function('private', 'can_read_course', array['uuid'], 'course visibility helper exists');
select has_function('private', 'can_read_enrollment', array['uuid'], 'enrollment visibility helper exists');
select has_function('private', 'can_manage_learning_catalog', array[]::text[], 'catalog management helper exists');
select has_function('private', 'can_read_organization_learning', array['uuid'], 'organization learning helper exists');
select has_function('private', 'reject_published_version_mutation', array[]::text[], 'published immutability helper exists');

select is((select count(*)::integer from public.permissions where key = 'learning.catalog.manage'), 1, 'catalog permission is registered once');
select is((select count(*)::integer from public.learning_tracks), 0, 'no fake tracks are seeded');
select is((select count(*)::integer from public.courses), 0, 'no fake courses are seeded');
select is((select count(*)::integer from public.enrollments), 0, 'no fake enrollments are seeded');
select is((select count(*)::integer from public.study_plans), 0, 'no fake study plans are seeded');
select is((select count(*)::integer from public.learner_notes), 0, 'no fake learner notes are seeded');

select ok(exists(select 1 from pg_policy where polrelid='public.courses'::regclass and polname='courses_select'), 'published course select policy exists');
select ok(exists(select 1 from pg_policy where polrelid='public.courses'::regclass and polname='courses_manage'), 'controlled catalog manage policy exists');
select ok(exists(select 1 from pg_policy where polrelid='public.enrollments'::regclass and polname='enrollments_select'), 'enrollment isolation policy exists');
select ok(exists(select 1 from pg_policy where polrelid='public.learner_bookmarks'::regclass and polname='learner_bookmarks_insert_self'), 'bookmark ownership insert policy exists');
select ok(exists(select 1 from pg_policy where polrelid='public.learner_notes'::regclass and polname='learner_notes_update_self'), 'note ownership update policy exists');
select ok(exists(select 1 from pg_policy where polrelid='public.study_plans'::regclass and polname='study_plans_insert_self'), 'study plan ownership insert policy exists');

select ok(exists(select 1 from pg_trigger where tgrelid='public.course_versions'::regclass and tgname='course_versions_reject_published_mutation'), 'course version immutable trigger exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.lesson_versions'::regclass and tgname='lesson_versions_reject_published_mutation'), 'lesson version immutable trigger exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.resource_versions'::regclass and tgname='resource_versions_reject_published_mutation'), 'resource version immutable trigger exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.learning_path_versions'::regclass and tgname='learning_path_versions_reject_published_mutation'), 'path version immutable trigger exists');

select ok(not has_table_privilege('anon', 'public.courses', 'select'), 'anonymous role cannot select catalog tables');

select * from finish();
rollback;
