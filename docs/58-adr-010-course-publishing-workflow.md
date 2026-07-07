# ADR-010: Course Publishing Workflow

## Status

Accepted for Prompt #017.

## Context

Prompt #017 introduces enterprise course authoring after the learning, assessment, certificate, mentor, and admin foundations. The learning domain already owns canonical published entities such as courses, course versions, modules, lessons, resources, categories, and tags.

## Decision

Course authoring uses additive draft and workflow tables. Drafts, reviews, locks, resources, jobs, and publication events live in the authoring domain. Publication RPCs write into the canonical learning tables when an approved draft is published.

All writes are controlled by RPCs. Application code must not perform direct authoring table writes. Students are excluded because the authoring permission is granted only to mentor, instructor, organization admin, enterprise admin, platform admin, and super admin roles.

Published course versions remain immutable through the existing learning-domain protections. Course publication records, publishing events, and version change logs are append-only evidence.

## Consequences

- Draft history can evolve without mutating published learning artifacts.
- Publishing logic remains server-side and auditable.
- Rollback preparation is represented as immutable evidence and future jobs, not as destructive edits.
- Marketplace, AI authoring, billing, reporting, live editing, and external CMS sync remain outside this wave.
