begin;

select plan(20);

select has_function('public', 'syra_start_course', array['uuid'], 'start course RPC exists');
select has_function('public', 'syra_resume_course', array['uuid'], 'resume course RPC exists');
select has_function('public', 'syra_start_lesson', array['uuid','uuid'], 'start lesson RPC exists');
select has_function('public', 'syra_update_lesson_progress', array['uuid','uuid','numeric'], 'progress RPC exists');
select has_function('public', 'syra_complete_lesson', array['uuid','uuid'], 'complete lesson RPC exists');
select has_function('public', 'syra_save_lesson_note', array['uuid','uuid','text','uuid'], 'save note RPC exists');
select has_function('public', 'syra_delete_lesson_note', array['uuid'], 'delete note RPC exists');
select has_function('public', 'syra_bookmark_lesson', array['uuid','uuid','jsonb'], 'bookmark lesson RPC exists');
select has_function('public', 'syra_remove_lesson_bookmark', array['uuid'], 'remove lesson bookmark RPC exists');
select has_function('public', 'syra_bookmark_resource', array['uuid','uuid','jsonb'], 'bookmark resource RPC exists');
select has_function('public', 'syra_remove_resource_bookmark', array['uuid'], 'remove resource bookmark RPC exists');

select ok(exists(select 1 from pg_constraint where conrelid='public.learner_notes'::regclass and conname='learner_notes_ciphertext_format_check' and convalidated), 'note ciphertext constraint is validated');
select ok(exists(select 1 from pg_trigger where tgrelid='public.learner_notes'::regclass and tgname='learner_notes_validate_write'), 'note write validation trigger exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.learner_bookmarks'::regclass and tgname='learner_bookmarks_validate_write'), 'bookmark write validation trigger exists');
select ok(exists(select 1 from pg_policy where polrelid='public.storage_objects'::regclass and polname='storage_objects_learning_select'), 'learning storage metadata policy exists');
select ok(exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='learning_objects_select'), 'private learning object policy exists');

select ok(not has_function_privilege('anon', 'public.syra_start_course(uuid)', 'execute'), 'anonymous cannot start courses');
select ok(has_function_privilege('authenticated', 'public.syra_start_course(uuid)', 'execute'), 'authenticated can invoke controlled course RPC');
select ok(not has_function_privilege('anon', 'public.syra_save_lesson_note(uuid,uuid,text,uuid)', 'execute'), 'anonymous cannot save private notes');
select ok(has_function_privilege('authenticated', 'public.syra_save_lesson_note(uuid,uuid,text,uuid)', 'execute'), 'authenticated can invoke controlled note RPC');

select * from finish();
rollback;
