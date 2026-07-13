# ADR-014: Notification platform lifecycle

## Status

Accepted for Prompt #021.

## Decision

Reuse the frozen `notifications`, `announcements`, and `announcement_acknowledgements` entities. Add delivery, inbox, preference, workflow, scheduling, digest, action, broadcast, and immutable evidence entities in one forward migration. `notification_templates` is a stable template identity while `notification_template_versions` contains immutable channel and locale content; this reconciles the catalog's versioned-template intent with Prompt #021 without replacing existing runtime tables.

External channels use provider-neutral queue and delivery records only. No provider credential or delivery SDK is introduced. User state changes and administrative publication use controlled RPCs; delivery and audit evidence is append-only.

## Consequences

Existing mentor notifications and announcements remain valid. Student notification placeholders can move to the canonical inbox projection. Future provider workers must claim queue items through a separately approved worker boundary and record every attempt without updating historical evidence.
