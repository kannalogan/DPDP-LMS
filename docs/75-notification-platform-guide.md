# Notification Platform Guide

Notifications are created, scheduled, published, read, archived, restored, dismissed, and digested through controlled RPCs. In-app delivery is available immediately; email, SMS, push, Teams, Slack, and webhook channels are provider-neutral foundations only. Templates use immutable published versions and explicit channel/locale variants.

Recipients read `notification_inbox_projection`. Administrators use organization-scoped projections and never receive direct table write grants. Quiet hours, digest frequency, category preferences, priorities, and channel enablement are persisted per user.
