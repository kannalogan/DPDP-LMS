# AI Privacy And Data Handling Guide

## Classification

Every request declares one of: public, internal, confidential, restricted, PII, or sensitive personal data. Organization policy controls allowed classifications, providers, and regions. Restricted data is denied unless explicitly allowed. PII redaction is mandatory when policy requires it.

## Minimization

Input processing detects email, phone, Aadhaar, payment-card, bearer-token, and common secret patterns. Matches are replaced before provider execution. Prompt-injection checks protect system instructions and prohibit instruction exfiltration. Output is redacted and classified before return.

## Evidence

The database stores request/response hashes, classification, message count, redaction category/count/hash, guardrail decision codes, token/cost/latency metadata, actor, organization, provider/model references, trace, retention category, and timestamps. It does not store API keys, authorization headers, prompt plaintext, response plaintext, raw provider errors, or hidden system instructions.

## Governance

`ai_execution_privacy_projection` makes execution evidence discoverable by actor and organization for privacy-request workflows without exposing content. Retention categories link execution evidence to Governance Platform policy. Immutable attempt/result/failure/redaction/decision evidence cannot be rewritten; approved retention workflows may later append disposition evidence rather than silently delete history.

AI cannot approve privacy requests, publish policies, delete evidence, change roles, finalize grades, issue certificates, or make employment/legal decisions.
