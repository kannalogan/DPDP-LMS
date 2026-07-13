# AI Prompt Framework Guide

## Lifecycle

Prompt templates use draft versions. Publishing a version records immutable template text, variables, classification, review requirements, and attribution. Subsequent changes create a new version; published versions are never edited.

## Variables

Variables are declared separately with a key, value type, requirement flag, classification, and validation schema. Runtime values belong to a future execution wave and must be validated server-side before use. Secrets and credentials are not valid prompt variables.

## Runs and results

The schema reserves immutable run and result evidence for a future provider integration. It records references, status, usage, latency, hashes, and encrypted payload locations without exposing content through current DTOs or routes. This prompt does not create runs or results because no AI calls are allowed.

## Publication rules

- Publication is controlled by RBAC and server-side RPCs.
- Classified prompts require the configured guardrail and human-review posture.
- Version history is append-only after publication.
- Prompt text, variables, and results are never included in reporting projections.
