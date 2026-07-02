# Architecture

SYRA is a multi-tenant, AI-first LMS where regulatory or professional subject areas are modeled as learning tracks. DPDP is the first track, not the platform boundary.

## Core Principles

- Tenant isolation is enforced in PostgreSQL with organization-scoped tables and Row Level Security.
- Roles are membership based, not hard-coded to one product area.
- Learning tracks, courses, modules, lessons, assessments, attempts, certificates, and AI interactions are reusable across domains.
- Provider integrations are isolated behind service boundaries so OpenAI, Claude, Gemini, Stripe, Razorpay, Resend, and MSG91 can evolve independently.
- UI routes are organized by user workflow: auth, student, mentor, instructor, admin.

## Feature Boundaries

- `features/auth`: session, onboarding, role claims, organization switching.
- `features/organizations`: tenants, memberships, invitations, enterprise settings.
- `features/learning-tracks`: domain registry and track taxonomy.
- `features/courses`: course authoring, modules, lessons, enrollment.
- `features/assessments`: question banks, attempts, scoring, certificates.
- `features/ai`: provider routing, generation, feedback, remediation.
- `features/billing`: Stripe and Razorpay subscriptions, invoices, entitlements.
- `features/users`: profile, learner progress, mentor assignment.

## Data Model

The first migration creates:

- organizations
- organization_members
- learning_tracks
- courses
- course_modules
- lessons
- enrollments
- assessments
- assessment_questions
- assessment_attempts
- certificates
- ai_interactions

All public tables enable RLS. Policies use membership checks, not user-editable metadata.

