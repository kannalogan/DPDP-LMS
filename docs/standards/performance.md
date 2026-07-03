# Performance Standards

## Baseline

- Prefer React Server Components for data-heavy routes.
- Stream expensive route segments when possible.
- Use dynamic imports for large client-only modules.
- Keep provider SDKs out of client bundles unless explicitly required.
- Configure image optimization through Next.js.
- Add Redis-compatible caching behind service interfaces when scale requires it.
