# ADR-020: Community and Live Learning Boundary

## Status

Accepted for Prompt #027.

## Decision

Community spaces, discussions, messaging, live learning, office hours, study groups, and whiteboard metadata are one additive communication domain. All writes use controlled RPCs. Existing identity, organization, notification, audit, reporting, and course entities remain authoritative.

Discussion revisions, chat reads, attendance, recording metadata, poll votes, whiteboard versions, and communication events are append-only evidence. Direct client writes are denied. Views use `security_invoker`; attachment projections omit storage paths and checksums, and booking projections omit mentor-private notes.

Meeting providers are metadata abstractions only. Database records may contain provider type, capability, region, health, and external references, but never credentials or join secrets. No vendor SDK is introduced.

## Consequences

- Search and reporting consume projections rather than bypassing community RLS.
- Mentors and administrators moderate only through existing organization permissions.
- Private channels require active membership and reject cross-tenant participants.
- Whiteboards store version, snapshot, and export references only; no drawing engine is included.
