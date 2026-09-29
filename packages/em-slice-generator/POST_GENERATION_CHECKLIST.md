# Post-Generation Checklist

After `pnpm em:slice:generate` or `pnpm em:slice:implement`. See [docs/TEMPLATE.md](../../docs/TEMPLATE.md).

## Always

- [ ] Register command handler in [commands.ts](../../packages/slices/src/commands.ts)
- [ ] Add inline projection in [projections-inline.ts](../../packages/slices/src/projections-inline.ts) when the slice owns a projection
- [ ] Wire API route under [apps/web-app/src/app/api/](../../apps/web-app/src/app/api/) (`<path>/route.ts`)
- [ ] Use **Zod** for HTTP bodies — [docs/ZOD.md](../../docs/ZOD.md)
- [ ] Routes: `initializeEventStore()` + `initializeMessageBus()`; wrap with `withAxiomRouteHandler`
- [ ] Query via slice-local projections, not ad-hoc `readStream` in routes
- [ ] No cross-slice imports
- [ ] Slice UI imports **`@store-checkout/ui` only** (see [UI_STACK.md](../../packages/ui/UI_STACK.md))

## STATE_CHANGE

- [ ] Integration tests via [CommandHandlerSpec](../../packages/slices/test-utils/command-handler-spec.ts)
- [ ] Handler returns `CommandResult`; routes use `ICommandDispatcher.sendCommand` with `correlationId`
- [ ] Follow [STATE_CHANGE_POST_GENERATION_PLAN.md](./STATE_CHANGE_POST_GENERATION_PLAN.md)

## STATE_VIEW

- [ ] Register projection in `projections-inline.ts`, `projections-registry.ts`, `manual-rebuild-config.ts`
- [ ] Export UI from [index.ts](../../packages/slices/src/index.ts)
- [ ] Follow [STATE_VIEW_POST_GENERATION_PLAN.md](./STATE_VIEW_POST_GENERATION_PLAN.md)

## AUTOMATION

- [ ] Register in [automations.ts](../../packages/slices/src/automations.ts)
- [ ] Follow [AUTOMATION_POST_GENERATION_PLAN.md](./AUTOMATION_POST_GENERATION_PLAN.md)

## TRANSLATOR

- [ ] Dispatch via `dispatcher.sendCommand`
- [ ] Follow [TRANSLATOR_POST_GENERATION_PLAN.md](./TRANSLATOR_POST_GENERATION_PLAN.md)

## Completion

- [ ] Run slice tests: `pnpm --filter @store-checkout/slices exec vitest run <SliceDir>`
- [ ] `pnpm em:slice:check-drift --all`
- [ ] `pnpm em:slice:mark-status <dir> Done` then `pnpm em:export:merge-status`
