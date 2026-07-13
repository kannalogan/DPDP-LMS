# ADR-013: Assignment and Grading Lifecycle

Status: accepted

## Context

The frozen catalog defines assignment submissions as open-response assessment artifacts, but the approved assignment platform also requires standalone course, lesson, project, portfolio, practical and offline work. The assessment runtime cannot be changed.

## Decision

Create the missing canonical assignments and assignment_submissions tables additively. A submission belongs to one assignment delivery and may also reference an assessment attempt when the assignment originates from assessment runtime. Submission versions, status events, grading results, rubric scores, resubmission events and gradebook events preserve immutable history.

Existing rubrics, rubric_versions and rubric_criteria remain the scoring authority. Published rubric versions and assignment versions are immutable. All writes use controlled security-definer RPCs with explicit identity, tenant and workflow checks. Storage stays private and uses governed storage_objects metadata plus storage.objects policies.

## Consequences

Standalone assignments no longer require synthetic assessment attempts. Assessment assignments can link to the same evidence model without changing learner assessment behavior. Reporting consumes read-only projections rather than operational tables directly.
