begin;

select plan(20);

select has_table('public', 'user_settings', 'user_settings exists');
select has_table('public', 'user_sessions', 'user_sessions exists');
select has_table('public', 'devices', 'devices exists');
select has_table('public', 'organization_invitations', 'organization_invitations exists');
select has_table('public', 'organization_settings', 'organization_settings exists');

select has_function('public', 'syra_authorize', array['uuid','text','text','uuid'], 'authorization RPC exists');
select has_function('public', 'syra_create_organization', array['text','text','text'], 'organization creation RPC exists');
select has_function('public', 'syra_accept_invitation', array['text'], 'invitation RPC exists');
select has_function('public', 'syra_record_identity_audit', array['uuid','text','text','uuid','text','jsonb'], 'identity audit RPC exists');
select has_function('public', 'syra_record_session', array['uuid','text','text','text','text'], 'session observation RPC exists');

select is((select count(*)::integer from public.roles where organization_id is null), 9, 'nine frozen system roles exist');
select is((select count(*)::integer from public.permissions), 11, 'identity permission registry exists');
select ok((select count(*) > 0 from public.role_permissions), 'system roles compose permissions');
select is((select count(*)::integer from public.profiles), 0, 'no fake profiles are seeded');
select is((select count(*)::integer from public.organizations), 0, 'no fake organizations are seeded');

select ok((select relrowsecurity from pg_class where oid='public.user_settings'::regclass), 'settings RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.devices'::regclass), 'devices RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.organization_invitations'::regclass), 'invitation RLS enabled');
select ok(exists(select 1 from pg_policy where polrelid='public.profiles'::regclass and polname='profiles_update_self'), 'profile self-update policy exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.user_sessions'::regclass and tgname='user_sessions_reject_mutation'), 'session immutable trigger exists');

select * from finish();
rollback;
