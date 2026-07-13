# ADR-018: AI Provider Execution Boundary

## Status

Accepted for Prompt #025. Prompts #001-024 remain frozen.

## Context

The provider-neutral AI foundation needs controlled access to OpenAI, Anthropic Claude, and Google Gemini without exposing credentials, provider payloads, or consequential actions. Prompt #024 already owns provider/model registries, guardrails, usage limits, budgets, and audit foundations.

## Decision

1. All provider calls pass through `AiProviderExecutionService`; feature modules cannot call adapters directly.
2. Adapters use provider-neutral requests and responses with injected HTTP transports. No provider SDK is added.
3. Credentials remain server environment values and are never represented by database columns or DTOs.
4. One additive migration reuses Prompt #024 entities and adds routing, policy, health, circuit, budget-reservation, request, attempt, result, failure, redaction, and policy-decision evidence.
5. Execution evidence stores hashes, classifications, counts, safe codes, token/cost metadata, and timestamps, not prompt or response plaintext.
6. Routing and fallback are deterministic and organization-configured. Fallback cannot silently cross a prohibited provider or region.
7. Budget reservation precedes provider execution; immutable evidence records reconciliation.
8. Global, organization, provider, and model kill switches fail closed.
9. Consequential actions remain prohibited and require authorized human workflows.

## Consequences

Provider-disabled development and tests need no credentials. A production default provider must be both enabled and credentialed. Provider price changes are versioned configuration, not UI code. Future AI products must use this boundary and inherit its policy, redaction, budget, reliability, and evidence controls.
