# Store Checkout — First slice walkthrough

This guide walks through adding your first vertical slice to the template. The repo ships with a hand-crafted tutorial snapshot (`packages/em-manager/migrations/20260701000000_tutorial.json`) containing a toy **Add Item** state change and **Item List** state view.

## Prerequisites

1. **Node.js 24+** and **pnpm 10+**
2. **Docker** for PostgreSQL
3. Copy env file:

```bash
cp apps/web-app/.env.example apps/web-app/.env.local
```

4. Start Postgres:

```bash
docker compose up -d
```

5. Install and run:

```bash
pnpm install
pnpm dev
```

6. Verify health: `curl -s localhost:3000/api/health | jq .`

## 1. Model in Event Modelers (optional)

You can model slices in [Event Modelers](https://eventmodelers.com) and export snapshots, or use the tutorial snapshot already in the repo.

The tutorial board **EM Slices Tutorial** includes:

| Slice | Type | Command / read model |
|-------|------|----------------------|
| Add item | STATE_CHANGE | `Add Item` → `Item Added` |
| Item list | STATE_VIEW | Read model `Item list` |

## 2. Initialize a slice from the snapshot

```bash
pnpm em:slice:init "Add item"
```

This creates `packages/slices/src/AddItem/slice.ref.json` pinned to the tutorial snapshot.

## 3. Resolve and generate

```bash
pnpm em:slice:resolve packages/slices/src/AddItem
pnpm em:slice:generate packages/slices/src/AddItem
```

Review generated files: command handler, events in `packages/core/src/events/`, tests, and route stubs.

## 4. Implement

```bash
pnpm em:slice:implement packages/slices/src/AddItem
```

Follow `packages/em-slice-generator/STATE_CHANGE_POST_GENERATION_PLAN.md` and `POST_GENERATION_CHECKLIST.md`.

### Registration checklist

After implementing `decide` / `evolve` and tests:

1. **Events** — add domain events under `packages/core/src/events/` and export from `packages/core/src/index.ts` if shared
2. **Commands** — register handler in `packages/slices/src/commands.ts`
3. **Projections** — append to `packages/slices/src/projections-inline.ts` (and `projections-registry.ts` / `manual-rebuild-config.ts` for state views)
4. **UI export** — export slice UI from `packages/slices/src/index.ts` when you add a page
5. **API route** — wire under `apps/web-app/src/app/api/<path>/route.ts` (see `api/README.md`)
6. **Optional page** — add kebab-case route under `apps/web-app/src/app/` that imports slice UI

## 5. First run

On first API request, `initializeEventStore()` runs `schema.migrate()` automatically. Ensure `DATABASE_URL` points at your Postgres instance.

## 6. Local dev without auth

The template has no Auth0. For local testing you can set:

```bash
DEV_USER_ID=<uuid>
```

Use this in route handlers until you add edge authentication (see below).

## 7. Test and drift check

```bash
pnpm --filter @store-checkout/slices exec vitest run AddItem
pnpm em:slice:check-drift --all
```

## 8. Mark status and export

```bash
pnpm em:slice:mark-status packages/slices/src/AddItem Review
# after review:
pnpm em:slice:mark-status packages/slices/src/AddItem Done
pnpm em:export:merge-status
```

Re-import the merged snapshot into Event Modelers to sync slice status.

## 9. Adding authentication later

This starter intentionally omits Auth0 and RBAC. When you add auth:

- Protect routes in Next.js middleware or route handlers
- Pass `user_id` from your session into commands (correlation id + metadata)
- Do not assume `@auth0/nextjs-auth0` is present

See `docs/SLICE_IMPLEMENTATION_WORKFLOW.md` for ongoing slice conventions.

## 10. Slice UI

Generated and hand-written slice UI must import **`@store-checkout/ui` only** (no `@mui/*`, no app-local shadcn paths).

The UI package is a **skeleton** until you adopt a stack. Read [packages/ui/UI_STACK.md](../packages/ui/UI_STACK.md) for:

- **Path A:** Material UI (MUI + Emotion)
- **Path B:** Tailwind CSS + shadcn/ui

Prefer custom components (`Button`, `Card`, `Input`) over layout primitives in slice screens.

## 11. Locale and sample copy

The web app uses **en-US** (`lang="en-US"` on `<html>`, English strings on the home, maintenance, and system-error pages). There is no i18n framework. Update `layout.tsx`, page copy, and sidebar labels in `@store-checkout/ui` if you change locale.

## Related docs

- [README.md](../README.md)
- [CLAUDE.md](../CLAUDE.md)
- [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- [SLICE_IMPLEMENTATION_WORKFLOW.md](./SLICE_IMPLEMENTATION_WORKFLOW.md)
- [EVENT_SOURCING_BEST_PRACTICES.md](./EVENT_SOURCING_BEST_PRACTICES.md)
