# Engine To AI Map

AI is optional infrastructure behind purpose-specific engines. `None` means the engine remains deterministic and must not delegate authority to a model. All allowed uses pass authorization, purpose/consent, minimization, provider/model policy, prompt/version, schema/safety checks, usage accounting and retention from `docs/08-ai-engine-blueprint.md`.

| #   | Engine                   | Permitted AI touchpoint                                           | Prohibited use                                                              | Risk/review                            |
| --- | ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Identity                 | None; help copy may come from Assistant without identity payload  | authentication, identity proofing or account-risk decision by LLM           | Deterministic only                     |
| 2   | Authorization            | None                                                              | grant/deny permission from model output                                     | Deterministic only                     |
| 3   | Organization / Tenant    | Optional setup guidance from Assistant                            | tenant ownership/hierarchy decision                                         | Low; no mutation without confirmation  |
| 4   | User Profile             | Language/accessibility preferences shape presentation             | infer sensitive attributes or rewrite profile                               | Low; user confirms                     |
| 5   | Learning Track           | Draft taxonomy/description suggestions                            | publish/classify regulatory status autonomously                             | Medium; content review                 |
| 6   | Course                   | Outline, summary and metadata drafts                              | direct publication or unsupported claims                                    | Medium; author approval                |
| 7   | Module                   | Draft sequencing suggestions                                      | unlock/completion policy change                                             | Medium; author approval                |
| 8   | Lesson                   | Tutor/retrieval source; draft summary/translation                 | expose drafts/hidden content to unauthorized user                           | Medium; source/version binding         |
| 9   | Content Versioning       | Provenance and AI-draft marker                                    | approve/publish/supersede automatically                                     | Deterministic transition               |
| 10  | Media / Storage          | Approved transcription/caption/vision extraction                  | unconsented biometric/emotion/identity inference                            | High privacy; explicit purpose/review  |
| 11  | Progress                 | Minimized mastery input to recommendation/tutor                   | set completion or fabricate activity                                        | Medium; deterministic completion       |
| 12  | Assessment               | AI may help authors and evaluators through dedicated engines      | learner answer assistance, timing, attempts or final score authority        | High; strict context separation        |
| 13  | Question Bank            | Quiz generation/difficulty proposal with citations                | learner-visible keys or direct publish                                      | Medium/high; reviewer approval         |
| 14  | Assignment               | Optional learner assistance policy and evaluation proposal        | undisclosed authorship or canonical grading                                 | High; attribution/human review         |
| 15  | Evaluation               | AI proposal/evidence through AI Evaluation                        | release/finalize/override autonomously                                      | High; configured human review          |
| 16  | Certificate              | None; optional text layout drafting                               | eligibility, issue/revoke/expiry decision                                   | Deterministic only                     |
| 17  | Certificate Verification | None                                                              | interpret or alter credential status                                        | Deterministic only                     |
| 18  | Gamification             | Optional campaign copy                                            | points/badge/ranking decision outside versioned rules                       | Deterministic award rules              |
| 19  | Notification             | Draft template/message text                                       | choose recipients/purpose/consent or send                                   | Medium; owner approves template/action |
| 20  | Discussion / Community   | Moderation triage/summarization                                   | automatic punitive moderation without appeal policy                         | Medium/high; moderator review          |
| 21  | Announcement             | Draft/translation                                                 | select audience or publish high-impact notice                               | Medium; publisher review               |
| 22  | Mentor                   | AI Mentor summaries/recommendations                               | access unassigned learner or create intervention                            | High; mentor review                    |
| 23  | Cohort                   | Privacy-safe aggregate summarization                              | assign/remove people or infer cohort membership                             | Low/medium; deterministic membership   |
| 24  | Intervention             | Draft action/message and follow-up suggestion                     | auto-send, grant retake or record false action                              | High; mentor confirmation              |
| 25  | Reporting                | Narrative summary of authorized aggregates with citations         | fabricate metrics or expose suppressed cells                                | Medium; reviewer and source links      |
| 26  | Analytics                | Anomaly explanation/model evaluation                              | raw PII upload or causal/adverse decisions                                  | Medium/high; privacy/fairness review   |
| 27  | Compliance               | Case classification/summary and policy-diff assistance            | legal conclusion, rights denial or deletion decision                        | High; compliance/counsel review        |
| 28  | DPDP Consent             | Plain-language explanation/translation after approval             | determine consent validity, manipulate choice or create receipt             | High legal; deterministic consent      |
| 29  | Audit Evidence           | Authorized evidence summary                                       | alter/delete evidence or infer unsupported actor intent                     | High; cited read-only output           |
| 30  | PII Protection           | Redaction/classification assist as secondary detector             | sole access/encryption authorization                                        | High; deterministic policy authority   |
| 31  | AI Tutor                 | Core grounded tutoring                                            | answer keys, legal advice, unrelated learner data                           | Medium; citations/safety               |
| 32  | AI Mentor                | Core assigned-cohort recommendation                               | automatic intervention/adverse classification                               | High; human review/fairness            |
| 33  | AI Assistant             | Core navigation and confirmable tools                             | arbitrary DB/tool access or unconfirmed risky command                       | Medium/high by tool                    |
| 34  | AI Content Generation    | Core summaries/flashcards/quizzes/outlines                        | publish or remove provenance                                                | Medium; human review                   |
| 35  | AI Evaluation            | Core rubric evidence proposal                                     | final released grade                                                        | High; calibration/human review         |
| 36  | Recommendation           | Rule/model ranking and explanation                                | protected-trait or employment eligibility decision                          | High for career; fairness review       |
| 37  | Search                   | Semantic query/retrieval over authorized corpus                   | use vector similarity as authorization                                      | Medium; source RLS recheck             |
| 38  | Translation              | Core draft localization                                           | approve legal/privacy notice or publish directly                            | Medium/high by content; human linguist |
| 39  | Voice Tutor              | Core speech-to-text/tutor/text-to-speech                          | silent recording, speaker ID or emotion detection                           | High privacy; explicit consent         |
| 40  | Billing                  | Safe invoice explanation/support draft                            | set price, charge, refund or tax conclusion                                 | Medium; no financial authority         |
| 41  | Subscription             | None; plan explanation only                                       | activate/expire entitlement                                                 | Deterministic only                     |
| 42  | Payment                  | None                                                              | fraud/charge/refund authority without approved separate system              | Deterministic provider facts           |
| 43  | Enterprise Admin         | Aggregate narrative and setup assistance                          | cross-tenant PII access or policy rollout                                   | High; source scope + confirmation      |
| 44  | Platform Admin           | Narrow operator assistant/runbook summary                         | universal tenant query, break-glass or config mutation without confirmation | High; tool allowlist/step-up           |
| 45  | Placement                | Interview practice and optional stage-note summary                | stage/outcome decision or protected-trait ranking                           | High; human decision/fairness          |
| 46  | Internship               | Matching explanation and preparation                              | eligibility or stipend decision                                             | High for matching; review              |
| 47  | Hiring Partner           | Opportunity copy and applicant-summary only after authorization   | partner verification or hidden candidate profiling                          | High; no reveal expansion              |
| 48  | Candidate Visibility     | None for reveal authorization; optional redacted search semantics | infer/reveal hidden PII or consent                                          | Deterministic reveal policy            |
| 49  | Developer API            | Optional documented AI endpoints with dedicated scope             | general prompt proxy or service-role access                                 | Per-engine risk and budgets            |
| 50  | Webhook                  | None                                                              | signature verification, delivery truth or payload mutation                  | Deterministic only                     |
| 51  | Feature Flag             | None                                                              | safety/privacy gate override or autonomous rollout                          | Deterministic only                     |
| 52  | Workflow                 | AI may propose next operator step                                 | execute high-risk step or decide retry semantics                            | High; confirmed commands only          |
| 53  | Event                    | None                                                              | generate/alter/drop canonical facts                                         | Deterministic only                     |
| 54  | Integration              | AI provider routing by deterministic capability/policy            | silent region/privacy-incompatible fallback                                 | Deterministic routing policy           |
| 55  | Security Monitoring      | Alert clustering/summary and investigation aid                    | accuse, suspend or close incident autonomously                              | High; analyst review                   |

## AI Context Classes

| Class                  | Allowed examples                                                                 | Default retention                   | Additional gate                                  |
| ---------------------- | -------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| A0 Public content      | published public course text                                                     | cache by source hash                | source/version citation                          |
| A1 Tenant content      | private published course/announcement                                            | 30 days or no content retention     | active tenant entitlement                        |
| A2 Learner context     | question, progress/mastery, submission                                           | 30 days maximum by purpose          | self/assignment + consent/policy                 |
| A3 Employment/career   | resume, interview, candidate profile                                             | shorter configured period           | explicit purpose/consent; fairness               |
| A4 Compliance/security | case/evidence/alert                                                              | minimal/disabled provider retention | explicit privileged review and approved provider |
| AX Prohibited          | answer keys for learner, secrets, unrelated tenant data, raw payment credentials | never                               | reject before provider call                      |

## Human Review Gates

- **Mandatory:** final assessment evaluation where AI contributes under high-risk policy; career recommendation used by another person; mentor intervention; legal/privacy notice translation; compliance/security conclusion; platform/admin mutation.
- **Editorial:** generated course, lesson, question, rubric, announcement and notification content before publication.
- **User-controlled:** tutor/assistant/study plan/voice outputs remain advisory and correctable.

No feature flag or tenant setting may lower a mandatory review gate without an approved AI risk ADR, benchmark evidence, Security/Privacy approval and a recorded rollout plan.
