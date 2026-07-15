-- SYRA-CONTRACT: docs/21-master-database-contract.md; docs/23-master-table-catalog.md; docs/24-database-relationship-map.md; docs/28-database-security-matrix.md; docs/29-database-performance-strategy.md
-- SYRA-ADR: ADR-020
-- SYRA-CHANGE: additive
-- SYRA-PII: P3
-- SYRA-PII-NOTES: messages, posts, office-hour notes, attendance and meeting metadata are tenant-scoped; provider credentials are prohibited
-- SYRA-RLS: S2/S4/S6/S8 forced RLS, membership and role authorization, no public access
-- SYRA-IMMUTABLE: revisions, reads, attendance, recordings, moderation and communication events are append-only
-- SYRA-SEED: deployment-reference

create table public.community_spaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  cohort_id uuid references public.cohorts(id) on delete restrict,
  name text not null,
  slug text not null,
  description text not null default '',
  space_type text not null default 'organization',
  visibility text not null default 'organization',
  status text not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_spaces_slug_check check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint community_spaces_type_check check(space_type in('organization','course','cohort','study_group')),
  constraint community_spaces_visibility_check check(visibility in('private','members','organization')),
  constraint community_spaces_status_check check(status in('active','archived')),
  constraint community_spaces_scope_check check((space_type='course')=(course_id is not null) and (space_type='cohort')=(cohort_id is not null)),
  constraint community_spaces_org_slug_unique unique(organization_id,slug)
);

create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  space_id uuid not null references public.community_spaces(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  muted_until timestamptz,
  last_seen_at timestamptz,
  constraint community_members_role_check check(role in('member','mentor','moderator','owner')),
  constraint community_members_status_check check(status in('invited','active','left','removed')),
  constraint community_members_unique unique(space_id,profile_id)
);

create table public.community_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  blocker_profile_id uuid not null references public.profiles(id) on delete restrict,
  blocked_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  constraint community_blocks_distinct_check check(blocker_profile_id<>blocked_profile_id),
  constraint community_blocks_unique unique(organization_id,blocker_profile_id,blocked_profile_id)
);

create table public.discussion_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  space_id uuid not null references public.community_spaces(id) on delete restrict,
  name text not null,
  slug text not null,
  description text not null default '',
  sort_order integer not null default 100,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discussion_categories_slug_check check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint discussion_categories_sort_check check(sort_order>=0),
  constraint discussion_categories_unique unique(space_id,slug)
);

create table public.discussion_topics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  space_id uuid not null references public.community_spaces(id) on delete restrict,
  category_id uuid references public.discussion_categories(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  slug text not null,
  status text not null default 'open',
  is_pinned boolean not null default false,
  solved_post_id uuid,
  post_count integer not null default 0,
  last_post_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discussion_topics_slug_check check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint discussion_topics_status_check check(status in('open','locked','archived','moderated')),
  constraint discussion_topics_count_check check(post_count>=0),
  constraint discussion_topics_unique unique(space_id,slug)
);

create table public.discussion_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  topic_id uuid not null references public.discussion_topics(id) on delete restrict,
  parent_post_id uuid references public.discussion_posts(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  body_format text not null default 'markdown',
  body_hash text not null,
  status text not null default 'published',
  is_solution boolean not null default false,
  mentioned_profile_ids uuid[] not null default '{}',
  hashtags text[] not null default '{}',
  attachment_metadata jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint discussion_posts_body_check check(length(body) between 1 and 50000),
  constraint discussion_posts_format_check check(body_format in('markdown','rich_text')),
  constraint discussion_posts_hash_check check(body_hash ~ '^[a-f0-9]{64}$'),
  constraint discussion_posts_status_check check(status in('published','edited','deleted','moderated')),
  constraint discussion_posts_attachments_check check(jsonb_typeof(attachment_metadata)='array')
);
alter table public.discussion_topics add constraint discussion_topics_solution_fk foreign key(solved_post_id) references public.discussion_posts(id) on delete restrict;

create table public.discussion_post_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  post_id uuid not null references public.discussion_posts(id) on delete restrict,
  editor_profile_id uuid not null references public.profiles(id) on delete restrict,
  revision_number integer not null,
  previous_body text not null,
  previous_body_hash text not null,
  change_reason text,
  created_at timestamptz not null default now(),
  constraint discussion_post_revisions_number_check check(revision_number>0),
  constraint discussion_post_revisions_hash_check check(previous_body_hash ~ '^[a-f0-9]{64}$'),
  constraint discussion_post_revisions_unique unique(post_id,revision_number)
);

create table public.discussion_reactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  post_id uuid not null references public.discussion_posts(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  reaction text not null,
  created_at timestamptz not null default now(),
  constraint discussion_reactions_value_check check(reaction in('like','helpful','celebrate','insightful','support')),
  constraint discussion_reactions_unique unique(post_id,profile_id,reaction)
);

create table public.discussion_bookmarks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  topic_id uuid not null references public.discussion_topics(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint discussion_bookmarks_unique unique(topic_id,profile_id)
);

create table public.discussion_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  topic_id uuid references public.discussion_topics(id) on delete restrict,
  post_id uuid references public.discussion_posts(id) on delete restrict,
  reporter_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  details text,
  status text not null default 'open',
  assigned_moderator_id uuid references public.profiles(id) on delete restrict,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint discussion_reports_target_check check((topic_id is not null)::integer+(post_id is not null)::integer=1),
  constraint discussion_reports_reason_check check(reason in('spam','harassment','privacy','unsafe','off_topic','other')),
  constraint discussion_reports_status_check check(status in('open','reviewing','resolved','dismissed'))
);

create table public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  space_id uuid references public.community_spaces(id) on delete restrict,
  channel_type text not null,
  name text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint chat_channels_type_check check(channel_type in('direct','group','course','mentor','organization')),
  constraint chat_channels_status_check check(status in('active','archived','locked'))
);

create table public.chat_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  channel_id uuid not null references public.chat_channels(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  member_role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_until timestamptz,
  archived_at timestamptz,
  constraint chat_members_role_check check(member_role in('member','moderator','owner')),
  constraint chat_members_status_check check(status in('active','left','removed')),
  constraint chat_members_unique unique(channel_id,profile_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  channel_id uuid not null references public.chat_channels(id) on delete restrict,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  parent_message_id uuid references public.chat_messages(id) on delete restrict,
  body text not null,
  body_format text not null default 'markdown',
  status text not null default 'sent',
  is_pinned boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint chat_messages_body_check check(length(body) between 1 and 50000),
  constraint chat_messages_format_check check(body_format in('markdown','rich_text')),
  constraint chat_messages_status_check check(status in('sent','edited','deleted','moderated')),
  constraint chat_messages_metadata_check check(jsonb_typeof(metadata)='object')
);

create table public.chat_message_reads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  message_id uuid not null references public.chat_messages(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  read_at timestamptz not null default now(),
  constraint chat_message_reads_unique unique(message_id,profile_id)
);

create table public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  message_id uuid not null references public.chat_messages(id) on delete restrict,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text not null,
  quarantine_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint chat_attachments_size_check check(size_bytes between 1 and 52428800),
  constraint chat_attachments_hash_check check(checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint chat_attachments_quarantine_check check(quarantine_status in('pending','clean','quarantined','rejected')),
  constraint chat_attachments_path_unique unique(storage_bucket,storage_path)
);

create table public.chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  message_id uuid not null references public.chat_messages(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint chat_message_reactions_emoji_check check(length(emoji) between 1 and 16),
  constraint chat_message_reactions_unique unique(message_id,profile_id,emoji)
);

create table public.meeting_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider text not null,
  account_label text not null,
  external_account_reference text,
  region text,
  status text not null default 'unconfigured',
  capabilities jsonb not null default '{}'::jsonb,
  configured_by uuid references public.profiles(id) on delete restrict,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_provider_accounts_provider_check check(provider in('zoom','google_meet','microsoft_teams','bigbluebutton')),
  constraint meeting_provider_accounts_status_check check(status in('unconfigured','configured','degraded','disabled')),
  constraint meeting_provider_accounts_capabilities_check check(jsonb_typeof(capabilities)='object'),
  constraint meeting_provider_accounts_unique unique(organization_id,provider,account_label)
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  space_id uuid references public.community_spaces(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  provider_account_id uuid references public.meeting_provider_accounts(id) on delete restrict,
  title text not null,
  description text not null default '',
  provider text not null,
  provider_meeting_reference text,
  join_reference text,
  status text not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 100,
  waiting_room_enabled boolean not null default true,
  recording_allowed boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_sessions_provider_check check(provider in('zoom','google_meet','microsoft_teams','bigbluebutton')),
  constraint live_sessions_status_check check(status in('scheduled','waiting','live','ended','cancelled')),
  constraint live_sessions_dates_check check(ends_at>starts_at),
  constraint live_sessions_capacity_check check(capacity between 1 and 10000),
  constraint live_sessions_metadata_check check(jsonb_typeof(metadata)='object')
);

create table public.live_session_hosts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  host_role text not null default 'cohost', created_at timestamptz not null default now(),
  constraint live_session_hosts_role_check check(host_role in('host','cohost','moderator')), constraint live_session_hosts_unique unique(live_session_id,profile_id)
);

create table public.live_session_participants (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'registered', admitted_at timestamptz, joined_at timestamptz, left_at timestamptz, raised_hand_at timestamptz, created_at timestamptz not null default now(),
  constraint live_session_participants_status_check check(status in('registered','waiting','admitted','attended','left','removed','cancelled')),
  constraint live_session_participants_dates_check check(left_at is null or joined_at is null or left_at>=joined_at), constraint live_session_participants_unique unique(live_session_id,profile_id)
);

create table public.live_session_recordings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, storage_bucket text not null, storage_path text not null,
  duration_seconds integer not null default 0, size_bytes bigint, checksum_sha256 text, status text not null default 'processing', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), constraint live_session_recordings_duration_check check(duration_seconds>=0),
  constraint live_session_recordings_size_check check(size_bytes is null or size_bytes>0), constraint live_session_recordings_status_check check(status in('processing','available','quarantined','unavailable')),
  constraint live_session_recordings_path_unique unique(storage_bucket,storage_path)
);

create table public.live_session_chat (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null, body_format text not null default 'markdown', status text not null default 'published', sent_at timestamptz not null default now(),
  constraint live_session_chat_body_check check(length(body) between 1 and 10000), constraint live_session_chat_format_check check(body_format in('markdown','plain')),
  constraint live_session_chat_status_check check(status in('published','deleted','moderated'))
);

create table public.live_session_questions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, asked_by uuid not null references public.profiles(id) on delete restrict,
  question text not null, status text not null default 'open', upvote_count integer not null default 0, answer text, answered_by uuid references public.profiles(id) on delete restrict,
  answered_at timestamptz, created_at timestamptz not null default now(), constraint live_session_questions_status_check check(status in('open','answered','dismissed','moderated')),
  constraint live_session_questions_upvote_check check(upvote_count>=0)
);

create table public.live_session_polls (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, created_by uuid not null references public.profiles(id) on delete restrict,
  question text not null, options jsonb not null, allows_multiple boolean not null default false, is_anonymous boolean not null default false,
  status text not null default 'draft', opened_at timestamptz, closed_at timestamptz, created_at timestamptz not null default now(),
  constraint live_session_polls_options_check check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 20),
  constraint live_session_polls_status_check check(status in('draft','open','closed'))
);

create table public.live_session_poll_votes (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  poll_id uuid not null references public.live_session_polls(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  selected_options integer[] not null, voted_at timestamptz not null default now(), constraint live_session_poll_votes_options_check check(cardinality(selected_options)>0),
  constraint live_session_poll_votes_unique unique(poll_id,profile_id)
);

create table public.live_session_attendance (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  joined_at timestamptz not null, left_at timestamptz, duration_seconds integer not null default 0, attendance_status text not null default 'present', source text not null default 'platform',
  recorded_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint live_session_attendance_dates_check check(left_at is null or left_at>=joined_at), constraint live_session_attendance_duration_check check(duration_seconds>=0),
  constraint live_session_attendance_status_check check(attendance_status in('present','late','partial','absent','excused')), constraint live_session_attendance_unique unique(live_session_id,profile_id,joined_at)
);

create table public.live_session_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid not null references public.live_sessions(id) on delete restrict, actor_profile_id uuid references public.profiles(id) on delete restrict,
  event_type text not null, payload jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint live_session_events_type_check check(event_type ~ '^[a-z][a-z0-9_.-]{0,99}$'), constraint live_session_events_payload_check check(jsonb_typeof(payload)='object')
);

create table public.office_hours (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  mentor_profile_id uuid not null references public.profiles(id) on delete restrict, title text not null, description text not null default '',
  starts_at timestamptz not null, ends_at timestamptz not null, recurrence_rule text, capacity integer not null default 1, meeting_provider text,
  status text not null default 'available', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint office_hours_dates_check check(ends_at>starts_at), constraint office_hours_capacity_check check(capacity between 1 and 100),
  constraint office_hours_provider_check check(meeting_provider is null or meeting_provider in('zoom','google_meet','microsoft_teams','bigbluebutton')),
  constraint office_hours_status_check check(status in('available','full','cancelled','completed'))
);

create table public.office_hour_bookings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  office_hour_id uuid not null references public.office_hours(id) on delete restrict, student_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'booked', agenda text, learner_notes text, mentor_private_notes text, booked_at timestamptz not null default now(),
  rescheduled_from_id uuid references public.office_hour_bookings(id) on delete restrict, cancelled_at timestamptz, attended_at timestamptz,
  constraint office_hour_bookings_status_check check(status in('booked','rescheduled','cancelled','attended','missed')),
  constraint office_hour_bookings_unique unique(office_hour_id,student_profile_id)
);

create table public.study_groups (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  space_id uuid references public.community_spaces(id) on delete restrict, course_id uuid references public.courses(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict, name text not null, description text not null default '',
  visibility text not null default 'organization', status text not null default 'active', capacity integer not null default 20,
  shared_resources jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint study_groups_visibility_check check(visibility in('private','invite_only','organization')),
  constraint study_groups_status_check check(status in('active','archived')), constraint study_groups_capacity_check check(capacity between 2 and 500),
  constraint study_groups_resources_check check(jsonb_typeof(shared_resources)='array'), constraint study_groups_unique unique(organization_id,name)
);

create table public.study_group_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  study_group_id uuid not null references public.study_groups(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  member_role text not null default 'member', status text not null default 'active', invited_by uuid references public.profiles(id) on delete restrict,
  joined_at timestamptz not null default now(), left_at timestamptz, constraint study_group_members_role_check check(member_role in('member','facilitator','owner')),
  constraint study_group_members_status_check check(status in('invited','active','left','removed')), constraint study_group_members_unique unique(study_group_id,profile_id)
);

create table public.study_group_sessions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  study_group_id uuid not null references public.study_groups(id) on delete restrict, live_session_id uuid references public.live_sessions(id) on delete restrict,
  title text not null, starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'scheduled',
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint study_group_sessions_dates_check check(ends_at>starts_at), constraint study_group_sessions_status_check check(status in('scheduled','live','completed','cancelled'))
);

create table public.whiteboard_sessions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  live_session_id uuid references public.live_sessions(id) on delete restrict, study_group_id uuid references public.study_groups(id) on delete restrict,
  title text not null, created_by uuid not null references public.profiles(id) on delete restrict, participant_profile_ids uuid[] not null default '{}',
  current_version integer not null default 1, status text not null default 'active', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint whiteboard_sessions_scope_check check(live_session_id is not null or study_group_id is not null),
  constraint whiteboard_sessions_version_check check(current_version>0), constraint whiteboard_sessions_status_check check(status in('active','locked','archived')),
  constraint whiteboard_sessions_metadata_check check(jsonb_typeof(metadata)='object')
);

create table public.whiteboard_versions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  whiteboard_session_id uuid not null references public.whiteboard_sessions(id) on delete restrict, version_number integer not null,
  snapshot_reference text not null, snapshot_hash text not null, created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), constraint whiteboard_versions_number_check check(version_number>0),
  constraint whiteboard_versions_hash_check check(snapshot_hash ~ '^[a-f0-9]{64}$'), constraint whiteboard_versions_unique unique(whiteboard_session_id,version_number)
);

create table public.whiteboard_exports (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  whiteboard_session_id uuid not null references public.whiteboard_sessions(id) on delete restrict, version_number integer not null,
  export_format text not null, storage_reference text not null, requested_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), constraint whiteboard_exports_format_check check(export_format in('png','pdf_metadata','json'))
);

create table public.communication_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete restrict, domain text not null, entity_type text not null, entity_id uuid,
  event_type text not null, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now(),
  constraint communication_events_domain_check check(domain in('community','discussion','messaging','live_learning','office_hours','study_groups','whiteboard','moderation')),
  constraint communication_events_entity_check check(entity_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  constraint communication_events_type_check check(event_type ~ '^[a-z][a-z0-9_.-]{0,99}$'), constraint communication_events_metadata_check check(jsonb_typeof(metadata)='object')
);

create index community_spaces_scope_idx on public.community_spaces(organization_id,status,visibility);
create index community_members_profile_idx on public.community_members(profile_id,status,space_id);
create index community_blocks_blocked_idx on public.community_blocks(blocked_profile_id,organization_id);
create index discussion_categories_space_idx on public.discussion_categories(space_id,sort_order);
create index discussion_topics_feed_idx on public.discussion_topics(space_id,status,is_pinned desc,last_post_at desc);
create index discussion_topics_author_idx on public.discussion_topics(author_profile_id,created_at desc);
create index discussion_posts_thread_idx on public.discussion_posts(topic_id,parent_post_id,created_at);
create index discussion_posts_author_idx on public.discussion_posts(author_profile_id,created_at desc);
create index discussion_post_revisions_post_idx on public.discussion_post_revisions(post_id,revision_number desc);
create index discussion_reactions_post_idx on public.discussion_reactions(post_id,reaction);
create index discussion_bookmarks_profile_idx on public.discussion_bookmarks(profile_id,created_at desc);
create index discussion_reports_queue_idx on public.discussion_reports(organization_id,status,created_at);
create index chat_channels_activity_idx on public.chat_channels(organization_id,status,last_message_at desc);
create index chat_members_profile_idx on public.chat_members(profile_id,status,channel_id);
create index chat_messages_channel_idx on public.chat_messages(channel_id,sent_at desc);
create index chat_message_reads_profile_idx on public.chat_message_reads(profile_id,read_at desc);
create index chat_attachments_message_idx on public.chat_attachments(message_id,created_at);
create index chat_message_reactions_message_idx on public.chat_message_reactions(message_id,emoji);
create index meeting_provider_accounts_org_idx on public.meeting_provider_accounts(organization_id,provider,status);
create index live_sessions_schedule_idx on public.live_sessions(organization_id,status,starts_at);
create index live_session_hosts_profile_idx on public.live_session_hosts(profile_id,live_session_id);
create index live_session_participants_profile_idx on public.live_session_participants(profile_id,status,live_session_id);
create index live_session_recordings_session_idx on public.live_session_recordings(live_session_id,status);
create index live_session_chat_session_idx on public.live_session_chat(live_session_id,sent_at);
create index live_session_questions_queue_idx on public.live_session_questions(live_session_id,status,upvote_count desc);
create index live_session_polls_session_idx on public.live_session_polls(live_session_id,status);
create index live_session_poll_votes_profile_idx on public.live_session_poll_votes(profile_id,poll_id);
create index live_session_attendance_profile_idx on public.live_session_attendance(profile_id,joined_at desc);
create index live_session_events_session_idx on public.live_session_events(live_session_id,occurred_at);
create index office_hours_schedule_idx on public.office_hours(organization_id,mentor_profile_id,status,starts_at);
create index office_hour_bookings_student_idx on public.office_hour_bookings(student_profile_id,status,booked_at desc);
create index study_groups_discovery_idx on public.study_groups(organization_id,status,visibility);
create index study_group_members_profile_idx on public.study_group_members(profile_id,status,study_group_id);
create index study_group_sessions_schedule_idx on public.study_group_sessions(study_group_id,status,starts_at);
create index whiteboard_sessions_scope_idx on public.whiteboard_sessions(organization_id,status,updated_at desc);
create index whiteboard_versions_session_idx on public.whiteboard_versions(whiteboard_session_id,version_number desc);
create index whiteboard_exports_session_idx on public.whiteboard_exports(whiteboard_session_id,created_at desc);
create index communication_events_reporting_idx on public.communication_events(organization_id,domain,event_type,occurred_at desc);

create or replace function private.can_moderate_community(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select auth.uid() is not null and (
    private.can_platform_admin()
    or private.can_manage_notifications(target_organization_id)
    or private.can_manage_mentor_workspace(target_organization_id)
  )
$$;

create or replace function private.can_access_community_space(target_space_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.community_spaces s
    where s.id=target_space_id and s.status='active' and (
      private.can_moderate_community(s.organization_id)
      or exists(select 1 from public.community_members m where m.space_id=s.id and m.profile_id=auth.uid() and m.status='active')
      or (s.visibility='organization' and private.is_active_org_member(s.organization_id))
    )
  )
$$;

create or replace function private.can_manage_community_space(target_space_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.community_spaces s
    where s.id=target_space_id and (
      private.can_moderate_community(s.organization_id)
      or exists(select 1 from public.community_members m where m.space_id=s.id and m.profile_id=auth.uid() and m.status='active' and m.role in('owner','moderator','mentor'))
    )
  )
$$;

create or replace function private.can_access_chat_channel(target_channel_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.chat_channels c
    where c.id=target_channel_id and (
      private.can_moderate_community(c.organization_id)
      or exists(select 1 from public.chat_members m where m.channel_id=c.id and m.profile_id=auth.uid() and m.status='active')
    )
  )
$$;

create or replace function private.can_access_live_session(target_session_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.live_sessions s
    where s.id=target_session_id and (
      private.can_moderate_community(s.organization_id)
      or s.created_by=auth.uid()
      or exists(select 1 from public.live_session_hosts h where h.live_session_id=s.id and h.profile_id=auth.uid())
      or exists(select 1 from public.live_session_participants p where p.live_session_id=s.id and p.profile_id=auth.uid() and p.status not in('removed','cancelled'))
      or (s.space_id is not null and private.can_access_community_space(s.space_id))
    )
  )
$$;

create or replace function private.can_manage_live_session(target_session_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.live_sessions s
    where s.id=target_session_id and (
      private.can_moderate_community(s.organization_id)
      or s.created_by=auth.uid()
      or exists(select 1 from public.live_session_hosts h where h.live_session_id=s.id and h.profile_id=auth.uid() and h.host_role in('host','cohost'))
    )
  )
$$;

create or replace function private.can_access_study_group(target_group_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(
    select 1 from public.study_groups g where g.id=target_group_id and (
      private.can_moderate_community(g.organization_id) or g.owner_profile_id=auth.uid()
      or exists(select 1 from public.study_group_members m where m.study_group_id=g.id and m.profile_id=auth.uid() and m.status='active')
      or (g.visibility='organization' and private.is_active_org_member(g.organization_id))
    )
  )
$$;

create or replace function private.is_study_group_member(target_group_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.study_group_members m where m.study_group_id=target_group_id and m.profile_id=auth.uid() and m.status='active')
$$;

create or replace view public.community_dashboard_projection with (security_invoker=true) as
select s.id as space_id,s.organization_id,s.name,s.slug,s.space_type,s.visibility,s.status,
  count(distinct m.id)::integer as member_count,count(distinct t.id)::integer as topic_count,
  max(t.last_post_at) as last_activity_at
from public.community_spaces s
left join public.community_members m on m.space_id=s.id and m.status='active'
left join public.discussion_topics t on t.space_id=s.id and t.status in('open','locked')
group by s.id;

create or replace view public.live_learning_projection with (security_invoker=true) as
select s.id as session_id,s.organization_id,s.space_id,s.course_id,s.title,s.description,s.provider,s.status,
  s.starts_at,s.ends_at,s.capacity,s.waiting_room_enabled,s.recording_allowed,s.created_by,
  count(distinct p.profile_id)::integer as participant_count,
  count(distinct a.profile_id) filter(where a.attendance_status in('present','late','partial'))::integer as attended_count,
  count(distinct r.id) filter(where r.status='available')::integer as recording_count
from public.live_sessions s
left join public.live_session_participants p on p.live_session_id=s.id and p.status not in('removed','cancelled')
left join public.live_session_attendance a on a.live_session_id=s.id
left join public.live_session_recordings r on r.live_session_id=s.id
group by s.id;

create or replace view public.mentor_communication_projection with (security_invoker=true) as
select o.organization_id,o.mentor_profile_id,count(distinct o.id)::integer as office_hour_count,
  count(distinct b.id) filter(where b.status='booked')::integer as pending_booking_count,
  count(distinct s.id) filter(where s.status in('scheduled','live'))::integer as live_session_count
from public.office_hours o
left join public.office_hour_bookings b on b.office_hour_id=o.id
left join public.live_session_hosts h on h.profile_id=o.mentor_profile_id and h.organization_id=o.organization_id
left join public.live_sessions s on s.id=h.live_session_id
group by o.organization_id,o.mentor_profile_id;

create or replace view public.student_activity_projection with (security_invoker=true) as
select e.organization_id,e.actor_profile_id as profile_id,count(*)::integer as event_count,
  count(*) filter(where e.domain='discussion')::integer as discussion_events,
  count(*) filter(where e.domain='messaging')::integer as messaging_events,
  count(*) filter(where e.domain='live_learning')::integer as live_events,max(e.occurred_at) as last_activity_at
from public.communication_events e where e.actor_profile_id is not null
group by e.organization_id,e.actor_profile_id;

create or replace view public.reporting_community_projection with (security_invoker=true) as
select e.organization_id,date_trunc('day',e.occurred_at) as activity_date,e.domain,e.event_type,count(*)::bigint as event_count,
  count(distinct e.actor_profile_id)::bigint as active_user_count
from public.communication_events e group by e.organization_id,date_trunc('day',e.occurred_at),e.domain,e.event_type;

create or replace function public.record_communication_event(p_organization_id uuid,p_domain text,p_entity_type text,p_entity_id uuid,p_event_type text,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare event_id uuid; begin
  if auth.uid() is null or not private.is_active_org_member(p_organization_id) then raise exception 'communication event denied' using errcode='42501'; end if;
  if p_domain not in('community','discussion','messaging','live_learning','office_hours','study_groups','whiteboard','moderation') or jsonb_typeof(p_metadata)<>'object' then raise exception 'invalid communication event' using errcode='22023'; end if;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type,metadata)
  values(p_organization_id,auth.uid(),p_domain,p_entity_type,p_entity_id,p_event_type,p_metadata) returning id into event_id; return event_id;
end $$;

create or replace function public.create_community_space(p_organization_id uuid,p_name text,p_slug text,p_description text default '',p_space_type text default 'organization',p_visibility text default 'organization',p_course_id uuid default null,p_cohort_id uuid default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare space_id uuid; begin
  if not private.can_moderate_community(p_organization_id) then raise exception 'community administration denied' using errcode='42501'; end if;
  insert into public.community_spaces(organization_id,course_id,cohort_id,name,slug,description,space_type,visibility,created_by)
  values(p_organization_id,p_course_id,p_cohort_id,btrim(p_name),lower(btrim(p_slug)),coalesce(p_description,''),p_space_type,p_visibility,auth.uid()) returning id into space_id;
  insert into public.community_members(organization_id,space_id,profile_id,role,status) values(p_organization_id,space_id,auth.uid(),'owner','active');
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(p_organization_id,auth.uid(),'community','community_space',space_id,'space.created'); return space_id;
end $$;

create or replace function public.create_discussion_category(p_space_id uuid,p_name text,p_slug text,p_description text default '')
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; category_id uuid; begin
  select organization_id into org_id from public.community_spaces where id=p_space_id;
  if org_id is null or not private.can_manage_community_space(p_space_id) then raise exception 'category administration denied' using errcode='42501'; end if;
  insert into public.discussion_categories(organization_id,space_id,name,slug,description,created_by)
  values(org_id,p_space_id,btrim(p_name),lower(btrim(p_slug)),coalesce(p_description,''),auth.uid()) returning id into category_id; return category_id;
end $$;

create or replace function public.create_discussion(p_space_id uuid,p_category_id uuid,p_title text,p_body text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; topic_id uuid; post_id uuid; begin
  select organization_id into org_id from public.community_spaces where id=p_space_id;
  if org_id is null or not private.can_access_community_space(p_space_id) then raise exception 'discussion denied' using errcode='42501'; end if;
  if p_category_id is not null and not exists(select 1 from public.discussion_categories where id=p_category_id and space_id=p_space_id and not is_archived) then raise exception 'invalid category' using errcode='22023'; end if;
  insert into public.discussion_topics(organization_id,space_id,category_id,author_profile_id,title,slug,last_post_at)
  values(org_id,p_space_id,p_category_id,auth.uid(),btrim(p_title),'topic-'||substring(gen_random_uuid()::text from 1 for 8),now()) returning id into topic_id;
  insert into public.discussion_posts(organization_id,topic_id,author_profile_id,body,body_hash)
  values(org_id,topic_id,auth.uid(),btrim(p_body),encode(extensions.digest(btrim(p_body),'sha256'),'hex')) returning id into post_id;
  update public.discussion_topics set post_count=1 where id=topic_id;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(org_id,auth.uid(),'discussion','discussion_topic',topic_id,'topic.created'); return topic_id;
end $$;

create or replace function public.reply_discussion(p_topic_id uuid,p_parent_post_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; space_id uuid; post_id uuid; topic_status text; begin
  select organization_id,space_id,status into org_id,space_id,topic_status from public.discussion_topics where id=p_topic_id;
  if org_id is null or topic_status<>'open' or not private.can_access_community_space(space_id) then raise exception 'reply denied' using errcode='42501'; end if;
  if p_parent_post_id is not null and not exists(select 1 from public.discussion_posts where id=p_parent_post_id and topic_id=p_topic_id and status not in('deleted','moderated')) then raise exception 'invalid parent post' using errcode='22023'; end if;
  insert into public.discussion_posts(organization_id,topic_id,parent_post_id,author_profile_id,body,body_hash)
  values(org_id,p_topic_id,p_parent_post_id,auth.uid(),btrim(p_body),encode(extensions.digest(btrim(p_body),'sha256'),'hex')) returning id into post_id;
  update public.discussion_topics set post_count=post_count+1,last_post_at=now(),updated_at=now() where id=p_topic_id;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(org_id,auth.uid(),'discussion','discussion_post',post_id,'post.replied'); return post_id;
end $$;

create or replace function public.edit_post(p_post_id uuid,p_body text,p_reason text default null)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare target public.discussion_posts%rowtype; space_id uuid; next_revision integer; begin
  select * into target from public.discussion_posts where id=p_post_id;
  select t.space_id into space_id from public.discussion_topics t where t.id=target.topic_id;
  if target.id is null or (target.author_profile_id<>auth.uid() and not private.can_manage_community_space(space_id)) then raise exception 'post edit denied' using errcode='42501'; end if;
  select coalesce(max(revision_number),0)+1 into next_revision from public.discussion_post_revisions where post_id=p_post_id;
  insert into public.discussion_post_revisions(organization_id,post_id,editor_profile_id,revision_number,previous_body,previous_body_hash,change_reason)
  values(target.organization_id,p_post_id,auth.uid(),next_revision,target.body,target.body_hash,p_reason);
  update public.discussion_posts set body=btrim(p_body),body_hash=encode(extensions.digest(btrim(p_body),'sha256'),'hex'),status='edited',updated_at=now() where id=p_post_id;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(target.organization_id,auth.uid(),'discussion','discussion_post',p_post_id,'post.edited');
end $$;

create or replace function public.delete_post(p_post_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare target public.discussion_posts%rowtype; space_id uuid; begin
  select * into target from public.discussion_posts where id=p_post_id; select t.space_id into space_id from public.discussion_topics t where t.id=target.topic_id;
  if target.id is null or (target.author_profile_id<>auth.uid() and not private.can_manage_community_space(space_id)) then raise exception 'post delete denied' using errcode='42501'; end if;
  insert into public.discussion_post_revisions(organization_id,post_id,editor_profile_id,revision_number,previous_body,previous_body_hash,change_reason)
  select target.organization_id,p_post_id,auth.uid(),coalesce(max(revision_number),0)+1,target.body,target.body_hash,p_reason from public.discussion_post_revisions where post_id=p_post_id;
  update public.discussion_posts set status=case when target.author_profile_id=auth.uid() then 'deleted' else 'moderated' end,deleted_at=now(),updated_at=now() where id=p_post_id;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type,metadata) values(target.organization_id,auth.uid(),'moderation','discussion_post',p_post_id,'post.deleted',jsonb_build_object('reason',p_reason));
end $$;

create or replace function public.react_post(p_post_id uuid,p_reaction text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; space_id uuid; removed boolean; begin
  select p.organization_id,t.space_id into org_id,space_id from public.discussion_posts p join public.discussion_topics t on t.id=p.topic_id where p.id=p_post_id and p.status not in('deleted','moderated');
  if org_id is null or not private.can_access_community_space(space_id) then raise exception 'reaction denied' using errcode='42501'; end if;
  delete from public.discussion_reactions where post_id=p_post_id and profile_id=auth.uid() and reaction=p_reaction returning true into removed;
  if coalesce(removed,false) then return false; end if;
  insert into public.discussion_reactions(organization_id,post_id,profile_id,reaction) values(org_id,p_post_id,auth.uid(),p_reaction); return true;
end $$;

create or replace function public.bookmark_post(p_topic_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; space_id uuid; removed boolean; begin
  select organization_id,space_id into org_id,space_id from public.discussion_topics where id=p_topic_id;
  if org_id is null or not private.can_access_community_space(space_id) then raise exception 'bookmark denied' using errcode='42501'; end if;
  delete from public.discussion_bookmarks where topic_id=p_topic_id and profile_id=auth.uid() returning true into removed;
  if coalesce(removed,false) then return false; end if;
  insert into public.discussion_bookmarks(organization_id,topic_id,profile_id) values(org_id,p_topic_id,auth.uid()); return true;
end $$;

create or replace function public.report_post(p_post_id uuid,p_reason text,p_details text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; space_id uuid; report_id uuid; begin
  select p.organization_id,t.space_id into org_id,space_id from public.discussion_posts p join public.discussion_topics t on t.id=p.topic_id where p.id=p_post_id;
  if org_id is null or not private.can_access_community_space(space_id) then raise exception 'report denied' using errcode='42501'; end if;
  insert into public.discussion_reports(organization_id,post_id,reporter_profile_id,reason,details) values(org_id,p_post_id,auth.uid(),p_reason,p_details) returning id into report_id;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(org_id,auth.uid(),'moderation','discussion_report',report_id,'report.created'); return report_id;
end $$;

create or replace function public.moderate_discussion(p_topic_id uuid,p_action text,p_post_id uuid default null,p_reason text default null)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; space_id uuid; begin
  select organization_id,space_id into org_id,space_id from public.discussion_topics where id=p_topic_id;
  if org_id is null or not private.can_manage_community_space(space_id) then raise exception 'moderation denied' using errcode='42501'; end if;
  if p_action='pin' then update public.discussion_topics set is_pinned=true,updated_at=now() where id=p_topic_id;
  elsif p_action='unpin' then update public.discussion_topics set is_pinned=false,updated_at=now() where id=p_topic_id;
  elsif p_action='lock' then update public.discussion_topics set status='locked',updated_at=now() where id=p_topic_id;
  elsif p_action='unlock' then update public.discussion_topics set status='open',updated_at=now() where id=p_topic_id;
  elsif p_action='solve' and p_post_id is not null and exists(select 1 from public.discussion_posts where id=p_post_id and topic_id=p_topic_id) then update public.discussion_topics set solved_post_id=p_post_id,updated_at=now() where id=p_topic_id; update public.discussion_posts set is_solution=true where id=p_post_id;
  else raise exception 'invalid moderation action' using errcode='22023'; end if;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type,metadata) values(org_id,auth.uid(),'moderation','discussion_topic',p_topic_id,'topic.'||p_action,jsonb_build_object('reason',p_reason));
end $$;

create or replace function public.create_chat_channel(p_organization_id uuid,p_channel_type text,p_name text,p_member_profile_ids uuid[])
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare channel_id uuid; invalid_members integer; begin
  if auth.uid() is null or not private.is_active_org_member(p_organization_id) then raise exception 'chat channel denied' using errcode='42501'; end if;
  select count(*) into invalid_members from unnest(coalesce(p_member_profile_ids,'{}')) member_id
  where not exists(select 1 from public.organization_members om where om.organization_id=p_organization_id and om.profile_id=member_id and om.status='active');
  if invalid_members>0 then raise exception 'chat member outside organization' using errcode='42501'; end if;
  if p_channel_type='direct' and cardinality(array(select distinct x from unnest(coalesce(p_member_profile_ids,'{}')) x where x<>auth.uid()))<>1 then raise exception 'direct channel requires one recipient' using errcode='22023'; end if;
  insert into public.chat_channels(organization_id,channel_type,name,created_by) values(p_organization_id,p_channel_type,nullif(btrim(p_name),''),auth.uid()) returning id into channel_id;
  insert into public.chat_members(organization_id,channel_id,profile_id,member_role)
  select p_organization_id,channel_id,profile_id,case when profile_id=auth.uid() then 'owner' else 'member' end
  from (select auth.uid() profile_id union select unnest(coalesce(p_member_profile_ids,'{}'))) members;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(p_organization_id,auth.uid(),'messaging','chat_channel',channel_id,'channel.created'); return channel_id;
end $$;

create or replace function public.send_message(p_channel_id uuid,p_body text,p_parent_message_id uuid default null,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; message_id uuid; begin
  select organization_id into org_id from public.chat_channels where id=p_channel_id and status='active';
  if org_id is null or not private.can_access_chat_channel(p_channel_id) then raise exception 'message denied' using errcode='42501'; end if;
  if exists(select 1 from public.chat_members cm join public.community_blocks b on b.organization_id=org_id and ((b.blocker_profile_id=auth.uid() and b.blocked_profile_id=cm.profile_id) or (b.blocked_profile_id=auth.uid() and b.blocker_profile_id=cm.profile_id)) where cm.channel_id=p_channel_id and cm.status='active') then raise exception 'message blocked' using errcode='42501'; end if;
  if p_parent_message_id is not null and not exists(select 1 from public.chat_messages where id=p_parent_message_id and channel_id=p_channel_id) then raise exception 'invalid parent message' using errcode='22023'; end if;
  insert into public.chat_messages(organization_id,channel_id,sender_profile_id,parent_message_id,body,metadata)
  values(org_id,p_channel_id,auth.uid(),p_parent_message_id,btrim(p_body),p_metadata) returning id into message_id;
  update public.chat_channels set last_message_at=now() where id=p_channel_id;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(org_id,auth.uid(),'messaging','chat_message',message_id,'message.sent'); return message_id;
end $$;

create or replace function public.mark_message_read(p_message_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; target_channel_id uuid; read_id uuid; begin
  select organization_id,chat_messages.channel_id into org_id,target_channel_id from public.chat_messages where id=p_message_id;
  if org_id is null or not private.can_access_chat_channel(target_channel_id) then raise exception 'message read denied' using errcode='42501'; end if;
  insert into public.chat_message_reads(organization_id,message_id,profile_id) values(org_id,p_message_id,auth.uid())
  on conflict(message_id,profile_id) do nothing returning id into read_id;
  update public.chat_members set last_read_at=greatest(coalesce(last_read_at,'-infinity'::timestamptz),now()) where channel_id=target_channel_id and profile_id=auth.uid();
  return coalesce(read_id,(select id from public.chat_message_reads where message_id=p_message_id and profile_id=auth.uid()));
end $$;

create or replace function public.react_message(p_message_id uuid,p_emoji text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; channel_id uuid; removed boolean; begin
  select organization_id,chat_messages.channel_id into org_id,channel_id from public.chat_messages where id=p_message_id and status not in('deleted','moderated');
  if org_id is null or not private.can_access_chat_channel(channel_id) then raise exception 'message reaction denied' using errcode='42501'; end if;
  delete from public.chat_message_reactions where message_id=p_message_id and profile_id=auth.uid() and emoji=p_emoji returning true into removed;
  if coalesce(removed,false) then return false; end if;
  insert into public.chat_message_reactions(organization_id,message_id,profile_id,emoji) values(org_id,p_message_id,auth.uid(),p_emoji); return true;
end $$;

create or replace function public.archive_chat_channel(p_channel_id uuid,p_archived boolean default true)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  if not private.can_access_chat_channel(p_channel_id) then raise exception 'chat archive denied' using errcode='42501'; end if;
  update public.chat_members set archived_at=case when p_archived then now() else null end where channel_id=p_channel_id and profile_id=auth.uid();
end $$;

create or replace function public.create_live_session(p_organization_id uuid,p_space_id uuid,p_course_id uuid,p_title text,p_description text,p_provider text,p_starts_at timestamptz,p_ends_at timestamptz,p_capacity integer default 100,p_waiting_room_enabled boolean default true,p_recording_allowed boolean default false)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare session_id uuid; begin
  if not private.can_moderate_community(p_organization_id) and private.current_mentor_member_id(p_organization_id) is null then raise exception 'live session creation denied' using errcode='42501'; end if;
  if p_space_id is not null and not exists(select 1 from public.community_spaces where id=p_space_id and organization_id=p_organization_id) then raise exception 'invalid community space' using errcode='22023'; end if;
  insert into public.live_sessions(organization_id,space_id,course_id,title,description,provider,starts_at,ends_at,capacity,waiting_room_enabled,recording_allowed,created_by)
  values(p_organization_id,p_space_id,p_course_id,btrim(p_title),coalesce(p_description,''),p_provider,p_starts_at,p_ends_at,p_capacity,p_waiting_room_enabled,p_recording_allowed,auth.uid()) returning id into session_id;
  insert into public.live_session_hosts(organization_id,live_session_id,profile_id,host_role) values(p_organization_id,session_id,auth.uid(),'host');
  insert into public.live_session_events(organization_id,live_session_id,actor_profile_id,event_type) values(p_organization_id,session_id,auth.uid(),'session.created'); return session_id;
end $$;

create or replace function public.start_live_session(p_session_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; begin
  select organization_id into org_id from public.live_sessions where id=p_session_id;
  if org_id is null or not private.can_manage_live_session(p_session_id) then raise exception 'live session start denied' using errcode='42501'; end if;
  update public.live_sessions set status='live',updated_at=now() where id=p_session_id and status in('scheduled','waiting');
  insert into public.live_session_events(organization_id,live_session_id,actor_profile_id,event_type) values(org_id,p_session_id,auth.uid(),'session.started');
end $$;

create or replace function public.end_live_session(p_session_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; begin
  select organization_id into org_id from public.live_sessions where id=p_session_id;
  if org_id is null or not private.can_manage_live_session(p_session_id) then raise exception 'live session end denied' using errcode='42501'; end if;
  update public.live_sessions set status='ended',updated_at=now() where id=p_session_id and status in('live','waiting');
  insert into public.live_session_events(organization_id,live_session_id,actor_profile_id,event_type) values(org_id,p_session_id,auth.uid(),'session.ended');
end $$;

create or replace function public.join_live_session(p_session_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare target public.live_sessions%rowtype; participant_id uuid; participant_status text; begin
  select * into target from public.live_sessions where id=p_session_id;
  if target.id is null or target.status not in('scheduled','waiting','live') or not private.is_active_org_member(target.organization_id) then raise exception 'live session join denied' using errcode='42501'; end if;
  participant_status:=case when target.waiting_room_enabled then 'waiting' else 'admitted' end;
  insert into public.live_session_participants(organization_id,live_session_id,profile_id,status,joined_at,admitted_at)
  values(target.organization_id,p_session_id,auth.uid(),participant_status,now(),case when participant_status='admitted' then now() else null end)
  on conflict(live_session_id,profile_id) do update set status=excluded.status,joined_at=coalesce(public.live_session_participants.joined_at,excluded.joined_at)
  returning id into participant_id;
  insert into public.live_session_events(organization_id,live_session_id,actor_profile_id,event_type) values(target.organization_id,p_session_id,auth.uid(),'participant.joined'); return participant_id;
end $$;

create or replace function public.record_attendance(p_session_id uuid,p_profile_id uuid,p_joined_at timestamptz,p_left_at timestamptz,p_status text default 'present',p_source text default 'platform')
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; attendance_id uuid; duration_value integer; begin
  select organization_id into org_id from public.live_sessions where id=p_session_id;
  if org_id is null or not private.can_manage_live_session(p_session_id) then raise exception 'attendance denied' using errcode='42501'; end if;
  if not exists(select 1 from public.organization_members where organization_id=org_id and profile_id=p_profile_id and status='active') then raise exception 'attendance profile outside organization' using errcode='42501'; end if;
  duration_value:=greatest(0,extract(epoch from(coalesce(p_left_at,p_joined_at)-p_joined_at))::integer);
  insert into public.live_session_attendance(organization_id,live_session_id,profile_id,joined_at,left_at,duration_seconds,attendance_status,source,recorded_by)
  values(org_id,p_session_id,p_profile_id,p_joined_at,p_left_at,duration_value,p_status,p_source,auth.uid()) returning id into attendance_id;
  insert into public.live_session_events(organization_id,live_session_id,actor_profile_id,event_type,payload) values(org_id,p_session_id,auth.uid(),'attendance.recorded',jsonb_build_object('profile_id',p_profile_id,'status',p_status)); return attendance_id;
end $$;

create or replace function public.create_poll(p_session_id uuid,p_question text,p_options jsonb,p_allows_multiple boolean default false,p_is_anonymous boolean default false)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; poll_id uuid; begin
  select organization_id into org_id from public.live_sessions where id=p_session_id;
  if org_id is null or not private.can_manage_live_session(p_session_id) then raise exception 'poll creation denied' using errcode='42501'; end if;
  insert into public.live_session_polls(organization_id,live_session_id,created_by,question,options,allows_multiple,is_anonymous,status,opened_at)
  values(org_id,p_session_id,auth.uid(),btrim(p_question),p_options,p_allows_multiple,p_is_anonymous,'open',now()) returning id into poll_id; return poll_id;
end $$;

create or replace function public.vote_poll(p_poll_id uuid,p_selected_options integer[])
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; session_id uuid; option_count integer; allows_many boolean; vote_id uuid; begin
  select organization_id,live_session_id,jsonb_array_length(options),allows_multiple into org_id,session_id,option_count,allows_many from public.live_session_polls where id=p_poll_id and status='open';
  if org_id is null or not private.can_access_live_session(session_id) then raise exception 'poll vote denied' using errcode='42501'; end if;
  if cardinality(p_selected_options)=0 or (not allows_many and cardinality(p_selected_options)<>1) or exists(select 1 from unnest(p_selected_options) option_index where option_index<0 or option_index>=option_count) then raise exception 'invalid poll selection' using errcode='22023'; end if;
  insert into public.live_session_poll_votes(organization_id,poll_id,profile_id,selected_options) values(org_id,p_poll_id,auth.uid(),p_selected_options) returning id into vote_id; return vote_id;
end $$;

create or replace function public.send_live_session_chat(p_session_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; message_id uuid; begin
  select organization_id into org_id from public.live_sessions where id=p_session_id and status='live';
  if org_id is null or not private.can_access_live_session(p_session_id) then raise exception 'live chat denied' using errcode='42501'; end if;
  insert into public.live_session_chat(organization_id,live_session_id,profile_id,body) values(org_id,p_session_id,auth.uid(),btrim(p_body)) returning id into message_id; return message_id;
end $$;

create or replace function public.ask_live_session_question(p_session_id uuid,p_question text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; question_id uuid; begin
  select organization_id into org_id from public.live_sessions where id=p_session_id and status='live';
  if org_id is null or not private.can_access_live_session(p_session_id) then raise exception 'live question denied' using errcode='42501'; end if;
  insert into public.live_session_questions(organization_id,live_session_id,asked_by,question) values(org_id,p_session_id,auth.uid(),btrim(p_question)) returning id into question_id; return question_id;
end $$;

create or replace function public.raise_live_session_hand(p_session_id uuid,p_raised boolean default true)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  if not private.can_access_live_session(p_session_id) then raise exception 'raise hand denied' using errcode='42501'; end if;
  update public.live_session_participants set raised_hand_at=case when p_raised then now() else null end where live_session_id=p_session_id and profile_id=auth.uid();
end $$;

create or replace function public.schedule_office_hours(p_organization_id uuid,p_title text,p_description text,p_starts_at timestamptz,p_ends_at timestamptz,p_capacity integer default 1,p_recurrence_rule text default null,p_meeting_provider text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare office_id uuid; begin
  if private.current_mentor_member_id(p_organization_id) is null and not private.can_moderate_community(p_organization_id) then raise exception 'office hours denied' using errcode='42501'; end if;
  insert into public.office_hours(organization_id,mentor_profile_id,title,description,starts_at,ends_at,recurrence_rule,capacity,meeting_provider)
  values(p_organization_id,auth.uid(),btrim(p_title),coalesce(p_description,''),p_starts_at,p_ends_at,p_recurrence_rule,p_capacity,p_meeting_provider) returning id into office_id;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(p_organization_id,auth.uid(),'office_hours','office_hour',office_id,'office_hour.scheduled'); return office_id;
end $$;

create or replace function public.book_office_hour(p_office_hour_id uuid,p_agenda text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare target public.office_hours%rowtype; booking_id uuid; booking_count integer; begin
  select * into target from public.office_hours where id=p_office_hour_id and status='available' and starts_at>now();
  if target.id is null or not private.is_active_org_member(target.organization_id) then raise exception 'office hour booking denied' using errcode='42501'; end if;
  select count(*) into booking_count from public.office_hour_bookings where office_hour_id=p_office_hour_id and status='booked';
  if booking_count>=target.capacity then raise exception 'office hour is full' using errcode='P0001'; end if;
  insert into public.office_hour_bookings(organization_id,office_hour_id,student_profile_id,agenda) values(target.organization_id,p_office_hour_id,auth.uid(),p_agenda) returning id into booking_id;
  if booking_count+1>=target.capacity then update public.office_hours set status='full',updated_at=now() where id=p_office_hour_id; end if;
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(target.organization_id,auth.uid(),'office_hours','office_hour_booking',booking_id,'booking.created'); return booking_id;
end $$;

create or replace function public.reschedule_office_hour(p_booking_id uuid,p_new_office_hour_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare old_booking public.office_hour_bookings%rowtype; new_id uuid; begin
  select * into old_booking from public.office_hour_bookings where id=p_booking_id;
  if old_booking.id is null or (old_booking.student_profile_id<>auth.uid() and not private.can_moderate_community(old_booking.organization_id)) then raise exception 'office hour reschedule denied' using errcode='42501'; end if;
  update public.office_hour_bookings set status='rescheduled' where id=p_booking_id and status='booked';
  insert into public.office_hour_bookings(organization_id,office_hour_id,student_profile_id,status,agenda,rescheduled_from_id)
  select old_booking.organization_id,p_new_office_hour_id,old_booking.student_profile_id,'booked',old_booking.agenda,p_booking_id
  where exists(select 1 from public.office_hours h where h.id=p_new_office_hour_id and h.organization_id=old_booking.organization_id and h.status='available' and h.starts_at>now()) returning id into new_id;
  if new_id is null then raise exception 'replacement office hour unavailable' using errcode='P0001'; end if; return new_id;
end $$;

create or replace function public.cancel_office_hour_booking(p_booking_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare target public.office_hour_bookings%rowtype; begin
  select * into target from public.office_hour_bookings where id=p_booking_id;
  if target.id is null or (target.student_profile_id<>auth.uid() and not private.can_moderate_community(target.organization_id) and not exists(select 1 from public.office_hours h where h.id=target.office_hour_id and h.mentor_profile_id=auth.uid())) then raise exception 'office hour cancellation denied' using errcode='42501'; end if;
  update public.office_hour_bookings set status='cancelled',cancelled_at=now(),learner_notes=case when student_profile_id=auth.uid() then p_reason else learner_notes end where id=p_booking_id and status='booked';
  update public.office_hours set status='available',updated_at=now() where id=target.office_hour_id and status='full';
end $$;

create or replace function public.create_study_group(p_organization_id uuid,p_name text,p_description text default '',p_course_id uuid default null,p_visibility text default 'organization',p_capacity integer default 20)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare group_id uuid; begin
  if auth.uid() is null or not private.is_active_org_member(p_organization_id) then raise exception 'study group denied' using errcode='42501'; end if;
  insert into public.study_groups(organization_id,course_id,owner_profile_id,name,description,visibility,capacity)
  values(p_organization_id,p_course_id,auth.uid(),btrim(p_name),coalesce(p_description,''),p_visibility,p_capacity) returning id into group_id;
  insert into public.study_group_members(organization_id,study_group_id,profile_id,member_role,status) values(p_organization_id,group_id,auth.uid(),'owner','active');
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type) values(p_organization_id,auth.uid(),'study_groups','study_group',group_id,'group.created'); return group_id;
end $$;

create or replace function public.join_study_group(p_study_group_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare target public.study_groups%rowtype; member_id uuid; member_count integer; begin
  select * into target from public.study_groups where id=p_study_group_id and status='active';
  if target.id is null or target.visibility='private' or not private.is_active_org_member(target.organization_id) then raise exception 'study group join denied' using errcode='42501'; end if;
  select count(*) into member_count from public.study_group_members where study_group_id=p_study_group_id and status='active';
  if member_count>=target.capacity then raise exception 'study group is full' using errcode='P0001'; end if;
  insert into public.study_group_members(organization_id,study_group_id,profile_id,status) values(target.organization_id,p_study_group_id,auth.uid(),'active')
  on conflict(study_group_id,profile_id) do update set status='active',left_at=null returning id into member_id; return member_id;
end $$;

create or replace function public.leave_study_group(p_study_group_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
  if not private.can_access_study_group(p_study_group_id) then raise exception 'study group leave denied' using errcode='42501'; end if;
  if exists(select 1 from public.study_groups where id=p_study_group_id and owner_profile_id=auth.uid()) then raise exception 'owner must transfer or archive the group' using errcode='P0001'; end if;
  update public.study_group_members set status='left',left_at=now() where study_group_id=p_study_group_id and profile_id=auth.uid() and status='active';
end $$;

create or replace function public.schedule_study_group_session(p_study_group_id uuid,p_title text,p_starts_at timestamptz,p_ends_at timestamptz)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare org_id uuid; session_id uuid; begin
  select organization_id into org_id from public.study_groups where id=p_study_group_id;
  if org_id is null or not exists(select 1 from public.study_group_members where study_group_id=p_study_group_id and profile_id=auth.uid() and status='active' and member_role in('owner','facilitator')) then raise exception 'study session denied' using errcode='42501'; end if;
  insert into public.study_group_sessions(organization_id,study_group_id,title,starts_at,ends_at,created_by) values(org_id,p_study_group_id,btrim(p_title),p_starts_at,p_ends_at,auth.uid()) returning id into session_id; return session_id;
end $$;

create or replace function public.create_whiteboard_session(p_organization_id uuid,p_live_session_id uuid,p_study_group_id uuid,p_title text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare board_id uuid; begin
  if auth.uid() is null or not private.is_active_org_member(p_organization_id) or (p_live_session_id is not null and not private.can_access_live_session(p_live_session_id)) or (p_study_group_id is not null and not private.can_access_study_group(p_study_group_id)) then raise exception 'whiteboard denied' using errcode='42501'; end if;
  insert into public.whiteboard_sessions(organization_id,live_session_id,study_group_id,title,created_by,participant_profile_ids) values(p_organization_id,p_live_session_id,p_study_group_id,btrim(p_title),auth.uid(),array[auth.uid()]) returning id into board_id; return board_id;
end $$;

create or replace function public.record_whiteboard_version(p_whiteboard_session_id uuid,p_snapshot_reference text,p_snapshot_hash text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$ declare target public.whiteboard_sessions%rowtype; version_id uuid; next_version integer; begin
  select * into target from public.whiteboard_sessions where id=p_whiteboard_session_id;
  if target.id is null or (target.created_by<>auth.uid() and not auth.uid()=any(target.participant_profile_ids) and not private.can_moderate_community(target.organization_id)) then raise exception 'whiteboard version denied' using errcode='42501'; end if;
  next_version:=target.current_version+1;
  insert into public.whiteboard_versions(organization_id,whiteboard_session_id,version_number,snapshot_reference,snapshot_hash,created_by) values(target.organization_id,p_whiteboard_session_id,next_version,p_snapshot_reference,p_snapshot_hash,auth.uid()) returning id into version_id;
  update public.whiteboard_sessions set current_version=next_version,updated_at=now() where id=p_whiteboard_session_id; return version_id;
end $$;

create or replace function public.resolve_discussion_report(p_report_id uuid,p_status text,p_resolution text)
returns void language plpgsql security definer set search_path=pg_catalog as $$ declare target public.discussion_reports%rowtype; begin
  select * into target from public.discussion_reports where id=p_report_id;
  if target.id is null or not private.can_moderate_community(target.organization_id) then raise exception 'report resolution denied' using errcode='42501'; end if;
  if p_status not in('resolved','dismissed') then raise exception 'invalid report resolution' using errcode='22023'; end if;
  update public.discussion_reports set status=p_status,resolution=p_resolution,assigned_moderator_id=auth.uid(),resolved_at=now() where id=p_report_id and status in('open','reviewing');
  insert into public.communication_events(organization_id,actor_profile_id,domain,entity_type,entity_id,event_type,metadata)
  values(target.organization_id,auth.uid(),'moderation','discussion_report',p_report_id,'report.'||p_status,jsonb_build_object('resolution',p_resolution));
end $$;

create or replace view public.chat_attachment_projection with (security_invoker=true) as
select id,organization_id,message_id,uploaded_by,file_name,mime_type,size_bytes,quarantine_status,created_at
from public.chat_attachments;

create or replace view public.office_hour_booking_projection with (security_invoker=true) as
select b.id as booking_id,b.organization_id,b.office_hour_id,b.student_profile_id,b.status,b.agenda,b.learner_notes,b.booked_at,b.cancelled_at,b.attended_at,
  h.mentor_profile_id,h.title,h.starts_at,h.ends_at,h.meeting_provider
from public.office_hour_bookings b join public.office_hours h on h.id=b.office_hour_id;

create or replace function private.set_community_updated_at()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin new.updated_at=now(); return new; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'community_spaces','discussion_categories','discussion_topics','meeting_provider_accounts','live_sessions','office_hours','study_groups','whiteboard_sessions'
] loop execute format('create trigger %I before update on public.%I for each row execute function private.set_community_updated_at()',table_name||'_updated_at',table_name); end loop; end $$;

create or replace function private.reject_communication_evidence_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'communication evidence is immutable'; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'discussion_post_revisions','chat_message_reads','live_session_recordings','live_session_poll_votes','live_session_attendance','live_session_events','whiteboard_versions','whiteboard_exports','communication_events'
] loop execute format('create trigger %I before update or delete on public.%I for each row execute function private.reject_communication_evidence_mutation()',table_name||'_immutable',table_name); end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'community_spaces','community_members','community_blocks','discussion_categories','discussion_topics','discussion_posts','discussion_post_revisions','discussion_reactions','discussion_bookmarks','discussion_reports',
  'chat_channels','chat_members','chat_messages','chat_message_reads','chat_attachments','chat_message_reactions','meeting_provider_accounts',
  'live_sessions','live_session_hosts','live_session_participants','live_session_recordings','live_session_chat','live_session_questions','live_session_polls','live_session_poll_votes','live_session_attendance','live_session_events',
  'office_hours','office_hour_bookings','study_groups','study_group_members','study_group_sessions','whiteboard_sessions','whiteboard_versions','whiteboard_exports','communication_events'
] loop execute format('alter table public.%I enable row level security',table_name); execute format('alter table public.%I force row level security',table_name); execute format('revoke all on table public.%I from anon,authenticated',table_name); end loop; end $$;

create policy community_spaces_access_select on public.community_spaces for select to authenticated using(private.can_access_community_space(id));
create policy community_members_access_select on public.community_members for select to authenticated using(profile_id=auth.uid() or private.can_access_community_space(space_id));
create policy community_blocks_owner_select on public.community_blocks for select to authenticated using(blocker_profile_id=auth.uid() or private.can_moderate_community(organization_id));
create policy discussion_categories_access_select on public.discussion_categories for select to authenticated using(private.can_access_community_space(space_id));
create policy discussion_topics_access_select on public.discussion_topics for select to authenticated using(private.can_access_community_space(space_id));
create policy discussion_posts_access_select on public.discussion_posts for select to authenticated using(exists(select 1 from public.discussion_topics t where t.id=topic_id and private.can_access_community_space(t.space_id)));
create policy discussion_post_revisions_restricted_select on public.discussion_post_revisions for select to authenticated using(editor_profile_id=auth.uid() or exists(select 1 from public.discussion_posts p join public.discussion_topics t on t.id=p.topic_id where p.id=post_id and (p.author_profile_id=auth.uid() or private.can_manage_community_space(t.space_id))));
create policy discussion_reactions_access_select on public.discussion_reactions for select to authenticated using(exists(select 1 from public.discussion_posts p join public.discussion_topics t on t.id=p.topic_id where p.id=post_id and private.can_access_community_space(t.space_id)));
create policy discussion_bookmarks_owner_select on public.discussion_bookmarks for select to authenticated using(profile_id=auth.uid());
create policy discussion_reports_restricted_select on public.discussion_reports for select to authenticated using(reporter_profile_id=auth.uid() or private.can_moderate_community(organization_id));
create policy chat_channels_member_select on public.chat_channels for select to authenticated using(private.can_access_chat_channel(id));
create policy chat_members_channel_select on public.chat_members for select to authenticated using(profile_id=auth.uid() or private.can_access_chat_channel(channel_id));
create policy chat_messages_channel_select on public.chat_messages for select to authenticated using(private.can_access_chat_channel(channel_id));
create policy chat_message_reads_channel_select on public.chat_message_reads for select to authenticated using(exists(select 1 from public.chat_messages m where m.id=message_id and private.can_access_chat_channel(m.channel_id)));
create policy chat_attachments_channel_select on public.chat_attachments for select to authenticated using(exists(select 1 from public.chat_messages m where m.id=message_id and private.can_access_chat_channel(m.channel_id)));
create policy chat_message_reactions_channel_select on public.chat_message_reactions for select to authenticated using(exists(select 1 from public.chat_messages m where m.id=message_id and private.can_access_chat_channel(m.channel_id)));
create policy meeting_provider_accounts_admin_select on public.meeting_provider_accounts for select to authenticated using(private.can_moderate_community(organization_id));
create policy live_sessions_access_select on public.live_sessions for select to authenticated using(private.can_access_live_session(id));
create policy live_session_hosts_access_select on public.live_session_hosts for select to authenticated using(private.can_access_live_session(live_session_id));
create policy live_session_participants_access_select on public.live_session_participants for select to authenticated using(profile_id=auth.uid() or private.can_manage_live_session(live_session_id));
create policy live_session_recordings_access_select on public.live_session_recordings for select to authenticated using(status='available' and private.can_access_live_session(live_session_id));
create policy live_session_chat_access_select on public.live_session_chat for select to authenticated using(private.can_access_live_session(live_session_id));
create policy live_session_questions_access_select on public.live_session_questions for select to authenticated using(private.can_access_live_session(live_session_id));
create policy live_session_polls_access_select on public.live_session_polls for select to authenticated using(private.can_access_live_session(live_session_id));
create policy live_session_poll_votes_restricted_select on public.live_session_poll_votes for select to authenticated using(profile_id=auth.uid() or exists(select 1 from public.live_session_polls p where p.id=poll_id and private.can_manage_live_session(p.live_session_id)));
create policy live_session_attendance_restricted_select on public.live_session_attendance for select to authenticated using(profile_id=auth.uid() or private.can_manage_live_session(live_session_id));
create policy live_session_events_restricted_select on public.live_session_events for select to authenticated using(actor_profile_id=auth.uid() or private.can_manage_live_session(live_session_id));
create policy office_hours_org_select on public.office_hours for select to authenticated using(private.is_active_org_member(organization_id));
create policy office_hour_bookings_restricted_select on public.office_hour_bookings for select to authenticated using(student_profile_id=auth.uid() or private.can_moderate_community(organization_id) or exists(select 1 from public.office_hours h where h.id=office_hour_id and h.mentor_profile_id=auth.uid()));
create policy study_groups_access_select on public.study_groups for select to authenticated using(private.can_access_study_group(id));
create policy study_group_members_restricted_select on public.study_group_members for select to authenticated using(profile_id=auth.uid() or private.is_study_group_member(study_group_id) or private.can_moderate_community(organization_id));
create policy study_group_sessions_access_select on public.study_group_sessions for select to authenticated using(private.can_access_study_group(study_group_id));
create policy whiteboard_sessions_participant_select on public.whiteboard_sessions for select to authenticated using(created_by=auth.uid() or auth.uid()=any(participant_profile_ids) or private.can_moderate_community(organization_id));
create policy whiteboard_versions_participant_select on public.whiteboard_versions for select to authenticated using(exists(select 1 from public.whiteboard_sessions w where w.id=whiteboard_session_id and (w.created_by=auth.uid() or auth.uid()=any(w.participant_profile_ids) or private.can_moderate_community(w.organization_id))));
create policy whiteboard_exports_participant_select on public.whiteboard_exports for select to authenticated using(requested_by=auth.uid() or exists(select 1 from public.whiteboard_sessions w where w.id=whiteboard_session_id and (w.created_by=auth.uid() or auth.uid()=any(w.participant_profile_ids) or private.can_moderate_community(w.organization_id))));
create policy communication_events_restricted_select on public.communication_events for select to authenticated using(actor_profile_id=auth.uid() or private.can_moderate_community(organization_id));

grant select on public.community_spaces,public.community_members,public.community_blocks,public.discussion_categories,public.discussion_topics,public.discussion_posts,public.discussion_post_revisions,public.discussion_reactions,public.discussion_bookmarks,public.discussion_reports,
public.chat_channels,public.chat_members,public.chat_messages,public.chat_message_reads,public.chat_message_reactions,public.meeting_provider_accounts,
public.live_sessions,public.live_session_hosts,public.live_session_participants,public.live_session_recordings,public.live_session_chat,public.live_session_questions,public.live_session_polls,public.live_session_poll_votes,public.live_session_attendance,public.live_session_events,
public.office_hours,public.study_groups,public.study_group_members,public.study_group_sessions,public.whiteboard_sessions,public.whiteboard_versions,public.whiteboard_exports,public.communication_events to authenticated;
grant select on public.community_dashboard_projection,public.live_learning_projection,public.mentor_communication_projection,public.student_activity_projection,public.reporting_community_projection,public.chat_attachment_projection,public.office_hour_booking_projection to authenticated;
grant select(id,organization_id,message_id,uploaded_by,file_name,mime_type,size_bytes,quarantine_status,created_at) on public.chat_attachments to authenticated;
grant select(id,organization_id,office_hour_id,student_profile_id,status,agenda,learner_notes,booked_at,rescheduled_from_id,cancelled_at,attended_at) on public.office_hour_bookings to authenticated;

revoke all on function private.can_moderate_community(uuid),private.can_access_community_space(uuid),private.can_manage_community_space(uuid),private.can_access_chat_channel(uuid),private.can_access_live_session(uuid),private.can_manage_live_session(uuid),private.can_access_study_group(uuid),private.is_study_group_member(uuid),private.set_community_updated_at(),private.reject_communication_evidence_mutation() from public;
grant execute on function private.can_moderate_community(uuid),private.can_access_community_space(uuid),private.can_manage_community_space(uuid),private.can_access_chat_channel(uuid),private.can_access_live_session(uuid),private.can_manage_live_session(uuid),private.can_access_study_group(uuid),private.is_study_group_member(uuid) to authenticated;

do $$ declare signature text; begin foreach signature in array array[
  'record_communication_event(uuid,text,text,uuid,text,jsonb)','create_community_space(uuid,text,text,text,text,text,uuid,uuid)','create_discussion_category(uuid,text,text,text)',
  'create_discussion(uuid,uuid,text,text)','reply_discussion(uuid,uuid,text)','edit_post(uuid,text,text)','delete_post(uuid,text)','react_post(uuid,text)','bookmark_post(uuid)','report_post(uuid,text,text)','moderate_discussion(uuid,text,uuid,text)','resolve_discussion_report(uuid,text,text)',
  'create_chat_channel(uuid,text,text,uuid[])','send_message(uuid,text,uuid,jsonb)','mark_message_read(uuid)','react_message(uuid,text)','archive_chat_channel(uuid,boolean)',
  'create_live_session(uuid,uuid,uuid,text,text,text,timestamptz,timestamptz,integer,boolean,boolean)','start_live_session(uuid)','end_live_session(uuid)','join_live_session(uuid)','record_attendance(uuid,uuid,timestamptz,timestamptz,text,text)',
  'create_poll(uuid,text,jsonb,boolean,boolean)','vote_poll(uuid,integer[])','send_live_session_chat(uuid,text)','ask_live_session_question(uuid,text)','raise_live_session_hand(uuid,boolean)',
  'schedule_office_hours(uuid,text,text,timestamptz,timestamptz,integer,text,text)','book_office_hour(uuid,text)','reschedule_office_hour(uuid,uuid)','cancel_office_hour_booking(uuid,text)',
  'create_study_group(uuid,text,text,uuid,text,integer)','join_study_group(uuid)','leave_study_group(uuid)','schedule_study_group_session(uuid,text,timestamptz,timestamptz)',
  'create_whiteboard_session(uuid,uuid,uuid,text)','record_whiteboard_version(uuid,text,text)'
] loop execute format('revoke all on function public.%s from public',signature); execute format('grant execute on function public.%s to authenticated',signature); end loop; end $$;

-- SYRA-REFERENCE-DATA-BEGIN
insert into public.permissions(key,description,risk_level) values
  ('community.moderate','Moderate organization community and communication content','high'),
  ('community.live.manage','Manage organization live learning and attendance','high')
on conflict(key) do update set description=excluded.description,risk_level=excluded.risk_level;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.organization_id is null and r.key in('mentor','organization_admin','enterprise_admin','platform_admin','super_admin')
and p.key in('community.moderate','community.live.manage') on conflict do nothing;
-- SYRA-REFERENCE-DATA-END
