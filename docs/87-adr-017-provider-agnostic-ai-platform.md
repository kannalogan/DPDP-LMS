# ADR-017: Provider-agnostic AI platform foundation

## Status

Accepted for Prompt #024.

## Context

SYRA needs stable AI contracts before any provider, model runtime, or generated-content feature is approved. The foundation must support tenant governance, budgets, audit evidence, prompts, conversations, and future adapters without storing credentials or making AI calls.

## Decision

The database owns provider-neutral metadata and immutable operational evidence. Application code exposes capability-based adapter interfaces, but the adapter registry is empty by default and fails closed when no implementation is registered. Provider and model records describe administrative catalog state only; they cannot contain credentials, endpoints, SDK configuration, or secrets.

Prompt versions, model versions after publication, prompt results, usage events, guardrail events, messages, and job events are immutable. Organization-scoped forced RLS and existing RBAC permissions protect every table and projection. Conversations expose metadata projections only; encrypted message content is never returned by the workspace repository.

The embeddings registry is a disabled metadata reservation for a future architecture decision. It stores no vectors, chunks, embeddings, provider identifiers, or executable configuration.

## Consequences

- No provider is selected by default and no provider-specific name appears in the implementation.
- AI routes provide configuration, governance, audit, and unavailable states rather than executable AI experiences.
- A later provider integration requires a separate ADR, secret-management design, threat model, and controlled adapter implementation.
- Reporting consumes minimized usage and guardrail projections without prompt or conversation content.
- Existing rule-based search recommendations remain unchanged.
