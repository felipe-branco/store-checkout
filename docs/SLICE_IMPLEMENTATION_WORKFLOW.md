# Slice Implementation Workflow

Flow from [Event Modelers](https://app.eventmodelers.ai/) board → slice pointers → generated code → implemented slice. Visual board export: [EVENT_MODEL.md](project/EVENT_MODEL.md#board-diagram-event-modelers-export) (PNG in `docs/project/assets/`).

Start with [docs/TEMPLATE.md](TEMPLATE.md) for the tutorial **Add item** / **Item list** slices.

## EM path (new slices)

```
1. Model in Event Modelers → export JSON
2. pnpm em:migration:add <export.json>
3. pnpm em:slice:init --all-planned   (refs only) or em:slice:init <Slice>
4. pnpm em:slice:resolve <SliceDir>   (review; optional --cache)
5. pnpm em:slice:generate <SliceDir>
6. pnpm em:slice:implement <SliceDir> → agent follows post-gen plan
7. Post-gen checklist → tests → em:slice:mark-status → em:export:merge-status
```

Implement **one Planned slice at a time**. Skip `Blocked` slices.

| Condition | Codegen |
|-----------|---------|
| `slice.ref.json` present | `em:slice:*` |

## Post-generation plans

After `pnpm em:slice:implement`, read the plan for your slice type and complete [POST_GENERATION_CHECKLIST.md](../packages/em-slice-generator/POST_GENERATION_CHECKLIST.md).

| Slice type | Plan |
|------------|------|
| STATE_CHANGE | [STATE_CHANGE_POST_GENERATION_PLAN.md](../packages/em-slice-generator/STATE_CHANGE_POST_GENERATION_PLAN.md) |
| TRANSLATOR | [TRANSLATOR_POST_GENERATION_PLAN.md](../packages/em-slice-generator/TRANSLATOR_POST_GENERATION_PLAN.md) |
| AUTOMATION | [AUTOMATION_POST_GENERATION_PLAN.md](../packages/em-slice-generator/AUTOMATION_POST_GENERATION_PLAN.md) |
| STATE_VIEW | [STATE_VIEW_POST_GENERATION_PLAN.md](../packages/em-slice-generator/STATE_VIEW_POST_GENERATION_PLAN.md) |

## Agent checklist

1. **decide** / **evolve** (or parseExternalPayload + translate for TRANSLATOR)
2. **Runtime shapes** — **Zod** schemas and `z.infer` (see [ZOD.md](ZOD.md))
3. **Conventions** — timestamps in **milliseconds**, money in **minor units** (e.g. cents) in the event store ([EVENT_SOURCING_BEST_PRACTICES.md](EVENT_SOURCING_BEST_PRACTICES.md))
4. **Tests** — replace TODOs with real assertions
5. **Registration** — add to `commands.ts` / projections / automations as applicable
6. **Next.js route** — create `apps/web-app/src/app/api/.../route.ts` when the slice exposes HTTP
7. **Verify** — `pnpm exec tsc --noEmit`, slice tests, `pnpm lint`

## Dependency order

1. STATE_CHANGE (foundation)
2. TRANSLATOR (depends on target STATE_CHANGE)
3. AUTOMATION (depends on source + target STATE_CHANGE)
4. STATE_VIEW (depends on source STATE_CHANGE)

## Quick reference

| Command | Purpose |
|---------|---------|
| `pnpm em:migration:add <export.json>` | Import EM export → migrations/ |
| `pnpm em:slice:init --all-planned` | Scaffold slice.ref.json only |
| `pnpm em:slice:resolve <SliceDir>` | Preview ResolvedSliceView |
| `pnpm em:slice:generate <SliceDir>` | Generate TS scaffolding |
| `pnpm em:slice:implement <SliceDir>` | Generate + print implementation plan |
| `pnpm em:slice:check-drift --all` | CI drift gate |
| `pnpm rebuild:projections [name...] \| --all` | Rebuild projections ([PROJECTION_REBUILD_PLAN.md](PROJECTION_REBUILD_PLAN.md)) |
