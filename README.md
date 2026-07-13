# SYRA Learning Platform

SYRA is an enterprise AI-first learning platform for compliance, privacy, security, and custom enterprise training. DPDP compliance is the first learning track, but the architecture is reusable across future domains.

## Stack

- Next.js 15 and React 19
- TypeScript with strict compiler settings
- Tailwind CSS v4
- Supabase Auth, PostgreSQL, Storage, and Realtime
- Vercel deployment target

## Engineering Foundation

- Strict TypeScript, ESLint, Prettier, Commitlint, Husky, and lint-staged
- Environment validation for development, testing, staging, and production
- GitHub Actions for lint, typecheck, format, unit test, build, and artifact upload
- Security headers, typed API errors, structured logging, retry utilities, and rate-limit hooks
- Health, readiness, and version endpoints
- Vitest and Playwright infrastructure without fake tests

## Getting Started

```bash
cp .env.development.example .env.local
npm install
npm run dev
```

## Validation

```bash
npm run db:check
npm run lint
npm run typecheck
npm run format
npm run test
npm run build
```

## Phase 0 Database Readiness

The frozen database contract is reconciled forward under ADR-001. The existing SQL migration remains quarantined historical evidence. Prompt #007 adds the first executable wave: 11 deny-by-default trust-foundation tables under ADR-002, with no business seed data or final auth policies.

```bash
# Static checks: no database, Docker, credentials, or network required
npm run db:check

# Optional isolated local Supabase readiness
npm run db:local:check
npm run db:local:start
npm run db:validate
npm run db:local:stop
```

The local harness refuses hosted project links, `DATABASE_URL`, Supabase access tokens and database passwords. It never connects to the developer PostgreSQL database named `dpdp`. See the [Phase 0 reconciliation report](docs/32-phase-0-database-reconciliation.md) and [environment setup](docs/34-supabase-environment-setup.md).

## Identity Platform

Prompt #008 implements Supabase email/password authentication, verification and recovery, profiles/preferences, private avatar uploads, organizations and invitation acceptance, tenant switching, scoped RBAC, middleware session refresh, server permission checks and identity audit/session evidence.

Primary routes: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/invite/[token]`, `/account/profile`, and `/account/organizations`.

See [Identity Platform implementation](docs/40-identity-platform-implementation.md). No student, mentor, administrator or LMS dashboard is included.

## Enterprise UI Platform

Prompt #009 adds SYRA's reusable design tokens, light/dark/system themes, accessible UI primitives, application shell, motion layer, responsive page templates, and AI, learning-content, and enterprise presentation components. Protected account routes use the shell without changing the frozen identity, RBAC, or organization architecture.

Import generic primitives from `@/shared/ui`, domain-neutral presentation components from `@/shared/components`, layouts from `@/shared/layouts`, and shell composition from `@/app-shell`. See the [Enterprise UI Platform guide](docs/41-enterprise-ui-platform.md). This foundation contains no dashboards or LMS pages.

## Student Workspace

Prompt #010 adds the protected `/student` learning home, library, progress, timeline, goals, calendar, notifications, bookmarks, downloads, achievements, activity, and search experiences. The workspace uses real identity, profile, organization, and RBAC context. Learning-domain repositories currently return explicit unavailable and empty states because their approved database tables and policies have not yet been migrated; no demo learning data is embedded.

See the [Student Workspace implementation](docs/42-student-workspace.md).

## Learning Domain

Prompt #011 adds the canonical learning catalog, versioning, enrollment, progress, learner-save, and study-plan tables with forced RLS and published-version immutability. The Student Workspace now reads real Supabase-backed learning projections through server-only repositories. Notifications and later-domain sections retain explicit empty capability states until their approved migrations exist.

No production business seed data is included. See the [Learning Domain implementation](docs/44-learning-domain-implementation.md) and [ADR-004](docs/43-adr-004-learning-wave-contract-reconciliation.md).

## Course And Lesson Delivery

Prompt #012 adds the authenticated `/student/courses` catalog, course/module/lesson routes, typed server repositories, controlled progress RPCs, resource access, bookmarks, and AES-256-GCM private learner notes. The delivery wave is additive and contains no tables or business content seeds.

Set the private server-only `SYRA_NOTE_ENCRYPTION_KEY` to a base64-encoded 32-byte value before enabling notes. Missing configuration fails closed. See the [delivery implementation](docs/46-course-lesson-delivery.md) and [ADR-005](docs/45-adr-005-delivery-routing-and-note-encryption.md).

## Enterprise Assessment Engine

Prompt #013 adds the canonical assessment/question/rubric/attempt/evaluation foundation and protected `/student/assessments` delivery routes. Learner writes use controlled RPCs with ownership, enrollment-course, tenant, window, expiry, and immutable-submission checks. Answer keys remain service-only and no automatic or AI grading is implemented.

See [ADR-006](docs/47-adr-006-assessment-contract-reconciliation.md) and the [Assessment Engine implementation](docs/48-assessment-engine.md).

## Documentation

### Product And Data Architecture

- [Source audit](docs/00-source-audit.md)
- [Master product map](docs/01-master-product-map.md)
- [Module map](docs/02-module-map.md)
- [Database blueprint](docs/03-database-blueprint.md)
- [RLS and security model](docs/04-rls-security-model.md)
- [API and service blueprint](docs/05-api-service-blueprint.md)
- [Feature-first folder map](docs/06-feature-folder-map.md)
- [Implementation roadmap](docs/07-implementation-roadmap.md)
- [AI engine blueprint](docs/08-ai-engine-blueprint.md)
- [DPDP compliance blueprint](docs/09-compliance-dpdp-blueprint.md)
- [Open risks and decisions](docs/10-open-risks-and-decisions.md)

### Master Engine Architecture

- [Master engine architecture](docs/11-master-engine-architecture.md)
- [Engine boundary rules](docs/12-engine-boundary-rules.md)
- [Event catalog](docs/13-event-catalog.md)
- [Workflow catalog](docs/14-workflow-catalog.md)
- [Engine-to-database map](docs/15-engine-to-database-map.md)
- [Engine-to-UI map](docs/16-engine-to-ui-map.md)
- [Engine-to-AI map](docs/17-engine-to-ai-map.md)
- [Engine security rules](docs/18-engine-security-rules.md)
- [Engine testing strategy](docs/19-engine-testing-strategy.md)
- [Engine implementation sequence](docs/20-engine-implementation-sequence.md)

### Master Database Contract

- [Master database contract](docs/21-master-database-contract.md)
- [Master enum catalog](docs/22-master-enum-catalog.md)
- [Master table catalog](docs/23-master-table-catalog.md)
- [Database relationship map](docs/24-database-relationship-map.md)
- [PostgreSQL design standards](docs/25-postgres-design-standards.md)
- [Supabase design standards](docs/26-supabase-design-standards.md)
- [Search and index strategy](docs/27-search-and-index-strategy.md)
- [Database security matrix](docs/28-database-security-matrix.md)
- [Database performance strategy](docs/29-database-performance-strategy.md)
- [Database open decisions](docs/30-database-open-decisions.md)

### Phase 0 Database Readiness

- [ADR-001: forward reconcile database history](docs/31-adr-001-forward-reconcile-database-history.md)
- [Phase 0 reconciliation report](docs/32-phase-0-database-reconciliation.md)
- [Database migration test harness](docs/33-database-test-harness.md)
- [Supabase environment setup](docs/34-supabase-environment-setup.md)
- [RLS test strategy](docs/35-rls-test-strategy.md)
- [Seed validation strategy](docs/36-seed-validation-strategy.md)
- [ADR-002: trust-foundation reconciliation wave](docs/37-adr-002-trust-foundation-wave.md)
- [Trust-foundation implementation status](docs/38-trust-foundation-implementation.md)
- [ADR-003: identity and RBAC bootstrap](docs/39-adr-003-identity-rbac-bootstrap.md)
- [Identity Platform implementation](docs/40-identity-platform-implementation.md)
- [Enterprise UI Platform](docs/41-enterprise-ui-platform.md)
- [Student Workspace](docs/42-student-workspace.md)
- [ADR-004: Learning wave contract reconciliation](docs/43-adr-004-learning-wave-contract-reconciliation.md)
- [Learning Domain implementation](docs/44-learning-domain-implementation.md)
- [ADR-005: Delivery routing and note encryption](docs/45-adr-005-delivery-routing-and-note-encryption.md)
- [Course and Lesson Delivery](docs/46-course-lesson-delivery.md)
- [ADR-006: Assessment contract reconciliation](docs/47-adr-006-assessment-contract-reconciliation.md)
- [Enterprise Assessment Engine](docs/48-assessment-engine.md)
- [ADR-007: Certificate lifecycle contract](docs/49-adr-007-certificate-lifecycle-contract.md)
- [Enterprise Certificate Engine](docs/50-certificate-engine.md)
- [Certificate migration notes](docs/51-certificate-migration-notes.md)
- [ADR-008: Mentor authorization model](docs/52-adr-008-mentor-authorization-model.md)
- [Mentor Workspace](docs/53-mentor-workspace.md)
- [Mentor migration notes](docs/54-mentor-migration-notes.md)
- [ADR-009: Admin workspace operational extensions](docs/55-adr-009-admin-workspace-extensions.md)
- [Admin Workspace](docs/56-admin-workspace.md)
- [Admin migration notes](docs/57-admin-migration-notes.md)
- [ADR-010: Course publishing workflow](docs/58-adr-010-course-publishing-workflow.md)
- [Course Authoring CMS](docs/59-course-authoring-guide.md)
- [Course authoring migration notes](docs/60-course-authoring-migration-notes.md)
- [ADR-011: Question bank architecture](docs/61-adr-011-question-bank-architecture.md)
- [Question Authoring Guide](docs/62-question-authoring-guide.md)
- [Assessment Authoring Guide](docs/63-assessment-authoring-guide.md)
- [Question authoring migration notes](docs/64-question-authoring-migration-notes.md)
- [Enterprise reporting guide](docs/66-enterprise-reporting-guide.md)
- [Enterprise reporting migration notes](docs/67-enterprise-reporting-migration-notes.md)
- [Assignment authoring guide](docs/69-assignment-authoring-guide.md)
- [Student submission guide](docs/70-student-submission-guide.md)
- [Mentor grading guide](docs/71-mentor-grading-guide.md)
- [Rubric guide](docs/72-rubric-guide.md)
- [Assignment and grading migration notes](docs/73-assignment-grading-migration-notes.md)
- [ADR-014: Notification platform lifecycle](docs/74-adr-014-notification-platform-lifecycle.md)
- [Notification platform guide](docs/75-notification-platform-guide.md)
- [Announcement guide](docs/76-announcement-guide.md)
- [Notification platform migration notes](docs/77-notification-platform-migration-notes.md)
- [ADR-015: Governance and compliance lifecycle](docs/78-adr-015-governance-compliance-lifecycle.md)
- [Governance platform guide](docs/79-governance-platform-guide.md)
- [Audit operations guide](docs/80-audit-operations-guide.md)
- [DPDP operations guide](docs/81-dpdp-operations-guide.md)
- [Governance migration notes](docs/82-governance-migration-notes.md)
- [ADR-016: Search and discovery authorization](docs/83-adr-016-search-discovery-authorization.md)
- [Enterprise search architecture guide](docs/84-search-architecture-guide.md)
- [Rule-based recommendation guide](docs/85-rule-based-recommendation-guide.md)
- [Search and discovery migration notes](docs/86-search-discovery-migration-notes.md)
- [ADR-017: Provider-agnostic AI platform foundation](docs/87-adr-017-provider-agnostic-ai-platform.md)
- [Enterprise AI architecture guide](docs/88-ai-architecture-guide.md)
- [AI prompt framework guide](docs/89-ai-prompt-framework-guide.md)
- [AI guardrail guide](docs/90-ai-guardrail-guide.md)
- [AI platform migration notes](docs/91-ai-platform-migration-notes.md)

### Engineering Standards

- [Architecture summary](ARCHITECTURE.md)
- [Extended architecture](docs/architecture.md)
- [Current folder guide](docs/folders.md)
- [Developer onboarding](docs/development/onboarding.md)
- [Environment standard](docs/standards/environment.md)
- [Security standard](docs/standards/security.md)
- [Performance standard](docs/standards/performance.md)
- [Accessibility standard](docs/standards/accessibility.md)
