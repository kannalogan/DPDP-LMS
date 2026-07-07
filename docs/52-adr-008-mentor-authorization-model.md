# ADR-008: Mentor Authorization Model

## Status

Accepted.

## Context

Prompt #015 requires mentor monitoring across learners, cohorts, enrollments, assessments and certificates while preserving tenant isolation and preventing access to assessment internals.

The frozen contract defines `mentor_reviews` as `learner_reviews` and generic `interventions` as `mentor_interventions`. Cohort identity and membership are canonicalized as `cohorts` and `cohort_members`.

## Decision

Mentor access is granted by active `mentor_assignments`, not by broad organization membership alone. A mentor can read only cohorts they are actively assigned to and learners who are active members of those cohorts. Organization administrators can manage mentor assignments through `mentor.workspace.manage`.

Dashboard, learner activity, task and review queues are implemented as mentor-safe projections over canonical tables rather than independent authority tables.

Mentor notes are represented as `mentor_interventions` with `type = 'note'` and encrypted note payloads.

## Consequences

Assignment termination immediately removes mentor access while historical reviews and interventions remain. Learners cannot read mentor data. Mentor projections never expose answer keys, private audit events, service-role operations, system configuration, or raw assessment internals.
