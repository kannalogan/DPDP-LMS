# Notification Platform Migration Notes

Migration `20260706001100_notification_platform.sql` is additive. It reuses existing notification and announcement tables, adds 25 canonical communication tables, extends inbox lifecycle metadata, enforces forced RLS, and creates security-invoker reporting projections. There is no business seed data and no external provider integration.
