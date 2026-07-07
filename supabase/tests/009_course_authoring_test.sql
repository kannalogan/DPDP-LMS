begin;

select plan(9);

select has_table('public', 'course_drafts', 'course drafts table exists');
select has_table('public', 'course_reviews', 'course reviews table exists');
select has_table('public', 'course_publications', 'publication history table exists');
select has_table('public', 'publishing_events', 'publishing events table exists');
select has_view('public', 'authoring_course_overview', 'authoring projection exists');
select has_function('public', 'publish_course', array['uuid'], 'controlled publish RPC exists');
select policies_are('public', 'course_drafts', array['course_drafts_authoring_select'], 'course drafts deny writes and allow authoring read');
select triggers_are('public', 'course_publications', array['course_publications_reject_mutation'], 'publication history rejects mutation');
select has_table('public', 'draft_lock_sessions', 'editor lock sessions table exists');

select * from finish();
rollback;
