-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-012
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-RLS: S4 forced RLS, organization-scoped analytics, admin-only management
-- SYRA-IMMUTABLE: analytics_events, audit_reporting_events, report_executions, report_exports are append-only evidence
-- SYRA-SEED: none

create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null, description text not null default '', definition jsonb not null default '{}'::jsonb,
  visibility text not null default 'organization', status text not null default 'active', version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint report_definitions_visibility_check check (visibility in ('private','organization','platform')),
  constraint report_definitions_status_check check (status in ('active','archived')),
  constraint report_definitions_definition_check check (jsonb_typeof(definition) = 'object')
);
create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  name text not null, category text not null, definition jsonb not null default '{}'::jsonb, is_platform boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint report_templates_definition_check check (jsonb_typeof(definition) = 'object')
);
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  report_definition_id uuid references public.report_definitions(id) on delete restrict, owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  name text not null, filters jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint saved_reports_filters_check check (jsonb_typeof(filters) = 'object')
);
create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  saved_report_id uuid not null references public.saved_reports(id) on delete restrict, schedule text not null, recipients jsonb not null default '[]'::jsonb,
  status text not null default 'active', next_run_at timestamptz, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint scheduled_reports_status_check check (status in ('active','paused','cancelled')),
  constraint scheduled_reports_recipients_check check (jsonb_typeof(recipients) = 'array')
);
create table if not exists public.report_executions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  report_definition_id uuid references public.report_definitions(id) on delete restrict, requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'queued', parameters jsonb not null default '{}'::jsonb, row_count integer not null default 0, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), constraint report_executions_status_check check (status in ('queued','running','completed','failed','cancelled'))
);
create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  report_execution_id uuid not null references public.report_executions(id) on delete restrict, format text not null, object_id uuid references public.storage_objects(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint report_exports_format_check check (format in ('csv','excel','pdf_metadata','json'))
);
create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict, widget_type text not null, title text not null, configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint dashboard_widgets_configuration_check check (jsonb_typeof(configuration) = 'object')
);
create table if not exists public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict, name text not null, layout jsonb not null default '[]'::jsonb,
  is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint dashboard_layouts_layout_check check (jsonb_typeof(layout) = 'array')
);
create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  snapshot_type text not null, as_of_date date not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint analytics_snapshots_payload_check check (jsonb_typeof(payload) = 'object'), constraint analytics_snapshots_unique unique (organization_id, snapshot_type, as_of_date)
);
create table if not exists public.analytics_dimensions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  dimension_key text not null, dimension_value text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint analytics_dimensions_unique unique (organization_id, dimension_key, dimension_value)
);
create table if not exists public.analytics_metrics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  metric_key text not null, metric_value numeric not null default 0, metric_date date not null, dimensions jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint analytics_metrics_dimensions_check check (jsonb_typeof(dimensions) = 'object'), constraint analytics_metrics_unique unique (organization_id, metric_key, metric_date)
);
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null, event_type text not null, entity_type text, entity_id uuid, occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb,
  constraint analytics_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);
create table if not exists public.executive_kpis (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  kpi_key text not null, kpi_value numeric not null default 0, target_value numeric, trend text not null default 'stable', as_of_date date not null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), constraint executive_kpis_trend_check check (trend in ('up','down','stable')), constraint executive_kpis_unique unique (organization_id, kpi_key, as_of_date)
);
create table if not exists public.organization_statistics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  as_of_date date not null, active_learners integer not null default 0, active_mentors integer not null default 0, active_courses integer not null default 0, completion_rate numeric not null default 0, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), constraint organization_statistics_unique unique (organization_id, as_of_date)
);
create table if not exists public.course_statistics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict, as_of_date date not null, enrolled_count integer not null default 0, completed_count integer not null default 0, completion_rate numeric not null default 0, average_progress numeric not null default 0,
  created_at timestamptz not null default now(), constraint course_statistics_unique unique (organization_id, course_id, as_of_date)
);
create table if not exists public.assessment_statistics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  assessment_id uuid, as_of_date date not null, attempt_count integer not null default 0, completion_count integer not null default 0, average_score numeric, pass_rate numeric not null default 0,
  created_at timestamptz not null default now(), constraint assessment_statistics_unique unique (organization_id, assessment_id, as_of_date)
);
create table if not exists public.learner_statistics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, as_of_date date not null, courses_enrolled integer not null default 0, courses_completed integer not null default 0, progress_rate numeric not null default 0, risk_level text not null default 'low',
  created_at timestamptz not null default now(), constraint learner_statistics_risk_check check (risk_level in ('low','medium','high','critical')), constraint learner_statistics_unique unique (organization_id, profile_id, as_of_date)
);
create table if not exists public.mentor_statistics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, as_of_date date not null, assigned_learners integer not null default 0, open_tasks integer not null default 0, response_rate numeric not null default 0,
  created_at timestamptz not null default now(), constraint mentor_statistics_unique unique (organization_id, profile_id, as_of_date)
);
create table if not exists public.certificate_statistics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  as_of_date date not null, issued_count integer not null default 0, revoked_count integer not null default 0, verified_count integer not null default 0,
  created_at timestamptz not null default now(), constraint certificate_statistics_unique unique (organization_id, as_of_date)
);
create table if not exists public.system_health_snapshots (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  service_key text not null, status text not null, latency_ms integer, observed_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb,
  constraint system_health_snapshots_status_check check (status in ('healthy','degraded','outage'))
);
create table if not exists public.audit_reporting_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null, event_type text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);

create index if not exists report_definitions_org_status_idx on public.report_definitions(organization_id, status, updated_at desc);
create index if not exists report_executions_org_time_idx on public.report_executions(organization_id, created_at desc);
create index if not exists analytics_metrics_org_date_idx on public.analytics_metrics(organization_id, metric_date desc);
create index if not exists analytics_events_org_time_idx on public.analytics_events(organization_id, occurred_at desc);
create index if not exists system_health_snapshots_time_idx on public.system_health_snapshots(organization_id, observed_at desc);

create or replace view public.reporting_student_progress as select organization_id, metric_date as as_of_date, metric_value as progress_value, dimensions from public.analytics_metrics where metric_key = 'student_progress';
create or replace view public.reporting_course_completion as select organization_id, course_id, as_of_date, enrolled_count, completed_count, completion_rate from public.course_statistics;
create or replace view public.reporting_assessment_outcomes as select organization_id, assessment_id, as_of_date, attempt_count, completion_count, average_score, pass_rate from public.assessment_statistics;
create or replace view public.reporting_certificates as select organization_id, as_of_date, issued_count, revoked_count, verified_count from public.certificate_statistics;
create or replace view public.reporting_organization_usage as select organization_id, as_of_date, active_learners, active_mentors, active_courses, completion_rate from public.organization_statistics;
create or replace view public.reporting_learning_activity as select organization_id, date_trunc('day', occurred_at)::date as activity_date, count(*)::integer as event_count from public.analytics_events where event_type like 'learning.%' group by organization_id, date_trunc('day', occurred_at)::date;
create or replace view public.reporting_mentor_activity as select organization_id, as_of_date, sum(assigned_learners)::integer as assigned_learners, sum(open_tasks)::integer as open_tasks, avg(response_rate) as response_rate from public.mentor_statistics group by organization_id, as_of_date;
create or replace view public.reporting_admin_activity as select organization_id, date_trunc('day', occurred_at)::date as activity_date, count(*)::integer as event_count from public.audit_reporting_events where event_type like 'admin.%' group by organization_id, date_trunc('day', occurred_at)::date;
create or replace view public.reporting_authoring_activity as select organization_id, date_trunc('day', occurred_at)::date as activity_date, count(*)::integer as event_count from public.analytics_events where event_type like 'authoring.%' group by organization_id, date_trunc('day', occurred_at)::date;
create or replace view public.reporting_question_bank_usage as select organization_id, date_trunc('day', occurred_at)::date as activity_date, count(*)::integer as event_count from public.analytics_events where event_type like 'question.%' group by organization_id, date_trunc('day', occurred_at)::date;
create or replace view public.reporting_risk_analytics as select organization_id, as_of_date, risk_level, count(*)::integer as learner_count from public.learner_statistics group by organization_id, as_of_date, risk_level;
create or replace view public.reporting_compliance_metrics as select organization_id, as_of_date, kpi_key, kpi_value, target_value, trend from public.executive_kpis where kpi_key like 'compliance.%';

create or replace function public.create_report(p_organization_id uuid, p_name text, p_definition jsonb)
returns uuid language plpgsql security invoker set search_path = public, private as $$ declare report_id uuid; begin
  if not private.can_administer_organization(p_organization_id) then raise exception 'not authorized'; end if;
  insert into public.report_definitions(organization_id,name,definition,created_by,updated_by) values(p_organization_id,btrim(p_name),p_definition,auth.uid(),auth.uid()) returning id into report_id; return report_id;
end $$;
create or replace function public.update_report(p_report_id uuid, p_name text, p_definition jsonb)
returns void language plpgsql security invoker set search_path = public, private as $$ begin
  update public.report_definitions set name=btrim(p_name), definition=p_definition, version=version+1, updated_by=auth.uid(), updated_at=now() where id=p_report_id and private.can_administer_organization(organization_id); if not found then raise exception 'report not found or not authorized'; end if;
end $$;
create or replace function public.delete_report(p_report_id uuid) returns void language plpgsql security invoker set search_path = public, private as $$ begin update public.report_definitions set status='archived',updated_by=auth.uid(),updated_at=now() where id=p_report_id and private.can_administer_organization(organization_id); end $$;
create or replace function public.run_report(p_report_id uuid, p_parameters jsonb default '{}'::jsonb) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare execution_id uuid; org_id uuid; begin select organization_id into org_id from public.report_definitions where id=p_report_id; if not private.can_administer_organization(org_id) then raise exception 'not authorized'; end if; insert into public.report_executions(organization_id,report_definition_id,requested_by,parameters) values(org_id,p_report_id,auth.uid(),p_parameters) returning id into execution_id; return execution_id; end $$;
create or replace function public.schedule_report(p_saved_report_id uuid, p_schedule text, p_recipients jsonb) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare schedule_id uuid; org_id uuid; begin select organization_id into org_id from public.saved_reports where id=p_saved_report_id; if not private.can_administer_organization(org_id) then raise exception 'not authorized'; end if; insert into public.scheduled_reports(organization_id,saved_report_id,schedule,recipients,created_by) values(org_id,p_saved_report_id,p_schedule,p_recipients,auth.uid()) returning id into schedule_id; return schedule_id; end $$;
create or replace function public.cancel_report(p_schedule_id uuid) returns void language plpgsql security invoker set search_path = public, private as $$ begin update public.scheduled_reports set status='cancelled' where id=p_schedule_id and private.can_administer_organization(organization_id); end $$;
create or replace function public.export_report(p_execution_id uuid, p_format text) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare export_id uuid; org_id uuid; begin select organization_id into org_id from public.report_executions where id=p_execution_id; if not private.can_administer_organization(org_id) then raise exception 'not authorized'; end if; insert into public.report_exports(organization_id,report_execution_id,format,created_by) values(org_id,p_execution_id,p_format,auth.uid()) returning id into export_id; return export_id; end $$;
create or replace function public.save_dashboard_layout(p_organization_id uuid, p_name text, p_layout jsonb) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare layout_id uuid; begin if not private.can_administer_organization(p_organization_id) then raise exception 'not authorized'; end if; insert into public.dashboard_layouts(organization_id,owner_profile_id,name,layout) values(p_organization_id,auth.uid(),p_name,p_layout) returning id into layout_id; return layout_id; end $$;
create or replace function public.save_dashboard_widget(p_organization_id uuid, p_widget_type text, p_title text, p_configuration jsonb) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare widget_id uuid; begin if not private.can_administer_organization(p_organization_id) then raise exception 'not authorized'; end if; insert into public.dashboard_widgets(organization_id,owner_profile_id,widget_type,title,configuration) values(p_organization_id,auth.uid(),p_widget_type,p_title,p_configuration) returning id into widget_id; return widget_id; end $$;
create or replace function public.record_dashboard_event(p_organization_id uuid, p_event_type text, p_metadata jsonb default '{}'::jsonb) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare event_id uuid; begin if not private.can_administer_organization(p_organization_id) then raise exception 'not authorized'; end if; insert into public.analytics_events(organization_id,actor_profile_id,event_type,metadata) values(p_organization_id,auth.uid(),p_event_type,p_metadata) returning id into event_id; return event_id; end $$;
create or replace function public.refresh_analytics_snapshot(p_organization_id uuid, p_snapshot_type text, p_as_of_date date, p_payload jsonb) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare snapshot_id uuid; begin if not private.can_administer_organization(p_organization_id) then raise exception 'not authorized'; end if; insert into public.analytics_snapshots(organization_id,snapshot_type,as_of_date,payload) values(p_organization_id,p_snapshot_type,p_as_of_date,p_payload) on conflict(organization_id,snapshot_type,as_of_date) do update set payload=excluded.payload returning id into snapshot_id; return snapshot_id; end $$;
create or replace function public.refresh_kpis(p_organization_id uuid, p_as_of_date date, p_kpis jsonb) returns void language plpgsql security invoker set search_path = public, private as $$ begin if not private.can_administer_organization(p_organization_id) then raise exception 'not authorized'; end if; insert into public.executive_kpis(organization_id,kpi_key,kpi_value,as_of_date) select p_organization_id, key, value::numeric, p_as_of_date from jsonb_each_text(p_kpis) on conflict(organization_id,kpi_key,as_of_date) do update set kpi_value=excluded.kpi_value; end $$;
create or replace function public.record_report_download(p_export_id uuid) returns uuid language plpgsql security invoker set search_path = public, private as $$ declare event_id uuid; org_id uuid; begin select organization_id into org_id from public.report_exports where id=p_export_id; if not private.can_administer_organization(org_id) then raise exception 'not authorized'; end if; insert into public.audit_reporting_events(organization_id,actor_profile_id,event_type,entity_type,entity_id) values(org_id,auth.uid(),'report.download','report_export',p_export_id) returning id into event_id; return event_id; end $$;

do $$ declare table_name text; begin foreach table_name in array array['report_definitions','report_templates','saved_reports','scheduled_reports','report_executions','report_exports','dashboard_widgets','dashboard_layouts','analytics_snapshots','analytics_dimensions','analytics_metrics','analytics_events','executive_kpis','organization_statistics','course_statistics','assessment_statistics','learner_statistics','mentor_statistics','certificate_statistics','system_health_snapshots','audit_reporting_events'] loop execute format('alter table public.%I enable row level security', table_name); execute format('alter table public.%I force row level security', table_name); end loop; end $$;
create policy reporting_org_select on public.report_definitions for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_templates on public.report_templates for select to authenticated using (organization_id is null or private.can_administer_organization(organization_id));
create policy reporting_org_select_saved on public.saved_reports for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_schedules on public.scheduled_reports for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_executions on public.report_executions for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_exports on public.report_exports for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_widgets on public.dashboard_widgets for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_layouts on public.dashboard_layouts for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_snapshots on public.analytics_snapshots for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_dimensions on public.analytics_dimensions for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_metrics on public.analytics_metrics for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_events on public.analytics_events for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_kpis on public.executive_kpis for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_org_stats on public.organization_statistics for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_course_stats on public.course_statistics for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_assessment_stats on public.assessment_statistics for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_learner_stats on public.learner_statistics for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_mentor_stats on public.mentor_statistics for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_certificate_stats on public.certificate_statistics for select to authenticated using (private.can_administer_organization(organization_id));
create policy reporting_org_select_health on public.system_health_snapshots for select to authenticated using (organization_id is null or private.can_administer_organization(organization_id));
create policy reporting_org_select_audit on public.audit_reporting_events for select to authenticated using (organization_id is not null and private.can_administer_organization(organization_id));

do $$ declare table_name text; begin foreach table_name in array array['analytics_events','audit_reporting_events','report_executions','report_exports'] loop execute format('create or replace function private.reject_reporting_immutable_%s() returns trigger language plpgsql as $f$ begin raise exception ''append-only reporting evidence''; end $f$', table_name); execute format('create trigger %s_immutable before update or delete on public.%I for each row execute function private.reject_reporting_immutable_%s()', table_name, table_name, table_name); end loop; end $$;
grant execute on function public.create_report(uuid,text,jsonb) to authenticated;
grant execute on function public.update_report(uuid,text,jsonb) to authenticated;
grant execute on function public.delete_report(uuid) to authenticated;
grant execute on function public.run_report(uuid,jsonb) to authenticated;
grant execute on function public.schedule_report(uuid,text,jsonb) to authenticated;
grant execute on function public.cancel_report(uuid) to authenticated;
grant execute on function public.export_report(uuid,text) to authenticated;
grant execute on function public.save_dashboard_layout(uuid,text,jsonb) to authenticated;
grant execute on function public.save_dashboard_widget(uuid,text,text,jsonb) to authenticated;
grant execute on function public.record_dashboard_event(uuid,text,jsonb) to authenticated;
grant execute on function public.refresh_analytics_snapshot(uuid,text,date,jsonb) to authenticated;
grant execute on function public.refresh_kpis(uuid,date,jsonb) to authenticated;
grant execute on function public.record_report_download(uuid) to authenticated;
