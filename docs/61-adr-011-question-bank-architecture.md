# ADR-011: Question Bank Architecture

## Status

Accepted for Prompt #018.

## Context

The assessment runtime already owns canonical tables for question banks, questions, question versions, assessments, assessment versions, and runtime assessment sections.

## Decision

Prompt #018 adds an authoring layer around the frozen assessment runtime. Question drafts, imports, collections, review assignments, assessment templates, authoring events, media, assets, publications, and change logs are additive tables. Publishing RPCs map approved authoring drafts into the existing runtime tables without changing learner assessment routes or attempt logic.

All mutations are exposed only through controlled RPCs and server actions. Students are never granted `question.authoring.manage`.

## Consequences

- Runtime assessment delivery remains stable.
- Authoring workflows can evolve without mutating submitted attempts or learner-facing assessment behavior.
- Publication history, authoring events, and question change logs are append-only evidence.
- AI generation, proctoring, analytics, notifications, marketplace, and billing remain outside this wave.
