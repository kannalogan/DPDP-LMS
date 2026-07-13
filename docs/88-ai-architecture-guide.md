# Enterprise AI Architecture Guide

## Boundaries

The AI platform is a governance and contract foundation. It does not call models, stream output, generate content, create embeddings, or load provider SDKs. `features/ai/providers` defines the adapter contract and an empty registry so future integrations can be added without changing domain services.

## Server path

Protected routes resolve the current user and organization through the frozen identity layer. Repositories query only tenant-filtered tables and security-invoker projections, then map rows into DTOs. Writes use server actions with existing CSRF protection and controlled RPCs. Client components never receive service-role credentials, encrypted content, or raw database rows.

## Capabilities

The contract recognizes chat, completion, summarization, classification, translation, recommendation, question generation, rubric assistance, feedback assistance, content assistance, and search augmentation. A capability record is descriptive and disabled until a separately approved adapter exists.

## Governance

Usage limits and budgets are organization scoped. Guardrails evaluate classification, human-review requirements, and provider availability before a future invocation can proceed. Prompt, usage, result, conversation, feedback, guardrail, job, and recommendation evidence is retained for audit and reporting under forced RLS.

## Operations

Platform and organization administrators manage metadata through controlled RPCs. Mentors and students can view only authorized tenant-scoped AI workspace state. Empty and unavailable states are expected production behavior while the provider registry has no adapters.
