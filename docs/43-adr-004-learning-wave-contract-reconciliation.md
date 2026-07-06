# ADR-004: Learning Wave Contract Reconciliation

- Status: Accepted
- Date: 2026-07-06
- Decision owners: SYRA architecture and data engineering
- Contract references: `docs/21-master-database-contract.md`, `docs/23-master-table-catalog.md`, `docs/24-database-relationship-map.md`, `docs/28-database-security-matrix.md`

## Context

Prompt #011 authorizes the learning-domain migration wave but uses several short labels that conflict with the frozen physical names in the master database contract. It also requests `learning_path_items` while omitting their mandatory parent, `learning_path_versions`. Finally, it requests `study_plans` while explicitly prohibiting the AI wave, even though the frozen `study_plans.ai_interaction_id` column eventually references `ai_interactions`.

The architecture freeze prohibits silent renames and requires an ADR before any necessary deviation.

## Decision

1. The migration uses the frozen physical names:
   - `tracks` maps to `learning_tracks`.
   - `modules` maps to `course_modules`.
   - `resources` maps to `learning_resources`.
   - `bookmarks` maps to `learner_bookmarks`.
   - `notes` maps to `learner_notes`.
   - `favorites` maps to `learner_favorites`.
2. `learning_path_versions` is included as a required dependency of `learning_path_items`. It is not a new pattern or renamed entity; it is the parent fixed by the frozen relationship contract.
3. `study_plans.ai_interaction_id` is created as a nullable UUID but its foreign key is deferred until the approved AI migration creates `ai_interactions`. No AI table, policy, repository, or behavior is introduced in this wave.
4. `enrollments.cohort_id` is created as a nullable UUID but its foreign key is deferred until the separately approved cohort wave creates `cohorts`. No cohort or mentor behavior is introduced here.
5. `study_plan_items`, `learning_activity_events`, and `video_progress` remain deferred because Prompt #011 did not authorize them and the current Student Workspace can represent honest empty goal/timeline states without them.
6. All catalog entities retain the frozen global-or-tenant ownership model. All learner entities retain explicit organization and profile ownership with deny-by-default RLS.

## Consequences

- The physical schema remains compatible with the frozen contract and avoids duplicate aliases such as `modules` or `resources`.
- Learning-path item integrity is enforceable immediately because its version parent exists.
- The AI and cohort boundaries remain intact. Later migrations must add the deferred `study_plans.ai_interaction_id -> ai_interactions.id` and `enrollments.cohort_id -> cohorts.id` foreign keys after verifying existing nullable values.
- Prompt #011 creates 22 physical learning tables: the 21 requested logical entities plus the required `learning_path_versions` parent.
- Any further learning entity or changed relationship requires a separate approved migration and, where it differs from the frozen contract, another ADR.

## Rejected Alternatives

- Creating short-name alias tables or views was rejected because it would silently duplicate or rename frozen entities.
- Pointing `learning_path_items` directly to `learning_paths` was rejected because it would discard immutable version pinning.
- Creating a stub `ai_interactions` table was rejected because AI implementation is explicitly out of scope.
- Omitting `ai_interaction_id` entirely was rejected because retaining the nullable column minimizes future contract drift.
