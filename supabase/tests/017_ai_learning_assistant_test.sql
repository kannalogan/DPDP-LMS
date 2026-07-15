begin;

select plan(12);

select has_table('public','ai_learning_sessions','AI learning sessions exist');
select has_table('public','ai_flashcards','AI flashcards exist');
select has_table('public','ai_quiz_attempts','AI quiz attempts exist');
select has_table('public','ai_learning_events','AI learning events exist');
select has_view('public','student_ai_dashboard_projection','Student AI dashboard projection exists');
select has_view('public','mentor_ai_student_projection','Mentor AI projection exists');
select has_function('public','create_learning_session',array['uuid','text','text','text','uuid','uuid','uuid','integer'],'Session creation is controlled');
select has_function('public','generate_flashcards',array['uuid','uuid','text','text','uuid','text','jsonb'],'Flashcard persistence is controlled');
select has_function('public','generate_quiz',array['uuid','uuid','text','text','uuid','text','jsonb'],'Quiz persistence is controlled');
select has_function('public','record_learning_feedback',array['uuid','text','uuid','integer','boolean','text[]','text'],'Feedback is controlled');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.ai_learning_sessions'::regclass),'Sessions force RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.ai_learning_events'::regclass),'Events force RLS');

select * from finish();
rollback;
