# Local Workspace Acceptance Bootstrap

## Purpose

The local acceptance bootstrap provisions the smallest tenant graph needed to exercise the existing Student, Mentor, and Admin workspaces. It is operational tooling, not a migration or production seed. It never creates Auth users or credentials.

## Prerequisites

1. Start the local Supabase stack and application.
2. Register three distinct local users through `/auth/register`.
3. Confirm each email through local Mailpit and complete the Auth callback.
4. Add the three emails to `.env.local`:

```dotenv
LOCAL_BOOTSTRAP_STUDENT_EMAIL=
LOCAL_BOOTSTRAP_MENTOR_EMAIL=
LOCAL_BOOTSTRAP_ADMIN_EMAIL=
```

Run:

```bash
npm run local:bootstrap
```

Arguments can override the environment without storing identities in source control:

```bash
npm run local:bootstrap -- \
  --student-email student@example.test \
  --mentor-email mentor@example.test \
  --admin-email admin@example.test
```

## Safeguards

- The command rejects non-loopback Supabase and PostgreSQL URLs.
- Production, preview, staging, and CI execution is rejected.
- All three users must already exist, be distinct, be email verified, and have profiles.
- Passwords are never accepted or persisted.
- The script is absent from `supabase/migrations/` and `db.seed` remains disabled.
- The operation is one transaction with `ON_ERROR_STOP`; partial changes roll back.
- Stable local keys make reruns idempotent and existing records are reused.
- Organization creation, invitations, role acceptance, branding, course publication, mentor assignment, progress, assignment publication, and announcements use existing controlled RPCs.
- Tables without a frozen write RPC receive only the minimum local acceptance links. The bootstrap script does not alter runtime grants or policies.
- The final phase runs as `authenticated` and verifies Student and Mentor RLS visibility plus admin-permission separation.

## Provisioned Graph

- `SYRA Local Acceptance` organization with branding, security settings, and a local acceptance setting.
- Active student, mentor, and organization-admin memberships with the frozen system roles.
- One published track, course, module, and two published lessons.
- One active cohort, student cohort membership, and mentor assignment.
- One enrollment with a 35% first-lesson progress state.
- One published text assignment delivered through the enrollment.
- One cohort announcement.

Assessment data is intentionally omitted. A valid assessment requires the complete question, version, answer-key, section, and form-item graph; fabricating that graph is outside this minimal bootstrap.

## Verification

Open role-specific login return paths:

- Student: `/auth/login?next=/student`
- Mentor: `/auth/login?next=/mentor/dashboard`
- Admin: `/auth/login?next=/admin/dashboard`

Select `SYRA Local Acceptance` in the organization selector after login. Verify the routes listed in the acceptance task and confirm permission-denied states for cross-role routes.

No cleanup command is provided. Published versions, workflow evidence, and audit records are immutable. Use `supabase db reset`, re-register and verify the local identities, then rerun the bootstrap for a clean acceptance cycle.
