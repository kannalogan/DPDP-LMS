# Audit Operations Guide

Audits progress from planned to active, fieldwork, closing, and closed states. Findings retain severity, ownership, due dates, remediation actions, and append-only action events. Evidence verification records the reviewer and decision without overwriting historical versions.

## Audit lifecycle

1. An authorized compliance officer starts an audit with a bounded scope and start date.
2. Observations connect testing outcomes to controls.
3. Findings receive a unique organization-scoped reference, severity, owner, and due date.
4. Remediation actions record status changes as append-only action events.
5. Resolution records a summary and timestamp; closure preserves the complete history.

The operational audit tables do not replace `audit_events`. The frozen audit ledger remains the cross-domain record of sensitive system activity, while this module manages audit engagements, findings, actions, and evidence.

## Evidence handling

Evidence metadata is organization scoped. Artifact storage references the existing private storage object registry and supports quarantine status without introducing a scanning vendor. Evidence versions, artifacts, verification outcomes, and audit action events cannot be updated or deleted.

## Verification

Run `npm run db:check` for static contract checks and `supabase db reset` followed by the pgTAP suite for runtime function, RLS, projection, and immutability validation.
