# AI Reliability And Fallback Guide

## Request Reliability

Execution uses an abort signal, a bounded timeout, and at most `AI_MAX_RETRIES` retries. Only retryable timeout, rate-limit, overload, and transient failures are retried. Backoff is exponential with bounded jitter. Authentication, validation, forbidden, and content-policy failures are not retried.

Circuit state opens after repeated failures and rejects calls until its cooldown permits a probe. Provider health evidence records safe status, latency, region, and verification time. Raw health responses are discarded.

## Deterministic Fallback

Fallback requires an active organization rule linking an approved primary route to an approved fallback route and named failure classes. Rules specify priority, region crossing, and additional attempts. Routing is deterministic by configured default, priority, then stable identifier; there is no random selection.

Fallback is rejected when it violates organization provider/classification/region policy, exceeds the original budget, lacks credentials, targets an unhealthy/open-circuit route, or performs an unsafe retry. Every attempt records immutable route, latency, safe failure class, and fallback lineage.

## Degraded Mode

Missing providers, open circuits, kill switches, exhausted budgets, and absent routes return safe unavailable states. Student and mentor screens communicate limits and human accountability without exposing provider internals.
