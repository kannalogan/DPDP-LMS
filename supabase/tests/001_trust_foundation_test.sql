begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

select has_extension('pgcrypto', 'pgcrypto extension is enabled');
select has_extension('citext', 'citext extension is enabled');

select has_table('public', table_name, format('%s table exists', table_name))
from (
  values
    ('organizations'),
    ('profiles'),
    ('organization_members'),
    ('roles'),
    ('permissions'),
    ('role_permissions'),
    ('member_role_assignments'),
    ('storage_objects'),
    ('system_config_versions'),
    ('processing_purposes'),
    ('audit_events')
) as expected(table_name);

select ok(
  exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'risk_level' and t.typtype = 'e'
  ),
  'risk_level is a native enum'
);

select ok(
  exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'audit_outcome' and t.typtype = 'e'
  ),
  'audit_outcome is a native enum'
);

select ok(c.relrowsecurity, format('%s has RLS enabled', c.relname))
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'organizations', 'profiles', 'organization_members', 'roles', 'permissions',
    'role_permissions', 'member_role_assignments', 'storage_objects',
    'system_config_versions', 'processing_purposes', 'audit_events'
  ]);

select ok(c.relforcerowsecurity, format('%s has FORCE RLS enabled', c.relname))
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'organizations', 'profiles', 'organization_members', 'roles', 'permissions',
    'role_permissions', 'member_role_assignments', 'storage_objects',
    'system_config_versions', 'processing_purposes', 'audit_events'
  ]);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.audit_events'::regclass
      and tgname = 'audit_events_reject_mutation'
      and not tgisinternal
  ),
  'audit_events immutable trigger exists'
);

select is(
  (select count(*)::integer from pg_policy where polrelid = any (array[
    'public.organizations'::regclass,
    'public.profiles'::regclass,
    'public.organization_members'::regclass,
    'public.roles'::regclass,
    'public.permissions'::regclass,
    'public.role_permissions'::regclass,
    'public.member_role_assignments'::regclass,
    'public.storage_objects'::regclass,
    'public.system_config_versions'::regclass,
    'public.processing_purposes'::regclass,
    'public.audit_events'::regclass
  ])),
  0,
  'foundation remains deny-by-default with no RLS policies'
);

select is((select count(*)::integer from public.organizations), 0, 'organizations has no seed rows');
select is((select count(*)::integer from public.roles), 0, 'roles has no seed rows');
select is((select count(*)::integer from public.permissions), 0, 'permissions has no seed rows');
select is((select count(*)::integer from public.system_config_versions), 0, 'system config has no seed rows');
select is((select count(*)::integer from public.processing_purposes), 0, 'processing purposes has no seed rows');
select is((select count(*)::integer from public.audit_events), 0, 'audit events has no seed rows');

insert into public.audit_events (
  actor_type,
  action,
  resource_type,
  outcome,
  correlation_id,
  event_hash
) values (
  'test',
  'create',
  'foundation.test',
  'succeeded',
  'foundation-test',
  repeat('a', 64)
);

select throws_ok(
  $$update public.audit_events set metadata = '{"changed":true}'::jsonb where correlation_id = 'foundation-test'$$,
  '55000',
  'audit_events is append-only; UPDATE and DELETE are prohibited',
  'audit_events rejects update'
);

select throws_ok(
  $$delete from public.audit_events where correlation_id = 'foundation-test'$$,
  '55000',
  'audit_events is append-only; UPDATE and DELETE are prohibited',
  'audit_events rejects delete'
);

select * from finish();

rollback;
