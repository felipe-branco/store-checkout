# Project docs

**Spec:** [web_checkout_v0.1.pdf](./web_checkout_v0.1.pdf)

**Run:** [LOCAL_SETUP.md](../LOCAL_SETUP.md) — `make setup`, then `make dev` → [http://localhost:3000](http://localhost:3000) (kiosk at `/`).

## Implementation status (MashginCheckout)

All **19 EM slices** in [EVENT_MODEL.md](./EVENT_MODEL.md) are implemented (**Done** in EM). Board snapshot: **`20260930011438_store`** (`packages/em-manager/manifest.json` → `currentSnapshot`). Kiosk uses event-sourced cart, stock, order, payment simulation, automations, and checkout status UI.

After a fresh DB or projection drift, run `pnpm rebuild:projections --all` (see [PROJECTION_REBUILD_PLAN.md](../PROJECTION_REBUILD_PLAN.md)).

## Documentation map

Keep these aligned when behavior or EM exports change (Phase 2 of the implementation plan):

| Document | Purpose |
|----------|---------|
| [EVENT_MODEL.md](./EVENT_MODEL.md) | Slice list, dependency order, HTTP API map, automations, Stock Products List |
| [DECISIONS.md](./DECISIONS.md) | Stack, catalog, cart/stock orchestration, payment sim, logging, production kiosk gate |
| [../DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md) | Vercel deploy (Postgres, env, monorepo root `apps/web-app`) |
| [../../apps/web-app/src/app/api/README.md](../../apps/web-app/src/app/api/README.md) | Route → slice handler map, kiosk session cookie, registration checklist |
| [../PROJECTION_REBUILD_PLAN.md](../PROJECTION_REBUILD_PLAN.md) | `pnpm rebuild:projections`, `manual-rebuild-config.ts` |
| [../SLICE_IMPLEMENTATION_WORKFLOW.md](../SLICE_IMPLEMENTATION_WORKFLOW.md) | `pnpm em:slice:*`, drift, mark-status |
| [../TEMPLATE.md](../TEMPLATE.md) | First-slice walkthrough |
| [../../tasks/todo.md](../../tasks/todo.md) | Milestone checklist |
| [../../tasks/lessons.md](../../tasks/lessons.md) | Gotchas discovered during implementation |
| [../plans/em-checkout-completion.md](../plans/em-checkout-completion.md) | Archived EM checkout implementation plan (completed 2026-09-30) |

**Implementation plan (archived):** [em-checkout-completion.md](../plans/em-checkout-completion.md) — completed 2026-09-30.

## Other assets

| Asset | Purpose |
|-------|---------|
| [EVENT_MODEL.md](./EVENT_MODEL.md) — [board PNG](./assets/mashgin-checkout-event-board-2026-09-30.png) | Event Modelers ([app.eventmodelers.ai](https://app.eventmodelers.ai/)) export of **MashginCheckout** / Self-service checkout (2026-09-30) |
| [neon-projection-table-cartdetails-collection.png](./assets/neon-projection-table-cartdetails-collection.png) | Example: **`cartdetails-collection`** read model as a Postgres table (Neon); see [PROJECTION_REBUILD_PLAN.md](../PROJECTION_REBUILD_PLAN.md) |
| [vercel-v0-self-service-store-theme-source.zip](./vercel-v0-self-service-store-theme-source.zip) | v0 export reference |
