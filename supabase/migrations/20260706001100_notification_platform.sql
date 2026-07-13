-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-014
-- SYRA-CHANGE: additive
-- SYRA-PII: P2
-- SYRA-RLS: S2/S4/S8 forced RLS, recipient ownership, organization administration, no public access
-- SYRA-IMMUTABLE: published template versions and all delivery, failure, action and audit evidence are append-only
-- SYRA-SEED: deployment-reference

create table if not exists public.notification_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  key text not null, name text not null, description text not null default '', default_priority text not null default 'normal',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint notification_categories_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint notification_categories_priority_check check (default_priority in ('low','normal','high','critical')),
  constraint notification_categories_unique unique nulls not distinct (organization_id,key)
);
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  category_id uuid references public.notification_categories(id) on delete restrict, key text not null, name text not null,
  status text not null default 'draft', created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint notification_templates_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint notification_templates_status_check check (status in ('draft','published','archived')),
  constraint notification_templates_unique unique nulls not distinct (organization_id,key)
);
create table if not exists public.notification_template_versions (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.notification_templates(id) on delete restrict,
  version integer not null, channel text not null, locale text not null default 'en-IN', subject_template text,
  body_template text not null, variables jsonb not null default '[]'::jsonb, status text not null default 'draft',
  content_hash text not null, published_at timestamptz, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint notification_template_versions_version_check check (version > 0),
  constraint notification_template_versions_channel_check check (channel in ('in_app','email','sms','push','teams','slack','webhook')),
  constraint notification_template_versions_variables_check check (jsonb_typeof(variables)='array'),
  constraint notification_template_versions_status_check check (status in ('draft','review','published','archived')),
  constraint notification_template_versions_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint notification_template_versions_unique unique (template_id,version,channel,locale)
);
create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  channel text not null, enabled boolean not null default true, provider_key text not null default 'internal',
  configuration jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint notification_channels_channel_check check (channel in ('in_app','email','sms','push','teams','slack','webhook')),
  constraint notification_channels_configuration_check check (jsonb_typeof(configuration)='object'),
  constraint notification_channels_unique unique nulls not distinct (organization_id,channel)
);
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, category_id uuid references public.notification_categories(id) on delete restrict,
  channel text not null, enabled boolean not null default true, quiet_hours_start time, quiet_hours_end time,
  timezone text not null default 'Asia/Kolkata', digest_frequency text not null default 'immediate',
  priority_filter text[] not null default array['low','normal','high','critical']::text[], updated_at timestamptz not null default now(),
  constraint notification_preferences_channel_check check (channel in ('in_app','email','sms','push','teams','slack','webhook')),
  constraint notification_preferences_digest_check check (digest_frequency in ('immediate','daily','weekly','never')),
  constraint notification_preferences_unique unique nulls not distinct (organization_id,profile_id,category_id,channel)
);
create table if not exists public.notification_rules (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  category_id uuid references public.notification_categories(id) on delete restrict, template_id uuid references public.notification_templates(id) on delete restrict,
  event_source text not null, conditions jsonb not null default '{}'::jsonb, channels text[] not null default array['in_app']::text[],
  priority text not null default 'normal', enabled boolean not null default true, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint notification_rules_source_check check (event_source ~ '^[a-z][a-z0-9_.-]*$'),
  constraint notification_rules_conditions_check check (jsonb_typeof(conditions)='object'),
  constraint notification_rules_priority_check check (priority in ('low','normal','high','critical'))
);

alter table public.notifications add column if not exists category_id uuid references public.notification_categories(id) on delete restrict;
alter table public.notifications add column if not exists template_version_id uuid references public.notification_template_versions(id) on delete restrict;
alter table public.notifications add column if not exists priority text not null default 'normal';
alter table public.notifications add column if not exists source_type text;
alter table public.notifications add column if not exists source_id uuid;
alter table public.notifications add column if not exists published_at timestamptz not null default now();
alter table public.notifications add column if not exists archived_at timestamptz;
alter table public.notifications add column if not exists dismissed_at timestamptz;
alter table public.notifications add column if not exists deleted_at timestamptz;
alter table public.notifications add column if not exists updated_at timestamptz not null default now();
alter table public.notifications add column if not exists version integer not null default 1;

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict, channel text not null,
  status text not null default 'pending', scheduled_for timestamptz not null default now(), attempt_count integer not null default 0,
  locked_at timestamptz, correlation_id uuid not null default gen_random_uuid(), created_at timestamptz not null default now(),
  constraint notification_queue_channel_check check (channel in ('in_app','email','sms','push','teams','slack','webhook')),
  constraint notification_queue_status_check check (status in ('pending','claimed','completed','failed','cancelled')),
  constraint notification_queue_unique unique (notification_id,channel,correlation_id)
);
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict, queue_id uuid references public.notification_queue(id) on delete restrict,
  channel text not null, provider text not null default 'internal', provider_message_id_hash text, attempt integer not null default 1,
  status text not null, occurred_at timestamptz not null default now(), delivered_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  constraint notification_deliveries_channel_check check (channel in ('in_app','email','sms','push','teams','slack','webhook')),
  constraint notification_deliveries_status_check check (status in ('accepted','queued','sent','delivered','failed','bounced','suppressed')),
  constraint notification_deliveries_metadata_check check (jsonb_typeof(metadata)='object'),
  constraint notification_deliveries_unique unique (notification_id,channel,attempt)
);
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict, actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint notification_events_metadata_check check (jsonb_typeof(metadata)='object')
);
create table if not exists public.notification_failures (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict, delivery_id uuid references public.notification_deliveries(id) on delete restrict,
  channel text not null, error_code text not null, error_class text not null, retryable boolean not null default false,
  safe_details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint notification_failures_details_check check (jsonb_typeof(safe_details)='object')
);
create table if not exists public.notification_batches (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  batch_type text not null, status text not null default 'draft', recipient_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null, scheduled_for timestamptz, created_at timestamptz not null default now(),
  constraint notification_batches_status_check check (status in ('draft','scheduled','processing','completed','cancelled','failed'))
);
create table if not exists public.announcement_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  name text not null, title_template text not null, body_template jsonb not null default '{}'::jsonb, status text not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint announcement_templates_body_check check (jsonb_typeof(body_template)='object'),
  constraint announcement_templates_status_check check (status in ('draft','published','archived'))
);
create table if not exists public.announcement_targets (
  id uuid primary key default gen_random_uuid(), announcement_id uuid not null references public.announcements(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict, target_type text not null,
  target_id uuid, profile_id uuid references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint announcement_targets_type_check check (target_type in ('organization','course','cohort','role','profile')),
  constraint announcement_targets_profile_check check ((target_type='profile')=(profile_id is not null))
);
create table if not exists public.announcement_reads (
  id uuid primary key default gen_random_uuid(), announcement_id uuid not null references public.announcements(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  read_at timestamptz not null default now(), dismissed_at timestamptz,
  constraint announcement_reads_unique unique (announcement_id,profile_id)
);
create table if not exists public.workflow_notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict, workflow_type text not null,
  workflow_entity_id uuid not null, workflow_state text not null, action_required boolean not null default false,
  assigned_profile_id uuid references public.profiles(id) on delete restrict, due_at timestamptz, created_at timestamptz not null default now(),
  constraint workflow_notifications_unique unique (notification_id,workflow_type,workflow_entity_id)
);
create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict, scheduled_for timestamptz not null,
  recurrence_rule text, timezone text not null default 'Asia/Kolkata', status text not null default 'scheduled',
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint scheduled_notifications_status_check check (status in ('scheduled','processing','completed','cancelled','failed'))
);
create table if not exists public.deadline_reminders (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, source_type text not null, source_id uuid not null,
  deadline_at timestamptz not null, remind_at timestamptz not null, escalation_level integer not null default 0,
  status text not null default 'scheduled', notification_id uuid references public.notifications(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint deadline_reminders_dates_check check (remind_at <= deadline_at),
  constraint deadline_reminders_status_check check (status in ('scheduled','sent','cancelled','failed')),
  constraint deadline_reminders_unique unique (profile_id,source_type,source_id,remind_at,escalation_level)
);
create table if not exists public.digest_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, frequency text not null,
  period_start timestamptz not null, period_end timestamptz not null, status text not null default 'queued',
  item_count integer not null default 0, created_at timestamptz not null default now(), completed_at timestamptz,
  constraint digest_jobs_frequency_check check (frequency in ('daily','weekly')),
  constraint digest_jobs_period_check check (period_end > period_start),
  constraint digest_jobs_status_check check (status in ('queued','processing','completed','failed','cancelled'))
);
create table if not exists public.digest_items (
  id uuid primary key default gen_random_uuid(), digest_job_id uuid not null references public.digest_jobs(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict, sort_order integer not null default 0,
  created_at timestamptz not null default now(), constraint digest_items_unique unique (digest_job_id,notification_id)
);
create table if not exists public.notification_inbox (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, notification_id uuid not null references public.notifications(id) on delete restrict,
  folder text not null default 'inbox', pinned boolean not null default false, dismissed_at timestamptz, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint notification_inbox_folder_check check (folder in ('inbox','archive','deleted')),
  constraint notification_inbox_unique unique (profile_id,notification_id)
);
create table if not exists public.notification_actions (
  id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.notifications(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict, action_key text not null, label text not null,
  destination_path text, expires_at timestamptz, created_at timestamptz not null default now(),
  constraint notification_actions_key_check check (action_key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint notification_actions_path_check check (destination_path is null or destination_path ~ '^/[a-zA-Z0-9/_?=&.-]*$'),
  constraint notification_actions_unique unique (notification_id,action_key)
);
create table if not exists public.notification_action_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  notification_action_id uuid not null references public.notification_actions(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, event_type text not null,
  occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb,
  constraint notification_action_events_metadata_check check (jsonb_typeof(metadata)='object')
);
create table if not exists public.system_messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete restrict, title text not null, body jsonb not null default '{}'::jsonb,
  severity text not null default 'info', status text not null default 'active', starts_at timestamptz not null default now(), expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint system_messages_body_check check (jsonb_typeof(body)='object'),
  constraint system_messages_severity_check check (severity in ('info','warning','critical')),
  constraint system_messages_status_check check (status in ('draft','active','archived')),
  constraint system_messages_dates_check check (expires_at is null or expires_at >= starts_at)
);
create table if not exists public.broadcast_messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null, body jsonb not null default '{}'::jsonb, audience_filter jsonb not null default '{}'::jsonb,
  priority text not null default 'normal', status text not null default 'draft', publish_at timestamptz,
  expires_at timestamptz, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint broadcast_messages_body_check check (jsonb_typeof(body)='object'),
  constraint broadcast_messages_filter_check check (jsonb_typeof(audience_filter)='object'),
  constraint broadcast_messages_priority_check check (priority in ('low','normal','high','critical')),
  constraint broadcast_messages_status_check check (status in ('draft','scheduled','published','archived','cancelled'))
);
create table if not exists public.communication_audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null, event_type text not null,
  entity_type text not null, entity_id uuid, correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint communication_audit_events_metadata_check check (jsonb_typeof(metadata)='object')
);

create index if not exists notifications_inbox_idx on public.notifications(profile_id,status,created_at desc) where deleted_at is null;
create index if not exists notification_queue_ready_idx on public.notification_queue(status,scheduled_for) where status='pending';
create index if not exists notification_deliveries_reporting_idx on public.notification_deliveries(organization_id,occurred_at desc,status);
create index if not exists notification_events_timeline_idx on public.notification_events(notification_id,occurred_at desc);
create index if not exists scheduled_notifications_ready_idx on public.scheduled_notifications(status,scheduled_for) where status='scheduled';
create index if not exists deadline_reminders_ready_idx on public.deadline_reminders(status,remind_at) where status='scheduled';
create index if not exists notification_inbox_profile_idx on public.notification_inbox(profile_id,folder,updated_at desc);
create index if not exists broadcast_messages_org_idx on public.broadcast_messages(organization_id,status,publish_at desc);

create or replace function private.can_manage_notifications(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and (
    private.can_administer_organization(target_organization_id)
    or private.can_manage_mentor_workspace(target_organization_id)
  )
$$;

create or replace view public.notification_inbox_projection with (security_invoker=true) as
select n.id as notification_id,n.organization_id,n.profile_id,n.type,n.purpose,n.priority,
  coalesce(n.data->>'title',initcap(replace(n.purpose,'.',' '))) as title,
  coalesce(n.data->>'summary',n.data->>'message','') as summary,n.status,n.read_at,n.created_at,n.expires_at,
  coalesce(i.folder,case when n.status='archived' then 'archive' else 'inbox' end) as folder,
  coalesce(i.pinned,false) as pinned,coalesce(i.dismissed_at,n.dismissed_at) as dismissed_at,coalesce(i.deleted_at,n.deleted_at) as deleted_at,
  coalesce((select jsonb_agg(jsonb_build_object('key',a.action_key,'label',a.label,'path',a.destination_path) order by a.created_at) from public.notification_actions a where a.notification_id=n.id),'[]'::jsonb) as actions
from public.notifications n left join public.notification_inbox i on i.notification_id=n.id and i.profile_id=n.profile_id
where n.published_at is not null and n.deleted_at is null;
create or replace view public.announcement_feed_projection with (security_invoker=true) as
select b.id as message_id,b.organization_id,b.title,coalesce(b.body->>'markdown',b.body->>'text','') as body,
  b.priority,b.publish_at,b.expires_at,'broadcast'::text as message_type
from public.broadcast_messages b where b.status='published' and b.publish_at<=now() and (b.expires_at is null or b.expires_at>now());
create or replace view public.notification_preference_projection with (security_invoker=true) as
select p.id,p.organization_id,p.profile_id,c.key as category,p.channel,p.enabled,p.quiet_hours_start,p.quiet_hours_end,
  p.timezone,p.digest_frequency,p.priority_filter,p.updated_at
from public.notification_preferences p left join public.notification_categories c on c.id=p.category_id;
create or replace view public.deadline_reminder_projection with (security_invoker=true) as
select id,organization_id,profile_id,source_type,source_id,deadline_at,remind_at,escalation_level,status
from public.deadline_reminders where status in ('scheduled','sent');
create or replace view public.notification_delivery_reporting with (security_invoker=true) as
select organization_id,date_trunc('day',occurred_at)::date as activity_date,channel,status,count(*)::integer as delivery_count
from public.notification_deliveries group by organization_id,date_trunc('day',occurred_at)::date,channel,status;
create or replace view public.reporting_notification_performance with (security_invoker=true) as
select n.organization_id,date_trunc('day',n.created_at)::date as activity_date,count(*)::integer as notification_volume,
  count(*) filter (where n.read_at is not null)::integer as read_count,
  count(*) filter (where exists(select 1 from public.notification_failures f where f.notification_id=n.id))::integer as failure_count
from public.notifications n where n.organization_id is not null group by n.organization_id,date_trunc('day',n.created_at)::date;
create or replace view public.reporting_announcement_engagement with (security_invoker=true) as
select a.organization_id,a.id as announcement_id,a.title,count(distinct t.id)::integer as target_count,
  count(distinct r.profile_id)::integer as read_count
from public.announcements a left join public.announcement_targets t on t.announcement_id=a.id
left join public.announcement_reads r on r.announcement_id=a.id group by a.organization_id,a.id,a.title
union all
select b.organization_id,b.id,b.title,count(distinct m.profile_id)::integer,
  count(distinct n.profile_id) filter (where n.read_at is not null)::integer
from public.broadcast_messages b left join public.organization_members m on m.organization_id=b.organization_id and m.status='active' and m.ended_at is null
left join public.notifications n on n.source_type='broadcast_message' and n.source_id=b.id
group by b.organization_id,b.id,b.title;

create or replace function public.create_notification(p_organization_id uuid,p_profile_id uuid,p_type text,p_purpose text,p_data jsonb default '{}'::jsonb,p_priority text default 'normal')
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare notification_id uuid; begin
  if auth.uid() is null or (auth.uid()<>p_profile_id and not private.can_manage_notifications(p_organization_id)) then raise exception 'notification denied' using errcode='42501'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.profile_id=p_profile_id and m.status='active' and m.ended_at is null) then raise exception 'recipient is not active'; end if;
  insert into public.notifications(organization_id,profile_id,type,purpose,data,status,priority,published_at)
  values(p_organization_id,p_profile_id,p_type,p_purpose,coalesce(p_data,'{}'::jsonb),'unread',p_priority,now()) returning id into notification_id;
  insert into public.notification_inbox(organization_id,profile_id,notification_id) values(p_organization_id,p_profile_id,notification_id);
  insert into public.notification_events(organization_id,notification_id,actor_profile_id,event_type) values(p_organization_id,notification_id,auth.uid(),'created');
  return notification_id;
end $$;
create or replace function public.create_notification_template(p_organization_id uuid,p_key text,p_name text,p_category_id uuid default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare template_id uuid; begin
  if not private.can_manage_notifications(p_organization_id) then raise exception 'template denied' using errcode='42501'; end if;
  insert into public.notification_templates(organization_id,category_id,key,name,created_by) values(p_organization_id,p_category_id,btrim(p_key),btrim(p_name),auth.uid()) returning id into template_id; return template_id;
end $$;
create or replace function public.save_notification_template_draft(p_template_id uuid,p_channel text,p_locale text,p_subject_template text,p_body_template text,p_variables jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; version_id uuid; next_version integer; begin
  select organization_id into org_id from public.notification_templates where id=p_template_id;
  if not private.can_manage_notifications(org_id) then raise exception 'template denied' using errcode='42501'; end if;
  select coalesce(max(version),0)+1 into next_version from public.notification_template_versions where template_id=p_template_id and channel=p_channel and locale=p_locale;
  insert into public.notification_template_versions(template_id,version,channel,locale,subject_template,body_template,variables,status,content_hash,created_by)
  values(p_template_id,next_version,p_channel,p_locale,p_subject_template,p_body_template,p_variables,'draft',encode(extensions.digest(coalesce(p_subject_template,'')||p_body_template||p_variables::text,'sha256'),'hex'),auth.uid()) returning id into version_id; return version_id;
end $$;
create or replace function public.publish_notification_template(p_template_version_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; template_identity uuid; begin
  select t.organization_id,t.id into org_id,template_identity from public.notification_template_versions v join public.notification_templates t on t.id=v.template_id where v.id=p_template_version_id;
  if not private.can_manage_notifications(org_id) then raise exception 'template denied' using errcode='42501'; end if;
  update public.notification_template_versions set status='published',published_at=now() where id=p_template_version_id and status in ('draft','review');
  if not found then raise exception 'template version cannot be published'; end if;
  update public.notification_templates set status='published',updated_at=now() where id=template_identity;
end $$;
create or replace function public.update_notification_channel(p_organization_id uuid,p_channel text,p_enabled boolean,p_configuration jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare channel_id uuid; begin
  if not private.can_manage_notifications(p_organization_id) then raise exception 'channel denied' using errcode='42501'; end if;
  insert into public.notification_channels(organization_id,channel,enabled,configuration) values(p_organization_id,p_channel,p_enabled,p_configuration)
  on conflict(organization_id,channel) do update set enabled=excluded.enabled,configuration=excluded.configuration,updated_at=now() returning id into channel_id; return channel_id;
end $$;
create or replace function public.publish_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; begin
  select organization_id into org_id from public.notifications where id=p_notification_id;
  if not private.can_manage_notifications(org_id) then raise exception 'notification denied' using errcode='42501'; end if;
  update public.notifications set published_at=coalesce(published_at,now()),updated_at=now(),version=version+1 where id=p_notification_id;
  insert into public.notification_queue(organization_id,notification_id,channel)
  select org_id,p_notification_id,p.channel from public.notification_preferences p
  join public.notifications n on n.id=p_notification_id and n.profile_id=p.profile_id
  where p.organization_id=org_id and p.enabled and p.channel<>'in_app' and p.digest_frequency='immediate'
  and not exists(select 1 from public.notification_queue q where q.notification_id=p_notification_id and q.channel=p.channel);
  insert into public.notification_events(organization_id,notification_id,actor_profile_id,event_type) values(org_id,p_notification_id,auth.uid(),'published');
end $$;
create or replace function public.schedule_notification(p_notification_id uuid,p_scheduled_for timestamptz,p_recurrence_rule text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; schedule_id uuid; begin
  select organization_id into org_id from public.notifications where id=p_notification_id;
  if not private.can_manage_notifications(org_id) then raise exception 'notification denied' using errcode='42501'; end if;
  insert into public.scheduled_notifications(organization_id,notification_id,scheduled_for,recurrence_rule,created_by) values(org_id,p_notification_id,p_scheduled_for,p_recurrence_rule,auth.uid()) returning id into schedule_id; return schedule_id;
end $$;
create or replace function public.cancel_notification(p_schedule_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  update public.scheduled_notifications set status='cancelled' where id=p_schedule_id and private.can_manage_notifications(organization_id) and status='scheduled';
  if not found then raise exception 'schedule not found or denied' using errcode='42501'; end if;
end $$;
create or replace function public.create_announcement(p_organization_id uuid,p_title text,p_body jsonb,p_audience_filter jsonb default '{}'::jsonb,p_priority text default 'normal')
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare message_id uuid; begin
  if not private.can_manage_notifications(p_organization_id) then raise exception 'announcement denied' using errcode='42501'; end if;
  insert into public.broadcast_messages(organization_id,title,body,audience_filter,priority,created_by) values(p_organization_id,btrim(p_title),p_body,p_audience_filter,p_priority,auth.uid()) returning id into message_id; return message_id;
end $$;
create or replace function public.publish_announcement(p_message_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; begin
  select organization_id into org_id from public.broadcast_messages where id=p_message_id;
  if not private.can_manage_notifications(org_id) then raise exception 'announcement denied' using errcode='42501'; end if;
  update public.broadcast_messages set status='published',publish_at=coalesce(publish_at,now()),updated_at=now() where id=p_message_id and status in ('draft','scheduled');
  with inserted as (
    insert into public.notifications(organization_id,profile_id,type,purpose,data,status,priority,source_type,source_id,published_at)
    select b.organization_id,m.profile_id,'announcement','announcement.published',jsonb_build_object('title',b.title,'summary',coalesce(b.body->>'markdown',b.body->>'text','')),'unread',b.priority,'broadcast_message',b.id,now()
    from public.broadcast_messages b join public.organization_members m on m.organization_id=b.organization_id and m.status='active' and m.ended_at is null
    where b.id=p_message_id and not exists(select 1 from public.notifications n where n.profile_id=m.profile_id and n.source_type='broadcast_message' and n.source_id=b.id)
    returning id,organization_id,profile_id
  ) insert into public.notification_inbox(organization_id,profile_id,notification_id) select organization_id,profile_id,id from inserted;
  insert into public.communication_audit_events(organization_id,actor_profile_id,event_type,entity_type,entity_id) values(org_id,auth.uid(),'announcement.published','broadcast_message',p_message_id);
end $$;
create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  update public.notifications set status='read',read_at=coalesce(read_at,now()),updated_at=now() where id=p_notification_id and profile_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'notification denied' using errcode='42501'; end if;
  insert into public.notification_events(organization_id,notification_id,actor_profile_id,event_type) select organization_id,id,auth.uid(),'read' from public.notifications where id=p_notification_id;
end $$;
create or replace function public.mark_notification_unread(p_notification_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  update public.notifications set status='unread',read_at=null,updated_at=now() where id=p_notification_id and profile_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'notification denied' using errcode='42501'; end if;
end $$;
create or replace function public.archive_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  update public.notifications set status='archived',archived_at=now(),updated_at=now() where id=p_notification_id and profile_id=auth.uid() and deleted_at is null;
  update public.notification_inbox set folder='archive',updated_at=now() where notification_id=p_notification_id and profile_id=auth.uid();
end $$;
create or replace function public.restore_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  update public.notifications set status=case when read_at is null then 'unread' else 'read' end,archived_at=null,deleted_at=null,updated_at=now() where id=p_notification_id and profile_id=auth.uid();
  update public.notification_inbox set folder='inbox',deleted_at=null,updated_at=now() where notification_id=p_notification_id and profile_id=auth.uid();
end $$;
create or replace function public.dismiss_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  update public.notifications set dismissed_at=now(),updated_at=now() where id=p_notification_id and profile_id=auth.uid();
  update public.notification_inbox set dismissed_at=now(),updated_at=now() where notification_id=p_notification_id and profile_id=auth.uid();
end $$;
create or replace function public.delete_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  update public.notifications set deleted_at=now(),updated_at=now() where id=p_notification_id and profile_id=auth.uid();
  if not found then raise exception 'notification denied' using errcode='42501'; end if;
  update public.notification_inbox set folder='deleted',deleted_at=now(),updated_at=now() where notification_id=p_notification_id and profile_id=auth.uid();
  insert into public.notification_events(organization_id,notification_id,actor_profile_id,event_type) select organization_id,id,auth.uid(),'deleted' from public.notifications where id=p_notification_id;
end $$;
create or replace function public.update_preferences(p_organization_id uuid,p_category_id uuid,p_channel text,p_enabled boolean,p_digest_frequency text,p_quiet_hours_start time default null,p_quiet_hours_end time default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare preference_id uuid; begin
  if auth.uid() is null or not exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.profile_id=auth.uid() and m.status='active' and m.ended_at is null) then raise exception 'preference denied' using errcode='42501'; end if;
  insert into public.notification_preferences(organization_id,profile_id,category_id,channel,enabled,digest_frequency,quiet_hours_start,quiet_hours_end)
  values(p_organization_id,auth.uid(),p_category_id,p_channel,p_enabled,p_digest_frequency,p_quiet_hours_start,p_quiet_hours_end)
  on conflict(organization_id,profile_id,category_id,channel) do update set enabled=excluded.enabled,digest_frequency=excluded.digest_frequency,quiet_hours_start=excluded.quiet_hours_start,quiet_hours_end=excluded.quiet_hours_end,updated_at=now()
  returning id into preference_id; return preference_id;
end $$;
create or replace function public.send_digest(p_organization_id uuid,p_profile_id uuid,p_frequency text,p_period_start timestamptz,p_period_end timestamptz)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare job_id uuid; begin
  if auth.uid()<>p_profile_id and not private.can_manage_notifications(p_organization_id) then raise exception 'digest denied' using errcode='42501'; end if;
  insert into public.digest_jobs(organization_id,profile_id,frequency,period_start,period_end) values(p_organization_id,p_profile_id,p_frequency,p_period_start,p_period_end) returning id into job_id;
  insert into public.digest_items(digest_job_id,notification_id,sort_order) select job_id,n.id,row_number() over(order by n.created_at desc) from public.notifications n where n.organization_id=p_organization_id and n.profile_id=p_profile_id and n.created_at>=p_period_start and n.created_at<p_period_end and n.status='unread';
  update public.digest_jobs set item_count=(select count(*) from public.digest_items where digest_job_id=job_id) where id=job_id; return job_id;
end $$;
create or replace function public.record_delivery_event(p_notification_id uuid,p_channel text,p_status text,p_attempt integer default 1,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; delivery_id uuid; begin
  select organization_id into org_id from public.notifications where id=p_notification_id;
  if not private.can_manage_notifications(org_id) then raise exception 'delivery denied' using errcode='42501'; end if;
  insert into public.notification_deliveries(organization_id,notification_id,channel,status,attempt,metadata,delivered_at) values(org_id,p_notification_id,p_channel,p_status,p_attempt,p_metadata,case when p_status='delivered' then now() else null end) returning id into delivery_id; return delivery_id;
end $$;
create or replace function public.record_notification_failure(p_notification_id uuid,p_delivery_id uuid,p_channel text,p_error_code text,p_error_class text,p_retryable boolean default false,p_safe_details jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; failure_id uuid; begin
  select organization_id into org_id from public.notifications where id=p_notification_id;
  if not private.can_manage_notifications(org_id) then raise exception 'failure denied' using errcode='42501'; end if;
  insert into public.notification_failures(organization_id,notification_id,delivery_id,channel,error_code,error_class,retryable,safe_details) values(org_id,p_notification_id,p_delivery_id,p_channel,p_error_code,p_error_class,p_retryable,p_safe_details) returning id into failure_id; return failure_id;
end $$;

create or replace function private.reject_notification_evidence_mutation() returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'notification evidence is immutable'; end $$;
create or replace function private.protect_published_notification_template() returns trigger language plpgsql set search_path=pg_catalog as $$ begin if old.status='published' then raise exception 'published notification template versions are immutable'; end if; return new; end $$;
create trigger notification_template_versions_immutable before update or delete on public.notification_template_versions for each row execute function private.protect_published_notification_template();
do $$ declare table_name text; begin foreach table_name in array array['notification_deliveries','notification_events','notification_failures','notification_action_events','communication_audit_events'] loop execute format('create trigger %I before update or delete on public.%I for each row execute function private.reject_notification_evidence_mutation()',table_name || '_immutable',table_name); end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'notification_categories','notification_templates','notification_template_versions','notification_channels','notification_preferences','notification_rules','notification_queue','notification_deliveries','notification_events','notification_failures','notification_batches','announcement_templates','announcement_targets','announcement_reads','workflow_notifications','scheduled_notifications','deadline_reminders','digest_jobs','digest_items','notification_inbox','notification_actions','notification_action_events','system_messages','broadcast_messages','communication_audit_events'
] loop execute format('alter table public.%I enable row level security',table_name); execute format('alter table public.%I force row level security',table_name); execute format('revoke all on table public.%I from anon,authenticated',table_name); end loop; end $$;

create policy notification_categories_select on public.notification_categories for select to authenticated using (organization_id is null or private.is_active_org_member(organization_id));
create policy notification_templates_admin_select on public.notification_templates for select to authenticated using ((organization_id is null and private.can_platform_admin()) or private.can_manage_notifications(organization_id));
create policy notification_template_versions_admin_select on public.notification_template_versions for select to authenticated using (exists(select 1 from public.notification_templates t where t.id=template_id and ((t.organization_id is null and private.can_platform_admin()) or private.can_manage_notifications(t.organization_id))));
create policy notification_channels_admin_select on public.notification_channels for select to authenticated using ((organization_id is null and private.can_platform_admin()) or private.can_manage_notifications(organization_id));
create policy notification_preferences_self_select on public.notification_preferences for select to authenticated using (profile_id=auth.uid());
create policy notification_rules_admin_select on public.notification_rules for select to authenticated using (private.can_manage_notifications(organization_id));
create policy notification_queue_admin_select on public.notification_queue for select to authenticated using (private.can_manage_notifications(organization_id));
create policy notification_deliveries_context_select on public.notification_deliveries for select to authenticated using (private.can_manage_notifications(organization_id) or exists(select 1 from public.notifications n where n.id=notification_id and n.profile_id=auth.uid()));
create policy notification_events_context_select on public.notification_events for select to authenticated using (private.can_manage_notifications(organization_id) or exists(select 1 from public.notifications n where n.id=notification_id and n.profile_id=auth.uid()));
create policy notification_failures_admin_select on public.notification_failures for select to authenticated using (private.can_manage_notifications(organization_id));
create policy notification_batches_admin_select on public.notification_batches for select to authenticated using (private.can_manage_notifications(organization_id));
create policy announcement_templates_admin_select on public.announcement_templates for select to authenticated using ((organization_id is null and private.can_platform_admin()) or private.can_manage_notifications(organization_id));
create policy announcement_targets_context_select on public.announcement_targets for select to authenticated using (profile_id=auth.uid() or private.is_active_org_member(organization_id));
create policy announcement_reads_context_select on public.announcement_reads for select to authenticated using (profile_id=auth.uid() or private.can_manage_notifications(organization_id));
create policy workflow_notifications_context_select on public.workflow_notifications for select to authenticated using (assigned_profile_id=auth.uid() or private.can_manage_notifications(organization_id));
create policy scheduled_notifications_admin_select on public.scheduled_notifications for select to authenticated using (private.can_manage_notifications(organization_id));
create policy deadline_reminders_context_select on public.deadline_reminders for select to authenticated using (profile_id=auth.uid() or private.can_manage_notifications(organization_id));
create policy digest_jobs_context_select on public.digest_jobs for select to authenticated using (profile_id=auth.uid() or private.can_manage_notifications(organization_id));
create policy digest_items_context_select on public.digest_items for select to authenticated using (exists(select 1 from public.digest_jobs d where d.id=digest_job_id and (d.profile_id=auth.uid() or private.can_manage_notifications(d.organization_id))));
create policy notification_inbox_self_select on public.notification_inbox for select to authenticated using (profile_id=auth.uid());
create policy notification_actions_recipient_select on public.notification_actions for select to authenticated using (exists(select 1 from public.notifications n where n.id=notification_id and (n.profile_id=auth.uid() or private.can_manage_notifications(n.organization_id))));
create policy notification_action_events_context_select on public.notification_action_events for select to authenticated using (profile_id=auth.uid() or private.can_manage_notifications(organization_id));
create policy system_messages_context_select on public.system_messages for select to authenticated using ((profile_id is null and (organization_id is null or private.is_active_org_member(organization_id))) or profile_id=auth.uid() or private.can_manage_notifications(organization_id));
create policy broadcast_messages_context_select on public.broadcast_messages for select to authenticated using ((status='published' and private.is_active_org_member(organization_id)) or private.can_manage_notifications(organization_id));
create policy communication_audit_admin_select on public.communication_audit_events for select to authenticated using (organization_id is not null and private.can_manage_notifications(organization_id));
create policy notifications_select_notification_admin on public.notifications for select to authenticated using (organization_id is not null and private.can_manage_notifications(organization_id));

grant select on public.notification_categories,public.notification_templates,public.notification_template_versions,public.notification_channels,public.notification_preferences,public.notification_rules,public.notification_queue,public.notification_deliveries,public.notification_events,public.notification_failures,public.notification_batches,public.announcement_templates,public.announcement_targets,public.announcement_reads,public.workflow_notifications,public.scheduled_notifications,public.deadline_reminders,public.digest_jobs,public.digest_items,public.notification_inbox,public.notification_actions,public.notification_action_events,public.system_messages,public.broadcast_messages,public.communication_audit_events to authenticated;
grant select on public.notification_inbox_projection,public.announcement_feed_projection,public.notification_preference_projection,public.deadline_reminder_projection,public.notification_delivery_reporting,public.reporting_notification_performance,public.reporting_announcement_engagement to authenticated;

revoke all on function private.can_manage_notifications(uuid) from public;
revoke all on function private.reject_notification_evidence_mutation() from public;
revoke all on function private.protect_published_notification_template() from public;
grant execute on function private.can_manage_notifications(uuid) to authenticated;
do $$ declare signature text; begin foreach signature in array array[
  'create_notification(uuid,uuid,text,text,jsonb,text)','create_notification_template(uuid,text,text,uuid)','save_notification_template_draft(uuid,text,text,text,text,jsonb)','publish_notification_template(uuid)','update_notification_channel(uuid,text,boolean,jsonb)','publish_notification(uuid)','schedule_notification(uuid,timestamptz,text)','cancel_notification(uuid)','create_announcement(uuid,text,jsonb,jsonb,text)','publish_announcement(uuid)','mark_notification_read(uuid)','mark_notification_unread(uuid)','archive_notification(uuid)','restore_notification(uuid)','dismiss_notification(uuid)','delete_notification(uuid)','update_preferences(uuid,uuid,text,boolean,text,time,time)','send_digest(uuid,uuid,text,timestamptz,timestamptz)','record_delivery_event(uuid,text,text,integer,jsonb)','record_notification_failure(uuid,uuid,text,text,text,boolean,jsonb)'
] loop execute format('revoke all on function public.%s from public',signature); execute format('grant execute on function public.%s to authenticated',signature); end loop; end $$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions(key,description,risk_level) values
  ('notification.manage','Manage organization notification workflows','high'),
  ('notification.template.manage','Manage notification templates and channels','high')
on conflict(key) do update set description=excluded.description,risk_level=excluded.risk_level;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.organization_id is null and r.key in ('organization_admin','enterprise_admin','platform_admin','super_admin')
and p.key in ('notification.manage','notification.template.manage') on conflict do nothing;
-- SYRA-REFERENCE-DATA-END
