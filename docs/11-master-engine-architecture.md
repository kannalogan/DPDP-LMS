# Master Engine Architecture

## Engine Model

SYRA is engine-driven: pages compose engine capabilities but never become systems of record. An engine is a bounded business capability with explicit data ownership, commands, queries, events, security policy and operational SLOs. Engines are logical boundaries inside the feature-first Next.js application; they are not an instruction to create 55 deployable microservices.

The approved runtime is Next.js App Router plus Supabase Auth/PostgreSQL/Storage/Realtime, narrowly scoped Supabase Edge Functions, Vercel, Resend, MSG91, Stripe, Razorpay and governed OpenAI/Claude/Gemini adapters. Legacy documents contribute product behavior only. Django, DRF, Celery, Prisma, Redis-as-authority, AWS S3, SendGrid, Vite and API-middleware-only isolation are rejected.

### Common Interface Rules

- **Commands:** authenticated UI commands use Server Actions; external/public/streaming/provider operations use Route Handlers; durable asynchronous work uses database-backed jobs plus Edge Functions.
- **Queries:** Server Components and feature queries use request-scoped Supabase clients under RLS. Public reads use minimal projections.
- **Events:** durable past-tense facts use the catalog in `docs/13-event-catalog.md`; consumers are idempotent and at-least-once safe.
- **Audit:** privileged, privacy-sensitive, financial and consequential transitions append actor, tenant, purpose, resource, outcome and correlation evidence.
- **Privacy:** every P2/P3/P4 flow declares purpose, minimization, retention and authorized recipients.

## 1. Identity Engine

- **Purpose/users:** Establish authenticated human identities and sessions for every user; guests, learners, mentors, administrators, TPOs and partner users interact with it.
- **Responsibilities/ownership:** Own identity linking, session state, MFA posture, recovery and authentication assurance; Supabase Auth owns credentials while `profiles` owns the application identity link.
- **Never owns:** Tenant membership, role authority, course access, consent validity or feature preferences.
- **Data/services:** `auth.users`, `profiles`; Supabase Auth, Resend and optional MSG91 verification behind notification policy.
- **Interfaces:** sign-in, sign-out, recovery, verification and MFA Server Actions/Route Handlers; server session resolver. No custom JWT-per-portal scheme.
- **Events:** emits `identity.registered`, `identity.verified`, `identity.session_revoked`; consumes membership suspension and security-risk decisions.
- **AI/UI:** no model decision; auth, verification, recovery, session-expired and step-up UI states.
- **Security/RLS/audit/privacy:** generic errors prevent enumeration; secure same-site cookies, rotation, MFA and rate limits; self profile access; audit recovery, MFA and revocation; P2/R1.
- **Failure/scale/testing/future:** provider outage degrades new sessions but not valid sessions; test fixation, replay, revocation and multi-device scale; future enterprise SSO/passkeys/SCIM after ADR.

## 2. Authorization Engine

- **Purpose/users:** Decide whether an actor may perform a capability in a tenant/resource scope; every engine and role depends on it.
- **Responsibilities/ownership:** Own permission vocabulary, role composition, scoped grants, delegation and application-level denial explanations.
- **Never owns:** Authentication, organization lifecycle, resource business state or audit storage.
- **Data/services:** `roles`, `permissions`, `role_permissions`, `member_role_assignments`; indexed PostgreSQL policy helpers.
- **Interfaces:** server-only `authorize(command, context)` and grant/revoke actions; no general client permission mutation API.
- **Events:** emits `authorization.assignment_granted/revoked`; consumes membership and resource-assignment lifecycle events.
- **AI/UI:** AI tools receive only already-authorized context; UI may hide/disable commands but RLS remains authoritative.
- **Security/RLS/audit/privacy:** least privilege, no self-escalation or delegation beyond grantor, time/scope bounds, stale-JWT-safe DB authority; every grant change audited.
- **Failure/scale/testing/future:** fail closed on resolver errors; cache only low-volatility decisions with revocation; exhaustive role/resource/two-tenant tests; future ABAC conditions without replacing RBAC.

## 3. Organization / Tenant Engine

- **Purpose/users:** Establish customer ownership boundaries and optional enterprise hierarchy for organization and enterprise admins.
- **Responsibilities/ownership:** Own organization identity, parent relationship, verified domains, lifecycle, privacy contacts and tenant resolution.
- **Never owns:** User credentials, member role definitions, billing transactions or learning records.
- **Data/services:** `organizations`, `organization_domains`, tenant-owned settings references; domain verification service.
- **Interfaces:** create/update/suspend organization and verify domain actions; tenant resolver for every request.
- **Events:** emits `organization.created/updated/suspended`, `organization.domain_verified`; consumes subscription and security decisions.
- **AI/UI:** tenant policy scopes every AI call; organization switcher, profile, hierarchy and lifecycle UI.
- **Security/RLS/audit/privacy:** every owned query begins with `organization_id`; hierarchy traversal is explicit and cycle-safe; all lifecycle/domain changes audited; P1/P2.
- **Failure/scale/testing/future:** ambiguous tenant fails closed; index hierarchy/status, benchmark 1,000+ tenants; test sibling isolation; future regional project routing and approved enterprise rollups.

## 4. User Profile Engine

- **Purpose/users:** Manage the minimum application profile and user-controlled preferences for all authenticated people.
- **Responsibilities/ownership:** Own display name, locale, timezone, avatar reference, accessibility settings and profile status projection.
- **Never owns:** Auth credentials, tenant roles, career resume, consent evidence or assessment data.
- **Data/services:** `profiles`, `user_settings`, governed `storage_objects` avatar reference.
- **Interfaces:** get/update own profile and accessibility preferences; scoped minimal staff projection.
- **Events:** emits `profile.updated`, `profile.status_changed`; consumes identity link and privacy execution events.
- **AI/UI:** locale/accessibility may shape output presentation, never authorization; profile/settings/avatar UI.
- **Security/RLS/audit/privacy:** allowlisted self updates, staff field minimization, avatar validation; audit status and sensitive changes; P2/R1.
- **Failure/scale/testing/future:** profile creation is idempotent after Auth hook; test overposting and cross-user reads; future portable profile and localization without identity duplication.

## 5. Learning Track Engine

- **Purpose/users:** Catalog reusable learning domains so DPDP is one track among unlimited future tracks; content admins, organizations and learners use it.
- **Responsibilities/ownership:** Own track identity, domain taxonomy, ownership, publication status and compliance-pack association.
- **Never owns:** Course versions, enrollment, progress, DPDP statutory logic or tenant entitlement.
- **Data/services:** `learning_tracks`; search/index projection and compliance-pack contract.
- **Interfaces:** create/review/publish/archive track actions; catalog Route Handler/query for published tracks.
- **Events:** emits `track.created/published/archived`; consumes feature/entitlement changes.
- **AI/UI:** track taxonomy constrains retrieval/recommendation; global/private track catalog and admin review UI.
- **Security/RLS/audit/privacy:** published global or owning-tenant visibility; assigned content-admin writes; publication audited; P0/P1.
- **Failure/scale/testing/future:** invalid taxonomy blocks publication; index domain/status; test tenant-private visibility; future standards mappings and marketplace distribution.

## 6. Course Engine

- **Purpose/users:** Define reusable courses and immutable published versions for authors, instructors, organizations and learners.
- **Responsibilities/ownership:** Own course identity, versions, outcomes, locale, difficulty, publication workflow and version-level prerequisites.
- **Never owns:** Module content, enrollment progress, assessment attempts or certificate issuance.
- **Data/services:** `courses`, `course_versions`; Content Versioning, Search and Audit services.
- **Interfaces:** draft/review/publish/retire actions and authorized catalog/detail queries.
- **Events:** emits `course.created`, `course.version_published`, `course.retired`; consumes track lifecycle and entitlement changes.
- **AI/UI:** generation/summarization creates drafts only; authoring review, catalog and course-detail UI.
- **Security/RLS/audit/privacy:** drafts assigned authors only, published versions immutable, tenant-private isolation; publication/change audit; P1/R10.
- **Failure/scale/testing/future:** incomplete outcomes/structure block publish; cache immutable versions; contract and concurrent-publish tests; future co-authoring, approvals and syndicated catalogs.

## 7. Module Engine

- **Purpose/users:** Organize a course version into ordered learning units and completion gates.
- **Responsibilities/ownership:** Own module title/order, completion/unlock rules and relationship to lessons/assessments.
- **Never owns:** Lesson bodies, learner completion, score calculation or calendar-based cohort blocking.
- **Data/services:** `course_modules`; Course, Lesson, Progress and Assessment contracts.
- **Interfaces:** add/reorder/configure module actions; authorized structure query.
- **Events:** emits `module.structure_changed`, `module.rule_changed`; consumes course publication state.
- **AI/UI:** AI may suggest draft outlines; curriculum tree and learner module navigation.
- **Security/RLS/audit/privacy:** inherit course draft/published policy; self-paced legacy rule means no cohort-date gating; audit rule/order changes.
- **Failure/scale/testing/future:** cycles/invalid positions rejected; ordered composite indexes; test performance-gated unlock; future optional/elective branches.

## 8. Lesson Engine

- **Purpose/users:** Deliver versioned learning activities such as video, reading, case and interactive lessons.
- **Responsibilities/ownership:** Own stable lesson identity, ordered placement, versioned body, type, duration and completion declaration.
- **Never owns:** Raw media bytes, learner progress, quiz scoring or course publication authority.
- **Data/services:** `lessons`, `lesson_versions`, `learning_resources`; Media, Versioning and Progress contracts.
- **Interfaces:** author/review/publish lesson actions; enrolled learner lesson query; completion command delegates to Progress.
- **Events:** emits `lesson.version_published`, `lesson.opened`; consumes module/course status.
- **AI/UI:** tutor/summarizer context is bound to published version; lesson player and author preview UI.
- **Security/RLS/audit/privacy:** entitlement before content, draft author scope, sanitized rich content, external-video disclosure; publication audited; P1.
- **Failure/scale/testing/future:** missing resource/dependency blocks publish; immutable-version caching and streaming; test XSS, content authorization and accessibility; future labs/SCORM only by ADR.

## 9. Content Versioning Engine

- **Purpose/users:** Make published learning and policy artifacts reproducible for authors, auditors and credential/evaluation engines.
- **Responsibilities/ownership:** Own version-state machine, content hashes, review approvals, effective/publish timestamps and supersession links.
- **Never owns:** Artifact semantics, editor UI, learner assignment or Storage bytes.
- **Data/services:** version fields across course, lesson, question, rubric, template, notice and prompt tables; Audit/Event engines.
- **Interfaces:** create draft from version, submit review, approve, publish and diff queries.
- **Events:** emits `<artifact>.version_submitted/approved/published/superseded`; consumes review and policy decisions.
- **AI/UI:** generated content remains a provenance-tagged draft; diff/review/history UI.
- **Security/RLS/audit/privacy:** published records deny update/delete; approver separation for high-risk artifacts; every transition audited.
- **Failure/scale/testing/future:** conflicting publication uses optimistic version checks; content-addressed cache; test immutable enforcement/races; future multi-stage approvals and scheduled activation.

## 10. Media / Storage Engine

- **Purpose/users:** Govern private uploads, generated artifacts and externally hosted learning media.
- **Responsibilities/ownership:** Own object metadata, classification, tenant-prefixed paths, checksums, signed grants, malware/type/size validation and lifecycle.
- **Never owns:** Parent-resource authorization, lesson semantics, certificate validity or provider-specific UI.
- **Data/services:** `storage_objects`, `learning_resources`; Supabase Storage and approved external video provider.
- **Interfaces:** request/finalize upload, signed download and external-media registration Route Handlers/Actions.
- **Events:** emits `storage.object_uploaded/scanned/deleted`; consumes parent retention/deletion and certificate generation.
- **AI/UI:** media may enter AI only under engine purpose; uploader, progress, preview, caption/transcript and failure states.
- **Security/RLS/audit/privacy:** parent authorization precedes grant, short expiry, no public sensitive buckets, download audit for P3/P4; disclose external video data transfer.
- **Failure/scale/testing/future:** orphan uploads quarantined/expired; CDN and multipart scaling; test path traversal/MIME/polyglot/signed URL expiry; future transcoding/caption pipeline.

## 11. Progress Engine

- **Purpose/users:** Record learner activity and derive trustworthy lesson/module/course completion for learners, mentors and reporting.
- **Responsibilities/ownership:** Own enrollments' progress snapshots, append-only activity, playback checkpoints, completion rules and streak inputs.
- **Never owns:** Course structure, assessment scoring, cohort membership or gamification balances.
- **Data/services:** `enrollments`, `lesson_progress`, `learning_activity_events`, `video_progress`; Event, Workflow and Analytics engines.
- **Interfaces:** start/update/complete lesson Server Actions and learner/mentor progress queries.
- **Events:** emits `lesson.started/progressed/completed`, `module.completed`, `course.completed`; consumes enrollment and released assessment results.
- **AI/UI:** feeds minimized mastery context to recommendations/tutor; progress bars, resume state, locked/completed states.
- **Security/RLS/audit/privacy:** self writes only through validated commands, mentor via active assignment, server completion authority; activity is P3/R2.
- **Failure/scale/testing/future:** duplicate/out-of-order events dedupe by idempotency/version; partition activity and update projections asynchronously; test race/offline/replay/unlock rules; future xAPI import by contract.

## 12. Assessment Engine

- **Purpose/users:** Define reusable quiz/exam policies and control attempt eligibility/lifecycle for learners, instructors and evaluators.
- **Responsibilities/ownership:** Own assessment identity/version, form composition, windows, limits, timer, randomization, prerequisites and attempt lifecycle.
- **Never owns:** Canonical question content/keys, assignment artifacts, evaluation method or learner progress.
- **Data/services:** `assessments`, `assessment_versions`, `assessment_form_items`, `assessment_assignments`, `assessment_attempts`, `attempt_items`, `attempt_responses`, integrity tables.
- **Interfaces:** create/publish/assign assessment; start/save/submit attempt actions using transactional DB functions.
- **Events:** emits `assessment.published/assigned/attempt_started/attempt_submitted/expired`; consumes enrollment, progress, retake grants and evaluation completion.
- **AI/UI:** no hidden keys enter learner AI context; authoring, timed attempt, autosave, submit, result-pending and appeal UI.
- **Security/RLS/audit/privacy:** server time and form freeze, owner-only active responses, submitted immutability, anti-cheat without covert surveillance; P3/R2, high-risk actions audited.
- **Failure/scale/testing/future:** network loss preserves local/server versions, atomic expiry/submission; millions of attempts require partitions/indexes; test timing/races/randomization/key leakage/load; future adaptive forms after fairness review.

## 13. Question Bank Engine

- **Purpose/users:** Manage reusable, versioned assessment items for instructors and reviewers.
- **Responsibilities/ownership:** Own banks, question identities/versions, options, tags, difficulty and protected answer/evaluation keys.
- **Never owns:** Assessment scheduling, learner form instances, attempts or released scores.
- **Data/services:** `question_banks`, `questions`, `question_versions`, `question_options`, `question_answer_keys`; Versioning and Search.
- **Interfaces:** draft/import/review/publish/retire actions and author-only search/query.
- **Events:** emits `question.version_published/retired`; consumes AI draft generation and review decisions.
- **AI/UI:** quiz generator creates drafts with sources; question editor, reviewer diff and item-analysis UI.
- **Security/RLS/audit/privacy:** learners never select banks/keys; keys separately encrypted/restricted; publish and key access audited.
- **Failure/scale/testing/future:** invalid distractors/key schemas block publish; tag/search indexes; test client bundles/API/RLS for key leakage; future item variants and multilingual linking.

## 14. Assignment Engine

- **Purpose/users:** Manage open-ended briefs, submissions and artifact handoff for learners and evaluators.
- **Responsibilities/ownership:** Own assignment-specific instructions, submission constraints, text/file artifact reference and submission freeze.
- **Never owns:** Generic assessment policy, rubric definitions, evaluation decisions or Storage internals.
- **Data/services:** assignment-kind assessment versions, `assignment_submissions`, attempt records, `storage_objects`; Media and Evaluation.
- **Interfaces:** configure assignment, request upload, save draft and submit actions; evaluator submission query.
- **Events:** emits `assignment.draft_saved/submitted`; consumes assessment assignment and storage scan events.
- **AI/UI:** AI assistance/evaluation follows declared policy and attribution; brief, upload/editor, submission receipt and evaluator handoff UI.
- **Security/RLS/audit/privacy:** owner pre-submit, assigned evaluator post-submit, scanned private files, submitted immutability; P3/R2 and downloads audited.
- **Failure/scale/testing/future:** upload scan/submit race fails safely; large objects stay out of DB; test file abuse, deadline and duplicate submit; future peer review/plagiarism adapter by ADR.

## 15. Evaluation Engine

- **Purpose/users:** Produce reviewable scores and feedback from deterministic, human or governed AI evaluation.
- **Responsibilities/ownership:** Own evaluation lifecycle, criterion/item scores, finalization, release, override and appeal linkage.
- **Never owns:** Attempts/responses, rubric content, retake authority, progress or certificate rules.
- **Data/services:** `evaluations`, `evaluation_scores`; Rubric/Question, AI Evaluation, Notification and Audit engines.
- **Interfaces:** claim/review/finalize/release/override actions and released-result queries.
- **Events:** emits `evaluation.completed/released/overridden`; consumes attempt/assignment submission and AI proposal events.
- **AI/UI:** AI scores are proposals with evidence/confidence; evaluator queue, rubric form, learner feedback and appeal UI.
- **Security/RLS/audit/privacy:** blind marking where configured, evaluator assignment, append-only override reason, learner sees released safe result; P3/R2/R4.
- **Failure/scale/testing/future:** inconsistent/low-confidence result routes to human; work queues and batch deterministic scoring; calibration/variance/race tests; future double marking and moderation.

## 16. Certificate Engine

- **Purpose/users:** Issue, expire, renew and revoke evidence-backed credentials for learners and credential administrators.
- **Responsibilities/ownership:** Own templates/versions, eligibility policy, immutable issuance snapshot, artifact generation and status history.
- **Never owns:** Course completion facts, assessment scores, public token response or payment entitlement.
- **Data/services:** `certificate_templates`, `certificate_template_versions`, `certificates`, `certificate_status_events`; Storage, Workflow and Notification.
- **Interfaces:** configure/publish template, evaluate eligibility, issue/revoke/renew actions and learner credential queries.
- **Events:** emits `certificate.issued/generated/expired/revoked`; consumes course completion, evaluation release and scheduled expiry.
- **AI/UI:** no AI issuance decision; template admin, issuance status, learner certificate and reasoned revoke UI.
- **Security/RLS/audit/privacy:** idempotent issuance, immutable snapshot/status events, artifact signed access, scoped revoke with step-up; P2/R3/R4.
- **Failure/scale/testing/future:** generation failure leaves retryable pending state, never duplicate credential; queue and batch expiry scale; eligibility/idempotency/PDF tests; future badges/standards wallets.

## 17. Certificate Verification Engine

- **Purpose/users:** Let guests and auditors verify a credential without accessing learner accounts.
- **Responsibilities/ownership:** Own non-enumerable verification token/projection, response policy, anti-abuse and verification telemetry.
- **Never owns:** Certificate status authority, internal profile, contact data, assessment result or artifact mutation.
- **Data/services:** `certificate_public_views` backed by certificate/status data; rate limiting and server cache.
- **Interfaces:** anonymous exact-token Route Handler/page; no list/search endpoint.
- **Events:** emits `certificate.verification_viewed`; consumes issued/expired/revoked status changes.
- **AI/UI:** none; public valid/expired/revoked/not-found states with minimal fields.
- **Security/RLS/audit/privacy:** server function only, high-entropy token, path/log redaction, bounded cache invalidation, P2 public only under approved basis.
- **Failure/scale/testing/future:** stale cache must not hide revocation; CDN/rate limit high-volume reads; enumeration/leak/cache tests; future signed QR/VC verification.

## 18. Gamification Engine

- **Purpose/users:** Encourage learning through transparent points, badges and streaks without distorting assessment or employment decisions.
- **Responsibilities/ownership:** Own versioned earning rules, append-only points/badge facts, reversals and derived balances.
- **Never owns:** Progress facts, scores, leader eligibility, course unlock or punitive ranking.
- **Data/services:** `gamification_ledger` plus future badge/rule catalog approved by schema ADR; Progress/Event engines.
- **Interfaces:** rules/admin actions, self balance/history and opt-in leaderboard query.
- **Events:** emits `gamification.points_awarded/reversed`, `badge.awarded`; consumes lesson/module/assessment events.
- **AI/UI:** recommendations may reference achievements, never ranking; points, streak and badge UI with reduced motion.
- **Security/RLS/audit/privacy:** service append only, idempotent source key, leaderboard explicit opt-in/minimization; P2/R2.
- **Failure/scale/testing/future:** missed consumer replays safely, duplicate facts rejected; ledger partitions/projections; rule/property/reversal/privacy tests; future tenant-defined campaigns under fairness controls.

## 19. Notification Engine

- **Purpose/users:** Deliver purpose-aware in-app, email and SMS messages to all roles.
- **Responsibilities/ownership:** Own notification intents, preferences, templates/versions, channel selection and delivery state.
- **Never owns:** Domain decision to notify, provider credentials, identity contact authority or audit evidence.
- **Data/services:** `notification_preferences`, `notification_templates`, `notifications`, `notification_deliveries`; Resend, MSG91 and Realtime adapters.
- **Interfaces:** set preferences/read state, send approved intent, unsubscribe Route Handler and provider callbacks.
- **Events:** emits `notification.queued/delivered/failed/unsubscribed`; consumes domain events and template activation.
- **AI/UI:** AI may draft templates only under review; inbox, preferences, unread count, delivery status and unsubscribe UI.
- **Security/RLS/audit/privacy:** recipient-only content, optional communications require separate active consent, mandatory purposes explicit, signed unsubscribe; P2/P3/R6.
- **Failure/scale/testing/future:** provider failure retries then operator queue without duplicate sends; batch worker/quotas; consent/race/template/provider contract tests; future push/WhatsApp channel by approval.

## 20. Discussion / Community Engine

- **Purpose/users:** Provide course/cohort community discussion for enrolled learners, mentors and moderators.
- **Responsibilities/ownership:** Own spaces, threads, posts, moderation state, reports and participation policy.
- **Never owns:** Enrollment authority, notifications delivery, identity/profile or learning completion.
- **Data/services:** `discussion_spaces`, `discussion_threads`, `discussion_posts`, `content_reports`; Realtime, Notification and Moderation contracts.
- **Interfaces:** create/edit/report/moderate actions and authorized feed/thread queries.
- **Events:** emits `discussion.thread_created/post_created/content_reported/moderated`; consumes enrollment/cohort and account status.
- **AI/UI:** optional moderation assistance is advisory and logged; forum list/thread/editor/report/removed states.
- **Security/RLS/audit/privacy:** active space membership, edit window, sanitized content, author nullification on erasure, moderation audited; P2/P3/R2/R4.
- **Failure/scale/testing/future:** Realtime loss falls back to fetch, moderation queue persists; cursor pagination/search; XSS/abuse/RLS/accessibility/load tests; future reactions/mentions.

## 21. Announcement Engine

- **Purpose/users:** Publish scheduled, targeted organization/course/cohort communications and capture required acknowledgement.
- **Responsibilities/ownership:** Own announcement versions, audience rules, publish/expiry schedule and acknowledgement facts.
- **Never owns:** Notification delivery, cohort membership, marketing consent or lesson content.
- **Data/services:** `announcements`, `announcement_acknowledgements`; Notification, Cohort and Event engines.
- **Interfaces:** draft/review/publish/cancel/acknowledge actions and audience query.
- **Events:** emits `announcement.published/expired/acknowledged`; consumes audience membership and schedule ticks.
- **AI/UI:** AI draft requires human publisher; announcement composer, banner/feed and acknowledgement states.
- **Security/RLS/audit/privacy:** audience resolved under RLS, published version immutable, high-impact publication audited; P1/P2/R2.
- **Failure/scale/testing/future:** membership changes recalculate visibility, not historical acknowledgement; fan-out via notification intents; audience/time/idempotency tests; future emergency broadcasts.

## 22. Mentor Engine

- **Purpose/users:** Establish qualified mentor authority and provide an assigned-cohort operational workspace.
- **Responsibilities/ownership:** Own mentor assignment, eligibility/status, workload projection and mentor-facing learner-safe views.
- **Never owns:** Cohort membership, learner records, progress facts, scores or notification delivery.
- **Data/services:** `mentor_assignments` plus authorized projections; Cohort, Progress, Assessment, Reporting and Authorization.
- **Interfaces:** assign/unassign mentor, dashboard/cohort/learner timeline queries and support command adapters.
- **Events:** emits `mentor.assigned/unassigned`; consumes cohort, risk, progress, evaluation and intervention events.
- **AI/UI:** AI Mentor supplies explainable recommendations only; dashboard, learner drawer, action queue and activity timeline.
- **Security/RLS/audit/privacy:** active-date assignment is the read grant, minimum learner fields, immediate revocation, no unrelated cohort access; P2/P3/R2.
- **Failure/scale/testing/future:** unassigned cohorts surface admin alert; precomputed cohort aggregates; assignment-boundary and two-mentor tests; future mentor accreditation/workload routing.

## 23. Cohort Engine

- **Purpose/users:** Group learners for support, reporting and assignment without time-gating self-paced progress.
- **Responsibilities/ownership:** Own cohort identity, membership, optional course association, lifecycle and roster import result.
- **Never owns:** Enrollment entitlement, mentor authority, deadlines that block learning or progress.
- **Data/services:** `cohorts`, `cohort_members`; Organization, Enrollment, Mentor and Workflow engines.
- **Interfaces:** create/update/archive cohort, add/remove/bulk roster actions and scoped roster query.
- **Events:** emits `cohort.created/member_added/member_removed/archived`; consumes organization/member suspension.
- **AI/UI:** cohort aggregates may feed mentor AI under assignment; cohort manager, filters, roster/import UI.
- **Security/RLS/audit/privacy:** tenant-only, admins manage, member/mentor limited views, roster changes audited; P2/R2.
- **Failure/scale/testing/future:** partial bulk import uses dry-run and per-row outcomes; indexed membership/batch jobs; idempotency/RLS/large roster tests; future dynamic cohorts by approved rules.

## 24. Intervention Engine

- **Purpose/users:** Record mentor/TPO support actions, nudges, follow-ups and learner-visible outcomes.
- **Responsibilities/ownership:** Own intervention reason/type, notes, visibility, follow-up and outcome; enforce nudge policy.
- **Never owns:** Mentor assignment, notification transport, risk detection or learner progress.
- **Data/services:** `mentor_interventions`; Mentor, Notification, Audit and Workflow engines.
- **Interfaces:** create/update outcome/schedule follow-up actions; assigned learner intervention query.
- **Events:** emits `mentor.intervention_created/completed`, `learner.nudge_requested`; consumes risk signals and notification outcome.
- **AI/UI:** AI may suggest action/message but mentor approves; nudge/retake/review modals, history and follow-up UI.
- **Security/RLS/audit/privacy:** active mentor assignment, separate communication consent, configurable rate limit (legacy: three nudges/24h), sensitive notes encrypted; P3/R2/R4.
- **Failure/scale/testing/future:** failed delivery does not erase intervention, retry status visible; due-date indexes; consent/rate/idempotency/visibility tests; future playbooks and escalation.

## 25. Reporting Engine

- **Purpose/users:** Produce governed operational and compliance reports for mentors, admins, enterprises and auditors.
- **Responsibilities/ownership:** Own report definitions, parameter validation, export jobs/manifests, classification and expiry.
- **Never owns:** Transactional facts, analytics event collection, unrestricted SQL or permanent copies.
- **Data/services:** `report_exports`, `evidence_exports`; Analytics, Storage, Audit and Workflow engines.
- **Interfaces:** preview/request/cancel/download report actions and job status Route Handler.
- **Events:** emits `report.requested/generated/failed/downloaded`; consumes aggregate refresh and export expiry.
- **AI/UI:** narrative summaries require cited aggregates and review; report catalog, filters, progress, failure and expiring download UI.
- **Security/RLS/audit/privacy:** field allowlists, tenant/scope, minimum-cell rules, short signed downloads, sensitive export/download audit; P2/P3, 30-day default.
- **Failure/scale/testing/future:** large jobs asynchronous/checkpointed; replica/aggregate reads and quotas; leakage/suppression/replay/format tests; future scheduled reports.

## 26. Analytics Engine

- **Purpose/users:** Convert governed product/learning facts into privacy-safe measures for learners, mentors, product and enterprise teams.
- **Responsibilities/ownership:** Own event schema registry, pseudonymous ingestion, daily facts, metric definitions and aggregate freshness.
- **Never owns:** Transactional truth, authorization, raw secrets, small-group PII or provider analytics as authority.
- **Data/services:** `analytics_events`, `learner_daily_facts`, `course_daily_facts`, `assessment_item_facts`; Event and Reporting engines.
- **Interfaces:** ingestion service, metric/aggregate queries and refresh jobs; no client arbitrary event payloads.
- **Events:** emits `analytics.aggregate_refreshed/anomaly_detected`; consumes approved domain events.
- **AI/UI:** supplies privacy-safe features and AI quality/cost metrics; dashboards with freshness, suppression and comparison states.
- **Security/RLS/audit/privacy:** purpose/consent basis, pseudonyms, no PII to external analytics, cell suppression and tenant facts; P2/R8.
- **Failure/scale/testing/future:** late/duplicate events reprocess deterministically; partitions/materialized facts; reconciliation/privacy/cardinality tests; future warehouse after measured need.

## 27. Compliance Engine

- **Purpose/users:** Configure and operate cross-jurisdiction privacy/compliance policy for compliance admins, DPOs and auditors.
- **Responsibilities/ownership:** Own processing purposes, notices, policy packs, rights-case orchestration, retention policies, legal holds and evidence status.
- **Never owns:** Course content, identity credentials, raw audit event storage or legal interpretation without approval.
- **Data/services:** processing purpose, privacy notice/version, request/action, retention policy/execution and legal-hold tables.
- **Interfaces:** publish policy/notice, manage case/hold/retention actions and compliance report queries.
- **Events:** emits `compliance.notice_published/request_received/retention_due`; consumes consent, access, incident and deletion facts.
- **AI/UI:** AI may classify/summarize cases with human review and no autonomous decision; compliance case, policy, hold, retention and evidence UI.
- **Security/RLS/audit/privacy:** compliance permission separate from admin, purpose limitation, immutable case events and dual control; P3/P4/R4.
- **Failure/scale/testing/future:** missed deadlines escalate, deletion fails closed on holds; indexed due queues; legal-hold/request completeness tests; future GDPR/HIPAA packs.

## 28. DPDP Consent Engine

- **Purpose/users:** Capture, prove, withdraw and renew DPDP-purpose consent for data principals and compliance teams.
- **Responsibilities/ownership:** Own current consent state and immutable receipt events tied to purpose and notice version.
- **Never owns:** Identity, generic settings, processing-purpose definitions, rights execution or bundled marketing permission.
- **Data/services:** `consent_records`, `consent_events`, notice/purpose references; Identity, Compliance and Notification.
- **Interfaces:** present/accept/withdraw/renew consent actions and self receipt/history query; signed communication unsubscribe.
- **Events:** emits `consent.granted/withdrawn/expired/renewed`; consumes notice material change and subject verification.
- **AI/UI:** no AI consent decision; pre-data-collection notice, unchecked separate purposes, history/withdrawal and parental gate states.
- **Security/RLS/audit/privacy:** affirmative action, server timestamp/hash, no pre-ticked/bundled consent, withdrawal blocks future processing; P3/R9/R4.
- **Failure/scale/testing/future:** evidence-write failure blocks processing; active-state indexes and immutable ledger; timing/version/withdrawal/minor tests; future consent-manager interoperability.

## 29. Audit Evidence Engine

- **Purpose/users:** Produce tamper-evident, queryable accountability facts for security, compliance and business-critical operations.
- **Responsibilities/ownership:** Own audit event schema, append function, correlation/causation, hash chaining/anchoring and evidence exports.
- **Never owns:** Domain state, mutable activity feed, raw secrets/content or authorization decisions.
- **Data/services:** `audit_events`, `evidence_exports`; Storage, Event and Security Monitoring.
- **Interfaces:** server-only append, scoped search and signed evidence-export actions; no update/delete endpoint.
- **Events:** emits `audit.evidence_appended/export_generated`; consumes privileged/sensitive domain transitions.
- **AI/UI:** AI may summarize an authorized evidence set but cannot alter it; audit search/timeline/export UI.
- **Security/RLS/audit/privacy:** controlled insert function, no interactive role mutation including Super Admin, metadata minimization, P3/P4/R4 and legal holds.
- **Failure/scale/testing/future:** compliance-critical command rolls back if required audit append fails; time partitions/archives; immutability/hash/access/load tests; future external timestamp anchoring.

## 30. PII Protection Engine

- **Purpose/users:** Enforce data classification, minimization, encryption/redaction and purpose-aware sensitive access across all engines.
- **Responsibilities/ownership:** Own classification vocabulary, field policies, cryptographic service contracts, redaction manifests and sensitive-access decision hooks.
- **Never owns:** Source records, consent state, role grants, keys in application tables or legal basis definitions.
- **Data/services:** classification metadata across schema, KMS/environment-managed secrets, Audit and Compliance engines.
- **Interfaces:** server-only classify/encrypt/decrypt/redact/tokenize and safe-projection builders.
- **Events:** emits `pii.access_granted/denied`, `pii.redaction_applied`; consumes purpose/consent/retention and key rotation.
- **AI/UI:** redacts before provider calls; UI uses explicit reveal, masked values and reason collection.
- **Security/RLS/audit/privacy:** field allowlists, envelope encryption for selected P3/P4, no plaintext logs, decrypt only after row/purpose auth; sensitive reads audited.
- **Failure/scale/testing/future:** crypto/policy failure denies access; batch key rotation and deterministic lookup hashes; leakage/log/rotation tests; future confidential computing/token vault.

## 31. AI Tutor Engine

- **Purpose/users:** Give enrolled learners grounded course help without exposing hidden or unauthorized content.
- **Responsibilities/ownership:** Own tutor session policy, authorized retrieval context, citations, conversational state and feedback linkage.
- **Never owns:** Course truth, assessment keys, progress mutation, legal advice or final learning decisions.
- **Data/services:** AI interaction/content/usage/safety/feedback tables; AI provider, Search, Course, Lesson and PII engines.
- **Interfaces:** streaming tutor Route Handler, session/feedback actions and learner-safe history query.
- **Events:** emits `ai.tutor_session_started/response_generated/feedback_recorded`; consumes content publication and consent/entitlement changes.
- **AI/UI:** this is the touchpoint; cited streaming response, stop/retry, uncertainty, feedback and safe refusal states.
- **Security/RLS/audit/privacy:** enrollment and source authorization per turn, prompt-injection defense, no keys/other learners, purpose/retention and usage audit; P2/P3/R7.
- **Failure/scale/testing/future:** provider loss returns grounded fallback/no fabrication; token budgets/cache only nonpersonal context; adversarial/grounding/cost/stream tests; future multilingual/voice composition.

## 32. AI Mentor Engine

- **Purpose/users:** Help assigned mentors interpret cohort signals and prepare interventions without automating consequential action.
- **Responsibilities/ownership:** Own mentor-specific context assembly, explainable summaries, recommendation drafts and review feedback.
- **Never owns:** Risk facts, mentor assignment, learner state, intervention creation or communication sending.
- **Data/services:** AI tables plus assigned mentor/progress/risk projections; Mentor, Recommendation and PII engines.
- **Interfaces:** generate cohort/learner summary and suggested intervention actions; no autonomous action endpoint.
- **Events:** emits `ai.mentor_recommendation_generated/reviewed`; consumes risk and progress events.
- **AI/UI:** recommendation panel with factors, sources, confidence, edit/accept/reject; every accepted action remains a separate human command.
- **Security/RLS/audit/privacy:** active assignment, minimum cohort fields, no sensitive inference, prompt/output protected and human decision audited; P3/R7.
- **Failure/scale/testing/future:** stale/low-evidence output blocked or labeled; precompute authorized aggregates; bias/assignment/leakage/human-agreement tests; future playbook optimization.

## 33. AI Assistant Engine

- **Purpose/users:** Provide contextual product/navigation help to all users within their authorized SYRA surface.
- **Responsibilities/ownership:** Own assistant intents, tool allowlist, context selection and safe command proposals.
- **Never owns:** Direct arbitrary database access, authorization, domain state or execution of high-risk actions without confirmation.
- **Data/services:** AI tables, documentation/search index and typed engine tool contracts.
- **Interfaces:** streaming assistant Route Handler and confirmable tool Server Actions.
- **Events:** emits `ai.assistant_response_generated/tool_proposed/tool_confirmed`; consumes current route/context and tool outcomes.
- **AI/UI:** assistant panel with citations, command preview, confirmation and undo guidance where possible.
- **Security/RLS/audit/privacy:** tools reauthorize at execution, no hidden prompt/secrets, confirmation for mutation, high-risk tools prohibited; interaction P2/P3/R7.
- **Failure/scale/testing/future:** invalid tool output rejected by schema; tool quotas and cancellation; prompt-injection/tool-abuse/confirmation tests; future developer/admin assistants by separate allowlists.

## 34. AI Content Generation Engine

- **Purpose/users:** Generate draft quizzes, flashcards, summaries, outlines and translations for authorized authors/learners.
- **Responsibilities/ownership:** Own generation job, source/version citations, prompt/model provenance, draft output and review status.
- **Never owns:** Published content, answer-key release, source material or approval authority.
- **Data/services:** AI tables and draft target records; Content Versioning, Question Bank, Course/Lesson and Translation.
- **Interfaces:** request/cancel/regenerate generation and reviewer accept/edit/reject actions.
- **Events:** emits `ai.content_draft_generated/accepted/rejected`; consumes published/draft source authorization.
- **AI/UI:** generation workspace, provenance/citation, diff and review queue.
- **Security/RLS/audit/privacy:** assigned author/source scope, protected keys, tenant/model policy, accepted output attribution; P1/P3/R7.
- **Failure/scale/testing/future:** malformed/ungrounded drafts fail validation; async jobs/budgets and source-hash cache; correctness/citation/plagiarism/schema tests; future interactive course copilot.

## 35. AI Evaluation Engine

- **Purpose/users:** Produce governed criterion-level evaluation proposals for authorized evaluators.
- **Responsibilities/ownership:** Own model evaluation request, rubric evidence, confidence, safety and calibration metadata.
- **Never owns:** Final/released score, rubric, submission, appeal or retake decision.
- **Data/services:** AI tables linked from `evaluations`; Evaluation, Assignment, Rubric and PII engines.
- **Interfaces:** request evaluation proposal, reviewer feedback and calibration-run operations.
- **Events:** emits `ai.evaluation_proposed/flagged/reviewed`; consumes assignment submission and rubric publication.
- **AI/UI:** side-by-side proposal/evidence, confidence and mandatory reviewer disposition for configured risk.
- **Security/RLS/audit/privacy:** evaluator assignment, blind identity, no provider training, human review/high-risk thresholds, immutable model/prompt provenance; P3/R7/R4.
- **Failure/scale/testing/future:** low confidence/disagreement routes human-only; bounded batch queues; benchmark/fairness/injection/human-agreement tests; future ensemble moderation by ADR.

## 36. Recommendation Engine

- **Purpose/users:** Generate explainable next-learning, remediation and career suggestions for learners and mentors.
- **Responsibilities/ownership:** Own recommendation rules/model version, candidate set, factors, ranking result, expiry and feedback.
- **Never owns:** Enrollment, progress, hiring eligibility, protected-trait inference or automatic adverse action.
- **Data/services:** analytics/progress/mastery/career-safe projections and AI metadata where used; Search and Analytics.
- **Interfaces:** get/dismiss/accept recommendation actions and admin policy/evaluation operations.
- **Events:** emits `recommendation.generated/accepted/dismissed`; consumes progress, evaluation, catalog and opportunity changes.
- **AI/UI:** rule-first with governed AI explanation where approved; recommendation cards with why/not-interested controls.
- **Security/RLS/audit/privacy:** self/assigned mentor, minimized features, no protected traits, explainability and career fairness gate; P3/R8.
- **Failure/scale/testing/future:** insufficient evidence returns no recommendation; offline candidate generation/online filter; bias/relevance/staleness/privacy tests; future tenant learning paths.

## 37. Search Engine

- **Purpose/users:** Provide tenant-safe discovery across published tracks, courses, lessons, community and consented candidates.
- **Responsibilities/ownership:** Own search documents/indexing, query parsing, ranking configuration and result-safe projections.
- **Never owns:** Source records, authorization, candidate PII, analytics truth or AI-generated facts.
- **Data/services:** `search_documents`, candidate search projection and future vector indexes; source engines and Analytics.
- **Interfaces:** search Route Handlers/queries by vertical with cursor pagination and suggestion endpoints.
- **Events:** emits `search.index_updated/query_recorded`; consumes source published/updated/deleted events.
- **AI/UI:** semantic retrieval remains authorization-filtered and grounded; search bar, filters, results, empty/error and saved-search UI.
- **Security/RLS/audit/privacy:** source visibility rechecked, tenant predicates, query log minimization, candidate anti-scraping; P0-P3 by vertical.
- **Failure/scale/testing/future:** stale index never grants access; async incremental indexing and GIN/vector scale; permission/ranking/injection/load tests; future multilingual/federated search.

## 38. Translation Engine

- **Purpose/users:** Create governed localized drafts for learners, authors and compliance teams.
- **Responsibilities/ownership:** Own translation job, source-version linkage, locale, glossary, quality/reviewer state and provenance.
- **Never owns:** Source content, locale publication authority, legal equivalence or user language preference.
- **Data/services:** AI interactions and localized artifact versions; Content Versioning, AI Provider and Compliance.
- **Interfaces:** request/review/approve/reject translation actions and localized content query through source engine.
- **Events:** emits `translation.draft_generated/approved`; consumes source version publication/supersession.
- **AI/UI:** provider-assisted translation with glossary; side-by-side review, untranslated/fallback and locale selector UI.
- **Security/RLS/audit/privacy:** source authorization, no hidden PII expansion, legal/privacy notices require qualified human review; P1-P3 by source.
- **Failure/scale/testing/future:** source supersession marks draft stale; job queues and translation memory keyed by source hash; terminology/layout/accessibility tests; future human vendor workflow.

## 39. Voice Tutor Engine

- **Purpose/users:** Provide accessible conversational tutoring through voice after explicit policy approval.
- **Responsibilities/ownership:** Own voice-session consent, transport/session state, ephemeral audio handling, transcript linkage and speech adapter policy.
- **Never owns:** Identity/biometric inference, permanent raw audio by default, tutor knowledge or emotional profiling.
- **Data/services:** AI interaction metadata/content with short retention; speech provider, AI Tutor and Notification/Accessibility contracts.
- **Interfaces:** start/stream/stop voice session Route Handler and transcript deletion/feedback actions.
- **Events:** emits `voice.session_started/ended/transcript_expired`; consumes active consent and tutor responses.
- **AI/UI:** composes Tutor plus STT/TTS; recording indicator, captions, mute/stop, text fallback and interruption states.
- **Security/RLS/audit/privacy:** explicit per-purpose consent, approved region/provider, ephemeral media, no speaker identification; P3/R7.
- **Failure/scale/testing/future:** latency/provider loss falls back to text and closes capture; streaming quotas; consent/audio leakage/caption/accessibility/latency tests; future languages after quality review.

## 40. Billing Engine

- **Purpose/users:** Manage internal billing account, catalog mapping, invoices and financial reconciliation for billing admins and Finance.
- **Responsibilities/ownership:** Own billing account, plan/price catalog, provider references, invoice projection and entitlement input.
- **Never owns:** Card data, provider ledger, organization identity, subscription lifecycle policy or payment gateway secret.
- **Data/services:** `billing_accounts`, `plans`, `prices`, `invoices`; Stripe/Razorpay adapters, Storage and Audit.
- **Interfaces:** billing profile/catalog/invoice queries, checkout/portal Route Handlers and provider reconciliation commands.
- **Events:** emits `billing.account_created/invoice_issued`; consumes payment/subscription provider facts.
- **AI/UI:** AI may explain invoices from safe fields, never decide charges; plan, checkout, invoices and billing settings UI.
- **Security/RLS/audit/privacy:** billing permission, no PAN/card storage, encrypted tax/contact fields, signed documents and financial audit; P3/P4/R5.
- **Failure/scale/testing/future:** provider/internal mismatch enters reconciliation queue; provider IDs indexed; webhook/out-of-order/currency/tax/access tests; future usage billing after ADR.

## 41. Subscription Engine

- **Purpose/users:** Translate provider subscription state into time-bounded SYRA entitlements for tenant admins and product engines.
- **Responsibilities/ownership:** Own normalized subscription lifecycle, grace/cancellation and entitlement grants/projections.
- **Never owns:** Payment success, plan pricing, organization suspension or browser redirect truth.
- **Data/services:** `subscriptions`, `entitlement_grants`; Billing, Payment, Feature Flag and Event engines.
- **Interfaces:** subscribe/change/cancel intent and effective entitlement queries; provider transitions only via verified reconciliation.
- **Events:** emits `subscription.activated/changed/past_due/expired`, `entitlement.changed`; consumes payment/provider webhook events.
- **AI/UI:** no model decision; subscription status, limits, change/cancel and grace-state UI.
- **Security/RLS/audit/privacy:** billing admins read/manage intent, service writes provider state, every entitlement transition audited; P2/R5.
- **Failure/scale/testing/future:** delayed webhook preserves prior state until reconciliation policy; cache effective entitlements with invalidation; state-machine/order/idempotency tests; future contracts/seat tiers.

## 42. Payment Engine

- **Purpose/users:** Verify, deduplicate and reconcile Stripe/Razorpay payment events for Finance and Subscription.
- **Responsibilities/ownership:** Own immutable normalized payment events, signature result, amount/currency outcome and reconciliation status.
- **Never owns:** Card/bank credentials, subscription policy, invoice presentation or client-reported success.
- **Data/services:** `payment_events`, `inbound_webhook_events`; Stripe/Razorpay SDK adapters, Workflow and Audit.
- **Interfaces:** raw-body webhook Route Handlers, operator replay/reconcile actions; no client mutation of payment state.
- **Events:** emits `payment.succeeded/failed/refunded/disputed`; consumes verified provider event receipt.
- **AI/UI:** none; checkout pending/result, finance event/reconciliation UI.
- **Security/RLS/audit/privacy:** timestamped signature, strict size/content type, event dedupe, encrypted payload/short access, no card data; P2/P4/R5.
- **Failure/scale/testing/future:** acknowledge after durable receipt, retry processing, fetch provider truth for ordering; partition/index provider IDs; signed fixture/replay/order/amount tests; future providers by adapter.

## 43. Enterprise Admin Engine

- **Purpose/users:** Orchestrate approved multi-organization governance for enterprise admins.
- **Responsibilities/ownership:** Own enterprise-level command composition, rollup policy and safe aggregate views.
- **Never owns:** Organizations, member data, billing state, raw child-tenant PII or a bypass role.
- **Data/services:** organization hierarchy and scoped projections; Authorization, Reporting, Billing and Compliance.
- **Interfaces:** manage approved child organizations, enterprise roles/policies and aggregate report actions.
- **Events:** emits `enterprise.policy_applied/rollup_requested`; consumes organization/subscription/report facts.
- **AI/UI:** AI summaries only from suppressed aggregates; organization tree, policy rollout, billing/report overview UI.
- **Security/RLS/audit/privacy:** explicit descendant relation and permission, sibling isolation, aggregate by default, step-up/high-risk audit; P2/P3.
- **Failure/scale/testing/future:** hierarchy ambiguity denies operation; closure/recursive query benchmarks; sibling/delegation/aggregate leakage tests; future matrix enterprises only by ADR.

## 44. Platform Admin Engine

- **Purpose/users:** Provide audited platform operations for catalog, configuration, support and incident responders.
- **Responsibilities/ownership:** Own platform command orchestration, support access grants, break-glass sessions and operational queues.
- **Never owns:** Tenant records, blanket PII access, immutable-log mutation or service-role exposure to humans.
- **Data/services:** system config/feature flags/support grants (future approved table) and safe projections; Security Monitoring and Audit.
- **Interfaces:** platform configuration/catalog/support/incident actions with reason, approval and expiry.
- **Events:** emits `platform.config_changed/support_access_granted/break_glass_started`; consumes operational alerts.
- **AI/UI:** admin assistant tools use narrow allowlists and confirmation; operations console, queue, support grant and session banner UI.
- **Security/RLS/audit/privacy:** MFA/step-up, least privilege, time-bound dual-approved access, session recording metadata, no immutable bypass; P3/P4/R4.
- **Failure/scale/testing/future:** authorization/audit failure blocks command; no cross-tenant bulk reads; abuse/break-glass/expiry tests; future dedicated control plane.

## 45. Placement Engine

- **Purpose/users:** Coordinate placement drives, applications, stages and outcomes for learners, TPOs and hiring partners.
- **Responsibilities/ownership:** Own placement drives, application lifecycle, stage events, eligibility policy reference and TPO coordination.
- **Never owns:** Candidate profile/PII, opportunities, partner verification, recommendation ranking or reveal consent.
- **Data/services:** `placement_drives`, `placement_drive_opportunities`, `applications`, `application_stage_events`; Hiring Partner, Candidate Visibility and Notification.
- **Interfaces:** create/publish drive, submit/withdraw application and transition stage actions; scoped pipeline queries.
- **Events:** emits `placement.drive_published/application_submitted/stage_changed/outcome_recorded`; consumes opportunity and visibility status.
- **AI/UI:** AI interview/career help is advisory, never stage authority; learner application, TPO pipeline and partner candidate-stage UI.
- **Security/RLS/audit/privacy:** party/scope filtering, append-only stage history, no hidden protected-trait use, stage changes audited; P3/R2/R4.
- **Failure/scale/testing/future:** invalid/out-of-order transition rejected; indexed pipelines/bulk notifications; state/RLS/consent/fairness tests; future campus events/offers.

## 46. Internship Engine

- **Purpose/users:** Apply internship-specific duration/stipend/academic-credit rules while reusing the common opportunity/application model.
- **Responsibilities/ownership:** Own internship policy extension and placement semantics, not a duplicate posting lifecycle.
- **Never owns:** Separate parallel opportunity table, candidate PII, partner verification or payments.
- **Data/services:** `opportunities` with type discriminator and versioned internship attributes, applications; Placement and Hiring Partner.
- **Interfaces:** create/validate internship opportunity and internship-specific outcome actions through shared opportunity contracts.
- **Events:** emits `internship.published/completed`; consumes opportunity/application stage events.
- **AI/UI:** optional fit explanation under career policy; internship-specific form fields, filters and completion UI.
- **Security/RLS/audit/privacy:** same partner/tenant/consent controls as placement, stipend visibility policy; P1/P3.
- **Failure/scale/testing/future:** schema parity preserved by discriminator/extension, invalid duration/stipend blocked; validation/parity tests; future academic-credit integrations.

## 47. Hiring Partner Engine

- **Purpose/users:** Onboard, verify and govern organizations/users that publish opportunities and evaluate consented applicants.
- **Responsibilities/ownership:** Own partner profile, verification/tier/status and partner-user operational scope.
- **Never owns:** Base organization/member identity, candidate PII, reveal decision, application stage history or subscription truth.
- **Data/services:** `hiring_partners`, organization/membership references; Organization, Authorization, Billing and Audit.
- **Interfaces:** apply/verify/suspend partner, manage partner permissions and opportunity ownership queries.
- **Events:** emits `hiring_partner.applied/verified/suspended`; consumes organization/subscription/security status.
- **AI/UI:** no automated verification; onboarding, verification status, partner team and opportunity dashboard UI.
- **Security/RLS/audit/privacy:** platform verification, tenant isolation, no GSTIN/CIN requirement per v2 source, suspension immediate, verification audited; P2/R4.
- **Failure/scale/testing/future:** unverified/suspended partner cannot publish/reveal; partner/status indexes; impersonation/sibling/RLS tests; future tiering without identity fork.

## 48. Candidate Visibility Engine

- **Purpose/users:** Let candidates control redacted discoverability and purpose-bound PII reveal to verified partners.
- **Responsibilities/ownership:** Own visibility grants, redacted search projection, reveal request/decision/access grant and immutable reveal facts.
- **Never owns:** Career source profile, partner verification, application decision, bulk export or administrative override.
- **Data/services:** `candidate_visibility_grants`, `candidate_search_profiles`, `pii_reveal_requests`, `pii_reveal_decisions`, `pii_access_grants`, `pii_reveal_events`; PII, Consent, Audit and Search.
- **Interfaces:** candidate opt-in/withdraw/history, partner search/request, authorized decision and exact field-reveal Route Handler.
- **Events:** emits `pii.reveal_requested/approved/denied/accessed/revoked`; consumes partner, opportunity and consent lifecycle.
- **AI/UI:** AI cannot reveal/rank on hidden data; candidate field/partner/purpose controls, partner redacted cards and explicit reveal states.
- **Security/RLS/audit/privacy:** verified active partner/opportunity, candidate grant, purpose/field/expiry, atomic append before disclosure, no cache/prefetch/bulk/admin bypass; P3/P4/R4.
- **Failure/scale/testing/future:** any policy/evidence failure denies reveal; search projections and anti-scraping quotas; race/withdrawal/expiry/atomicity/two-partner tests; future candidate-mediated data rooms.

## 49. Developer API Engine

- **Purpose/users:** Expose stable, scoped tenant integrations to approved machine clients.
- **Responsibilities/ownership:** Own API client identity, hashed keys, scopes, versioned HTTP contract, quotas and deprecation policy.
- **Never owns:** User sessions, domain data, webhook delivery or a service-role passthrough.
- **Data/services:** `api_clients`, `api_keys`, rate/idempotency records; feature public contracts and Integration logs.
- **Interfaces:** `/api/v1/*`, client/key rotate/revoke actions and future OpenAPI specification.
- **Events:** emits `developer.client_created/key_rotated/api_request_rejected`; consumes tenant/subscription/suspension changes.
- **AI/UI:** future AI API needs separate scopes/budgets; developer console, key-once display, logs and docs UI.
- **Security/RLS/audit/privacy:** hashed secrets, Authorization header only, scope + tenant + RLS, response schemas prevent PII expansion, every key lifecycle audited; P4/R4.
- **Failure/scale/testing/future:** rate/provider failure returns stable codes/retry headers; edge quotas/cursor pagination; contract/auth/idempotency/load tests; future OAuth and SDKs.

## 50. Webhook Engine

- **Purpose/users:** Reliably ingest provider callbacks and deliver signed tenant event subscriptions.
- **Responsibilities/ownership:** Own webhook subscriptions/secrets, inbound receipt/dedupe and outbound delivery attempts/replay.
- **Never owns:** Provider business state, domain mutation logic, event facts or unrestricted payload copies.
- **Data/services:** `webhook_subscriptions`, `webhook_deliveries`, `inbound_webhook_events`; Event, Workflow and Integration.
- **Interfaces:** provider-specific raw Route Handlers, subscription management and audited replay.
- **Events:** emits `webhook.received/verified/delivered/failed`; consumes cataloged domain events.
- **AI/UI:** none; developer subscription, delivery log, secret rotation and replay UI.
- **Security/RLS/audit/privacy:** timestamped signatures, secret encryption, endpoint validation/SSRF controls, redacted bounded payloads, tenant event allowlists; P2-P4/R6.
- **Failure/scale/testing/future:** durable receipt then retry/backoff/dead-letter, out-of-order reconciliation; partition attempts; signature/replay/SSRF/idempotency tests; future mTLS.

## 51. Feature Flag Engine

- **Purpose/users:** Control safe platform and tenant rollout for product/platform operators.
- **Responsibilities/ownership:** Own flag definitions, rules, priority, effective evaluation and change history.
- **Never owns:** Authorization, entitlements, security/privacy gate bypass or permanent business configuration.
- **Data/services:** `feature_flags`, `feature_flag_rules`; Organization, Subscription and Audit.
- **Interfaces:** evaluate server/client-safe flags and audited create/update/rollback actions.
- **Events:** emits `feature_flag.changed`; consumes tenant/entitlement context.
- **AI/UI:** controls rollout only after AI engine safety approval; operator flag list/rules/history UI.
- **Security/RLS/audit/privacy:** sensitive predicates server-only, no user PII in client payload, flags cannot weaken RLS/consent; changes audited.
- **Failure/scale/testing/future:** deterministic safe default on outage, local/server cache with rapid invalidation; targeting/rollback/consistency tests; future experimentation through Analytics, not hidden authorization.

## 52. Workflow Engine

- **Purpose/users:** Coordinate durable multi-step, time-bound processes spanning engines and providers.
- **Responsibilities/ownership:** Own workflow definition/version, instance state, step attempts, timers, compensation and operator intervention.
- **Never owns:** Domain truth, event catalog, arbitrary code execution or authorization bypass.
- **Data/services:** `background_jobs`, `idempotency_keys` and future workflow instance/step tables by migration ADR; Event and Edge Function workers.
- **Interfaces:** server-only start/signal/cancel/retry and operator status/replay actions.
- **Events:** emits `workflow.started/step_completed/failed/completed`; consumes cataloged triggers and provider callbacks.
- **AI/UI:** AI may propose a workflow action but cannot execute high-risk steps; progress, retry and operator queue UI.
- **Security/RLS/audit/privacy:** initiator authorization captured then every step revalidates current policy, encrypted payload references, retries audited; classification follows domain.
- **Failure/scale/testing/future:** leases/timeouts/idempotency/compensation prevent duplicate effects; horizontal workers/claim indexes; crash/replay/order/poison-job tests; future external orchestrator only after measured need.

## 53. Event Engine

- **Purpose/users:** Publish durable versioned domain facts and dispatch them to idempotent internal/external consumers.
- **Responsibilities/ownership:** Own event envelope, schema registry, outbox publication, consumer checkpoints and retention policy.
- **Never owns:** Domain transaction, workflow state, audit substitution or authorization.
- **Data/services:** approved outbox/event/consumer checkpoint tables added in Phase 1; Audit, Workflow, Webhook and Analytics.
- **Interfaces:** transactional append library, claim/ack/fail worker contracts and schema validation.
- **Events:** emits transport lifecycle events while carrying the catalog; consumes committed outbox rows.
- **AI/UI:** AI facts use same provenance; operator lag/failure/schema UI.
- **Security/RLS/audit/privacy:** payload minimization and classification, tenant ID mandatory, no secrets/answer keys/raw PII, consumer allowlists; domain audit remains separate.
- **Failure/scale/testing/future:** at-least-once delivery, poison isolation and replay; partition by time/tenant and consumer concurrency; schema/idempotency/order/recovery tests; future broker without changing envelope.

## 54. Integration Engine

- **Purpose/users:** Standardize provider-neutral adapters, credentials, health, retries and operational visibility.
- **Responsibilities/ownership:** Own adapter contracts/capability metadata, normalized errors, circuit/timeout policy and redacted integration logs.
- **Never owns:** Domain decision to call, vendor business truth, credentials in database logs or silent provider fallback.
- **Data/services:** `integration_logs`, system config references; AI, Billing, Email/SMS, Storage and provider adapters.
- **Interfaces:** typed server-only adapter calls and operator health/config verification.
- **Events:** emits `integration.call_succeeded/failed/degraded`; consumes provider configuration/rotation.
- **AI/UI:** provider routing follows AI policy; integration status, correlation and degraded-state UI.
- **Security/RLS/audit/privacy:** environment-managed secrets, egress allowlists, DPA/region metadata, redacted payloads, cross-tenant support grants; P1-P4/R6.
- **Failure/scale/testing/future:** timeout/circuit/retry classification and explicit fallback; per-provider quotas; adapter contract/chaos/secret-leak tests; future vendors plug into stable contracts.

## 55. Security Monitoring Engine

- **Purpose/users:** Detect, triage and evidence suspicious security/privacy/operational behavior for Security and incident responders.
- **Responsibilities/ownership:** Own detection rules, alerts, cases, severity, acknowledgement and response workflow linkage.
- **Never owns:** Raw domain logs as canonical truth, automatic punitive user decisions, audit history mutation or unrestricted tenant PII.
- **Data/services:** audit/integration/auth/rate/safety signals plus future security alert/case tables; Observability, Audit, Notification and Workflow.
- **Interfaces:** rule/config actions, alert/case queries, acknowledge/escalate/close commands and incident webhooks.
- **Events:** emits `security.alert_raised/incident_declared/contained`; consumes auth failures, privilege changes, PII reveals, webhook/signature failures and anomalies.
- **AI/UI:** AI may cluster/summarize authorized alerts, never close or accuse autonomously; alert queue, timeline, evidence and runbook UI.
- **Security/RLS/audit/privacy:** security-only permissions, dual control for containment, minimum event fields, investigation access audited, retention/legal hold; P3/P4/R4.
- **Failure/scale/testing/future:** monitoring failure pages operators and never blocks unrelated reads; stream/partition rules and dedupe; detection/false-positive/incident/recovery tests; future SIEM/OpenTelemetry/SOC integrations.

## Engine Dependency Tiers

1. **Trust foundation:** Identity, Organization, Authorization, Profile, PII Protection, Audit Evidence.
2. **Platform coordination:** Event, Workflow, Integration, Feature Flag, Security Monitoring, Notification.
3. **Learning core:** Track, Course, Module, Lesson, Versioning, Media, Cohort, Progress, Search.
4. **Mastery and credentials:** Question Bank, Assessment, Assignment, Evaluation, Certificate, Verification, Gamification.
5. **Human operations:** Mentor, Intervention, Announcement, Discussion, Reporting, Analytics, Compliance, DPDP Consent.
6. **AI capabilities:** AI Assistant/Tutor/Mentor/Content/Evaluation, Recommendation, Translation, Voice Tutor.
7. **Commercial and ecosystem:** Billing, Payment, Subscription, Enterprise Admin, Developer API, Webhook.
8. **Career:** Hiring Partner, Candidate Visibility, Placement and Internship.

Downstream engines may be implemented later, but none may bypass an upstream trust or evidence dependency.
