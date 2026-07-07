# ADR-006: Assessment Contract Reconciliation

- Status: Accepted
- Date: 2026-07-06
- Decision owners: SYRA architecture, assessment, data, and application security
- Contract references: `docs/21-master-database-contract.md`, `docs/22-master-enum-catalog.md`, `docs/23-master-table-catalog.md`, `docs/24-database-relationship-map.md`, `docs/28-database-security-matrix.md`

## Context

Prompt #013 uses assessment coverage labels that differ from the frozen canonical database contract. The compatibility register in `docs/21-master-database-contract.md` explicitly resolves `assessment_questions` to `assessment_form_items` and `attempt_answers` to `attempt_responses`; it also requires existing approved names to remain canonical. Other requested concepts are already modeled as columns or existing platform evidence rather than separate tables.

The requested route `/student/assessments/[assessmentSlug]` also assumes a slug, while the frozen `assessments` contract defines no slug column.

## Decision

1. Prompt #013 coverage uses the frozen canonical entities. No parallel aliases, compatibility tables, or renamed entities are created.
2. The first assessment wave creates: `question_banks`, `questions`, `question_versions`, `question_options`, `question_answer_keys`, `rubrics`, `rubric_versions`, `rubric_criteria`, `assessments`, `assessment_versions`, `assessment_sections`, `assessment_form_items`, `assessment_assignments`, `assessment_attempts`, `attempt_items`, `attempt_responses`, `evaluations`, and `evaluation_scores`.
3. Requested concepts map as follows:

| Prompt #013 label                        | Frozen canonical authority                                       |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `assessment_collections`                 | `question_banks` and `assessments`                               |
| `assessment_questions`                   | `assessment_form_items`                                          |
| `question_choices`                       | `question_options`                                               |
| `attempt_sections`                       | frozen section reference on `attempt_items`                      |
| `attempt_answers`                        | `attempt_responses`                                              |
| `attempt_events`, `grading_events`       | existing append-only `audit_events`                              |
| `grading_results`, `assessment_feedback` | `evaluations` and `evaluation_scores`                            |
| `question_tags`                          | `question_versions.tags`                                         |
| `question_difficulty_profiles`           | `question_versions.difficulty`; IRT expansion remains deferred   |
| `assessment_rules`                       | versioned fields and `integrity_policy` on `assessment_versions` |
| `assessment_windows`                     | `assessment_assignments.opens_at` and `closes_at`                |
| `question_media`                         | versioned prompt content and future approved storage junction    |

4. Requested route names remain unchanged, but `[assessmentSlug]` carries the stable assessment UUID. No unapproved slug column is added.
5. Cohort assignment is deferred until the canonical `cohorts` dependency wave. This wave supports enrollment assignments only and does not add an unvalidated cohort identifier.
6. Answer keys remain in `question_answer_keys` with service-only RLS and are never selected by learner repositories or returned by RPCs.
7. Objective grading is prepared through a pending `evaluations` record on submission. AI grading, coding runners, labs, and human grading UI remain out of scope.
8. File-upload, hotspot, scenario, fill-blank, code, coding-challenge, and lab types are represented by future-ready renderer/schema boundaries. They are not added to the frozen `question_type` registry or made executable without a later ADR.

## Consequences

- The assessment engine remains one canonical model rather than two competing schemas.
- Existing content, tenant, immutability, encryption, and audit rules remain reusable.
- URLs are stable but opaque, and assessment authors cannot depend on mutable titles.
- Future cohort assignment, media junctions, new question registry values, proctoring signals, and runners require their approved dependency waves.

## Rejected Alternatives

- Creating all Prompt #013 labels as new tables was rejected because it violates the frozen compatibility register.
- Adding `assessments.slug` was rejected because it changes the frozen identity contract.
- Returning answer keys to the browser for client grading was rejected as an S8 security violation.
- Reusing broad direct table writes was rejected because attempt lifecycle and autosave require state-machine enforcement and audit evidence.
