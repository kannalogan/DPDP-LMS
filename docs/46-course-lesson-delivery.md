# Course And Lesson Delivery

Prompt #012 turns the frozen learning domain into the authenticated student delivery experience. It does not add content models, business seed data, assessment behavior, authoring, or administrative surfaces.

## Routes

- `/student/courses` provides server-rendered search, track/category/status filters, real progress-aware catalog cards, a continue-learning target, and honest empty/error/loading states.
- `/student/courses/[courseSlug]` provides published metadata, outcomes, modules, resources, enrollment state, and start/resume behavior.
- `/student/courses/[courseSlug]/modules/[moduleId]` uses the stable frozen module UUID under ADR-005 and provides sequence, locks, progress, completion requirements, and lesson shortcuts.
- `/student/courses/[courseSlug]/lessons/[lessonSlug]` provides published lesson content, resources, navigation, progress controls, completion, bookmarks, encrypted private notes, and resume evidence.

All routes remain inside the existing protected student layout. The delivery server boundary resolves the authenticated profile and active organization, requires `organization.read`, and returns typed DTOs rather than database rows.

## Controlled Writes

Migration `20260706000200_learning_delivery.sql` adds no tables and does not rewrite the Prompt #011 migration. It adds controlled RPCs for course/lesson lifecycle, monotonic progress, notes, and bookmarks. The functions validate enrollment ownership, organization membership, lesson/resource membership, and emit learning audit events for material writes.

Direct arbitrary progress mutation remains denied by RLS. Published content versions remain immutable.

## Private Notes

Set `SYRA_NOTE_ENCRYPTION_KEY` only in a private server environment. It must be a base64-encoded 32-byte key. Generate a local key without connecting to Supabase:

```bash
openssl rand -base64 32
```

Notes use AES-256-GCM and are stored as versioned ciphertext. Missing or invalid configuration disables note reading and writing safely; plaintext is never persisted. Do not expose this variable with a `NEXT_PUBLIC_` prefix. Key rotation requires a separate approved re-encryption ADR and procedure.

## Storage And Seeds

Published resource metadata and private objects are selectable only when an authenticated learner has access to the corresponding enrolled course or lesson. Signed URLs are created server-side with a five-minute lifetime.

No catalog, enrollment, note, bookmark, or progress seed rows are included. Local validation therefore exercises empty states unless separately approved local-only content is supplied.

## Validation

```bash
npm run lint
npm run typecheck
npm run format
npm test
npm run db:check
npm run build
```

When Docker and the Supabase CLI are available, run `npm run db:local:start` followed by `npm run db:validate`. The local harness refuses hosted credentials and the developer `dpdp` database.
