# ADR-016: Search and discovery authorization

## Status

Accepted for Prompt #023.

## Decision

Search is a rebuildable PostgreSQL projection and never becomes an authorization source or business system of record. Every indexed document references its source entity and source version, contains only display-safe derivative text, and declares one conservative audience: authenticated public catalog, active organization members, one owning profile, or users holding a named permission.

Sensitive entities such as certificates, notifications, gradebooks, privacy requests, questions, reports, and governance evidence cannot be indexed with a general organization audience. Search, autocomplete, recent-item, click, and recommendation functions all re-evaluate the document audience for the current authenticated user before returning or recording the reference.

## Consequences

- Search failures never block direct source navigation.
- A stale index can reduce freshness but must not broaden access.
- Source workflow integrations must remove or replace documents when visibility changes.
- Index text excludes answer keys, private learner data, audit internals, encrypted request details, and non-public profile metadata.
- Rule-based recommendations rank only documents already admitted by the same audience predicate.

No vectors, embeddings, LLMs, external engines, or third-party search services are introduced.
