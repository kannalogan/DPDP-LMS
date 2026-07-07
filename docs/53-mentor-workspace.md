# Mentor Workspace Implementation

Prompt #015 adds the Mentor Workspace foundation for secure assigned-cohort operations.

## Database

The additive migration is `supabase/migrations/20260706000500_mentor_workspace.sql`.

It creates:

- `cohorts`
- `cohort_members`
- `mentor_profiles`
- `mentor_assignments`
- `mentor_interventions`
- `learner_reviews`
- `risk_signals`
- `notifications`
- `announcements`
- `announcement_acknowledgements`

It also creates mentor-safe projections:

- `mentor_dashboard_projections`
- `mentor_learner_activity_summaries`
- `mentor_task_queue`
- `mentor_review_queue`

## RPCs

Controlled RPCs own mentor operations:

- `assign_mentor`
- `assign_cohort`
- `record_mentor_note`
- `create_intervention`
- `mark_intervention_complete`
- `publish_announcement`
- `record_dashboard_event`
- `resolve_review_item`

## Routes

- `/mentor`
- `/mentor/dashboard`
- `/mentor/learners`
- `/mentor/learners/[learnerId]`
- `/mentor/cohorts`
- `/mentor/cohorts/[cohortId]`
- `/mentor/reviews`
- `/mentor/tasks`
- `/mentor/announcements`

## Non-Goals

This wave does not implement course authoring, lesson editing, question building, AI grading, chat, live classes, video conferencing, calendar sync or billing.
