# ADR-015: Governance and compliance lifecycle

## Status

Accepted for Prompt #022.

## Decision

Implement governance as an additive organization-scoped platform. Published controls and policies are immutable versions; evidence, consent withdrawals, retention outcomes, privacy timelines, risk reviews, approvals, and governance events are append-only. The existing `audit_events` table remains the cross-domain audit authority while governance entities provide operational cases and evidence.

Privacy and retention workflows never physically delete regulated evidence. Erasure and retention operations create controlled jobs and immutable outcomes, subject to legal holds. Users access only their own privacy cases, consent withdrawals, policy assignments, and acknowledgements.
