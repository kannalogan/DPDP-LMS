# AI Guardrail Guide

## Decisions

The deterministic guardrail contract returns `allow`, `review`, or `block`. A request is blocked when no provider adapter is configured or when its data classification is restricted. Confidential data and explicitly reviewable workflows require human review. Public and internal requests may be allowed only after a future provider integration satisfies all other controls.

## Rules

Guardrails and rules are organization scoped and managed through controlled server paths. Rule configuration describes classifications, capabilities, actions, and ordering. It does not execute provider calls or inspect generated output in this foundation wave.

## Evidence

Guardrail events are immutable and append-only. Audit projections expose decision metadata, capability, timestamps, and hashes, but not prompt text, message content, secrets, or private learner data. Platform and organization audit permissions remain tenant constrained.

## Fail-closed behavior

An empty adapter registry is valid. Unknown providers, missing adapters, restricted data, and invalid workflow transitions fail closed. Application routes render an explicit unavailable state rather than simulating AI output.
