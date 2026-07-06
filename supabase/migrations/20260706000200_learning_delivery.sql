-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md
-- SYRA-ADR: ADR-005
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S2 controlled learning delivery RPCs; supabase/tests/004_learning_delivery_test.sql
-- SYRA-IMMUTABLE: published content remains immutable; audit events append only

alter table public.learner_notes
  add constraint learner_notes_ciphertext_format_check
  check (body_ciphertext ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') not valid;

alter table public.learner_notes validate constraint learner_notes_ciphertext_format_check;

create index if not exists lesson_progress_enrollment_activity_idx
  on public.lesson_progress (enrollment_id, last_activity_at desc, lesson_id);
create index if not exists lessons_module_position_delivery_idx
  on public.lessons (course_module_id, position, id) where archived_at is null;
create index if not exists course_modules_version_position_delivery_idx
  on public.course_modules (course_version_id, position, id) where archived_at is null;
create index if not exists learner_notes_active_lesson_idx
  on public.learner_notes (profile_id, lesson_id, updated_at desc) where deleted_at is null;

create or replace function private.user_owns_enrollment(target_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.id = target_enrollment_id
      and e.profile_id = auth.uid()
      and e.status in ('pending','active','paused')
      and e.archived_at is null
      and private.is_active_org_member(e.organization_id)
  )
$$;

create or replace function private.lesson_belongs_to_enrollment(
  target_enrollment_id uuid,
  target_lesson_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.lessons l on l.id = target_lesson_id and l.archived_at is null
    join public.course_modules m on m.id = l.course_module_id and m.archived_at is null
    join public.course_versions cv on cv.id = m.course_version_id and cv.status = 'published'
    where e.id = target_enrollment_id
      and e.profile_id = auth.uid()
      and e.organization_id is not null
      and e.archived_at is null
      and (
        e.course_version_id = cv.id
        or (
          e.learning_path_version_id is not null
          and exists (
            select 1 from public.learning_path_items lpi
            where lpi.learning_path_version_id = e.learning_path_version_id
              and lpi.course_id = cv.course_id
          )
        )
      )
  )
$$;

create or replace function private.user_has_lesson_access(
  target_organization_id uuid,
  target_lesson_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.enrollments e
    where e.organization_id = target_organization_id
      and e.profile_id = auth.uid()
      and e.status in ('pending','active','paused','completed')
      and e.archived_at is null
      and private.lesson_belongs_to_enrollment(e.id, target_lesson_id)
  )
$$;

create or replace function private.user_has_resource_access(
  target_organization_id uuid,
  target_resource_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.resource_versions rv
    join public.learning_resources r on r.id = rv.resource_id
    where rv.id = target_resource_version_id
      and rv.status = 'published'
      and r.archived_at is null
      and (
        (r.lesson_version_id is not null and exists (
          select 1
          from public.lesson_versions lv
          where lv.id = r.lesson_version_id
            and lv.status = 'published'
            and private.user_has_lesson_access(target_organization_id, lv.lesson_id)
        ))
        or
        (r.course_version_id is not null and exists (
          select 1 from public.enrollments e
          where e.organization_id = target_organization_id
            and e.profile_id = auth.uid()
            and e.course_version_id = r.course_version_id
            and e.status in ('pending','active','paused','completed')
            and e.archived_at is null
        ))
      )
  )
$$;

create or replace function private.record_learning_audit(
  target_organization_id uuid,
  target_action text,
  target_resource_type text,
  target_resource_id uuid,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  event_id uuid;
  event_time timestamptz := now();
  correlation text := extensions.gen_random_uuid()::text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if target_action !~ '^learning\.[a-z0-9_.]+$' then
    raise exception 'invalid learning audit action' using errcode = '22023';
  end if;
  if not private.is_active_org_member(target_organization_id) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;

  insert into public.audit_events (
    organization_id, actor_profile_id, actor_type, actor_id, action, resource_type,
    resource_id, outcome, correlation_id, metadata, event_hash, occurred_at
  ) values (
    target_organization_id, auth.uid(), 'profile', auth.uid(), target_action,
    target_resource_type, target_resource_id, 'succeeded', correlation, target_metadata,
    encode(extensions.digest(concat_ws(':', auth.uid()::text, target_action, target_resource_id::text, correlation, event_time::text), 'sha256'), 'hex'),
    event_time
  ) returning id into event_id;
  return event_id;
end
$$;

create or replace function private.recalculate_learning_progress(
  target_enrollment_id uuid,
  target_module_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  module_total integer;
  module_complete integer;
  course_total integer;
  course_complete integer;
  module_percent numeric(5,2);
  course_percent numeric(5,2);
  course_state text;
begin
  select count(*)::integer into module_total
  from public.lessons l
  where l.course_module_id = target_module_id and l.archived_at is null;

  select count(*)::integer into module_complete
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  where lp.enrollment_id = target_enrollment_id
    and l.course_module_id = target_module_id
    and lp.status in ('completed','waived');

  module_percent := case when module_total = 0 then 0 else round(module_complete * 100.0 / module_total, 2) end;

  insert into public.module_progress (enrollment_id, module_id, status, progress, completed_at, version, updated_at)
  values (
    target_enrollment_id,
    target_module_id,
    case when module_total > 0 and module_complete = module_total then 'completed' when module_complete > 0 then 'in_progress' else 'not_started' end,
    module_percent,
    case when module_total > 0 and module_complete = module_total then now() else null end,
    1,
    now()
  )
  on conflict (enrollment_id, module_id) do update set
    status = excluded.status,
    progress = excluded.progress,
    completed_at = excluded.completed_at,
    version = public.module_progress.version + 1,
    updated_at = now();

  select count(*)::integer into course_total
  from public.enrollments e
  join public.course_modules m on (
    m.course_version_id = e.course_version_id
    or (
      e.learning_path_version_id is not null
      and exists (
        select 1 from public.learning_path_items lpi
        join public.course_versions cv on cv.course_id = lpi.course_id
        where lpi.learning_path_version_id = e.learning_path_version_id
          and cv.id = m.course_version_id
      )
    )
  )
  join public.lessons l on l.course_module_id = m.id and l.archived_at is null
  where e.id = target_enrollment_id and m.archived_at is null;

  select count(*)::integer into course_complete
  from public.lesson_progress lp
  where lp.enrollment_id = target_enrollment_id and lp.status in ('completed','waived');

  course_percent := case when course_total = 0 then 0 else round(course_complete * 100.0 / course_total, 2) end;
  course_state := case when course_total > 0 and course_complete = course_total then 'completed' when course_complete > 0 then 'in_progress' else 'not_started' end;

  insert into public.course_progress (enrollment_id, status, progress, completed_at, version, updated_at)
  values (target_enrollment_id, course_state, course_percent, case when course_state = 'completed' then now() else null end, 1, now())
  on conflict (enrollment_id) do update set
    status = excluded.status,
    progress = excluded.progress,
    completed_at = excluded.completed_at,
    version = public.course_progress.version + 1,
    updated_at = now();

  if course_state = 'completed' then
    update public.enrollments set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now(), version = version + 1
    where id = target_enrollment_id and profile_id = auth.uid();
  end if;

  return jsonb_build_object('moduleProgress', module_percent, 'courseProgress', course_percent, 'courseStatus', course_state);
end
$$;

create or replace function private.set_lesson_progress(
  target_enrollment_id uuid,
  target_lesson_id uuid,
  target_progress numeric,
  mark_complete boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  module_id uuid;
  organization_id uuid;
  safe_progress numeric(5,2);
  projection jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if target_progress < 0 or target_progress > 100 then raise exception 'progress must be between 0 and 100' using errcode = '22023'; end if;
  if not private.user_owns_enrollment(target_enrollment_id) then raise exception 'enrollment access denied' using errcode = '42501'; end if;
  if not private.lesson_belongs_to_enrollment(target_enrollment_id, target_lesson_id) then raise exception 'lesson is outside enrollment' using errcode = '42501'; end if;

  select l.course_module_id into strict module_id from public.lessons l where l.id = target_lesson_id;
  select e.organization_id into strict organization_id from public.enrollments e where e.id = target_enrollment_id;
  safe_progress := case when mark_complete then 100 else least(target_progress, 99.99) end;

  insert into public.lesson_progress (
    enrollment_id, lesson_id, status, progress, first_started_at,
    last_activity_at, completed_at, version, updated_at
  ) values (
    target_enrollment_id, target_lesson_id,
    case when mark_complete then 'completed' else 'in_progress' end,
    safe_progress, now(), now(), case when mark_complete then now() else null end, 1, now()
  )
  on conflict (enrollment_id, lesson_id) do update set
    status = case when public.lesson_progress.status = 'completed' or mark_complete then 'completed' else 'in_progress' end,
    progress = greatest(public.lesson_progress.progress, safe_progress),
    first_started_at = coalesce(public.lesson_progress.first_started_at, now()),
    last_activity_at = now(),
    completed_at = case when public.lesson_progress.status = 'completed' then public.lesson_progress.completed_at when mark_complete then now() else null end,
    version = public.lesson_progress.version + 1,
    updated_at = now();

  update public.enrollments set status = 'active', updated_at = now(), version = version + 1
  where id = target_enrollment_id and status in ('pending','paused');

  projection := private.recalculate_learning_progress(target_enrollment_id, module_id);
  perform private.record_learning_audit(
    organization_id,
    case when mark_complete then 'learning.lesson.completed' else 'learning.lesson.progressed' end,
    'lesson', target_lesson_id,
    jsonb_build_object('enrollmentId', target_enrollment_id, 'progress', safe_progress)
  );
  return projection || jsonb_build_object('lessonId', target_lesson_id, 'lessonProgress', safe_progress);
end
$$;

create or replace function private.validate_learner_note_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.profile_id <> auth.uid() then raise exception 'note owner mismatch' using errcode = '42501'; end if;
  if not private.user_has_lesson_access(new.organization_id, new.lesson_id) then raise exception 'lesson access denied' using errcode = '42501'; end if;
  if new.body_ciphertext !~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' then raise exception 'note ciphertext format invalid' using errcode = '22023'; end if;
  return new;
end
$$;

drop trigger if exists learner_notes_validate_write on public.learner_notes;
create trigger learner_notes_validate_write before insert or update on public.learner_notes for each row execute function private.validate_learner_note_write();

create or replace function private.validate_learner_bookmark_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.profile_id <> auth.uid() then raise exception 'bookmark owner mismatch' using errcode = '42501'; end if;
  if new.lesson_id is not null and not private.user_has_lesson_access(new.organization_id, new.lesson_id) then raise exception 'lesson access denied' using errcode = '42501'; end if;
  if new.resource_version_id is not null and not private.user_has_resource_access(new.organization_id, new.resource_version_id) then raise exception 'resource access denied' using errcode = '42501'; end if;
  return new;
end
$$;

drop trigger if exists learner_bookmarks_validate_write on public.learner_bookmarks;
create trigger learner_bookmarks_validate_write before insert or update on public.learner_bookmarks for each row execute function private.validate_learner_bookmark_write();

drop policy if exists storage_objects_learning_select on public.storage_objects;
create policy storage_objects_learning_select on public.storage_objects
for select to authenticated
using (
  exists (
    select 1
    from public.resource_versions rv
    where rv.storage_object_id = storage_objects.id
      and private.user_has_resource_access(storage_objects.organization_id, rv.id)
  )
);

drop policy if exists learning_objects_select on storage.objects;
create policy learning_objects_select on storage.objects
for select to authenticated
using (
  exists (
    select 1
    from public.storage_objects so
    join public.resource_versions rv on rv.storage_object_id = so.id
    where so.bucket = storage.objects.bucket_id
      and so.object_path = storage.objects.name
      and so.deleted_at is null
      and private.user_has_resource_access(so.organization_id, rv.id)
  )
);

create or replace function public.syra_start_course(enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare organization_id uuid;
begin
  if not private.user_owns_enrollment(enrollment_id) then raise exception 'enrollment access denied' using errcode = '42501'; end if;
  update public.enrollments set status = 'active', updated_at = now(), version = version + 1 where id = enrollment_id and status in ('pending','paused');
  select e.organization_id into strict organization_id from public.enrollments e where e.id = enrollment_id;
  perform private.record_learning_audit(organization_id, 'learning.course.started', 'enrollment', enrollment_id, '{}'::jsonb);
  return jsonb_build_object('enrollmentId', enrollment_id, 'status', 'active');
end
$$;

create or replace function public.syra_resume_course(enrollment_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $$ select public.syra_start_course(enrollment_id) $$;

create or replace function public.syra_start_lesson(enrollment_id uuid, lesson_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $$ select private.set_lesson_progress(enrollment_id, lesson_id, 0, false) $$;

create or replace function public.syra_update_lesson_progress(enrollment_id uuid, lesson_id uuid, progress numeric)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $$ select private.set_lesson_progress(enrollment_id, lesson_id, progress, false) $$;

create or replace function public.syra_complete_lesson(enrollment_id uuid, lesson_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $$ select private.set_lesson_progress(enrollment_id, lesson_id, 100, true) $$;

create or replace function public.syra_save_lesson_note(
  organization_id uuid,
  lesson_id uuid,
  body_ciphertext text,
  note_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare saved_id uuid;
begin
  if not private.user_has_lesson_access(organization_id, lesson_id) then raise exception 'lesson access denied' using errcode = '42501'; end if;
  if body_ciphertext !~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' or length(body_ciphertext) > 100000 then raise exception 'invalid note ciphertext' using errcode = '22023'; end if;
  if note_id is null then
    insert into public.learner_notes (organization_id, profile_id, lesson_id, body_ciphertext, visibility)
    values (organization_id, auth.uid(), lesson_id, body_ciphertext, 'private') returning id into saved_id;
  else
    update public.learner_notes set body_ciphertext = syra_save_lesson_note.body_ciphertext, deleted_at = null, updated_at = now(), version = version + 1
    where id = note_id and profile_id = auth.uid() and organization_id = syra_save_lesson_note.organization_id and lesson_id = syra_save_lesson_note.lesson_id
    returning id into saved_id;
    if saved_id is null then raise exception 'note not found' using errcode = 'P0002'; end if;
  end if;
  perform private.record_learning_audit(organization_id, 'learning.note.saved', 'learner_note', saved_id, jsonb_build_object('lessonId', lesson_id));
  return saved_id;
end
$$;

create or replace function public.syra_delete_lesson_note(note_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare target_org uuid; changed integer;
begin
  update public.learner_notes set deleted_at = now(), updated_at = now(), version = version + 1
  where id = note_id and profile_id = auth.uid() and deleted_at is null
  returning organization_id into target_org;
  get diagnostics changed = row_count;
  if changed = 1 then perform private.record_learning_audit(target_org, 'learning.note.deleted', 'learner_note', note_id, '{}'::jsonb); end if;
  return changed = 1;
end
$$;

create or replace function public.syra_bookmark_lesson(organization_id uuid, lesson_id uuid, bookmark_position jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare bookmark_id uuid;
begin
  if not private.user_has_lesson_access(organization_id, lesson_id) then raise exception 'lesson access denied' using errcode = '42501'; end if;
  insert into public.learner_bookmarks (organization_id, profile_id, lesson_id, position)
  values (organization_id, auth.uid(), lesson_id, coalesce(bookmark_position, '{}'::jsonb))
  on conflict (profile_id, lesson_id) where lesson_id is not null do update set position = excluded.position, updated_at = now()
  returning id into bookmark_id;
  perform private.record_learning_audit(organization_id, 'learning.lesson.bookmarked', 'lesson', lesson_id, '{}'::jsonb);
  return bookmark_id;
end
$$;

create or replace function public.syra_remove_lesson_bookmark(lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare changed integer;
begin
  delete from public.learner_bookmarks where profile_id = auth.uid() and lesson_id = syra_remove_lesson_bookmark.lesson_id;
  get diagnostics changed = row_count;
  return changed > 0;
end
$$;

create or replace function public.syra_bookmark_resource(organization_id uuid, resource_version_id uuid, bookmark_position jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare bookmark_id uuid;
begin
  if not private.user_has_resource_access(organization_id, resource_version_id) then raise exception 'resource access denied' using errcode = '42501'; end if;
  insert into public.learner_bookmarks (organization_id, profile_id, resource_version_id, position)
  values (organization_id, auth.uid(), resource_version_id, coalesce(bookmark_position, '{}'::jsonb))
  on conflict (profile_id, resource_version_id) where resource_version_id is not null do update set position = excluded.position, updated_at = now()
  returning id into bookmark_id;
  perform private.record_learning_audit(organization_id, 'learning.resource.bookmarked', 'resource_version', resource_version_id, '{}'::jsonb);
  return bookmark_id;
end
$$;

create or replace function public.syra_remove_resource_bookmark(resource_version_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare changed integer;
begin
  delete from public.learner_bookmarks where profile_id = auth.uid() and resource_version_id = syra_remove_resource_bookmark.resource_version_id;
  get diagnostics changed = row_count;
  return changed > 0;
end
$$;

do $$
declare function_signature text;
begin
  foreach function_signature in array array[
    'public.syra_start_course(uuid)',
    'public.syra_resume_course(uuid)',
    'public.syra_start_lesson(uuid,uuid)',
    'public.syra_update_lesson_progress(uuid,uuid,numeric)',
    'public.syra_complete_lesson(uuid,uuid)',
    'public.syra_save_lesson_note(uuid,uuid,text,uuid)',
    'public.syra_delete_lesson_note(uuid)',
    'public.syra_bookmark_lesson(uuid,uuid,jsonb)',
    'public.syra_remove_lesson_bookmark(uuid)',
    'public.syra_bookmark_resource(uuid,uuid,jsonb)',
    'public.syra_remove_resource_bookmark(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', function_signature);
    execute format('grant execute on function %s to authenticated', function_signature);
  end loop;
end
$$;

revoke all on function private.user_owns_enrollment(uuid) from public;
revoke all on function private.lesson_belongs_to_enrollment(uuid, uuid) from public;
revoke all on function private.user_has_lesson_access(uuid, uuid) from public;
revoke all on function private.user_has_resource_access(uuid, uuid) from public;
revoke all on function private.record_learning_audit(uuid, text, text, uuid, jsonb) from public;
revoke all on function private.recalculate_learning_progress(uuid, uuid) from public;
revoke all on function private.set_lesson_progress(uuid, uuid, numeric, boolean) from public;

comment on function public.syra_update_lesson_progress(uuid, uuid, numeric) is 'Controlled monotonic learner progress update; validates ownership, tenant, and immutable course membership.';
comment on function public.syra_save_lesson_note(uuid, uuid, text, uuid) is 'Stores application-encrypted E2 learner note ciphertext after enrollment validation.';
