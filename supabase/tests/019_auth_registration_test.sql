begin;

select plan(6);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000901',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'registration-test@example.invalid',
  extensions.crypt('LocalTestPassword9', extensions.gen_salt('bf')),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Registration Test","locale":"en-IN","timezone":"Asia/Kolkata"}'::jsonb,
  now(),
  now()
);

select is(
  (select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000901'),
  1,
  'auth user bootstrap creates exactly one profile'
);
select is(
  (select display_name from public.profiles where id = '00000000-0000-4000-8000-000000000901'),
  'Registration Test',
  'auth metadata maps to the profile display name'
);
select is(
  (select locale from public.profiles where id = '00000000-0000-4000-8000-000000000901'),
  'en-IN',
  'auth metadata maps to the profile locale'
);
select is(
  (select timezone from public.profiles where id = '00000000-0000-4000-8000-000000000901'),
  'Asia/Kolkata',
  'auth metadata maps to the profile timezone'
);
select is(
  (select count(*)::integer from public.user_settings where profile_id = '00000000-0000-4000-8000-000000000901'),
  1,
  'auth user bootstrap creates exactly one settings row'
);
select is(
  (select count(*)::integer from public.organization_members where profile_id = '00000000-0000-4000-8000-000000000901'),
  0,
  'registration does not create organization membership'
);

select * from finish();
rollback;
