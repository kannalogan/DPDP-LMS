# Question Authoring Guide

## Scope

The Enterprise Question Bank CMS supports organization-scoped question drafts, reusable collections, review workflows, import validation, media, assets, publishing, and immutable version history.

Supported authoring types are single choice, multiple choice, true/false, fill blank, matching, ordering, essay, file upload, coding, scenario, case study, and practical lab reference.

## Boundaries

Students must not access question authoring routes or data. Learner assessment runtime and attempt logic remain frozen.

## Server Boundary

Use `features/question-authoring` for repositories, services, actions, DTOs, schemas, mappers, selectors, validation, permission guards, workflow helpers, and publishing helpers.

All writes go through controlled RPCs. Direct table writes from application code are not allowed.

## Routes

Admin routes live under `/admin/question-bank`. Mentor question-bank routes live under `/mentor/question-bank`. The admin API projection is `/api/admin/question-bank`.
