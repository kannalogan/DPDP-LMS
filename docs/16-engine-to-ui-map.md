# Engine To UI Map

This map identifies future product surfaces and interaction obligations. It does not prescribe legacy visual styling or authorize page implementation. Every surface follows `docs/12-engine-boundary-rules.md` loading, empty, error, success, accessibility, theme, motion and high-risk confirmation requirements.

| #   | Engine                   | Primary surfaces                                              | Critical states/actions                                | UI must never do                                             |
| --- | ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | Identity                 | sign-in, verification, recovery, MFA, session banner          | pending, generic denial, resend, step-up, revoked      | expose account existence/token or implement auth locally     |
| 2   | Authorization            | role/permission assignment, access-denied explanation         | scoped grant, expiry, revoke, delegation denial        | treat hidden button as authorization                         |
| 3   | Organization / Tenant    | organization switcher/setup/domain/hierarchy                  | pending verification, suspended, ready                 | infer hierarchy access or mix tenant state                   |
| 4   | User Profile             | profile, locale, accessibility, avatar                        | upload scan, save/conflict, status                     | display staff-only fields broadly                            |
| 5   | Learning Track           | global/private track catalog/admin                            | draft, published, archived, tenant-private             | hardcode DPDP navigation/business rules                      |
| 6   | Course                   | catalog/detail/author/review                                  | draft validation, review, scheduled, published         | edit a published version in place                            |
| 7   | Module                   | curriculum tree/module rule editor                            | reorder, gated, optional, validation                   | time-gate self-paced learners by cohort dates                |
| 8   | Lesson                   | lesson player/author preview                                  | loading, resume, offline, complete, inaccessible       | trust client completion or render unsanitized content        |
| 9   | Content Versioning       | history/diff/approval                                         | stale draft, conflict, approve/reject/supersede        | hide AI provenance or overwrite history                      |
| 10  | Media / Storage          | upload, media preview, captions/transcripts                   | uploading, scanning, ready, rejected, expired link     | publish before scan or expose permanent private URL          |
| 11  | Progress                 | student dashboard/course progress/mentor projection           | saving/offline, locked reason, completed, stale        | let client set percent/completion arbitrarily                |
| 12  | Assessment               | authoring, instructions, attempt, timer/result pending        | autosave, reconnect, expiry, submit, attempt limit     | ship keys/correctness or rely on browser clock               |
| 13  | Question Bank            | bank search/editor/reviewer/item analysis                     | draft warnings, key-protected, approve/retire          | expose answer key to learner/client bundle                   |
| 14  | Assignment               | brief/editor/upload/submission receipt                        | scan pending, draft, deadline, frozen                  | allow post-submit mutation without new version               |
| 15  | Evaluation               | evaluator queue/rubric/result/appeal                          | claim, AI proposal, review, release, override          | silently accept AI score or rewrite original evaluation      |
| 16  | Certificate              | template, issuance queue, learner credential, revoke          | generating, available, expired, revoked, regenerate    | regenerate issuance fact or expose private artifact publicly |
| 17  | Certificate Verification | public exact-token page                                       | checking, valid, expired, revoked, not found           | list/search certificates or expose contact/score             |
| 18  | Gamification             | points history, badges, streak, opt-in leaderboard            | awarded, reversed, opted out                           | make ranking mandatory or alter learning truth               |
| 19  | Notification             | inbox, preferences, templates/delivery ops                    | unread, sending, delivered, failed, unsubscribed       | merge optional consent with mandatory messages               |
| 20  | Discussion / Community   | spaces, threads, editor, report/moderation                    | empty, live update, reported, removed, locked          | show content outside enrollment/cohort scope                 |
| 21  | Announcement             | composer/banner/feed/acknowledgement                          | scheduled, active, expired, mandatory ack              | infer audience client-side                                   |
| 22  | Mentor                   | dashboard/cohort/learner drawer/action queue                  | no assignment, stale data, risk alert, access ended    | display unrelated learner or hidden assessment data          |
| 23  | Cohort                   | cohort list/roster/import                                     | empty, dry run, partial import, archived               | block self-paced progress based on dates                     |
| 24  | Intervention             | nudge/review/follow-up/history                                | AI suggestion, consent/rate block, delivery outcome    | auto-send AI message or hide failed delivery                 |
| 25  | Reporting                | catalog/filter/preview/export/download                        | queued, progress, partial failure, ready/expired       | expose arbitrary fields or permanent export links            |
| 26  | Analytics                | learner/mentor/tenant/platform dashboards                     | freshness, suppressed cells, no data, anomaly          | identify small groups or imply causal certainty              |
| 27  | Compliance               | notices, cases, retention, legal hold, evidence               | due/escalated, partial denial, hold, completed         | let generic admin browse case PII                            |
| 28  | DPDP Consent             | pre-collection notice, choices, receipt/history/withdraw      | unchecked, required, expired, withdrawn, re-consent    | use dark patterns/pre-ticked/bundled choices                 |
| 29  | Audit Evidence           | search/timeline/export/integrity                              | redacted detail, export progress, custody, expiry      | edit/delete evidence or expose secret payloads               |
| 30  | PII Protection           | masked field, reveal confirmation, purpose entry              | denied, step-up, grant expiry, redacted                | fetch hidden fields before authorization                     |
| 31  | AI Tutor                 | cited streaming tutor panel                                   | thinking, stream/stop, refusal, uncertainty, feedback  | present uncited output as course truth                       |
| 32  | AI Mentor                | recommendation panel in assigned learner/cohort               | factors, confidence, edit/accept/reject                | auto-create intervention or infer sensitive traits           |
| 33  | AI Assistant             | contextual assistant/tool preview                             | proposed command, confirmation, tool failure           | execute mutation without reauthorization/confirmation        |
| 34  | AI Content Generation    | generation workspace/review queue                             | generating, schema warning, source stale, accepted     | publish generated content directly                           |
| 35  | AI Evaluation            | evaluator side-by-side proposal                               | low confidence, disagreement, mandatory review         | release model score without policy review                    |
| 36  | Recommendation           | next learning/remediation/career cards                        | why, stale, accept/dismiss, no evidence                | use hidden protected traits or adverse ranking               |
| 37  | Search                   | global/vertical search and filters                            | loading, no result, permission-filtered, pagination    | reveal hidden result counts/snippets                         |
| 38  | Translation              | locale selector/side-by-side review                           | untranslated, machine draft, stale, approved           | present legal translation as approved automatically          |
| 39  | Voice Tutor              | voice session with captions/text fallback                     | consent, listening, muted, reconnect, stop/delete      | record silently or infer identity/emotion                    |
| 40  | Billing                  | plans/checkout/invoices/settings                              | redirect pending, active, past due, refund, error      | display browser redirect as payment truth                    |
| 41  | Subscription             | plan/status/limits/change/cancel                              | grace, scheduled change, expired, restored             | bypass entitlement or hide effective date                    |
| 42  | Payment                  | checkout result/finance reconciliation                        | pending, succeeded, failed, disputed, mismatch         | collect/store card details in SYRA forms                     |
| 43  | Enterprise Admin         | organization tree/policies/rollup reports                     | sibling denied, partial rollout, aggregate suppressed  | imply enterprise role grants raw child PII                   |
| 44  | Platform Admin           | operations/config/support/break-glass                         | approval, reason, time remaining, session banner       | offer universal tenant browser or log mutation               |
| 45  | Placement                | drive/application/TPO pipeline/partner stages                 | eligible, submitted, withdrawn, stage/appeal           | use hidden PII/protected traits in decision UI               |
| 46  | Internship               | internship filters/detail/outcome                             | stipend/duration/credit validation                     | fork common opportunity/application UX unnecessarily         |
| 47  | Hiring Partner           | onboarding/verification/team/opportunities                    | pending, verified, suspended, subscription blocked     | expose candidate identity before reveal grant                |
| 48  | Candidate Visibility     | candidate controls/history and partner redacted search/reveal | field/purpose/expiry, pending, approved/denied/revoked | bulk export/prefetch/cache or admin override                 |
| 49  | Developer API            | clients/keys/docs/logs/usage                                  | secret shown once, rotate, revoke, quota/error         | display secret again or allow unscoped keys                  |
| 50  | Webhook                  | subscriptions/delivery log/replay                             | verifying, delivered, retrying, terminal failure       | expose signing secret/payload PII                            |
| 51  | Feature Flag             | flag/rule/history/rollback                                    | draft, scheduled, active, safe default                 | label flag as security/entitlement control                   |
| 52  | Workflow                 | job progress/operator intervention                            | waiting, retrying, failed, manual action, cancelled    | let retry duplicate effects                                  |
| 53  | Event                    | operator lag/failure/schema view                              | healthy, delayed, poison, replaying                    | offer event payload editing                                  |
| 54  | Integration              | provider health/config verification/logs                      | healthy, degraded, unavailable, circuit open           | expose credentials/raw payloads                              |
| 55  | Security Monitoring      | alert queue/case/timeline/runbook                             | new, acknowledged, contained, false positive, closed   | auto-accuse/punish or reveal unrelated tenant data           |

## Legacy Experience Evidence Retained

- Student: course overview/player, module quiz/final exam, progress/badges, certificate, forum, notifications, profile/settings and privacy rights.
- Mentor: dashboard KPIs, at-risk alert, cohort grid, learner drawer, content/assessment oversight, scoring, notifications, reports, certificates, nudge and retake actions.
- Required states: skeleton loading, populated, empty/onboarding, API error/retry, responsive table-to-card adaptations and accessible realtime announcements.

Legacy hero/cards/colors/routes are not architecture. Future screens follow the current product design standards and engine contracts.
