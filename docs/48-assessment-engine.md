# Enterprise Assessment Engine

Prompt #013 adds the canonical assessment database wave and secure learner delivery. ADR-006 reconciles Prompt #013 coverage labels with the frozen master database contract; no parallel alias tables or assessment slug column were introduced.

## Routes

- `/student/assessments` lists only assessments assigned through the learner's enrollment.
- `/student/assessments/[assessmentSlug]` shows details, instructions, rules, windows, attempt limits, and history. The route segment contains the stable assessment UUID because the frozen entity has no slug.
- `/student/assessments/[assessmentSlug]/attempt` delivers one frozen attempt question at a time with timer, palette, autosave, review markers, and controlled submission.
- `/student/assessments/[assessmentSlug]/review` shows response status and a pending result until an evaluation is explicitly released.

All routes use the existing protected student shell and active organization context.

## Canonical Data

The migration creates 18 frozen contract tables covering question banks and versions, protected answer keys, rubrics, assessments and versions, form structure, enrollment assignments, frozen attempts, autosaved responses, and evaluation preparation.

Published question, rubric, and assessment versions are immutable. Submitted responses are immutable. No business assessment content is seeded.

## Security

- Learners can read only enrollment-assigned assessment metadata and their own attempts.
- Question versions and options become readable only through the learner's own frozen active or submitted attempt items.
- `question_answer_keys` is S8 and has no `anon` or `authenticated` table privilege or learner policy.
- All lifecycle and response writes use controlled security-definer RPCs; clients cannot insert arbitrary attempts, responses, scores, or evaluations.
- Start validates tenant membership, assignment window, attempt limit, enrollment ownership, and that the assessment belongs to the enrolled course.
- Submission locks responses, changes the attempt to `evaluating`, creates a pending system evaluation, and appends audit evidence. It does not grade or release a score.
- Organization readers receive tenant-scoped attempt projections through existing RBAC. Mentor raw-answer access remains denied until the canonical mentor-assignment dependency exists.

## Question Delivery

The frozen executable registry supports single choice, multiple choice, true/false, short text, long text, numeric, matching, ordering, and file-upload shapes. File upload displays a disabled capability state until the approved response-attachment wave exists.

Hotspot, scenario, fill-blank, code, coding challenge, lab, and AI-evaluated types remain future-ready architecture boundaries. They are not silently added to the frozen registry and require a later contract ADR plus their runner or evaluator service.

## Validation

```bash
npm run db:check
supabase db reset
npm run lint
npm run typecheck
npm run format
npm test
npm run build
```

The local database reset runs `supabase/tests/005_assessment_engine_test.sql` with the existing test harness and contains no production credentials.
