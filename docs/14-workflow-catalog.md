# Core Workflow Catalog

Every workflow is a durable orchestration only when it crosses a request/provider/human boundary. A single transactional command remains in its owning engine. UI states listed are mandatory future experience states, not pages implemented by this document.

## W01. Student Onboarding

- **Trigger/actors:** Guest accepts applicable notice and starts registration; learner, Identity, Consent, Organization and Notification actors.
- **Engines:** Identity -> DPDP Consent -> Profile -> Organization/Authorization -> Notification.
- **Objects:** `auth.users`, profiles, consent records/events, invitations/membership, user settings, audit/outbox.
- **Events:** `identity.registered`, `consent.granted`, `identity.verified`, `organization.member_added`.
- **Validation:** notice/purpose/version, affirmative separate checkboxes, invitation validity, email normalization, age policy and tenant status.
- **Failure:** no identity/profile processing beyond approved pre-registration minimum; resumable verification; duplicate email returns generic safe result.
- **Audit/evidence:** consent receipt, invitation acceptance, verification and membership creation.
- **UI states:** notice -> form -> parental block if applicable -> verification pending/resend -> success; loading/error/recovery.
- **Security:** no pre-ticked consent, enumeration, open redirect or course access before verification/membership; minor enrollment disabled until approved flow.

## W02. Organization Onboarding

- **Trigger/actors:** Authorized platform operation or verified commercial flow creates a tenant; organization owner and platform/billing admins.
- **Engines:** Organization -> Identity/Authorization -> Billing/Subscription -> Compliance -> Notification.
- **Objects:** organizations/domains, invitation/membership/role assignment, billing account, settings, purpose/notice selection, audit.
- **Events:** `organization.created`, `authorization.assignment_granted`, `subscription.activated` where paid.
- **Validation:** unique slug/domain, hierarchy policy, country/region, owner identity, plan and privacy contacts.
- **Failure:** compensate incomplete invitation/billing intent without deleting audit; tenant remains `pending` until mandatory setup.
- **Audit/evidence:** creator, owner grant, domain verification, policy pack and subscription references.
- **UI states:** setup checklist, owner invitation, domain/policy/billing pending, ready and blocked explanations.
- **Security:** platform creation permission, no implicit enterprise descendants, domain token hashing, no service-role exposure.

## W03. Course Publishing

- **Trigger/actors:** Assigned author submits a complete draft; reviewer/publisher approves.
- **Engines:** Course/Module/Lesson -> Content Versioning -> Media -> Search/Event/Analytics.
- **Objects:** course/lesson versions, modules/resources, approval metadata and audit/outbox.
- **Events:** artifact version submitted/approved, `course.version_published`, `lesson.version_published`.
- **Validation:** outcomes, ordered structure, resource scan/accessibility metadata, assessment links, locale and review separation.
- **Failure:** validation report leaves draft editable; publish transaction is all-or-nothing; index consumers retry independently.
- **Audit/evidence:** source hashes, reviewer/publisher, diff, policy version and effective time.
- **UI states:** draft, validation errors, review, scheduled, publishing, published and superseded.
- **Security:** assigned scope only, published immutable, tenant-private visibility, AI content remains attributed draft.

## W04. Student Enrollment

- **Trigger/actors:** Self-service entitlement, organization assignment or approved bulk import; learner/admin.
- **Engines:** Organization/Subscription -> Learning Delivery -> Cohort -> Progress -> Notification.
- **Objects:** enrollment, optional cohort membership, idempotency/job rows and audit.
- **Events:** `enrollment.created`, cohort membership event, notification queued.
- **Validation:** active membership, course version, entitlement/seat, duplicate active enrollment and cohort tenant.
- **Failure:** bulk flow reports per-row errors and can resume; no partial cross-tenant membership.
- **Audit/evidence:** source, actor, course version, cohort, due date and import manifest.
- **UI states:** assignment preview/dry run, processing counts, row errors, enrolled/duplicate/seat-limit outcomes.
- **Security:** tenant/course/cohort alignment, least-privilege bulk action, safe CSV parsing and no emailed sensitive report.

## W05. Lesson Completion

- **Trigger/actors:** Learner reaches versioned completion condition; Progress engine is authority.
- **Engines:** Lesson/Media -> Progress -> Module/Assessment -> Gamification/Analytics/Recommendation.
- **Objects:** activity event, lesson progress, video checkpoint and derived module/course status.
- **Events:** `lesson.completed`, optionally `module.completed`, `enrollment.completed`.
- **Validation:** own active enrollment, published assigned lesson version, completion basis and monotonic progress.
- **Failure:** duplicate/offline requests return prior outcome; out-of-order checkpoints cannot regress completion.
- **Audit/evidence:** activity fact and version/basis; no separate security audit unless anomalous.
- **UI states:** saving, saved/offline queued, complete, next unlocked, still-required explanation.
- **Security:** server completion rules; external media callback/browser percentage is evidence, not blindly trusted.

## W06. Quiz Attempt

- **Trigger/actors:** Eligible learner starts an assigned quiz/exam.
- **Engines:** Assessment -> Question Bank safe projection -> Progress -> Evaluation -> Notification/Gamification.
- **Objects:** assignment, attempt, frozen items/options, responses, evaluation and integrity events.
- **Events:** `assessment.attempt_started/submitted/expired`, `evaluation.completed/released`.
- **Validation:** open window, prerequisites, attempts/retake, server timer, form seed and answer-key exclusion.
- **Failure:** autosave versions resolve conflicts; expiry atomically auto-submits per policy; submission retry is idempotent.
- **Audit/evidence:** start/submission/result and integrity/review signals; protected key access.
- **UI states:** instructions, loading form, timer/autosave, reconnect, submit confirmation, processing, result/pass/fail/retake.
- **Security:** no keys/correct flags in response/client/AI, submitted immutability, self-only and rate/abuse controls.

## W07. Assignment Evaluation

- **Trigger/actors:** Submitted assignment enters assigned evaluator queue; human evaluator and optional AI proposal.
- **Engines:** Assignment -> Evaluation -> AI Evaluation (optional) -> Notification/Progress.
- **Objects:** submission/storage object, evaluation/scores, AI interaction, override/appeal evidence.
- **Events:** `assignment.submitted`, `ai.evaluation_proposed`, `evaluation.completed/released/overridden`.
- **Validation:** clean artifact, immutable rubric version, evaluator assignment, blind-marking and review threshold.
- **Failure:** AI failure routes human-only; evaluator conflict/reassignment is recorded; release is separate from draft save.
- **Audit/evidence:** artifact hash, rubric/prompt/model, evaluator, criterion evidence, overrides/release.
- **UI states:** scan pending, unclaimed/claimed, AI pending/proposal, rubric draft, review required, released/appealed.
- **Security:** private signed downloads, minimum identity, no AI canonical score, append-only override and learner sees released result only.

## W08. Certificate Issuance

- **Trigger/actors:** Course completion/evaluation event or authorized manual reevaluation; Certificate service.
- **Engines:** Progress/Evaluation -> Certificate -> Media -> Verification -> Notification.
- **Objects:** eligibility inputs, certificate snapshot/status event, artifact object and public projection.
- **Events:** `certificate.issued`, `certificate.artifact_generated` or workflow failure.
- **Validation:** exact course/version policy, released passing result, no prior active issuance, template version and holder-name policy.
- **Failure:** pending generation retries; same eligibility key never duplicates certificate; operator can regenerate artifact, not issuance fact.
- **Audit/evidence:** eligibility facts/versions, issuance actor/system, template/hash, status history.
- **UI states:** eligible/pending generation/available, download error/retry, expired/revoked.
- **Security:** step-up for manual/revoke, private artifact, public projection only, seven-year default from legacy is subject to approved policy.

## W09. Certificate Verification

- **Trigger/actors:** Guest submits exact token/QR; Verification engine.
- **Engines:** Certificate Verification -> Certificate status projection -> Analytics/Security.
- **Objects:** public projection and privacy-preserving verification telemetry.
- **Events:** `certificate.verification_viewed`.
- **Validation:** full high-entropy token, rate/abuse policy and current status/cache version.
- **Failure:** unknown and malformed tokens return non-enumerating not-found; dependency outage returns retryable unavailable.
- **Audit/evidence:** only abuse/security telemetry; public view does not create learner activity.
- **UI states:** checking, valid, expired, revoked, not found and unavailable.
- **Security:** no listing/search, account/contact/score IDs, plaintext token logs or stale revocation cache.

## W10. Mentor Intervention

- **Trigger/actors:** Assigned mentor responds to risk/quiz failure/inactivity or schedules review.
- **Engines:** Mentor/Risk -> Intervention -> Notification -> Analytics/Audit.
- **Objects:** mentor assignment, risk signal, intervention, notification/delivery and audit.
- **Events:** `mentor.intervention_created`, `learner.nudge_requested`, notification outcome.
- **Validation:** active assignment, learner in cohort, communication purpose/consent, nudge quota and reason.
- **Failure:** intervention remains with delivery-failed status; retry follows channel policy; no silent duplicate.
- **Audit/evidence:** mentor, learner, reason/type, content hash/visibility, consent check and outcome.
- **UI states:** learner context, message draft/AI suggestion, consent/rate block, sending, delivered/failed, follow-up.
- **Security:** mentor cannot view unrelated learners; encrypted sensitive notes; AI never sends; withdrawal stops optional messages.

## W11. DPDP Consent Capture

- **Trigger/actors:** Data principal reaches a processing boundary requiring consent.
- **Engines:** Compliance/Notice -> DPDP Consent -> owning engine -> Audit/Notification.
- **Objects:** purpose, immutable notice version, current consent and consent event.
- **Events:** `consent.granted` or `consent.withdrawn`.
- **Validation:** active notice/purpose/locale/context, affirmative action, subject verification, age/guardian policy and separate optional purposes.
- **Failure:** evidence append failure blocks processing; material notice change requires re-consent, not silent migration.
- **Audit/evidence:** notice hash/version, purpose, action, server time, actor/context and minimized network evidence.
- **UI states:** notice, details, unchecked choices, disabled continue, receipt, history and withdrawal confirmation.
- **Security:** no collection before required consent, no dark pattern/bundling, subject-only receipts and immediate policy propagation.

## W12. Data Principal Request

- **Trigger/actors:** Verified learner submits access/correction/erasure/grievance/nomination request; compliance case team.
- **Engines:** Compliance -> Identity verification -> Workflow -> all owning engines/providers -> Reporting/Notification.
- **Objects:** privacy request/events/actions, legal holds, report/evidence object and audit.
- **Events:** `privacy.request_received/verified/completed`, retention action events.
- **Validation:** identity proportionality, controller/tenant/jurisdiction, scope, deadline, third-party rights and holds/exceptions.
- **Failure:** failed system action remains retryable with owner/escalation; partial response never marked complete; legal hold blocks deletion.
- **Audit/evidence:** immutable case timeline and per-system action/evidence hash.
- **UI states:** intake, verification, received/due, in progress, action required, secure export, completed/partially denied/appeal.
- **Security:** compliance permission separate from admin, secure delivery, no excessive identity documents and restored backups reapply deletions.

## W13. PII Reveal To Hiring Partner

- **Trigger/actors:** Verified partner requests candidate fields for an active opportunity; candidate/TPO/policy decides.
- **Engines:** Hiring Partner/Search -> Candidate Visibility -> Consent/PII Protection -> Audit/Security.
- **Objects:** visibility grant, redacted search profile, reveal request/decision/access grant/event.
- **Events:** `pii.reveal_requested/approved/denied/accessed`.
- **Validation:** partner/user/opportunity active, candidate grant/consent, purpose, requested field allowlist and expiry.
- **Failure:** any authorization/evidence error denies disclosure; withdrawal/revocation invalidates outstanding grants immediately.
- **Audit/evidence:** request, decision, grant and atomic access event with field categories/purpose.
- **UI states:** redacted result, request purpose/fields, pending/denied/approved expiry, explicit reveal and candidate history.
- **Security:** no admin override, bulk export, prefetch/cache, hidden fields or partner-cross access; actual reveal and evidence share transaction.

## W14. AI Tutor Session

- **Trigger/actors:** Enrolled learner asks a question; AI Tutor and provider.
- **Engines:** Identity/Authorization -> AI Tutor -> Search/Lesson -> PII Protection -> Integration/Analytics.
- **Objects:** AI interaction/content/usage/safety/feedback and source references.
- **Events:** `ai.interaction_started`, `ai.response_generated/safety_blocked/feedback_recorded`.
- **Validation:** entitlement, engine enabled/budget, purpose/consent, authorized source versions, prompt/model and input classification.
- **Failure:** timeout/cancel finalizes usage; unsafe/ungrounded response blocked; provider outage offers text/search fallback without fabrication.
- **Audit/evidence:** model/prompt/source versions, safety action and high-risk review; raw content outside general audit/logs.
- **UI states:** composing, streaming/cancel, citations, uncertainty/refusal, retry, feedback and quota/consent block.
- **Security:** prompt-injection controls, no answer keys/other users/secrets, short content retention and policy-equivalent fallback only.

## W15. AI-Generated Quiz Review

- **Trigger/actors:** Assigned author requests draft questions from approved course content; reviewer approves/rejects.
- **Engines:** AI Content -> Question Bank -> Content Versioning -> Audit.
- **Objects:** interaction/provenance, draft question/version/options/key and review transition.
- **Events:** `ai.content_draft_generated`, `question.version_published` after human approval.
- **Validation:** source authorization/hash, output schema, answer consistency, ambiguity/difficulty, citations and reviewer separation.
- **Failure:** malformed/unsupported draft rejected or regenerated; source supersession marks draft stale.
- **Audit/evidence:** source/prompt/model, generator, reviewer, edits/diff and publication.
- **UI states:** configuration, generating, draft list, validation warnings, side-by-side source, edit/reject/approve.
- **Security:** drafts never visible to learners, answer key protected, AI cannot publish or insert into active assessment.

## W16. Enterprise Billing

- **Trigger/actors:** Billing admin starts checkout/change/cancel; provider webhooks finalize.
- **Engines:** Billing -> Payment/Webhook -> Subscription -> Entitlement -> Notification/Audit.
- **Objects:** billing account, price, inbound/payment event, subscription, invoice and entitlement grant.
- **Events:** webhook receipt, `payment.succeeded/failed`, `subscription.activated/expired`, `entitlement.changed`.
- **Validation:** billing permission, plan/currency/country, signed provider event, event/order/idempotency and current provider state.
- **Failure:** browser stays pending until webhook/reconciliation; duplicates no-op; out-of-order events fetch provider truth; operator queue for mismatch.
- **Audit/evidence:** checkout intent, signed payload hash, normalized payment/subscription transitions and entitlement changes.
- **UI states:** plan/checkout, redirect returned-pending, active/past due/grace/cancelled, invoice and retry support.
- **Security:** no card data, raw-body signature, provider IDs unique, billing-role isolation and encrypted tax/contact fields.

## W17. Bulk Enrollment

- **Trigger/actors:** Organization admin uploads validated roster/selection.
- **Engines:** Organization/Auth -> Workflow -> Learning Delivery/Cohort -> Notification/Reporting.
- **Objects:** upload object, background job/idempotency, invitation/membership, enrollments/cohort members and result export.
- **Events:** organization member/enrollment/cohort events per successful row plus workflow outcome.
- **Validation:** file type/size/headers, tenant, dedupe, course/version, seats, role and dry-run approval.
- **Failure:** row isolation, checkpoint/resume, no rollback of already confirmed rows unless explicit compensating command; errors downloadable securely.
- **Audit/evidence:** source hash, dry-run summary, approver, per-row outcome and final counts.
- **UI states:** upload, parsing, dry-run issues, confirm, processing progress, completed/partial/failed and expiring report.
- **Security:** formula/CSV injection defense, private file, minimum row PII, admin scope, quotas and result download audit.

## W18. Admin Audit Review

- **Trigger/actors:** Authorized compliance/security auditor searches or exports evidence.
- **Engines:** Authorization -> Audit Evidence -> Reporting/Storage -> Security Monitoring.
- **Objects:** audit events, evidence export manifest/object and support access grant if cross-tenant.
- **Events:** `audit.evidence_appended`, report requested/generated/downloaded and security alerts where suspicious.
- **Validation:** auditor permission, tenant/time/resource scope, purpose, export field allowlist and step-up for sensitive scope.
- **Failure:** query/export fails closed; partial export is not downloadable; replay regenerates from immutable scope.
- **Audit/evidence:** the search/export/download itself is audited without recursive payload explosion.
- **UI states:** filters, results/timeline, redacted details, export confirmation/progress, expiry and integrity verification.
- **Security:** no mutation, no broad admin default, short signed object, hash/custody metadata and legal-hold retention.
