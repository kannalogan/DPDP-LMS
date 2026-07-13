#!/usr/bin/env sh
set -eu
migration="supabase/migrations/20260706001100_notification_platform.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-014" "$migration"
grep -q "SYRA-CONTRACT:" "$migration"
grep -q "SYRA-CHANGE: additive" "$migration"
for table in notification_templates notification_template_versions notification_channels notification_preferences notification_categories notification_rules notification_queue notification_deliveries notification_events notification_failures notification_batches announcement_templates announcement_targets announcement_reads workflow_notifications scheduled_notifications deadline_reminders digest_jobs digest_items notification_inbox notification_actions notification_action_events system_messages broadcast_messages communication_audit_events; do grep -q "create table if not exists public.$table" "$migration"; done
for view in notification_inbox_projection announcement_feed_projection notification_preference_projection deadline_reminder_projection notification_delivery_reporting reporting_notification_performance reporting_announcement_engagement; do grep -q "view public.$view" "$migration"; done
for rpc in create_notification create_notification_template save_notification_template_draft publish_notification_template update_notification_channel publish_notification schedule_notification cancel_notification create_announcement publish_announcement mark_notification_read mark_notification_unread archive_notification restore_notification dismiss_notification delete_notification update_preferences send_digest record_delivery_event record_notification_failure; do grep -q "function public.$rpc" "$migration"; done
grep -q "force row level security" "$migration"
grep -q "reject_notification_evidence_mutation" "$migration"
grep -q "provider-neutral" docs/74-adr-014-notification-platform-lifecycle.md
if grep -Eq "(sendgrid|twilio|resend|firebase|onesignal).*api[_ -]?key" "$migration"; then echo "notification check failed: provider integration detected" >&2; exit 1; fi
echo "notification migration check: ok (25 additive tables, 7 projections, 20 controlled RPCs, immutable evidence)"
