# Environment Strategy

## Environment Classes

- Development: local engineering work.
- Testing: deterministic CI and automated tests.
- Staging: Vercel preview deployments connected to non-production Supabase resources.
- Production: customer-facing environment.

## Rules

- `NEXT_PUBLIC_` values are visible to browsers.
- Provider API keys, service role keys, and webhooks are server-only.
- Missing required environment values are reported by `/api/ready`.
- Runtime code that requires validated values should call `getEnv()`.
- Optional integrations must degrade explicitly until configured.

## AI Provider Execution

- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY` are optional server-only values.
- `SYRA_AI_LEARNING_ENCRYPTION_KEY` is a server-only base64-encoded 32-byte key for AI learning conversations and generated study artifacts.
- Provider enablement is explicit; a credential alone does not enable execution.
- No AI credential or AI control variable may use `NEXT_PUBLIC_`.
- Production startup fails safely when its configured default provider is disabled or lacks credentials.
- Local development and tests default to all providers disabled and require no network access.
- Provider base URLs are server-only; production requires HTTPS and rejects embedded credentials, loopback hosts, queries, and fragments.

See [AI Secret Management](../94-ai-secret-management-guide.md).
