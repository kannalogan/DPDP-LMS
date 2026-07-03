# Database Relationship Map

## Relationship Metrics

The catalog declares **312 named business foreign-key relationships**. Standard attribution links supplied by column bundles (`created_by`, `updated_by`, `actor_profile_id`) are not included in 312 because they are operational provenance, not aggregate topology.

| Kind           |   Count | Meaning                                                       |
| -------------- | ------: | ------------------------------------------------------------- |
| One-to-one     |      15 | Extension/projection row shares one owning identity           |
| One-to-many    |     280 | Parent aggregate/reference owns or is referenced by many rows |
| Many-to-many   |       8 | Explicit junction table; never arrays of foreign IDs          |
| Self-reference |       9 | Hierarchy, thread, supersession, reversal or lineage          |
| **Total**      | **312** | Named relationships in table catalog                          |

The complete column-level FK inventory is in `docs/23-master-table-catalog.md`; every `->` target is mandatory migration input. This document defines cardinality and deletion semantics.

## Delete Semantics

- **`RESTRICT` (default for history):** published versions, attempts, evaluations, certificates, financial records, consent/audit/PII reveal/retention/event/workflow evidence and any parent required to interpret history.
- **`CASCADE` (aggregate-only):** pure junctions, draft-only dependent structure and rebuildable projections where deleting the owner is the intended single operation. Cascades cannot cross tenants or erase compliance evidence.
- **`SET NULL`:** human actor/assignee/author references when the fact must survive account erasure; the fact retains pseudonymous actor type/hash where required.
- **`NO ACTION`:** tenant/root relationships and lifecycle-controlled entities. Domain service performs an explicit archive/anonymize plan.
- **Privacy execution:** account erasure does not invoke a broad database cascade. The Compliance workflow applies per-table delete/redact/anonymize/retain rules under legal-hold checks.

## One-To-One Map (15)

| Parent                 | Child                                             | Rule                                                     | Rationale                                          |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `auth.users`           | `profiles`                                        | Auth deletion invokes privacy workflow; no blind cascade | Application identity must be anonymized coherently |
| `profiles`             | `user_settings`                                   | CASCADE after rights/hold check                          | Pure user preference extension                     |
| `organization_members` | `mentor_profiles`                                 | RESTRICT/explicit end                                    | Mentor history survives membership status change   |
| `learning_resources`   | current `resource_versions` via version selection | RESTRICT                                                 | Published content reproducibility                  |
| `enrollments`          | `course_progress`                                 | CASCADE only through explicit learning purge             | Rebuildable snapshot                               |
| `question_versions`    | `question_answer_keys`                            | RESTRICT                                                 | Protected key required for historical evaluation   |
| `assessment_attempts`  | `assignment_submissions`                          | RESTRICT after submission                                | Assessment evidence                                |
| `ai_interactions`      | `ai_interaction_content`                          | CASCADE/cryptographic erase by retention workflow        | Content lifecycle is purpose-bound                 |
| `profiles`             | `career_profiles`                                 | Explicit anonymize/delete                                | Career data has separate consent/retention         |
| `opportunities`        | `internship_details`                              | CASCADE only while draft; otherwise RESTRICT             | Shared opportunity identity                        |
| `organizations`        | `hiring_partners`                                 | RESTRICT/explicit suspension                             | Verification evidence survives tenant changes      |
| `organizations`        | `billing_accounts`                                | RESTRICT                                                 | Financial records survive tenant closure           |
| `assessment_attempts`  | active final `evaluations` projection             | RESTRICT                                                 | History uses supersession, not replacement         |
| `certificates`         | current public projection                         | projection refresh/delete follows source                 | No independent authority                           |
| `api_clients`          | active secret family through `api_keys`           | explicit revoke then archive                             | Credential lifecycle must be audited               |

## Many-To-Many Map (8)

| Left                      | Junction                        | Right                  | Delete rule                                                         |
| ------------------------- | ------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `roles`                   | `role_permissions`              | `permissions`          | CASCADE role; RESTRICT permission while referenced                  |
| `courses`                 | `course_tags`                   | `tags`                 | CASCADE course; RESTRICT/archive tag                                |
| `learning_paths`/versions | `learning_path_items`           | `courses`              | CASCADE unpublished path version; RESTRICT course                   |
| `cohorts`                 | `cohort_members`                | `organization_members` | CASCADE cohort only under explicit archive; RESTRICT member history |
| `placement_drives`        | `placement_drive_opportunities` | `opportunities`        | CASCADE draft drive; RESTRICT published entities                    |
| `discussion_posts`        | `discussion_reactions`          | `profiles`             | CASCADE post; profile relation anonymized/explicitly removed        |
| `announcements`           | `announcement_acknowledgements` | `profiles`             | RESTRICT mandatory evidence; otherwise retention workflow           |
| `webhook_subscriptions`   | `webhook_deliveries`            | `event_outbox`         | RESTRICT delivery evidence; subscriptions archive                   |

## Self-References (9)

| Table / field                              | Cardinality                       | Rule                                                    |
| ------------------------------------------ | --------------------------------- | ------------------------------------------------------- |
| `organizations.parent_id`                  | parent 1 -> N child organizations | SET NULL only after hierarchy validation; no cycles     |
| `course_categories.parent_id`              | category tree                     | RESTRICT while children exist; no cycles                |
| `learning_path_items.prerequisite_item_id` | prerequisite DAG                  | SET NULL only for unpublished draft; no cycles          |
| `discussion_posts.parent_post_id`          | post/reply tree                   | SET NULL or retain tombstone; same thread required      |
| `gamification_ledger.reversal_of`          | original 1 -> N reversals         | RESTRICT; no reversal chains that cycle                 |
| `evaluations.supersedes_id`                | evaluation lineage                | RESTRICT; append-only chain                             |
| `answer_reviews.supersedes_id`             | review lineage                    | RESTRICT; append-only chain                             |
| `ai_sessions.parent_session_id`            | forked session                    | SET NULL after parent content expiry if policy permits  |
| `ai_interactions.parent_id`                | model/tool causation              | SET NULL on content expiry; metadata retained by policy |

`audit_events.causation_id` and `event_outbox.causation_id` are validated UUID references rather than self-FKs because causes may originate outside their table. Future plan, subworkflow or security-case lineage requires a contract amendment before adding a physical self-reference.

## Aggregate Relationship Map

### Identity, Tenant And Authorization

```text
auth.users 1--1 profiles
organizations 1--N organization_domains
organizations 1--N organization_members N--1 profiles
organization_members 1--N member_role_assignments N--1 roles
roles N--M permissions (role_permissions)
organizations 1--N organization_invitations
profiles 1--N devices, user_sessions, support_access_grants
organizations 1--N organization_settings, feature_flag_rules
feature_flags 1--N feature_flag_rules
```

Tenant closure is explicit. Membership/profile references from immutable evidence use `SET NULL` actor links or pseudonymization, not cascade.

### Learning Catalog

```text
learning_tracks 1--N courses
course_categories 1--N courses
courses 1--N course_versions 1--N course_modules 1--N lessons 1--N lesson_versions
lesson_versions/course_versions 1--N learning_resources 1--N resource_versions
resource_versions N--0..1 storage_objects
courses N--M tags (course_tags)
learning_tracks 1--N learning_paths 1--N learning_path_versions 1--N learning_path_items N--1 courses
```

Published version parents are `RESTRICT`; draft child rows may cascade only before publication.

### Delivery, Cohort And Progress

```text
organizations 1--N cohorts 1--N cohort_members N--1 organization_members
profiles 1--N enrollments N--1 course_versions/learning_path_versions
enrollments N--0..1 cohorts
enrollments 1--N lesson_progress/module_progress/activity_events/video_progress
enrollments 1--1 course_progress
profiles 1--N learner_notes/bookmarks/favorites/study_plans
study_plans 1--N study_plan_items
```

Progress projections can rebuild from activity/attempt facts; learner erasure follows retention policy rather than cascade.

### Assessment And Credentials

```text
question_banks 1--N questions 1--N question_versions 1--N question_options
question_versions 1--1 question_answer_keys
rubrics 1--N rubric_versions 1--N rubric_criteria
courses 1--N assessments 1--N assessment_versions
assessment_versions 1--N assessment_sections/form_items/assignments
assessment_assignments 1--N assessment_attempts 1--N attempt_items 1--1 attempt_responses
assessment_attempts 1--0..1 assignment_submissions; 1--N evaluations/integrity_events/review_cases/retake_grants
evaluations 1--N evaluation_scores/answer_reviews
course_versions/enrollments/evaluations 1--N certificate_eligibility_records
certificate_templates 1--N template_versions 1--N certificates 1--N status_events/verification_events
```

Questions/keys, attempts/responses, evaluations and certificates are restricted history. Corrections append supersession/status records.

### Mentor And Engagement

```text
organization_members 1--1 mentor_profiles
cohorts 1--N mentor_assignments N--1 organization_members
mentor_assignments 1--N mentor_interventions/learner_reviews
profiles/enrollments 1--N risk_signals
profiles 1--N notifications/deliveries and notification_preferences
announcements 1--N acknowledgements
discussion_spaces 1--N threads 1--N posts 1--N reactions/reports
gamification_rules/badges 1--N gamification_ledger
```

Mentor assignment termination revokes access but retains interventions/reviews under R2/R4.

### AI And Recommendation

```text
ai_engine_configs 1--N ai_prompt_versions
profiles 1--N ai_sessions 1--N ai_messages/ai_interactions
ai_interactions 1--1 ai_interaction_content; 1--N safety_events/feedback/provider_logs
ai_interactions 1--1 usage_records
profiles 1--N recommendations 1--N recommendation_feedback
```

AI content can be cryptographically erased while minimized usage/safety provenance remains according to R7/R4.

### Career And PII Reveal

```text
profiles 1--1 career_profiles
organizations 1--1 hiring_partners 1--N opportunities
opportunities 1--0..1 internship_details
placement_drives N--M opportunities
profiles 1--N candidate_visibility_grants/search_projection/reveal_requests/applications
pii_reveal_requests 1--N decisions/access_grants/reveal_events
opportunities 1--N applications 1--N application_stage_events
profiles 1--N mock_interviews
```

PII reveal request, decision, grant and access evidence use `RESTRICT`; candidate withdrawal revokes future grants but does not erase evidence.

### Compliance And Audit

```text
processing_purposes 1--N notices/consent_records/retention_policies/data_processing_records
privacy_notices 1--N notice_versions
profiles 1--N consent_records 1--N consent_events
privacy_requests 1--N request_events/request_actions
retention_policies 1--N retention_executions
legal_holds 1--N security_cases and policy-scoped entities
audit_events/evidence_exports reference resources by typed ID without polymorphic FK
```

Typed resource IDs in audit/outbox tables intentionally avoid impossible polymorphic FKs; the owner engine validates resource type/ID before append.

### Commerce And Operations

```text
organizations 1--1 billing_accounts 1--N subscriptions/payments/invoices
plans 1--N prices/subscriptions
subscriptions 1--N history/entitlements/usage_records
payments 1--N payment_events
api_clients 1--N api_keys
webhook_subscriptions 1--N deliveries N--1 event_outbox
workflow_definitions 1--N workflow_instances 1--N workflow_steps/events
event_outbox 1--N consumer_checkpoints
search_documents 1--N search_embeddings
storage_objects 1--N report_exports/evidence_exports/invoices
security_alerts N--0..1 security_cases (future junction/field requires contract amendment)
```

Financial and operational evidence is restricted; expired keys/subscriptions/webhooks are revoked/archived, not cascade-deleted.

## Relationship Review Rules

- Every FK migration names `ON DELETE` explicitly; omitted behavior is rejected.
- Tenant child and parent must resolve to the same `organization_id`, enforced by composite FK where practical or a tested constraint/function.
- Cross-tenant/global references are allowlisted: global published catalog, platform roles/config, provider registries and explicit enterprise hierarchy.
- Nullable FK means the relationship is genuinely optional or intentionally survives actor deletion; it is not a shortcut for incomplete writes.
- Deferrable constraints are permitted only for documented atomic graph/version operations.
- Polymorphic `entity_type/entity_id` is limited to audit/event/search/favorite/report infrastructure and always validated by the owner engine.
