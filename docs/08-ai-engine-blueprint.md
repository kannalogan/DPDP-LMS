# AI Engine Blueprint

## Position

AI in SYRA is a governed capability platform, not direct SDK calls scattered through features. Course, assessment, mentor and career modules own the user outcome; the AI platform owns provider selection, prompt/config versions, safety, redaction, structured output, usage and evaluation.

## Layered Architecture

1. **Engine contract:** purpose-specific input/output schema and risk tier.
2. **Policy gate:** tenant entitlement, user permission, consent/purpose, regional/model allowlist and rate/cost budget.
3. **Context builder:** retrieves only authorized, versioned source material and emits citations.
4. **Privacy filter:** classifies/redacts input and blocks prohibited categories.
5. **Prompt registry:** resolves approved immutable prompt/model configuration.
6. **Provider router:** selects OpenAI, Claude or Gemini by capability/policy; no silent cross-region fallback.
7. **Output guard:** schema validation, safety moderation, citation and confidence checks.
8. **Human review:** required for configured consequential outputs.
9. **Observability:** interaction metadata, safety events, latency, tokens, cost and user feedback.

## Engine Catalog And Risk

| Engine                | Tier         | Authorized context                            | Required control                                            | Canonical write?          |
| --------------------- | ------------ | --------------------------------------------- | ----------------------------------------------------------- | ------------------------- |
| Course Summarizer     | Low          | One approved course/lesson version            | Citation and version binding                                | Draft content only        |
| Flashcard Generator   | Low          | Approved lesson content                       | Output schema and learner labeling                          | User study aid only       |
| AI Tutor              | Medium       | Enrolled content and current learner question | Retrieval citations, prompt-injection defense, age policy   | No                        |
| Translation           | Medium       | Approved content version                      | Locale reviewer before publication                          | Draft localized version   |
| Quiz Generator        | Medium       | Approved source content/outcomes              | Answer validation and instructor approval                   | Draft question version    |
| Study Plan            | Medium       | User goals, schedule and progress             | Editable plan, no health inference                          | No                        |
| Weak Area Detector    | Medium       | Mastery/progress aggregates                   | Explainable factors and minimum evidence                    | Risk/recommendation draft |
| AI Mentor             | High         | Assigned cohort projection                    | Mentor assignment, minimization, human action               | No automatic intervention |
| Assignment Evaluator  | High         | Submitted work and rubric                     | Blind marking option, calibrated model, human review/appeal | Proposed evaluation only  |
| Interview Practice    | Medium       | Consented profile and session                 | Recording consent and short retention                       | Feedback artifact only    |
| Resume Review         | High privacy | Explicit resume upload                        | Isolated purpose, no training, short retention              | No profile mutation       |
| Career Recommendation | High         | Consented career/learning profile             | Explainability, bias testing, no eligibility decision       | Recommendation only       |
| Voice Tutor           | High privacy | Live audio and approved context               | Explicit recording/transcription consent, ephemeral media   | No by default             |

## Provider Contract

The provider-neutral adapter supports:

- capability discovery: streaming, JSON schema, vision/audio, context limit and region;
- typed generation request/response;
- provider request ID and normalized token/latency usage;
- cancellation and timeout;
- safety/moderation outcome;
- retry classification without duplicating billable requests;
- data-processing attributes such as retention/training setting and region.

API keys remain server-side environment secrets. Prompt templates, provider raw errors and moderation internals are not sent to clients.

## Context And Retrieval

- Retrieval is tenant-filtered before semantic/keyword ranking.
- Only published/authorized versions enter learner engines; authoring engines may use drafts only for assigned authors.
- Every context chunk records source entity, version, classification and authorization decision.
- Retrieved text is data, never trusted instruction. System prompts delimit it and reject embedded attempts to change policy or expose secrets.
- Tutor/summarizer outputs cite source chunks; unsupported claims are withheld or labeled uncertain.
- Learner notes, mentor notes, resumes and assessment responses are excluded unless the engine contract explicitly requires and permits them.

## Assessment Controls

- Learners cannot invoke AI with hidden answer keys or unreleased question-bank content.
- Quiz generation outputs draft questions/options/keys separately; an instructor validates correctness, ambiguity, difficulty and source alignment.
- AI evaluation returns criterion-level evidence against an immutable rubric version.
- High-stakes or low-confidence evaluation requires human review before release.
- Model/prompt changes undergo calibration against a versioned benchmark and fairness slices before activation.
- Overrides append a new evaluation and reason; AI output is never rewritten to appear human-authored.

## Privacy And DPDP Controls

- Each engine declares processing purpose, data categories, lawful/consent basis, provider, region and retention.
- Data minimization happens before provider invocation; direct identifiers are replaced by pseudonyms unless essential.
- Tenants can disable engines or categories and configure approved providers/models.
- Provider contracts must prohibit training on SYRA/customer inputs and define deletion/security obligations.
- AI content is encrypted and expires after 30 days by default; resumes/audio may have shorter policies.
- Data-principal access/deletion discovery includes retained AI content; immutable usage/audit evidence is minimized and pseudonymized when legally permitted.

## Safety And Human Oversight

Blocked uses include covert proctoring, inferred sensitive traits, automatic employment eligibility decisions, automatic punitive mentor actions, legal conclusions presented as counsel, and generation/exposure of assessment answer keys to learners. Safety events record policy and action without unnecessarily retaining harmful content.

The UI must identify AI-generated output, provide source/version where relevant, offer correction/feedback, and explain when a person will review a consequential output.

## Reliability And Cost

- Engine budgets exist per tenant/user/time window; hard caps fail safely.
- Timeouts are engine-specific. Retry only transient, non-streamed failures with idempotency/correlation IDs.
- Fallback requires equivalent risk approval, residency and structured-output capability.
- Cache only non-personal, immutable content transformations keyed by source hash, prompt version, model and locale.
- Streaming interactions finalize usage on completion, cancellation and disconnect.

## Evaluation And Release Gates

Each engine has a benchmark covering correctness, groundedness, refusal, prompt injection, harmful content, privacy leakage, latency and cost. High-risk engines add bias slices, human agreement, appeal/override rates and regression thresholds. Activation proceeds offline benchmark → internal tenant → opted-in pilot → controlled rollout. Feature flags cannot override failed security/privacy gates.

## Observability

Track engine/config/prompt/model versions, status, latency, normalized usage/cost, context source IDs, safety outcomes and feedback. Do not log raw prompts/responses in general application logs. Content access uses the separately protected `ai_interaction_content` table and emits audit evidence.

## Voice Tutor Foundation

Voice requires a separate approved design for live transport, transcription/synthesis vendors, regional processing, interruption, captions, accessibility, recording indication and deletion. Initial foundation defines contracts only; it must not retain raw audio by default or imply emotion/identity detection.

## Implementation Sequence

1. Provider and engine interfaces plus configuration registry.
2. Privacy/policy gate, redaction and interaction ledger.
3. Retrieval with authorization and citation contracts.
4. Low-risk summarizer/flashcard pilot.
5. Tutor with streaming and safety evaluation.
6. Authoring engines with approval workflow.
7. High-risk evaluation/career engines only after legal, fairness and human-review sign-off.
