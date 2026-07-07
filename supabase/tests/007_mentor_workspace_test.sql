select plan(36);

select has_table('public', 'cohorts');
select has_table('public', 'cohort_members');
select has_table('public', 'mentor_profiles');
select has_table('public', 'mentor_assignments');
select has_table('public', 'mentor_interventions');
select has_table('public', 'learner_reviews');
select has_table('public', 'risk_signals');
select has_table('public', 'notifications');
select has_table('public', 'announcements');
select has_table('public', 'announcement_acknowledgements');

select has_view('public', 'mentor_dashboard_projections');
select has_view('public', 'mentor_learner_activity_summaries');
select has_view('public', 'mentor_task_queue');
select has_view('public', 'mentor_review_queue');

select row_security_is_enabled('public', 'cohorts');
select row_security_is_enabled('public', 'cohort_members');
select row_security_is_enabled('public', 'mentor_profiles');
select row_security_is_enabled('public', 'mentor_assignments');
select row_security_is_enabled('public', 'mentor_interventions');
select row_security_is_enabled('public', 'learner_reviews');
select row_security_is_enabled('public', 'risk_signals');
select row_security_is_enabled('public', 'notifications');
select row_security_is_enabled('public', 'announcements');
select row_security_is_enabled('public', 'announcement_acknowledgements');

select has_function('public', 'assign_mentor', array['uuid', 'uuid', 'uuid', 'text']);
select has_function('public', 'assign_cohort', array['uuid', 'text', 'uuid']);
select has_function('public', 'record_mentor_note', array['uuid', 'uuid', 'text', 'text']);
select has_function('public', 'create_intervention', array['uuid', 'uuid', 'text', 'text', 'timestamp with time zone']);
select has_function('public', 'mark_intervention_complete', array['uuid', 'text']);
select has_function('public', 'publish_announcement', array['uuid', 'uuid', 'text', 'jsonb']);
select has_function('public', 'record_dashboard_event', array['uuid', 'uuid', 'text', 'jsonb']);
select has_function('public', 'resolve_review_item', array['uuid', 'text']);

select has_policy('public', 'cohorts', 'cohorts_select_mentor');
select has_policy('public', 'mentor_assignments', 'mentor_assignments_select');
select has_policy('public', 'mentor_interventions', 'mentor_interventions_select');
select is_empty($$select 1 from public.mentor_assignments$$, 'mentor wave includes no business seed assignments');

select * from finish();
