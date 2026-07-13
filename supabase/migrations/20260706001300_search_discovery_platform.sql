-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/27-search-and-index-strategy.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-016
-- SYRA-CHANGE: additive
-- SYRA-PII: P2
-- SYRA-PII-NOTES: P0/P1 minimized index projection; P2 private query history
-- SYRA-RLS: S2/S4/S8 forced RLS, explicit audience scope, private user activity, no public access
-- SYRA-IMMUTABLE: index versions, click/result analytics and dashboard events are append-only
-- SYRA-SEED: deployment-reference

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.search_indexes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  module_key text not null,
  name text not null,
  status text not null default 'active',
  last_reindexed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_indexes_module_key_check check (module_key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint search_indexes_status_check check (status in ('active','paused','rebuilding','archived')),
  constraint search_indexes_unique unique nulls not distinct (organization_id,module_key)
);

create table if not exists public.search_index_versions (
  id uuid primary key default gen_random_uuid(),
  search_index_id uuid not null references public.search_indexes(id) on delete restrict,
  version integer not null,
  schema_version integer not null default 1,
  status text not null default 'active',
  source_watermark timestamptz not null default now(),
  document_count integer not null default 0,
  content_hash text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint search_index_versions_version_check check (version > 0 and schema_version > 0 and document_count >= 0),
  constraint search_index_versions_status_check check (status in ('building','active','retired','failed')),
  constraint search_index_versions_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint search_index_versions_unique unique (search_index_id,version)
);

create table if not exists public.search_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  key text not null,
  label text not null,
  parent_id uuid references public.search_categories(id) on delete restrict,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint search_categories_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint search_categories_status_check check (status in ('active','archived')),
  constraint search_categories_unique unique nulls not distinct (organization_id,key)
);

create table if not exists public.search_documents (
  id uuid primary key default gen_random_uuid(),
  search_index_version_id uuid not null references public.search_index_versions(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  locale text not null default 'en-IN',
  audience_scope text not null,
  owner_profile_id uuid references public.profiles(id) on delete restrict,
  required_permission text,
  category_id uuid references public.search_categories(id) on delete set null,
  author_profile_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  summary text not null default '',
  keywords text[] not null default '{}',
  route_path text not null,
  status text not null default 'active',
  source_version text not null,
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  indexed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  search_vector tsvector not null,
  constraint search_documents_entity_type_check check (entity_type in (
    'course','module','lesson','resource','learning_path','assignment','rubric','gradebook',
    'assessment','question','certificate','announcement','notification','report',
    'governance_control','policy','evidence','audit_finding','risk','privacy_request',
    'organization','profile_public'
  )),
  constraint search_documents_scope_check check (audience_scope in ('public_catalog','organization','owner','permission')),
  constraint search_documents_owner_check check (audience_scope <> 'owner' or owner_profile_id is not null),
  constraint search_documents_permission_check check (audience_scope <> 'permission' or required_permission is not null),
  constraint search_documents_route_check check (route_path ~ '^/' and route_path !~ '://'),
  constraint search_documents_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint search_documents_metadata_check check (jsonb_typeof(metadata)='object'),
  constraint search_documents_unique unique nulls not distinct (organization_id,entity_type,entity_id,locale,audience_scope,owner_profile_id,required_permission)
);

create table if not exists public.search_document_chunks (
  id uuid primary key default gen_random_uuid(),
  search_document_id uuid not null references public.search_documents(id) on delete restrict,
  position integer not null,
  safe_excerpt text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  search_vector tsvector not null,
  constraint search_document_chunks_position_check check (position >= 0),
  constraint search_document_chunks_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint search_document_chunks_unique unique (search_document_id,position)
);

create table if not exists public.search_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  key text not null,
  label text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint search_tags_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint search_tags_status_check check (status in ('active','archived')),
  constraint search_tags_unique unique nulls not distinct (organization_id,key)
);

create table if not exists public.search_tag_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  search_document_id uuid not null references public.search_documents(id) on delete restrict,
  search_tag_id uuid not null references public.search_tags(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  constraint search_tag_assignments_unique unique (search_document_id,search_tag_id)
);

create table if not exists public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  term text not null,
  synonyms text[] not null,
  locale text not null default 'en-IN',
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_synonyms_term_check check (length(btrim(term)) between 2 and 100 and cardinality(synonyms)>0),
  constraint search_synonyms_status_check check (status in ('active','archived')),
  constraint search_synonyms_unique unique nulls not distinct (organization_id,locale,term)
);

create table if not exists public.search_boost_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  name text not null,
  entity_type text,
  category_id uuid references public.search_categories(id) on delete restrict,
  condition jsonb not null default '{}'::jsonb,
  boost numeric not null default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint search_boost_rules_condition_check check (jsonb_typeof(condition)='object'),
  constraint search_boost_rules_boost_check check (boost between 0 and 20),
  constraint search_boost_rules_dates_check check (ends_at is null or starts_at is null or ends_at>=starts_at),
  constraint search_boost_rules_status_check check (status in ('draft','active','paused','archived'))
);

create table if not exists public.search_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  key text not null,
  label text not null,
  filter_type text not null,
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint search_filters_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint search_filters_type_check check (filter_type in ('category','tag','organization','date','status','author','course','content_type')),
  constraint search_filters_configuration_check check (jsonb_typeof(configuration)='object'),
  constraint search_filters_status_check check (status in ('active','archived')),
  constraint search_filters_unique unique nulls not distinct (organization_id,key)
);

create table if not exists public.search_saved_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  query_text text not null,
  filters jsonb not null default '{}'::jsonb,
  sort_key text not null default 'relevance',
  pinned boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_saved_queries_filters_check check (jsonb_typeof(filters)='object'),
  constraint search_saved_queries_sort_check check (sort_key in ('relevance','recent','popular','title')),
  constraint search_saved_queries_status_check check (status in ('active','archived')),
  constraint search_saved_queries_unique unique (organization_id,profile_id,name)
);

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  query_text text not null,
  query_hash text not null,
  filters jsonb not null default '{}'::jsonb,
  result_count integer not null default 0,
  latency_ms integer,
  searched_at timestamptz not null default now(),
  constraint search_history_hash_check check (query_hash ~ '^[a-f0-9]{64}$'),
  constraint search_history_filters_check check (jsonb_typeof(filters)='object'),
  constraint search_history_metrics_check check (result_count>=0 and (latency_ms is null or latency_ms>=0))
);

create table if not exists public.search_recent_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  search_document_id uuid not null references public.search_documents(id) on delete restrict,
  interaction_type text not null default 'view',
  interaction_count integer not null default 1,
  last_interacted_at timestamptz not null default now(),
  constraint search_recent_items_type_check check (interaction_type in ('view','open','continue','bookmark')),
  constraint search_recent_items_count_check check (interaction_count>0),
  constraint search_recent_items_unique unique (profile_id,search_document_id,interaction_type)
);

create table if not exists public.search_click_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  search_history_id uuid references public.search_history(id) on delete restrict,
  search_document_id uuid not null references public.search_documents(id) on delete restrict,
  result_position integer,
  occurred_at timestamptz not null default now(),
  constraint search_click_events_position_check check (result_position is null or result_position>0)
);

create table if not exists public.search_result_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  search_history_id uuid not null references public.search_history(id) on delete restrict,
  result_count integer not null,
  no_results boolean not null,
  latency_ms integer,
  occurred_at timestamptz not null default now(),
  constraint search_result_events_metrics_check check (result_count>=0 and (latency_ms is null or latency_ms>=0))
);

create table if not exists public.search_popularity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  search_document_id uuid not null references public.search_documents(id) on delete restrict,
  view_count bigint not null default 0,
  click_count bigint not null default 0,
  search_count bigint not null default 0,
  popularity_score numeric not null default 0,
  calculated_at timestamptz not null default now(),
  constraint search_popularity_metrics_check check (view_count>=0 and click_count>=0 and search_count>=0 and popularity_score>=0),
  constraint search_popularity_unique unique (search_document_id)
);

create table if not exists public.search_recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  key text not null,
  name text not null,
  recommendation_type text not null,
  priority integer not null default 100,
  conditions jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_recommendation_rules_key_check check (key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint search_recommendation_rules_type_check check (recommendation_type in ('continue_learning','pending_assignment','upcoming_assessment','recommended_certificate','popular_learning','frequently_viewed','recently_updated','role_based','organization','notification_driven')),
  constraint search_recommendation_rules_conditions_check check (jsonb_typeof(conditions)='object'),
  constraint search_recommendation_rules_status_check check (status in ('draft','active','paused','archived')),
  constraint search_recommendation_rules_unique unique nulls not distinct (organization_id,key)
);

create table if not exists public.search_recommendation_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  recommendation_rule_id uuid references public.search_recommendation_rules(id) on delete restrict,
  search_document_id uuid not null references public.search_documents(id) on delete restrict,
  recommendation_type text not null,
  reason_key text not null,
  score numeric not null,
  status text not null default 'active',
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  last_event text,
  last_event_at timestamptz,
  constraint search_recommendation_results_score_check check (score>=0),
  constraint search_recommendation_results_status_check check (status in ('active','dismissed','opened','completed','expired')),
  constraint search_recommendation_results_unique unique nulls not distinct (profile_id,search_document_id,recommendation_rule_id,recommendation_type)
);

create table if not exists public.search_personalization_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  preferred_categories uuid[] not null default '{}',
  preferred_tags uuid[] not null default '{}',
  dismissed_entity_types text[] not null default '{}',
  configuration jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint search_personalization_profiles_configuration_check check (jsonb_typeof(configuration)='object'),
  constraint search_personalization_profiles_unique unique (organization_id,profile_id)
);

create table if not exists public.search_collections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  description text not null default '',
  visibility text not null default 'private',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_collections_visibility_check check (visibility in ('private','organization')),
  constraint search_collections_status_check check (status in ('active','archived')),
  constraint search_collections_unique unique (organization_id,owner_profile_id,name)
);

create table if not exists public.search_collection_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  search_collection_id uuid not null references public.search_collections(id) on delete restrict,
  search_document_id uuid not null references public.search_documents(id) on delete restrict,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  constraint search_collection_items_position_check check (position>=0),
  constraint search_collection_items_unique unique (search_collection_id,search_document_id)
);

create table if not exists public.search_dashboard_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint search_dashboard_events_metadata_check check (jsonb_typeof(metadata)='object')
);

create or replace function private.populate_search_document_vector()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
begin
  new.search_vector :=
    pg_catalog.setweight(
      pg_catalog.to_tsvector('pg_catalog.simple'::regconfig,pg_catalog.coalesce(new.title,'')),
      'A'
    ) ||
    pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.simple'::regconfig,
        pg_catalog.coalesce(pg_catalog.array_to_string(new.keywords,' '),'')
      ),
      'B'
    ) ||
    pg_catalog.setweight(
      pg_catalog.to_tsvector('pg_catalog.simple'::regconfig,pg_catalog.coalesce(new.summary,'')),
      'C'
    );
  return new;
end
$$;

create or replace function private.populate_search_document_chunk_vector()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
begin
  new.search_vector := pg_catalog.to_tsvector(
    'pg_catalog.simple'::regconfig,
    pg_catalog.coalesce(new.safe_excerpt,'')
  );
  return new;
end
$$;

create trigger search_documents_populate_vector
before insert or update of title,keywords,summary on public.search_documents
for each row execute function private.populate_search_document_vector();

create trigger search_document_chunks_populate_vector
before insert or update of safe_excerpt on public.search_document_chunks
for each row execute function private.populate_search_document_chunk_vector();

create index if not exists search_documents_vector_idx on public.search_documents using gin(search_vector);
create index if not exists search_documents_title_trgm_idx on public.search_documents using gin(title extensions.gin_trgm_ops);
create index if not exists search_documents_scope_idx on public.search_documents(organization_id,audience_scope,entity_type,status,is_active);
create index if not exists search_documents_course_idx on public.search_documents(organization_id,course_id,updated_at desc) where course_id is not null;
create index if not exists search_document_chunks_vector_idx on public.search_document_chunks using gin(search_vector);
create index if not exists search_tag_assignments_document_idx on public.search_tag_assignments(search_document_id,search_tag_id);
create index if not exists search_history_profile_time_idx on public.search_history(profile_id,searched_at desc);
create index if not exists search_history_org_query_idx on public.search_history(organization_id,query_hash,searched_at desc);
create index if not exists search_recent_items_profile_time_idx on public.search_recent_items(profile_id,last_interacted_at desc);
create index if not exists search_click_events_org_time_idx on public.search_click_events(organization_id,occurred_at desc);
create index if not exists search_result_events_org_time_idx on public.search_result_events(organization_id,occurred_at desc);
create index if not exists search_popularity_org_score_idx on public.search_popularity(organization_id,popularity_score desc);
create index if not exists search_recommendation_results_profile_idx on public.search_recommendation_results(profile_id,status,score desc,generated_at desc);

create or replace function private.can_manage_search(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select target_organization_id is not null and (
    private.has_permission(target_organization_id,'search.manage')
    or private.can_administer_organization(target_organization_id)
  )
$$;

create or replace function private.can_read_search_document(
  target_organization_id uuid,
  target_owner_profile_id uuid,
  target_audience_scope text,
  target_required_permission text
)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select auth.uid() is not null and case target_audience_scope
    when 'public_catalog' then target_organization_id is null
    when 'organization' then target_organization_id is not null and private.is_active_org_member(target_organization_id)
    when 'owner' then target_owner_profile_id=auth.uid()
    when 'permission' then target_organization_id is not null and target_required_permission is not null
      and private.has_permission(target_organization_id,target_required_permission)
    else false end
$$;

create or replace function private.valid_search_audience(
  target_entity_type text,
  target_audience_scope text,
  target_owner_profile_id uuid,
  target_required_permission text
)
returns boolean language sql immutable set search_path=pg_catalog as $$
  select case
    when target_entity_type in ('certificate','notification','gradebook','privacy_request')
      then (target_audience_scope='owner' and target_owner_profile_id is not null)
        or (target_audience_scope='permission' and target_required_permission is not null)
    when target_entity_type in ('question','report','governance_control','policy','evidence','audit_finding','risk')
      then target_audience_scope='permission' and target_required_permission is not null
    when target_entity_type='profile_public'
      then target_audience_scope in ('public_catalog','organization')
    else target_audience_scope in ('public_catalog','organization','owner','permission')
  end
$$;

create or replace view public.search_index_status_projection with(security_invoker=true) as
select i.id,i.organization_id,i.module_key,i.name,i.status,i.last_reindexed_at,
  v.id as current_version_id,v.version,v.schema_version,v.source_watermark,
  (select count(*)::integer from public.search_documents d where d.search_index_version_id=v.id and d.is_active) as document_count,
  v.created_at as version_created_at
from public.search_indexes i
left join lateral (
  select x.* from public.search_index_versions x where x.search_index_id=i.id order by x.version desc limit 1
) v on true;

create or replace view public.search_saved_query_projection with(security_invoker=true) as
select id,organization_id,profile_id,name,query_text,filters,sort_key,pinned,status,created_at,updated_at
from public.search_saved_queries where status='active';

create or replace view public.search_trending_projection with(security_invoker=true) as
select d.id as search_document_id,d.organization_id,d.entity_type,d.title,d.summary,d.route_path,
  p.view_count,p.click_count,p.search_count,p.popularity_score,p.calculated_at
from public.search_popularity p join public.search_documents d on d.id=p.search_document_id
where d.is_active and d.status='active';

create or replace view public.search_recommendation_projection with(security_invoker=true) as
select r.id,r.organization_id,r.profile_id,r.search_document_id,r.recommendation_type,r.reason_key,r.score,r.status,r.generated_at,r.expires_at,
  d.entity_type,d.title,d.summary,d.route_path
from public.search_recommendation_results r join public.search_documents d on d.id=r.search_document_id
where d.is_active and r.status='active' and (r.expires_at is null or r.expires_at>now());

create or replace view public.search_document_access_projection with(security_invoker=true) as
select d.id,d.organization_id,d.entity_type,d.entity_id,d.locale,d.category_id,d.title,d.summary,d.route_path,d.status,d.published_at,d.updated_at,
  coalesce(array_agg(t.label order by t.label) filter(where t.id is not null),'{}') as tags
from public.search_documents d
left join public.search_tag_assignments a on a.search_document_id=d.id
left join public.search_tags t on t.id=a.search_tag_id
where d.is_active
group by d.id;

create or replace view public.search_reporting_metrics with(security_invoker=true) as
select h.organization_id,date_trunc('day',h.searched_at) as activity_day,
  count(distinct h.id)::integer as search_volume,
  count(distinct h.id) filter(where h.result_count=0)::integer as no_result_searches,
  count(distinct h.profile_id)::integer as searching_users,
  coalesce(avg(h.latency_ms),0)::numeric(12,2) as average_latency_ms,
  count(distinct c.id)::integer as clicks,
  count(distinct c.id)::numeric/nullif(count(distinct h.id),0) as click_through_rate
from public.search_history h left join public.search_click_events c on c.search_history_id=h.id
group by h.organization_id,date_trunc('day',h.searched_at);

create or replace function public.index_document(
  p_organization_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_title text,
  p_summary text,
  p_route_path text,
  p_source_version text,
  p_content_hash text,
  p_audience_scope text,
  p_owner_profile_id uuid default null,
  p_required_permission text default null,
  p_status text default 'active',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  index_id uuid;
  version_id uuid;
  document_id uuid;
begin
  if not ((p_organization_id is null and private.can_platform_admin()) or private.can_manage_search(p_organization_id)) then
    raise exception 'search indexing denied' using errcode='42501';
  end if;
  if (p_audience_scope='public_catalog' and p_organization_id is not null)
    or (p_audience_scope<>'public_catalog' and p_organization_id is null)
    or not private.valid_search_audience(p_entity_type,p_audience_scope,p_owner_profile_id,p_required_permission)
    or (p_required_permission is not null and not exists(select 1 from public.permissions where key=p_required_permission)) then
    raise exception 'invalid search audience' using errcode='22023';
  end if;
  insert into public.search_indexes(organization_id,module_key,name,created_by)
  values(p_organization_id,p_module_key,initcap(replace(p_module_key,'_',' ')),auth.uid())
  on conflict(organization_id,module_key) do update set status='active',updated_at=now()
  returning id into index_id;
  select id into version_id from public.search_index_versions
  where search_index_id=index_id order by version desc limit 1;
  if version_id is null then
    insert into public.search_index_versions(search_index_id,version,content_hash,created_by)
    values(index_id,1,encode(extensions.digest(p_module_key||':1','sha256'),'hex'),auth.uid())
    returning id into version_id;
  end if;
  insert into public.search_documents(
    search_index_version_id,organization_id,entity_type,entity_id,audience_scope,owner_profile_id,
    required_permission,title,summary,route_path,status,source_version,content_hash,metadata
  ) values(
    version_id,p_organization_id,p_entity_type,p_entity_id,p_audience_scope,p_owner_profile_id,
    p_required_permission,btrim(p_title),btrim(p_summary),p_route_path,p_status,p_source_version,p_content_hash,p_metadata
  )
  on conflict on constraint search_documents_unique do update set
    search_index_version_id=excluded.search_index_version_id,
    title=excluded.title,summary=excluded.summary,route_path=excluded.route_path,status=excluded.status,
    source_version=excluded.source_version,content_hash=excluded.content_hash,metadata=excluded.metadata,
    indexed_at=now(),updated_at=now(),is_active=true
  returning id into document_id;
  return document_id;
end $$;

create or replace function public.reindex_module(p_organization_id uuid,p_module_key text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare index_id uuid; next_version integer; version_id uuid;
begin
  if not ((p_organization_id is null and private.can_platform_admin()) or private.can_manage_search(p_organization_id)) then
    raise exception 'search reindex denied' using errcode='42501';
  end if;
  insert into public.search_indexes(organization_id,module_key,name,status,last_reindexed_at,created_by)
  values(p_organization_id,p_module_key,initcap(replace(p_module_key,'_',' ')),'rebuilding',now(),auth.uid())
  on conflict(organization_id,module_key) do update set status='rebuilding',last_reindexed_at=now(),updated_at=now()
  returning id into index_id;
  select coalesce(max(version),0)+1 into next_version from public.search_index_versions where search_index_id=index_id;
  insert into public.search_index_versions(search_index_id,version,status,content_hash,created_by)
  values(index_id,next_version,'building',encode(extensions.digest(index_id::text||':'||next_version::text,'sha256'),'hex'),auth.uid())
  returning id into version_id;
  return version_id;
end $$;

create or replace function public.remove_from_index(p_search_document_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
  update public.search_documents set is_active=false,status='removed',updated_at=now()
  where id=p_search_document_id
    and ((organization_id is null and private.can_platform_admin()) or private.can_manage_search(organization_id));
  if not found then raise exception 'search removal denied' using errcode='42501'; end if;
end $$;

create or replace function public.search_content(
  p_query text,
  p_filters jsonb default '{}'::jsonb,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table(
  document_id uuid,entity_type text,entity_id uuid,title text,safe_snippet text,route_path text,
  status text,category text,tags text[],rank_score numeric,published_at timestamptz,updated_at timestamptz
)
language plpgsql stable security definer set search_path=pg_catalog as $$
declare expanded_query text; query_terms tsquery;
begin
  if auth.uid() is null or length(btrim(p_query))<2 or length(p_query)>200
    or jsonb_typeof(p_filters)<>'object' or p_sort not in('relevance','recent','popular','title')
    or p_limit not between 1 and 100 or p_offset not between 0 and 500 then
    raise exception 'invalid search request' using errcode='22023';
  end if;
  select btrim(p_query)||coalesce(' '||string_agg(array_to_string(s.synonyms,' '),' '),'') into expanded_query
  from public.search_synonyms s
  where s.status='active' and lower(s.term)=lower(btrim(p_query))
    and (s.organization_id is null or private.is_active_org_member(s.organization_id));
  query_terms:=websearch_to_tsquery('simple',expanded_query);
  return query
  with candidates as (
    select d.*,c.label as category_label,
      coalesce(array_agg(t.label order by t.label) filter(where t.id is not null),'{}') as tag_labels,
      (ts_rank_cd(d.search_vector,query_terms)*10
       + extensions.similarity(lower(d.title),lower(btrim(p_query)))*4
       + coalesce(max(b.boost) filter(where b.status='active' and (b.starts_at is null or b.starts_at<=now()) and (b.ends_at is null or b.ends_at>=now())),1)
       + ln(1+coalesce(p.popularity_score,0)))::numeric as score,
      coalesce(p.popularity_score,0) as popularity
    from public.search_documents d
    left join public.search_categories c on c.id=d.category_id
    left join public.search_tag_assignments a on a.search_document_id=d.id
    left join public.search_tags t on t.id=a.search_tag_id
    left join public.search_popularity p on p.search_document_id=d.id
    left join public.search_boost_rules b on (b.organization_id=d.organization_id or b.organization_id is null)
      and (b.entity_type is null or b.entity_type=d.entity_type)
      and (b.category_id is null or b.category_id=d.category_id)
    where d.is_active and d.status<>'removed'
      and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)
      and (d.search_vector@@query_terms or d.title operator(extensions.%) btrim(p_query))
      and (not (p_filters ? 'entityTypes') or d.entity_type in (select jsonb_array_elements_text(p_filters->'entityTypes')))
      and (not (p_filters ? 'categoryId') or d.category_id=(p_filters->>'categoryId')::uuid)
      and (not (p_filters ? 'status') or d.status=p_filters->>'status')
      and (not (p_filters ? 'authorId') or d.author_profile_id=(p_filters->>'authorId')::uuid)
      and (not (p_filters ? 'courseId') or d.course_id=(p_filters->>'courseId')::uuid)
      and (not (p_filters ? 'fromDate') or d.updated_at>=(p_filters->>'fromDate')::timestamptz)
      and (not (p_filters ? 'toDate') or d.updated_at<=(p_filters->>'toDate')::timestamptz)
      and (not (p_filters ? 'tags') or exists(
        select 1 from public.search_tag_assignments ta join public.search_tags st on st.id=ta.search_tag_id
        where ta.search_document_id=d.id and st.key in(select jsonb_array_elements_text(p_filters->'tags'))
      ))
    group by d.id,c.label,p.popularity_score
  )
  select x.id,x.entity_type,x.entity_id,x.title,left(x.summary,320),x.route_path,x.status,x.category_label,x.tag_labels,x.score,x.published_at,x.updated_at
  from candidates x
  order by
    case when p_sort='recent' then extract(epoch from x.updated_at) end desc nulls last,
    case when p_sort='popular' then x.popularity end desc nulls last,
    case when p_sort='title' then lower(x.title) end asc nulls last,
    x.score desc,x.entity_type,x.entity_id
  limit p_limit offset p_offset;
end $$;

create or replace function public.search_autocomplete(p_prefix text,p_limit integer default 8)
returns table(suggestion text,suggestion_type text,entity_type text,route_path text)
language sql stable security definer set search_path=pg_catalog as $$
  with suggestions as (
    select d.title as suggestion,'document'::text as suggestion_type,d.entity_type,d.route_path,1 as priority
    from public.search_documents d
    where d.is_active and length(btrim(p_prefix))>=2 and lower(d.title) like lower(btrim(p_prefix))||'%'
      and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)
    union all
    select s.term,'synonym',null::text,null::text,2
    from public.search_synonyms s
    where s.status='active' and lower(s.term) like lower(btrim(p_prefix))||'%'
      and (s.organization_id is null or private.is_active_org_member(s.organization_id))
  )
  select suggestion,suggestion_type,entity_type,route_path from suggestions
  order by priority,lower(suggestion) limit least(greatest(p_limit,1),20)
$$;

create or replace function public.record_search(
  p_organization_id uuid,p_query text,p_filters jsonb,p_result_count integer,p_latency_ms integer default null
)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare history_id uuid;
begin
  if auth.uid() is null or not private.is_active_org_member(p_organization_id) or length(btrim(p_query))<2
    or p_result_count<0 or (p_latency_ms is not null and p_latency_ms<0) then
    raise exception 'search recording denied' using errcode='42501';
  end if;
  insert into public.search_history(organization_id,profile_id,query_text,query_hash,filters,result_count,latency_ms)
  values(p_organization_id,auth.uid(),left(btrim(p_query),200),encode(extensions.digest(lower(btrim(p_query)),'sha256'),'hex'),p_filters,p_result_count,p_latency_ms)
  returning id into history_id;
  insert into public.search_result_events(organization_id,profile_id,search_history_id,result_count,no_results,latency_ms)
  values(p_organization_id,auth.uid(),history_id,p_result_count,p_result_count=0,p_latency_ms);
  return history_id;
end $$;

create or replace function public.record_click(p_search_history_id uuid,p_search_document_id uuid,p_result_position integer default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare org_id uuid; click_id uuid;
begin
  select h.organization_id into org_id from public.search_history h
  where h.id=p_search_history_id and h.profile_id=auth.uid();
  if org_id is null or not exists(
    select 1 from public.search_documents d where d.id=p_search_document_id
      and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)
  ) then raise exception 'search click denied' using errcode='42501'; end if;
  insert into public.search_click_events(organization_id,profile_id,search_history_id,search_document_id,result_position)
  values(org_id,auth.uid(),p_search_history_id,p_search_document_id,p_result_position) returning id into click_id;
  insert into public.search_recent_items(organization_id,profile_id,search_document_id,interaction_type)
  values(org_id,auth.uid(),p_search_document_id,'open')
  on conflict(profile_id,search_document_id,interaction_type) do update set interaction_count=search_recent_items.interaction_count+1,last_interacted_at=now();
  insert into public.search_popularity(organization_id,search_document_id,click_count,popularity_score)
  values(org_id,p_search_document_id,1,1)
  on conflict(search_document_id) do update set click_count=search_popularity.click_count+1,popularity_score=search_popularity.popularity_score+1,calculated_at=now();
  return click_id;
end $$;

create or replace function public.save_search(
  p_organization_id uuid,p_name text,p_query text,p_filters jsonb default '{}'::jsonb,p_sort text default 'relevance'
)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare saved_id uuid;
begin
  if auth.uid() is null or not private.is_active_org_member(p_organization_id) then raise exception 'save search denied' using errcode='42501'; end if;
  insert into public.search_saved_queries(organization_id,profile_id,name,query_text,filters,sort_key)
  values(p_organization_id,auth.uid(),btrim(p_name),left(btrim(p_query),200),p_filters,p_sort)
  on conflict(organization_id,profile_id,name) do update set query_text=excluded.query_text,filters=excluded.filters,sort_key=excluded.sort_key,status='active',updated_at=now()
  returning id into saved_id;
  return saved_id;
end $$;

create or replace function public.delete_saved_search(p_saved_search_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
  update public.search_saved_queries set status='archived',pinned=false,updated_at=now()
  where id=p_saved_search_id and profile_id=auth.uid();
  if not found then raise exception 'saved search denied' using errcode='42501'; end if;
end $$;

create or replace function public.pin_search(p_saved_search_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin update public.search_saved_queries set pinned=true,updated_at=now() where id=p_saved_search_id and profile_id=auth.uid() and status='active'; if not found then raise exception 'saved search denied' using errcode='42501'; end if; end $$;

create or replace function public.unpin_search(p_saved_search_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin update public.search_saved_queries set pinned=false,updated_at=now() where id=p_saved_search_id and profile_id=auth.uid() and status='active'; if not found then raise exception 'saved search denied' using errcode='42501'; end if; end $$;

create or replace function public.record_recent_item(p_organization_id uuid,p_search_document_id uuid,p_interaction_type text default 'view')
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare document_org_id uuid; recent_id uuid;
begin
  if not private.is_active_org_member(p_organization_id) then raise exception 'recent item denied' using errcode='42501'; end if;
  select organization_id into document_org_id from public.search_documents d where d.id=p_search_document_id
    and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission);
  if not found or (document_org_id is not null and document_org_id<>p_organization_id) then raise exception 'recent item denied' using errcode='42501'; end if;
  insert into public.search_recent_items(organization_id,profile_id,search_document_id,interaction_type)
  values(p_organization_id,auth.uid(),p_search_document_id,p_interaction_type)
  on conflict(profile_id,search_document_id,interaction_type) do update set interaction_count=search_recent_items.interaction_count+1,last_interacted_at=now()
  returning id into recent_id;
  return recent_id;
end $$;

create or replace function public.record_recommendation_event(p_recommendation_result_id uuid,p_event_type text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare org_id uuid; event_id uuid;
begin
  update public.search_recommendation_results set last_event=p_event_type,last_event_at=now(),
    status=case when p_event_type='dismissed' then 'dismissed' when p_event_type='opened' then 'opened' when p_event_type='completed' then 'completed' else status end
  where id=p_recommendation_result_id and profile_id=auth.uid() returning organization_id into org_id;
  if org_id is null then raise exception 'recommendation event denied' using errcode='42501'; end if;
  insert into public.search_dashboard_events(organization_id,actor_profile_id,event_type,metadata)
  values(org_id,auth.uid(),'recommendation.'||p_event_type,jsonb_build_object('recommendationResultId',p_recommendation_result_id)) returning id into event_id;
  return event_id;
end $$;

create or replace function public.update_popularity(p_search_document_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare org_id uuid;
begin
  select organization_id into org_id from public.search_documents where id=p_search_document_id;
  if not ((org_id is null and private.can_platform_admin()) or private.can_manage_search(org_id)) then raise exception 'popularity update denied' using errcode='42501'; end if;
  insert into public.search_popularity(organization_id,search_document_id,view_count,click_count,search_count,popularity_score)
  select org_id,p_search_document_id,
    (select count(*) from public.search_recent_items where search_document_id=p_search_document_id),
    (select count(*) from public.search_click_events where search_document_id=p_search_document_id),0,
    (select count(*)*0.25 from public.search_recent_items where search_document_id=p_search_document_id)
      +(select count(*) from public.search_click_events where search_document_id=p_search_document_id)
  on conflict(search_document_id) do update set view_count=excluded.view_count,click_count=excluded.click_count,popularity_score=excluded.popularity_score,calculated_at=now();
end $$;

create or replace function public.refresh_recommendations(p_organization_id uuid)
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare refreshed integer;
begin
  if auth.uid() is null or not private.is_active_org_member(p_organization_id) then raise exception 'recommendation refresh denied' using errcode='42501'; end if;
  update public.search_recommendation_results set status='expired'
  where profile_id=auth.uid() and status='active' and expires_at is not null and expires_at<=now();
  insert into public.search_recommendation_results(
    organization_id,profile_id,recommendation_rule_id,search_document_id,recommendation_type,reason_key,score,expires_at
  )
  select p_organization_id,auth.uid(),null,d.id,
    case
      when r.interaction_type='continue' and d.entity_type in('course','lesson') then 'continue_learning'
      when d.entity_type='assignment' then 'pending_assignment'
      when d.entity_type='assessment' then 'upcoming_assessment'
      when d.entity_type='certificate' then 'recommended_certificate'
      when coalesce(r.interaction_count,0)>=3 then 'frequently_viewed'
      else 'popular_learning' end,
    case when r.id is not null then 'recent_activity' else 'organization_popularity' end,
    coalesce(p.popularity_score,0)+coalesce(r.interaction_count,0)*2+
      case when d.updated_at>now()-interval '30 days' then 3 else 0 end,
    now()+interval '7 days'
  from public.search_documents d
  left join public.search_recent_items r on r.search_document_id=d.id and r.profile_id=auth.uid()
  left join public.search_popularity p on p.search_document_id=d.id
  where d.is_active and (d.organization_id=p_organization_id or d.organization_id is null)
    and d.entity_type in('course','lesson','assignment','assessment','certificate','learning_path')
    and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)
  order by coalesce(r.last_interacted_at,d.updated_at) desc,coalesce(p.popularity_score,0) desc
  limit 24
  on conflict(profile_id,search_document_id,recommendation_rule_id,recommendation_type) do update set
    reason_key=excluded.reason_key,score=excluded.score,status='active',generated_at=now(),expires_at=excluded.expires_at;
  get diagnostics refreshed=row_count;
  return refreshed;
end $$;

create or replace function public.record_search_dashboard_event(p_organization_id uuid,p_event_type text,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare event_id uuid;
begin
  if not private.can_manage_search(p_organization_id) then raise exception 'search dashboard event denied' using errcode='42501'; end if;
  insert into public.search_dashboard_events(organization_id,actor_profile_id,event_type,metadata)
  values(p_organization_id,auth.uid(),p_event_type,p_metadata) returning id into event_id;
  return event_id;
end $$;

create or replace function public.save_search_synonym(p_organization_id uuid,p_term text,p_synonyms text[],p_locale text default 'en-IN')
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare synonym_id uuid;
begin
  if not private.can_manage_search(p_organization_id) then raise exception 'search synonym denied' using errcode='42501'; end if;
  insert into public.search_synonyms(organization_id,term,synonyms,locale,created_by)
  values(p_organization_id,lower(btrim(p_term)),p_synonyms,p_locale,auth.uid())
  on conflict(organization_id,locale,term) do update set synonyms=excluded.synonyms,status='active',updated_at=now()
  returning id into synonym_id;
  return synonym_id;
end $$;

create or replace function public.save_search_boost_rule(p_organization_id uuid,p_name text,p_entity_type text,p_boost numeric,p_condition jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare rule_id uuid;
begin
  if not private.can_manage_search(p_organization_id) then raise exception 'search boost denied' using errcode='42501'; end if;
  insert into public.search_boost_rules(organization_id,name,entity_type,boost,condition,created_by)
  values(p_organization_id,btrim(p_name),nullif(p_entity_type,''),p_boost,p_condition,auth.uid()) returning id into rule_id;
  return rule_id;
end $$;

create or replace function public.save_recommendation_rule(
  p_organization_id uuid,p_key text,p_name text,p_recommendation_type text,p_priority integer,p_conditions jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare rule_id uuid;
begin
  if not private.can_manage_search(p_organization_id) then raise exception 'recommendation rule denied' using errcode='42501'; end if;
  insert into public.search_recommendation_rules(organization_id,key,name,recommendation_type,priority,conditions,created_by)
  values(p_organization_id,p_key,p_name,p_recommendation_type,p_priority,p_conditions,auth.uid())
  on conflict(organization_id,key) do update set name=excluded.name,recommendation_type=excluded.recommendation_type,priority=excluded.priority,conditions=excluded.conditions,status='active',updated_at=now()
  returning id into rule_id;
  return rule_id;
end $$;

create or replace function private.reject_search_event_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'search evidence is immutable'; end $$;
create or replace function private.reject_search_index_version_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'search index versions are immutable'; end $$;
create trigger search_index_versions_immutable before update or delete on public.search_index_versions for each row execute function private.reject_search_index_version_mutation();
do $$ declare table_name text; begin foreach table_name in array array['search_history','search_click_events','search_result_events','search_dashboard_events'] loop
  execute format('create trigger %I before update or delete on public.%I for each row execute function private.reject_search_event_mutation()',table_name||'_immutable',table_name);
end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'search_indexes','search_index_versions','search_documents','search_document_chunks','search_categories','search_tags','search_tag_assignments',
  'search_synonyms','search_boost_rules','search_filters','search_saved_queries','search_history','search_recent_items','search_click_events',
  'search_result_events','search_popularity','search_recommendation_rules','search_recommendation_results','search_personalization_profiles',
  'search_collections','search_collection_items','search_dashboard_events'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from anon,authenticated',table_name);
end loop; end $$;

create policy search_indexes_admin_select on public.search_indexes for select to authenticated using((organization_id is null and private.can_platform_admin()) or private.can_manage_search(organization_id));
create policy search_index_versions_admin_select on public.search_index_versions for select to authenticated using(exists(select 1 from public.search_indexes i where i.id=search_index_id and ((i.organization_id is null and private.can_platform_admin()) or private.can_manage_search(i.organization_id))));
create policy search_documents_authorized_select on public.search_documents for select to authenticated using(private.can_read_search_document(organization_id,owner_profile_id,audience_scope,required_permission));
create policy search_document_chunks_authorized_select on public.search_document_chunks for select to authenticated using(exists(select 1 from public.search_documents d where d.id=search_document_id and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)));
create policy search_categories_member_select on public.search_categories for select to authenticated using((organization_id is null) or private.is_active_org_member(organization_id));
create policy search_tags_member_select on public.search_tags for select to authenticated using((organization_id is null) or private.is_active_org_member(organization_id));
create policy search_tag_assignments_authorized_select on public.search_tag_assignments for select to authenticated using(exists(select 1 from public.search_documents d where d.id=search_document_id and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)));
create policy search_synonyms_member_select on public.search_synonyms for select to authenticated using((organization_id is null) or private.is_active_org_member(organization_id));
create policy search_boost_rules_member_select on public.search_boost_rules for select to authenticated using(status='active' and ((organization_id is null) or private.is_active_org_member(organization_id)));
create policy search_filters_member_select on public.search_filters for select to authenticated using((organization_id is null) or private.is_active_org_member(organization_id));
create policy search_saved_queries_owner_select on public.search_saved_queries for select to authenticated using(profile_id=auth.uid());
create policy search_history_owner_select on public.search_history for select to authenticated using(profile_id=auth.uid());
create policy search_recent_items_owner_select on public.search_recent_items for select to authenticated using(profile_id=auth.uid());
create policy search_click_events_owner_select on public.search_click_events for select to authenticated using(profile_id=auth.uid());
create policy search_result_events_owner_select on public.search_result_events for select to authenticated using(profile_id=auth.uid());
create policy search_popularity_authorized_select on public.search_popularity for select to authenticated using(exists(select 1 from public.search_documents d where d.id=search_document_id and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)));
create policy search_recommendation_rules_member_select on public.search_recommendation_rules for select to authenticated using(status='active' and ((organization_id is null) or private.is_active_org_member(organization_id)));
create policy search_recommendation_results_owner_select on public.search_recommendation_results for select to authenticated using(profile_id=auth.uid() and exists(select 1 from public.search_documents d where d.id=search_document_id and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)));
create policy search_personalization_profiles_owner_select on public.search_personalization_profiles for select to authenticated using(profile_id=auth.uid());
create policy search_collections_context_select on public.search_collections for select to authenticated using(owner_profile_id=auth.uid() or (visibility='organization' and private.is_active_org_member(organization_id)));
create policy search_collection_items_context_select on public.search_collection_items for select to authenticated using(exists(select 1 from public.search_collections c where c.id=search_collection_id and (c.owner_profile_id=auth.uid() or (c.visibility='organization' and private.is_active_org_member(c.organization_id)))) and exists(select 1 from public.search_documents d where d.id=search_document_id and private.can_read_search_document(d.organization_id,d.owner_profile_id,d.audience_scope,d.required_permission)));
create policy search_dashboard_events_admin_select on public.search_dashboard_events for select to authenticated using(private.can_manage_search(organization_id));

grant select on public.search_indexes,public.search_index_versions,public.search_documents,public.search_document_chunks,public.search_categories,public.search_tags,public.search_tag_assignments,public.search_synonyms,public.search_boost_rules,public.search_filters,public.search_saved_queries,public.search_history,public.search_recent_items,public.search_click_events,public.search_result_events,public.search_popularity,public.search_recommendation_rules,public.search_recommendation_results,public.search_personalization_profiles,public.search_collections,public.search_collection_items,public.search_dashboard_events to authenticated;
grant select on public.search_index_status_projection,public.search_saved_query_projection,public.search_trending_projection,public.search_recommendation_projection,public.search_document_access_projection,public.search_reporting_metrics to authenticated;
revoke all on function private.can_manage_search(uuid) from public;
revoke all on function private.can_read_search_document(uuid,uuid,text,text) from public;
revoke all on function private.valid_search_audience(text,text,uuid,text) from public;
grant execute on function private.can_manage_search(uuid) to authenticated;
grant execute on function private.can_read_search_document(uuid,uuid,text,text) to authenticated;

do $$ declare signature text; begin foreach signature in array array[
  'index_document(uuid,text,text,uuid,text,text,text,text,text,text,uuid,text,text,jsonb)',
  'reindex_module(uuid,text)','remove_from_index(uuid)','search_content(text,jsonb,text,integer,integer)',
  'search_autocomplete(text,integer)','record_search(uuid,text,jsonb,integer,integer)','record_click(uuid,uuid,integer)',
  'save_search(uuid,text,text,jsonb,text)','delete_saved_search(uuid)','pin_search(uuid)','unpin_search(uuid)',
  'record_recent_item(uuid,uuid,text)','record_recommendation_event(uuid,text)','update_popularity(uuid)',
  'refresh_recommendations(uuid)','record_search_dashboard_event(uuid,text,jsonb)',
  'save_search_synonym(uuid,text,text[],text)','save_search_boost_rule(uuid,text,text,numeric,jsonb)',
  'save_recommendation_rule(uuid,text,text,text,integer,jsonb)'
] loop
  execute format('revoke all on function public.%s from public',signature);
  execute format('grant execute on function public.%s to authenticated',signature);
end loop; end $$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions(key,description,risk_level) values
 ('search.manage','Manage organization search indexes, ranking, synonyms and recommendations','high'),
 ('search.analytics.read','Read organization search analytics and discovery performance','medium')
on conflict(key) do update set description=excluded.description,risk_level=excluded.risk_level;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.organization_id is null
and r.key in('organization_admin','enterprise_admin','platform_admin','super_admin')
and p.key in('search.manage','search.analytics.read') on conflict do nothing;
-- SYRA-REFERENCE-DATA-END
