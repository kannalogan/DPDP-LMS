select plan(32);

select has_table('public', 'certificate_templates');
select has_table('public', 'certificate_template_versions');
select has_table('public', 'certificate_eligibility_records');
select has_table('public', 'certificates');
select has_table('public', 'certificate_status_events');
select has_table('public', 'certificate_verification_events');
select has_view('public', 'certificate_public_views');

select row_security_is_enabled('public', 'certificate_templates');
select row_security_is_enabled('public', 'certificate_template_versions');
select row_security_is_enabled('public', 'certificate_eligibility_records');
select row_security_is_enabled('public', 'certificates');
select row_security_is_enabled('public', 'certificate_status_events');
select row_security_is_enabled('public', 'certificate_verification_events');

select has_function('public', 'issue_certificate', array['uuid', 'uuid', 'text', 'text', 'uuid']);
select has_function('public', 'verify_certificate', array['text', 'text', 'text', 'text']);
select has_function('public', 'download_certificate', array['uuid']);
select has_function('public', 'record_certificate_download', array['uuid', 'text']);
select has_function('public', 'revoke_certificate', array['uuid', 'text', 'text', 'jsonb']);
select has_function('public', 'record_verification_event', array['uuid', 'text', 'text']);

select has_trigger('public', 'certificate_template_versions', 'certificate_template_versions_reject_published_mutation');
select has_trigger('public', 'certificates', 'certificates_reject_mutation');
select has_trigger('public', 'certificate_status_events', 'certificate_status_events_reject_mutation');
select has_trigger('public', 'certificate_verification_events', 'certificate_verification_events_reject_mutation');
select has_trigger('public', 'certificate_eligibility_records', 'certificate_eligibility_records_reject_mutation');

select has_policy('public', 'certificates', 'certificates_select');
select has_policy('public', 'certificate_templates', 'certificate_templates_manage');
select has_policy('public', 'certificate_template_versions', 'certificate_template_versions_manage');
select has_policy('public', 'certificate_eligibility_records', 'certificate_eligibility_records_insert');
select has_policy('public', 'certificate_status_events', 'certificate_status_events_select');
select has_policy('public', 'certificate_verification_events', 'certificate_verification_events_select');

select isnt_empty($$select 1 from public.permissions where key in ('certificate.template.manage','certificate.issue')$$);
select is_empty($$select 1 from public.certificates$$, 'certificate wave includes no seed certificates');

select * from finish();
