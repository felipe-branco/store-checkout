# API routes

Slice API routes are thin Next.js adapters over framework-agnostic handlers in `packages/slices/src/{SliceName}/routes.ts`.

Example layout:

```
api/
  add-item/
    route.ts
```

## Logging

Wrap handlers with [`withLoggedApiRoute`](../../lib/api-log.ts) from `@/lib/api-log` (includes Axiom route timing when configured). Each completion log includes:

- `correlationId` — from `x-correlation-id` / `x-request-id`, or generated; echoed on `x-correlation-id` response header
- `route`, `method`, `durationMs`, `status`, `success`
- Optional: `commandType`, `aggregateId`, `error` (no card/PAN data)

Use the `enrich` option for command-specific fields after the handler runs. See `api/orders/route.ts`.

See [docs/TEMPLATE.md](../../../../docs/TEMPLATE.md) for the full first-slice walkthrough.
