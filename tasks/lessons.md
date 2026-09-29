# Lessons learned

Framework-only notes for the EM Slices Starter template.

## Event sourcing

- Domain events live in `packages/core/src/events/` per slice (not pre-shipped in the template)
- Timestamps: Unix milliseconds; money: integer minor units (e.g. cents) in events — see `docs/EVENT_SOURCING_BEST_PRACTICES.md`

## Slices

- Register command handlers in `commands.ts`
- Register inline projections in `projections-inline.ts`
- API routes go under `apps/web-app/src/app/api/`
- Use `pnpm em:slice:*` CLI, not legacy Miro generators

## Error handling

- Command handlers return `CommandResult`
- Routes use `ICommandDispatcher.sendCommand()` with `correlationId`

## UI

- Default locale **pt-BR** in the sample web shell (`lang="pt-BR"`, Portuguese copy on home/maintenance pages). Change `lang` and user-facing strings when you fork; the template does not ship i18n infrastructure.
- UI skeleton via `@em-slices/ui`; pick MUI or Tailwind + shadcn in `packages/ui` (see `UI_STACK.md`)
- No em dashes in user-facing copy

## Verification

- Run `pnpm test`, `pnpm lint`, and `pnpm build` before merging template changes
- Keep legacy product brand strings out of the repo (grep gate in CI or local checks)
- Keep old npm scope out of imports (use `@em-slices/*` only)
