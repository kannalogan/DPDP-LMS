# Student Workspace

Prompt #010 implements the first production LMS experience on top of the frozen identity, organization, RBAC, database-contract, design-system, and application-shell layers.

## Scope

The protected `/student` workspace includes home, my learning, progress, timeline, goals, notifications, bookmarks, downloads, achievements, calendar, recent activity, and global student search. It does not implement course or lesson players, assessments, certificate issuance, payments, mentor/admin workspaces, or AI chat/tutoring.

## Data Boundary

`features/student/types.ts` defines the student read-model contract. `StudentWorkspaceRepository` is the only learning-data dependency available to server composition. The current `UnavailableStudentWorkspaceRepository` returns explicit unavailable capability metadata and empty collections because the learning-domain tables and RLS policies approved in the master database contract have not yet been migrated.

This is deliberate:

- No query targets a table that does not exist in the executable migration history.
- No demo user, course, progress, goal, recommendation, notification, certificate, or achievement is fabricated.
- Unknown metrics render as an em dash rather than a misleading zero.
- The UI distinguishes permission denial, expired sessions, route failures, service unavailability, loading, and domain-specific empty states.

Identity, profile, active organization, and `platform.access` continue to resolve through the approved Prompt #008 services. The server-only student composer is cached per request and feature UI contains no database or authorization logic.

## Component Ownership

- `features/student/components/` owns student-specific cards, learning library filters, search, profile summary, calendar, page headers, and workspace states.
- `app/(student)/student/` contains thin App Router composition only.
- `app-shell/student-application-shell.tsx` supplies student navigation through the existing application shell.
- `features/student/student.css` contains feature-scoped responsive styles using frozen semantic tokens.

## Routes

| Route                    | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `/student`               | Intelligent learning home and next-action summary         |
| `/student/learning`      | Searchable/filterable course grid and list                |
| `/student/progress`      | Course, track, skill, assessment, and study-time progress |
| `/student/timeline`      | Chronological learning and deadline events                |
| `/student/goals`         | Daily, weekly, monthly, time, and completion goals        |
| `/student/calendar`      | Date-oriented learning schedule                           |
| `/student/notifications` | Student learning inbox                                    |
| `/student/bookmarks`     | Saved lessons and resources                               |
| `/student/downloads`     | Authorized offline resources                              |
| `/student/achievements`  | XP, level, rank, badges, and achievements                 |
| `/student/activity`      | Recent learning activity                                  |
| `/student/search`        | Courses, lessons, resources, bookmarks, and certificates  |

## Accessibility And Performance

Pages use semantic headings, native links and controls, explicit labels, ARIA current-state/navigation, status announcements, accessible progress, grid semantics for calendars, keyboard-operable filters, visible focus inherited from the design system, and reduced-motion rules. Server Components are the default; only shell interaction, filters, and search are client components. Route loading uses skeletons, route errors are recoverable, and no course media or expensive chart bundle enters the workspace shell.

## Backend Enablement

Replacing the unavailable adapter requires the approved learning-domain migration and RLS wave first. The production adapter must read only authorized projections for `courses`, `course_versions`, `enrollments`, `lesson_progress`, `learning_activity_events`, `learner_bookmarks`, `study_plans`, `notifications`, `certificates`, `badges`, and analytics facts. Any contract deviation requires an ADR before implementation.
