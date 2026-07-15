# AI Learning Assistant Guide

## Execution

All tutor, explanation, summary, flashcard, quiz, plan, revision, and recommendation requests call `executeAiCapability`. The controlled execution service resolves identity and organization, applies policy and guardrails, reserves budget, redacts sensitive input, selects a configured route, records evidence, and returns a normalized result.

The learning service persists only after a completed execution request is verified by the matching RPC. Provider adapters are never imported by `features/ai-learning`.

## Privacy

Set `SYRA_AI_LEARNING_ENCRYPTION_KEY` to a private base64-encoded 32-byte key before enabling learning assistance. Titles, messages, generated artifacts, quiz answers, plans, feedback comments, and memory are encrypted in server code. The key is never stored in PostgreSQL or exposed through a public environment variable.

Admin views contain counts, dates, event names, and execution references only. Assigned mentors can read learning content only for learners covered by their existing assignment scope.

## Availability

The UI presents a real unavailable state when provider policy, model routes, budget, guardrails, or encryption configuration prevent execution. It does not insert demonstration content or synthesize a successful response.
