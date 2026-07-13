# DPDP Operations Guide

Authenticated users may submit access, correction, erasure, grievance, and consent-withdrawal requests. Requests retain encrypted details, case timelines, documents, due dates, approvals, and completion evidence. Retention actions create jobs and evidence records; legal holds suspend disposition. No destructive deletion is performed by this platform wave.

## Data principal requests

Users submit requests from `/account/privacy/requests`. The system assigns a public-facing case reference, records the organization and requester context, and appends a submitted event. Compliance officers may approve and complete requests through controlled functions. Request details remain encrypted-at-rest application payloads and are excluded from projections and APIs.

Supported request types are access, correction, erasure, grievance, and consent withdrawal. Completion means that the approved operational process has finished; it does not delete immutable audit, legal-hold, consent, or request evidence.

## Consent and purpose

Consent withdrawal evidence references the consent record by hash and includes purpose, actor, withdrawal time, and effective time. The platform never mutates historical consent evidence. Purpose keys and retention policies let compliance teams demonstrate purpose limitation without exposing private learner data.

## Retention and legal hold

Retention policies describe a data category, purpose, jurisdiction, duration, trigger, and review-first action. Jobs produce append-only events for candidate outcomes. Actions are limited to review, archive, anonymize, or restrict; no destructive SQL is part of the migration. Active legal holds are surfaced in retention projections and prevent disposition workflows from being treated as clear to execute.

## Cross-border and processing evidence

Cross-border transfer and processing evidence are represented through versioned controls, framework mappings, evidence artifacts, and immutable governance events. External legal systems and automated legal decisions are intentionally outside this implementation.
