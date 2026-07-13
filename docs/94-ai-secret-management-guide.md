# AI Secret Management Guide

## Server-Only Variables

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY` are optional server-only credentials. They must be supplied through the deployment secret manager. Never prefix them with `NEXT_PUBLIC_`, write them to PostgreSQL, place them in URLs, or include them in logs, analytics, errors, audit payloads, screenshots, or support exports.

Provider base URLs, defaults, timeouts, retries, kill switch, and enablement flags are documented in the checked-in environment examples. A provider is available only when both enabled and credentialed. Missing optional credentials leave that provider unavailable without breaking local development or tests.

## Startup

`instrumentation.ts` validates the server AI environment at Node runtime startup. Production fails safely when `AI_DEFAULT_PROVIDER` is configured without an enabled credential. Production base URLs require HTTPS and reject loopback hosts, embedded credentials, query strings, and fragments.

## Rotation

Rotate credentials in the platform secret manager, redeploy, test through the protected provider connection action, and revoke the prior credential. The UI shows only configured/enabled state, health, region, and last verification time. It never displays masked key material because even partial secrets are unnecessary.

## Incident Response

Enable `AI_GLOBAL_KILL_SWITCH` for deployment-wide shutdown or use controlled organization/provider/model kill switches. Treat any suspected client exposure as credential compromise, revoke immediately, and retain only safe incident evidence.
