# Course Authoring Guide

## Scope

Prompt #017 adds the Enterprise Course Authoring CMS for platform admins, organization admins, mentors, instructors, instructional designers, and course authors.

Students must not access authoring routes or authoring data.

## Workflow

The approved workflow is:

1. Draft
2. Review
3. Approved
4. Scheduled
5. Published
6. Archived

Rejected drafts return to the editable draft path. Published artifacts are immutable; new changes must create a new draft/version.

## Server Boundary

The application uses `features/course-authoring` for DTOs, mappers, repository access, permission guards, server actions, workflow helpers, publishing helpers, and UI components.

All writes call controlled RPCs:

- `create_course_draft`
- `save_course_draft`
- `submit_course_review`
- `approve_course`
- `reject_course`
- `publish_course`
- `schedule_publication`
- `archive_course`
- `lock_editor`
- `unlock_editor`
- `record_editor_event`

## Routes

Admin routes live under `/admin/authoring`. Mentor authoring routes live under `/mentor/authoring`. The API projection is `/api/admin/authoring`.

## Data Rules

- Do not duplicate canonical learning tables.
- Draft tables reference canonical courses, course versions, modules, lessons, resources, categories, and tags.
- Publication history is append-only.
- Publishing events are append-only.
- Version change logs are append-only.
- No business seed data is permitted.
