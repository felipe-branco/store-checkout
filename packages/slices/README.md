# Vertical Slices

Empty registries by default. Add slices via the EM workflow — see [docs/TEMPLATE.md](../../docs/TEMPLATE.md).

## After code generation

Each slice folder under `packages/slices/src/{SliceName}/` should register:

- Command handlers in `commands.ts`
- Automations in `automations.ts`
- Inline projections in `projections-inline.ts`
- UI exports in `index.ts` (when applicable)

API routes live under `apps/web-app/src/app/api/`.
