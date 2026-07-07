select plan(34);

select has_table('public', 'organization_domains');
select has_table('public', 'organization_branding');
select has_table('public', 'organization_audit_preferences');
select has_table('public', 'organization_security_settings');
select has_table('public', 'organization_integrations');
select has_table('public', 'admin_dashboard_events');
select has_table('public', 'organization_usage_snapshots');
select has_table('public', 'platform_announcements');
select has_table('public', 'organization_settings');
select has_table('public', 'organization_invitations');

select has_view('public', 'admin_organization_overview');
select has_view('public', 'admin_dashboard_projection');

select row_security_is_enabled('public', 'organization_domains');
select row_security_is_enabled('public', 'organization_branding');
select row_security_is_enabled('public', 'organization_security_settings');
select row_security_is_enabled('public', 'organization_integrations');
select row_security_is_enabled('public', 'admin_dashboard_events');
select row_security_is_enabled('public', 'organization_usage_snapshots');
select row_security_is_enabled('public', 'platform_announcements');

select has_function('public', 'create_organization_invitation', array['uuid', 'text', 'text', 'text', 'uuid', 'timestamp with time zone']);
select has_function('public', 'revoke_organization_invitation', array['uuid']);
select has_function('public', 'activate_domain', array['uuid', 'text', 'text']);
select has_function('public', 'verify_domain', array['uuid']);
select has_function('public', 'update_branding', array['uuid', 'text', 'jsonb', 'uuid']);
select has_function('public', 'update_security_settings', array['uuid', 'boolean', 'integer', 'jsonb']);
select has_function('public', 'record_dashboard_event', array['uuid', 'text', 'text', 'jsonb']);
select has_function('public', 'publish_platform_announcement', array['text', 'jsonb', 'text']);
select has_function('public', 'archive_platform_announcement', array['uuid']);

select has_trigger('public', 'admin_dashboard_events', 'admin_dashboard_events_reject_mutation');
select has_trigger('public', 'organization_usage_snapshots', 'organization_usage_snapshots_reject_mutation');
select has_policy('public', 'organization_domains', 'organization_domains_select_admin');
select has_policy('public', 'platform_announcements', 'platform_announcements_select_admin');
select isnt_empty($$select 1 from public.permissions where key = 'admin.workspace.manage'$$);
select is_empty($$select 1 from public.admin_dashboard_events$$, 'admin wave includes no business seed events');

select * from finish();
