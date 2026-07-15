#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
MIGRATION="$ROOT/supabase/migrations/20260706001700_community_live_learning.sql"
test -f "$MIGRATION" || { echo "Missing community migration" >&2; exit 1; }
for table in community_spaces community_members discussion_categories discussion_topics discussion_posts discussion_post_revisions discussion_reactions discussion_bookmarks discussion_reports chat_channels chat_members chat_messages chat_message_reads chat_attachments live_sessions live_session_hosts live_session_participants live_session_recordings live_session_chat live_session_questions live_session_polls live_session_poll_votes live_session_attendance live_session_events office_hours office_hour_bookings study_groups study_group_members study_group_sessions whiteboard_sessions meeting_provider_accounts communication_events; do
  grep -Eq "create table public\.${table}[ (]" "$MIGRATION" || { echo "Missing community table: $table" >&2; exit 1; }
done
for view in community_dashboard_projection live_learning_projection mentor_communication_projection student_activity_projection reporting_community_projection; do
  grep -Eq "view public\.${view} with \(security_invoker=true\)" "$MIGRATION" || { echo "Unsafe or missing community view: $view" >&2; exit 1; }
done
for rpc in create_discussion reply_discussion edit_post delete_post react_post bookmark_post report_post create_chat_channel send_message mark_message_read create_live_session start_live_session end_live_session join_live_session record_attendance create_poll vote_poll schedule_office_hours book_office_hour create_study_group record_communication_event; do
  grep -q "function public\.${rpc}(" "$MIGRATION" || { echo "Missing community RPC: $rpc" >&2; exit 1; }
done
grep -q "force row level security" "$MIGRATION"
grep -q "reject_communication_evidence_mutation" "$MIGRATION"
grep -q "revoke all on table" "$MIGRATION"
grep -q "grant select(id,organization_id,message_id" "$MIGRATION"
if grep -Eqi "to[[:space:]]+anon|service_role|api[_-]?key|access[_-]?token|refresh[_-]?token" "$MIGRATION"; then echo "Community migration exposes a forbidden role or credential field" >&2; exit 1; fi
echo "Community and live learning migration check: ok"
