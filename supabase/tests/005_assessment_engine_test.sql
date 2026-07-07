begin;
select plan(68);

select has_table('public', table_name, format('%s table exists', table_name))
from (values ('question_banks'),('questions'),('question_versions'),('question_options'),('question_answer_keys'),('rubrics'),('rubric_versions'),('rubric_criteria'),('assessments'),('assessment_versions'),('assessment_sections'),('assessment_form_items'),('assessment_assignments'),('assessment_attempts'),('attempt_items'),('attempt_responses'),('evaluations'),('evaluation_scores')) expected(table_name);

select ok(c.relrowsecurity, format('%s has RLS enabled', c.relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any(array['question_banks','questions','question_versions','question_options','question_answer_keys','rubrics','rubric_versions','rubric_criteria','assessments','assessment_versions','assessment_sections','assessment_form_items','assessment_assignments','assessment_attempts','attempt_items','attempt_responses','evaluations','evaluation_scores']);
select ok(c.relforcerowsecurity, format('%s has FORCE RLS enabled', c.relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any(array['question_banks','questions','question_versions','question_options','question_answer_keys','rubrics','rubric_versions','rubric_criteria','assessments','assessment_versions','assessment_sections','assessment_form_items','assessment_assignments','assessment_attempts','attempt_items','attempt_responses','evaluations','evaluation_scores']);

select has_function('public','syra_start_assessment',array['uuid','uuid'],'start assessment RPC exists');
select has_function('public','syra_resume_assessment',array['uuid'],'resume assessment RPC exists');
select has_function('public','syra_save_assessment_response',array['uuid','uuid','jsonb','integer'],'autosave RPC exists');
select has_function('public','syra_clear_assessment_response',array['uuid','uuid'],'clear response RPC exists');
select has_function('public','syra_mark_assessment_review',array['uuid','uuid','boolean'],'review marker RPC exists');
select has_function('public','syra_submit_assessment',array['uuid'],'submit RPC exists');
select has_function('public','syra_abandon_assessment',array['uuid'],'abandon RPC exists');

select ok(exists(select 1 from pg_trigger where tgrelid='public.assessment_versions'::regclass and tgname='assessment_versions_reject_published_mutation'),'assessment version immutable trigger exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.attempt_responses'::regclass and tgname='attempt_responses_reject_submitted_mutation'),'submitted response immutable trigger exists');
select ok(not has_table_privilege('authenticated','public.question_answer_keys','select'),'authenticated cannot select answer keys');
select ok(not has_function_privilege('anon','public.syra_start_assessment(uuid,uuid)','execute'),'anonymous cannot start attempts');
select ok(not has_function_privilege('anon','public.syra_save_assessment_response(uuid,uuid,jsonb,integer)','execute'),'anonymous cannot autosave');
select ok(not has_function_privilege('anon','public.syra_submit_assessment(uuid)','execute'),'anonymous cannot submit');
select is((select count(*)::integer from public.permissions where key='assessment.catalog.manage'),1,'assessment management permission registered once');
select is((select count(*)::integer from public.assessments),0,'no fake assessments seeded');

select * from finish();
rollback;
