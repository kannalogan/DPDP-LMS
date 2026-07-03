# Master Event Catalog

## Canonical Envelope

```ts
type DomainEvent<T> = {
  id: string; // UUID, globally unique
  type: string; // domain.fact.v1
  schemaVersion: 1;
  organizationId: string | null;
  aggregate: { type: string; id: string; version: number };
  actor: { type: "user" | "api_client" | "system"; id: string | null };
  occurredAt: string; // server UTC
  correlationId: string;
  causationId: string | null;
  privacy: "P0" | "P1" | "P2" | "P3" | "P4";
  payload: T;
};
```

The outbox insert shares the domain transaction. Delivery is at least once. Every consumer records `(consumer_key,event_id)` before/with its effect. `aggregate.version` provides per-aggregate order; no global order is promised. Payload fields below are identifiers/status/minimized facts, never full records.

## Identity, Tenancy And Authorization

| Event                                 | Producer -> consumers                                           | Payload                                                       | Audit                 | Retry and idempotency             | Privacy |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- | --------------------- | --------------------------------- | ------- |
| `identity.registered.v1`              | Identity -> Profile, Consent, Notification                      | `profileId, verificationRequired`                             | Yes                   | Durable; `profileId`              | P2      |
| `identity.verified.v1`                | Identity -> Organization, Notification                          | `profileId, method`                                           | Yes                   | Durable; `profileId:method`       | P2      |
| `identity.session_revoked.v1`         | Identity -> Security Monitoring, Realtime                       | `profileId, sessionIdHash, reason`                            | Yes                   | Durable; `sessionIdHash`          | P4      |
| `organization.created.v1`             | Organization -> Authorization, Billing, Audit                   | `organizationId, parentId, type, countryCode`                 | Yes                   | Durable; `organizationId`         | P1      |
| `organization.suspended.v1`           | Organization -> Identity, Authorization, Subscription, Security | `organizationId, reasonCode`                                  | Yes                   | Durable; `organizationId:version` | P2      |
| `organization.member_added.v1`        | Organization -> Authorization, Cohort, Notification             | `memberId, profileId, organizationId`                         | Yes                   | Durable; `memberId`               | P2      |
| `organization.member_ended.v1`        | Organization -> Authorization, Mentor, Cohort, Realtime         | `memberId, profileId, endedAt`                                | Yes                   | Durable; `memberId:endedAt`       | P2      |
| `authorization.assignment_granted.v1` | Authorization -> Security Monitoring, Audit                     | `assignmentId, memberId, roleKey, scopeType, scopeId, endsAt` | Yes                   | Durable; `assignmentId`           | P2      |
| `authorization.assignment_revoked.v1` | Authorization -> Realtime, Security Monitoring                  | `assignmentId, reasonCode, revokedAt`                         | Yes                   | Durable; `assignmentId:revokedAt` | P2      |
| `profile.updated.v1`                  | Profile -> Search, Notification                                 | `profileId, changedFieldKeys`                                 | Sensitive fields only | Durable; `profileId:version`      | P2      |

## Catalog, Learning And Cohorts

| Event                         | Producer -> consumers                                              | Payload                                                                 | Audit             | Retry and idempotency                      | Privacy |
| ----------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------- | ------------------------------------------ | ------- |
| `track.published.v1`          | Track -> Search, Analytics                                         | `trackId, slug, ownerOrganizationId`                                    | Yes               | Durable; `trackId:version`                 | P1      |
| `course.version_published.v1` | Course/Versioning -> Search, Recommendation, Analytics             | `courseId, courseVersionId, trackId, locale, contentHash`               | Yes               | Durable; `courseVersionId`                 | P1      |
| `lesson.version_published.v1` | Lesson/Versioning -> Search, AI Content                            | `lessonId, lessonVersionId, courseVersionId, contentHash`               | Yes               | Durable; `lessonVersionId`                 | P1      |
| `storage.object_uploaded.v1`  | Media -> Workflow, Security Monitoring                             | `objectId, parentType, parentId, classification, bytes, sha256`         | Conditional       | Durable; `objectId`                        | P1-P4   |
| `storage.object_scanned.v1`   | Media -> Assignment, Certificate, Workflow                         | `objectId, outcome, scannerVersion`                                     | Yes if blocked    | Durable; `objectId:sha256`                 | P1      |
| `cohort.created.v1`           | Cohort -> Mentor, Reporting                                        | `cohortId, courseId, startsAt, endsAt`                                  | Yes               | Durable; `cohortId`                        | P2      |
| `cohort.member_added.v1`      | Cohort -> Mentor, Notification, Analytics                          | `cohortId, memberId, profileId`                                         | Yes               | Durable; `cohortId:memberId`               | P2      |
| `cohort.member_removed.v1`    | Cohort -> Mentor, Realtime, Analytics                              | `cohortId, memberId, leftAt`                                            | Yes               | Durable; `cohortId:memberId:leftAt`        | P2      |
| `mentor.assigned.v1`          | Mentor -> Authorization, Notification, Analytics                   | `mentorAssignmentId, mentorMemberId, cohortId, startsAt, endsAt`        | Yes               | Durable; `mentorAssignmentId`              | P2      |
| `mentor.unassigned.v1`        | Mentor -> Authorization, Realtime                                  | `mentorAssignmentId, endedAt, reasonCode`                               | Yes               | Durable; `mentorAssignmentId:endedAt`      | P2      |
| `enrollment.created.v1`       | Learning Delivery -> Progress, Notification, Analytics             | `enrollmentId, profileId, courseVersionId, cohortId, dueAt`             | Yes               | Durable; `enrollmentId`                    | P2      |
| `enrollment.completed.v1`     | Progress -> Certificate, Gamification, Analytics, Notification     | `enrollmentId, profileId, courseVersionId, completedAt`                 | Yes               | Durable; `enrollmentId:completedAt`        | P3      |
| `lesson.started.v1`           | Progress -> Analytics                                              | `enrollmentId, lessonId, startedAt`                                     | No separate audit | Durable; `enrollmentId:lessonId:first`     | P3      |
| `lesson.completed.v1`         | Progress -> Module, Gamification, Analytics, Recommendation        | `enrollmentId, lessonId, lessonVersionId, completedAt, completionBasis` | No separate audit | Durable; `enrollmentId:lessonId:completed` | P3      |
| `module.completed.v1`         | Progress -> Assessment, Gamification, Recommendation, Notification | `enrollmentId, moduleId, completedAt`                                   | No separate audit | Durable; `enrollmentId:moduleId`           | P3      |

## Assessment, Evaluation And Credentials

| Event                                   | Producer -> consumers                                       | Payload                                                                      | Audit      | Retry and idempotency                    | Privacy |
| --------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- | ---------------------------------------- | ------- |
| `question.version_published.v1`         | Question Bank -> Assessment, Analytics                      | `questionId, questionVersionId, type, tags, maxScore`                        | Yes        | Durable; `questionVersionId`             | P1      |
| `assessment.published.v1`               | Assessment -> Search, Assignment                            | `assessmentId, assessmentVersionId, kind, courseId`                          | Yes        | Durable; `assessmentVersionId`           | P1      |
| `assessment.assigned.v1`                | Assessment -> Notification, Workflow                        | `assignmentId, assessmentVersionId, targetType, targetId, opensAt, closesAt` | Yes        | Durable; `assignmentId`                  | P2      |
| `assessment.attempt_started.v1`         | Assessment -> Analytics, Integrity                          | `attemptId, assignmentId, profileId, attemptNumber, expiresAt`               | Yes        | Durable; `attemptId`                     | P3      |
| `assessment.attempt_submitted.v1`       | Assessment -> Evaluation, Progress, Analytics               | `attemptId, assessmentVersionId, profileId, submittedAt, responseCount`      | Yes        | Durable; `attemptId:submitted`           | P3      |
| `assessment.attempt_expired.v1`         | Assessment -> Evaluation, Notification                      | `attemptId, expiredAt, autoSubmitted`                                        | Yes        | Durable; `attemptId:expired`             | P3      |
| `assessment.integrity_signal_raised.v1` | Assessment -> Security Monitoring, Evaluation               | `integrityEventId, attemptId, type, severity`                                | Yes        | Durable; `integrityEventId`              | P3      |
| `assignment.submitted.v1`               | Assignment -> Evaluation, Notification                      | `submissionId, attemptId, objectId, contentHash, submittedAt`                | Yes        | Durable; `submissionId`                  | P3      |
| `evaluation.completed.v1`               | Evaluation -> Assessment, Analytics                         | `evaluationId, attemptId, score, passed, evaluatorType`                      | Yes        | Durable; `evaluationId:completed`        | P3      |
| `evaluation.released.v1`                | Evaluation -> Progress, Notification, Recommendation        | `evaluationId, attemptId, profileId, score, passed, releasedAt`              | Yes        | Durable; `evaluationId:released`         | P3      |
| `evaluation.overridden.v1`              | Evaluation -> Audit, Analytics, Certificate                 | `newEvaluationId, supersededEvaluationId, reasonCode, actorId`               | Yes        | Durable; `newEvaluationId`               | P3      |
| `assessment.retake_granted.v1`          | Assessment -> Notification, Audit                           | `grantId, attemptId, profileId, expiresAt, reasonCode`                       | Yes        | Durable; `grantId`                       | P3      |
| `certificate.issued.v1`                 | Certificate -> Media, Verification, Notification, Analytics | `certificateId, profileId, courseVersionId, issuedAt, expiresAt`             | Yes        | Durable; `certificateId`                 | P2      |
| `certificate.artifact_generated.v1`     | Certificate/Media -> Notification                           | `certificateId, objectId, sha256`                                            | Yes        | Durable; `certificateId:templateVersion` | P2      |
| `certificate.expired.v1`                | Certificate -> Verification, Notification, Analytics        | `certificateId, expiredAt`                                                   | Yes        | Durable; `certificateId:expired`         | P2      |
| `certificate.revoked.v1`                | Certificate -> Verification, Notification, Security         | `certificateId, reasonCode, revokedAt`                                       | Yes        | Durable; `certificateId:revokedAt`       | P3      |
| `certificate.verification_viewed.v1`    | Verification -> Analytics, Security Monitoring              | `certificateId, outcome, networkFingerprintHash`                             | Abuse only | Best effort; `requestId`                 | P2/P4   |

## Engagement, Mentor And Community

| Event                            | Producer -> consumers                                  | Payload                                                                                  | Audit              | Retry and idempotency                           | Privacy |
| -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------- | ------- |
| `risk.signal_raised.v1`          | Analytics/Recommendation -> Mentor, Notification       | `riskSignalId, profileId, enrollmentId, ruleKey, severity, detectedAt`                   | Model/rule version | Durable; `riskSignalId`                         | P3      |
| `mentor.intervention_created.v1` | Intervention -> Notification, Analytics                | `interventionId, mentorAssignmentId, learnerProfileId, type, followUpAt, learnerVisible` | Yes                | Durable; `interventionId`                       | P3      |
| `learner.nudge_requested.v1`     | Intervention -> Notification, Workflow                 | `interventionId, profileId, channel, templateKey`                                        | Yes                | Durable; `interventionId:channel`               | P3      |
| `announcement.published.v1`      | Announcement -> Notification, Realtime                 | `announcementId, audienceType, audienceId, publishAt, expiresAt`                         | Yes                | Durable; `announcementId:published`             | P2      |
| `announcement.acknowledged.v1`   | Announcement -> Reporting                              | `announcementId, profileId, acknowledgedAt`                                              | If mandatory       | Durable; `announcementId:profileId`             | P2      |
| `discussion.post_created.v1`     | Discussion -> Notification, Realtime, Analytics        | `postId, threadId, authorProfileId, mentionedProfileIds`                                 | No                 | Durable; `postId`                               | P2/P3   |
| `discussion.content_reported.v1` | Discussion -> Security Monitoring, Notification        | `reportId, entityType, entityId, reasonCode`                                             | Yes                | Durable; `reportId`                             | P3      |
| `notification.queued.v1`         | Notification -> Workflow                               | `notificationId, profileId, purpose, channels`                                           | Sensitive purposes | Durable; `notificationId`                       | P2/P3   |
| `notification.delivered.v1`      | Notification -> Analytics                              | `deliveryId, notificationId, channel, providerMessageIdHash, deliveredAt`                | No                 | Durable; `deliveryId:delivered`                 | P2      |
| `notification.failed.v1`         | Notification -> Security Monitoring, Operator Workflow | `deliveryId, channel, errorCode, terminal`                                               | Terminal only      | Durable; `deliveryId:attempt`                   | P2      |
| `notification.unsubscribed.v1`   | Notification -> Consent, Intervention                  | `profileId, purpose, channel, occurredAt`                                                | Yes                | Durable; `profileId:purpose:channel:occurredAt` | P3      |

## Privacy, Compliance And Audit

| Event                          | Producer -> consumers                                            | Payload                                                                        | Audit                   | Retry and idempotency                   | Privacy |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- | --------------------------------------- | ------- |
| `privacy.notice_published.v1`  | Compliance -> Consent, Notification                              | `noticeId, noticeVersionId, audience, locale, effectiveAt, materialChange`     | Yes                     | Durable; `noticeVersionId`              | P1      |
| `consent.granted.v1`           | DPDP Consent -> Compliance, AI, Notification                     | `consentRecordId, profileId, purposeId, noticeVersionId, grantedAt, expiresAt` | Evidence event is audit | Durable; `consentEventId`               | P3      |
| `consent.withdrawn.v1`         | DPDP Consent -> AI, Notification, Candidate Visibility, Workflow | `consentRecordId, profileId, purposeId, withdrawnAt`                           | Evidence event is audit | Durable; `consentEventId`               | P3      |
| `privacy.request_received.v1`  | Compliance -> Workflow, Notification                             | `requestId, requestType, requesterProfileId, dueAt, jurisdiction`              | Yes                     | Durable; `requestId`                    | P3      |
| `privacy.request_verified.v1`  | Compliance -> Workflow                                           | `requestId, verificationMethod, verifiedAt`                                    | Yes                     | Durable; `requestId:verified`           | P4      |
| `privacy.request_completed.v1` | Compliance -> Notification, Reporting                            | `requestId, outcome, completedAt, exceptionCodes`                              | Yes                     | Durable; `requestId:completed`          | P3      |
| `retention.item_due.v1`        | Compliance -> Workflow                                           | `policyId, entityType, entityReferenceHash, dueAt`                             | No                      | Durable; `policyId:entityReferenceHash` | P3      |
| `retention.action_executed.v1` | Compliance -> Audit, Analytics                                   | `executionId, policyId, entityType, action, outcome, exceptionCode`            | Evidence event is audit | Durable; `executionId`                  | P3      |
| `audit.evidence_appended.v1`   | Audit Evidence -> Security Monitoring                            | `auditEventId, action, resourceType, resourceId, outcome`                      | Self-evidencing         | Durable; `auditEventId`                 | P3/P4   |

## Career And PII Reveal

| Event                                | Producer -> consumers                                            | Payload                                                                                      | Audit                   | Retry and idempotency                  | Privacy |
| ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------- | ------- |
| `hiring_partner.verified.v1`         | Hiring Partner -> Authorization, Placement, Candidate Visibility | `partnerId, organizationId, verifiedAt`                                                      | Yes                     | Durable; `partnerId:verified`          | P2      |
| `opportunity.published.v1`           | Hiring Partner/Internship -> Search, Placement, Recommendation   | `opportunityId, partnerId, type, opensAt, closesAt`                                          | Yes                     | Durable; `opportunityId:published`     | P1      |
| `candidate.visibility_granted.v1`    | Candidate Visibility -> Search, Compliance                       | `visibilityGrantId, profileId, partnerId, opportunityId, fieldCategories, expiresAt`         | Yes                     | Durable; `visibilityGrantId`           | P3      |
| `candidate.visibility_withdrawn.v1`  | Candidate Visibility -> Search, Workflow                         | `visibilityGrantId, withdrawnAt`                                                             | Yes                     | Durable; `visibilityGrantId:withdrawn` | P3      |
| `pii.reveal_requested.v1`            | Candidate Visibility -> Candidate, TPO, Compliance               | `requestId, partnerId, candidateProfileId, opportunityId, purposeId, requestedFields`        | Yes                     | Durable; `requestId`                   | P3      |
| `pii.reveal_approved.v1`             | Candidate Visibility -> Partner, Workflow                        | `requestId, decisionId, fieldScope, grantExpiresAt`                                          | Evidence event is audit | Durable; `decisionId`                  | P3      |
| `pii.reveal_denied.v1`               | Candidate Visibility -> Partner, Candidate                       | `requestId, decisionId, reasonCode`                                                          | Evidence event is audit | Durable; `decisionId`                  | P3      |
| `pii.reveal_accessed.v1`             | Candidate Visibility -> Candidate, Compliance, Security          | `revealEventId, requestId, partnerProfileId, candidateProfileId, fieldCategories, purposeId` | Evidence event is audit | Transactional; `revealEventId`         | P3/P4   |
| `placement.application_submitted.v1` | Placement -> Partner, TPO, Notification                          | `applicationId, opportunityId, candidateProfileId, submittedAt`                              | Yes                     | Durable; `applicationId`               | P3      |
| `placement.stage_changed.v1`         | Placement -> Candidate, Partner, Analytics                       | `stageEventId, applicationId, fromStage, toStage, occurredAt`                                | Evidence event is audit | Durable; `stageEventId`                | P3      |

## AI

| Event                           | Producer -> consumers                       | Payload                                                                          | Audit               | Retry and idempotency                 | Privacy |
| ------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- | ------------------- | ------------------------------------- | ------- |
| `ai.interaction_started.v1`     | AI engine -> Analytics, Security            | `interactionId, engineKey, promptVersionId, model, riskTier`                     | High-risk only      | Durable; `interactionId`              | P2/P3   |
| `ai.response_generated.v1`      | AI engine -> owning feature, Analytics      | `interactionId, engineKey, status, citationCount, humanReviewRequired, usageRef` | High-risk only      | Durable; `interactionId:completed`    | P2/P3   |
| `ai.safety_blocked.v1`          | AI engine -> Security Monitoring, Analytics | `interactionId, policyKey, severity, action`                                     | Yes                 | Durable; `safetyEventId`              | P3      |
| `ai.content_draft_generated.v1` | AI Content -> Versioning, Question Bank     | `interactionId, targetType, draftId, sourceVersionIds`                           | Provenance required | Durable; `draftId`                    | P1/P3   |
| `ai.evaluation_proposed.v1`     | AI Evaluation -> Evaluation                 | `interactionId, evaluationId, rubricVersionId, confidenceBand`                   | Yes                 | Durable; `interactionId:evaluationId` | P3      |
| `ai.feedback_recorded.v1`       | AI engine -> Analytics, AI Quality          | `feedbackId, interactionId, rating, reasonCodes`                                 | No                  | Durable; `feedbackId`                 | P2/P3   |

## Commerce, Developer And Operations

| Event                        | Producer -> consumers                                         | Payload                                                                         | Audit               | Retry and idempotency                       | Privacy   |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------- | ------------------------------------------- | --------- |
| `payment.succeeded.v1`       | Payment -> Billing, Subscription, Notification                | `paymentEventId, billingAccountId, provider, amountMinor, currency, occurredAt` | Financial evidence  | Durable; `provider:providerEventId`         | P2/P4     |
| `payment.failed.v1`          | Payment -> Subscription, Notification, Security               | `paymentEventId, billingAccountId, reasonCode, occurredAt`                      | Financial evidence  | Durable; `provider:providerEventId`         | P2/P4     |
| `payment.refunded.v1`        | Payment -> Billing, Subscription                              | `paymentEventId, billingAccountId, amountMinor, currency`                       | Financial evidence  | Durable; `provider:providerEventId`         | P2/P4     |
| `subscription.activated.v1`  | Subscription -> Entitlement, Feature Flag, Organization       | `subscriptionId, organizationId, planId, periodEnd`                             | Yes                 | Durable; `subscriptionId:version`           | P2        |
| `subscription.expired.v1`    | Subscription -> Entitlement, Notification, Organization       | `subscriptionId, organizationId, expiredAt`                                     | Yes                 | Durable; `subscriptionId:expired`           | P2        |
| `entitlement.changed.v1`     | Subscription -> all gated engines                             | `organizationId, key, oldValue, newValue, effectiveAt`                          | Yes                 | Durable; `grantId:version`                  | P1        |
| `developer.key_rotated.v1`   | Developer API -> Security Monitoring, Audit                   | `apiClientId, oldKeyId, newKeyId, expiresAt`                                    | Yes                 | Durable; `newKeyId`                         | P4        |
| `webhook.received.v1`        | Webhook -> Payment/Notification/Integration                   | `receiptId, provider, providerEventId, signatureValid, payloadHash`             | Invalid signatures  | Durable receipt; `provider:providerEventId` | P4        |
| `webhook.delivery_failed.v1` | Webhook -> Security Monitoring, Operator Workflow             | `deliveryId, subscriptionId, eventId, attempt, terminal, errorCode`             | Terminal only       | Durable; `deliveryId:attempt`               | P2/P4     |
| `feature_flag.changed.v1`    | Feature Flag -> affected engines, Audit                       | `flagKey, ruleVersion, changedAt`                                               | Yes                 | Durable; `flagKey:ruleVersion`              | P1        |
| `workflow.failed.v1`         | Workflow -> owning engine, Security Monitoring                | `workflowId, workflowType, stepKey, errorCode, terminal`                        | High-risk workflows | Durable; `workflowId:step:attempt`          | Inherited |
| `security.alert_raised.v1`   | Security Monitoring -> Notification, Platform Admin, Workflow | `alertId, ruleKey, severity, subjectType, subjectIdHash, detectedAt`            | Yes                 | Durable; `alertId`                          | P3/P4     |

## Schema Evolution

Additive optional fields may retain `v1`. Removing/renaming/retyping fields or changing semantics creates `v2`; producers dual-publish only for a bounded migration window. Consumers reject unknown major versions into an operator queue rather than guessing. Event schemas and representative fixtures are version-controlled and compatibility-tested.
