# Zod: types and runtime validation

This repository uses **[Zod](https://zod.dev)** (v4, e.g. `^4.3.6`) as the default way to:

1. **Define runtime schemas** for untrusted input (HTTP bodies, query strings, webhooks, external JSON).
2. **Derive TypeScript types** from those schemas with `z.infer<typeof SomeSchema>` so wire shapes stay single-sourced.

## Conventions

- **UUIDs:** use `z.uuid()`, not deprecated `z.string().uuid()` (see `tasks/lessons.md`).
- **Country-specific IDs (CPF, SSN, etc.):** not shipped in `@store-checkout/core`. Add validators in your app or slice package when you need them.
- **Version alignment:** prefer the same `zod` range as `@store-checkout/slices` (and other packages that already depend on Zod) so the workspace does not resolve multiple majors; use root `pnpm` overrides if needed.
- **New packages:** if a package needs validation or schema-derived types, add `zod` to that package’s `package.json`—do not rely on transitive Zod unless the package only re-exports types.

## Slice boundaries

- Validate HTTP and webhook payloads in slice `routes.ts` (or dedicated schema modules) with Zod before dispatching commands.
- **Timestamps (domain events):** [EVENT_SOURCING_BEST_PRACTICES.md](./EVENT_SOURCING_BEST_PRACTICES.md) — Unix **milliseconds**; normalize seconds → ms at translator boundaries.
- **Money (event store):** [EVENT_SOURCING_BEST_PRACTICES.md](./EVENT_SOURCING_BEST_PRACTICES.md) — integer **minor units** (e.g. cents); convert at translator boundaries.

## Related docs

- [docs/TEMPLATE.md](./TEMPLATE.md) — first slice walkthrough
- [docs/SLICE_IMPLEMENTATION_WORKFLOW.md](./SLICE_IMPLEMENTATION_WORKFLOW.md)
