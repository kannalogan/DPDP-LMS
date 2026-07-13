begin;

select plan(9);

select has_table('public', 'question_drafts', 'question drafts table exists');
select has_table('public', 'question_publications', 'question publication history table exists');
select has_table('public', 'question_import_jobs', 'question import jobs table exists');
select has_table('public', 'assessment_templates', 'assessment templates table exists');
select has_view('public', 'question_authoring_overview', 'question authoring projection exists');
select has_function('public', 'publish_question', array['uuid'], 'controlled publish question RPC exists');
select policies_are('public', 'question_drafts', array['question_drafts_author_select'], 'question drafts deny writes and allow authoring read');
select triggers_are('public', 'question_publications', array['question_publications_reject_mutation'], 'question publication history rejects mutation');
select has_table('public', 'assessment_section_questions', 'assessment section question builder table exists');

select * from finish();
rollback;
