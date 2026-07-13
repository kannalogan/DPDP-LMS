# AI Budget And Cost Guide

## Enforcement

The execution pipeline applies input/output token limits, user and organization concurrency, existing daily/monthly usage limits, route cost ceilings, and active usage budgets. A budget reservation is created before execution and finalized or released with actual usage evidence.

Soft thresholds remain warnings in the Prompt #024 budget model. Hard limits reject before a provider call. Unknown cost rejects unless the active organization policy explicitly allows it.

## Cost Rates

`ai_cost_rates` stores organization, provider, model, currency, per-million token rates, effective dates, and a source-reference hash. Rates are immutable historical configuration. There are no provider prices in UI or execution code.

Estimated cost uses configured input, cached-input, and output rates. Actual token usage from the adapter is reconciled after completion. Fallback remains within the original reservation and records the provider/model that actually executed.

## Operations

Administrators maintain rates on `/admin/ai/budgets`. Reporting consumes the security-invoker execution metrics projection for token, cost, latency, failure, fallback, redaction, and guardrail-block counts.
