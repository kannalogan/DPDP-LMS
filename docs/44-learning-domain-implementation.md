# Learning Domain Foundation

Prompt #011 implements the first executable learning-domain wave and replaces the Student Workspace readiness adapter with server-side Supabase repositories.

## Architecture Decision

[ADR-004](43-adr-004-learning-wave-contract-reconciliation.md) records the required reconciliation between Prompt #011 shorthand and the frozen physical contract. The migration uses canonical names, includes `learning_path_versions` as the required parent of `learning_path_items`, and defers only foreign keys to the prohibited cohort and AI waves.

## Migration

`supabase/migrations/20260706000100_learning_domain.sql` creates 22 physical tables:

- Catalog: `learning_tracks`, `course_categories`, `courses`, `course_versions`, `course_modules`, `lessons`, `lesson_versions`, `learning_resources`, `resource_versions`, `tags`, `course_tags`.
- Paths: `learning_paths`, `learning_path_versions`, `learning_path_items`.
- Learner state: `enrollments`, `lesson_progress`, `module_progress`, `course_progress`, `learner_bookmarks`, `learner_notes`, `learner_favorites`, `study_plans`.

All tables enable and force RLS. Published course, lesson, resource, and path versions reject updates and deletes. Catalog reads require authenticated access to published global content or active membership for tenant content. Catalog writes require the deployment-owned `learning.catalog.manage` permission assigned only to platform and super-admin roles. Enrollment/progress reads are self-scoped or organization-staff scoped. Bookmark, note, favorite, and study-plan writes lock both `profile_id` and `organization_id` to current database state.

Anonymous roles receive no table grants. Application code uses the normal server-side session client and never imports the service-role client.

## Repository Adapter

`SupabaseStudentWorkspaceRepository` implements:

- `getStudentWorkspaceSummary`
- `getStudentCourses`
- `getStudentProgress`
- `getStudentTimeline`
- `getStudentGoals`
- `getStudentBookmarks`
- `getStudentNotificationsView`
- `searchStudentLearning`

The server facade resolves the verified profile, active organization, and `organization.read` permission before invoking the adapter. Queries repeat profile/organization filters for bounded plans while RLS remains authoritative. Database projections are converted to feature DTOs; raw rows are not returned to UI components.

Assessment, certificate, badge, activity-event, study-plan-item, and notification tables remain outside this wave. Their Student Workspace sections keep honest empty states. The notification repository returns an explicit partial-capability reason until its approved table wave exists.

## Seed Strategy

No `supabase/seed.sql` or business seed data is added. The migration inserts one deployment-owned permission registry key and its platform-role composition inside the approved reference-data boundary. There are no users, profiles, organizations, courses, enrollments, notes, bookmarks, or study plans in production migrations.

Local catalog fixtures may be introduced only through a future separately reviewed local-only script that refuses CI, hosted links, and production-like environments. The existing seed validation policy remains authoritative.

## Database Types

Type generation is local-only and refuses hosted links or credential-bearing environments:

```bash
npm run db:local:start
npm run db:validate
npm run db:types
npm run db:local:stop
```

`npm run db:types` writes `lib/supabase/database.types.ts` only from the isolated local stack. No types were generated during Prompt #011 when Docker was unavailable. The repositories therefore use narrow internal projection types at their mapping boundary.

## Validation

Static validation:

```bash
npm run db:check
npm run lint
npm run typecheck
npm run format
npm test
npm run build
```

Runtime validation requires Docker and the local Supabase CLI. When available, `npm run db:validate` applies local migrations, runs schema lint, and executes pgTAP including `003_learning_domain_test.sql`. It must never connect to the developer PostgreSQL database named `dpdp`.
