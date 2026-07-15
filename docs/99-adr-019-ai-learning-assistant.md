# ADR-019: AI Learning Assistant Boundary

## Status

Accepted for Prompt #026.

## Context

Prompt #024 defines provider-neutral AI records and Prompt #025 owns provider execution, routing, guardrails, budgets, resilience, redaction, and immutable execution evidence. Learner experiences need durable study artifacts without creating another provider path or exposing private learning content through analytics.

## Decision

The AI Learning Assistant is an additive feature above `executeAiCapability`. Feature services construct capability requests, but only Prompt #025 selects and invokes providers. Successful execution results are application-encrypted before controlled RPCs persist learning artifacts. PostgreSQL stores ciphertext, content hashes, source references, workflow metadata, and append-only events.

Learners read their own content. Assigned mentors receive read-only access through the frozen mentor assignment helper. Administrators read redacted event projections rather than learner prompts or generated content. All learning tables force RLS and expose no anonymous policy.

The existing `ai_conversations`, `ai_messages`, and execution evidence remain canonical. `ai_learning_sessions` binds learning context to those records; it does not replace them.

## Consequences

- No learning feature may import or call a provider adapter.
- Missing execution policy, provider configuration, budget, or encryption configuration fails closed.
- Generated content and learner messages remain decryptable only on the server.
- Context, generated-answer evidence, quiz attempts, revision sessions, and learning events are append-only.
- Admin analytics cannot reveal conversation text, learner prompts, answers, or provider credentials.
