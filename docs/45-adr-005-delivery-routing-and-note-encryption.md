# ADR-005: Delivery Routing And Note Encryption

- Status: Accepted
- Date: 2026-07-06
- Decision owners: SYRA architecture, application security, and learning delivery
- Contract references: `docs/21-master-database-contract.md`, `docs/23-master-table-catalog.md`, `docs/24-database-relationship-map.md`, `docs/30-database-open-decisions.md`

## Context

Prompt #012 requests `/student/courses/[courseSlug]/modules/[moduleSlug]`, but the frozen `course_modules` contract has no slug. Adding a derived or mutable title slug would create an unapproved identity and collision contract. The same prompt requires learner note editing, while `learner_notes.body_ciphertext` is E2 application-encrypted data and DB-009 recommends environment-managed envelope keys.

The architecture freeze requires an ADR before deviating from a requested route or introducing encryption infrastructure.

## Decision

1. Module routes use the stable existing identifier: `/student/courses/[courseSlug]/modules/[moduleId]`. Course and lesson routes continue to use their frozen slugs.
2. No `slug` column, generated alias, view, or title-derived identifier is added to `course_modules`.
3. Learner note text is encrypted and decrypted only in server-side application code using AES-256-GCM and a private `SYRA_NOTE_ENCRYPTION_KEY` environment variable containing a base64-encoded 32-byte key.
4. Ciphertext is versioned as `v1.<iv>.<ciphertext-and-tag>` so a future envelope-key rotation migration can distinguish formats.
5. Missing, malformed, or unavailable encryption configuration causes note reads and writes to fail closed. Plaintext is never written to `body_ciphertext`, logged, placed in URLs, or returned by database RPCs.
6. The delivery migration adds controlled security-definer RPCs only. Clients cannot directly create or mutate progress snapshots, enrollment lifecycle, audit evidence, notes, or bookmarks through arbitrary row writes.

## Consequences

- Module links remain stable across title edits and locales without changing the frozen schema.
- URLs expose opaque non-sensitive UUIDs, already used as entity identifiers throughout the platform.
- Notes satisfy the E2 contract without introducing Supabase Vault, KMS provider coupling, or client-held keys.
- Deployments must configure and retain the note key before enabling note editing. Key rotation requires a separately approved re-encryption procedure.
- Progress RPCs remain the only interactive write path for derived progress projections.

## Rejected Alternatives

- Adding `course_modules.slug` was rejected because the frozen contract defines no such identity and Prompt #012 permits helper functions/indexes, not content-model columns.
- Deriving a slug from title/position was rejected because it is unstable and collision-prone.
- Storing note text directly in `body_ciphertext` was rejected as a security and contract violation.
- Browser-side encryption was rejected because key distribution would undermine server authorization and recovery.
- Supabase Vault was rejected because the key is application-owned, and DB-009 prefers environment-managed keys for this case.
