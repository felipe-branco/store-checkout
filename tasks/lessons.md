# Lessons learned

Framework and product notes for **store-checkout**.

## Event sourcing

- Domain events live in `packages/core/src/events/` per slice (not pre-shipped in the template)
- Timestamps: Unix milliseconds; money: integer minor units (e.g. cents) in events — see `docs/EVENT_SOURCING_BEST_PRACTICES.md`

## Slices

- Register command handlers in `commands.ts`
- Register inline projections in `projections-inline.ts`; state views also in `projections-registry.ts` and **`packages/slices/src/manual-rebuild-config.ts`** (same keys as registry) so `pnpm rebuild:projections --all` works
- **Do not add code under `packages/slices/src/` outside an EM slice directory** (no shared `stock/`, `stockProductsList/`, etc.) unless the user explicitly asks for it
- **Slices are self-contained units** — keep state, `evolve`, and `decide` inside each slice folder; prefer **duplication over cross-slice shared modules** (including stock deciders: `ReserveStockItem`, `DereserveStockItem`, and `SellStockItem` must keep identical `evolve` for `StockItemSold` / reservation fields)
- **Automators:** register in `packages/slices/src/automations.ts`; use **per-slice context types** (e.g. `WebhookSimulatorAutomatorContext`, `CartClearedAutomatorContext`) — no shared `packages/slices/src/automation/` helpers unless explicitly requested
- **Cross-slice sequencing at the route layer:** when the EM board chains commands (e.g. reserve then add to cart), orchestrate in `{Slice}/routes.ts` via multiple `dispatcher.sendCommand()` calls — do **not** import another slice’s command handler into a decider. Roll back the stock step if the cart step fails after a successful reserve/dereserve.
- **Next.js client vs server:** `@store-checkout/slices` exports **UI only** (`CreateCart`, `CartDetails`). Routes, projections, `commands`, and `INLINE_PROJECTIONS` live on `@store-checkout/slices/server` — never import the barrel from Client Components or you pull `pg` into the browser bundle
- API routes go under `apps/web-app/src/app/api/`
- **Production kiosk gate:** `KIOSK_ACCESS_MAGIC_WORD` + HttpOnly **`kiosk_session`** cookie; middleware protects `/api/*` without exposing secrets to the browser bundle
- Use `pnpm em:slice:*` CLI, not legacy Miro generators

## Error handling

- Command handlers return `CommandResult` (`success` + `newEvents`, or structured `error`)
- Routes use `ICommandDispatcher.sendCommand()` with `correlationId`; **`SendResult`** includes **`eventsPublished`** — treat `success: true` with `eventsPublished === 0` as failure when the EM flow requires an event (e.g. `DereserveStockItem` before remove from cart). **Exception:** after **`StockItemSold`**, `DereserveStockItem` intentionally emits nothing (EM spec “do not dereserve sold item”); `RemoveItemFromCart` with `{ cartAlreadyCleared: true }` may succeed with zero dereserve events for sold lines
- Slice route errors can expose `code` (`STOCK_RESERVE_FAILED`, …) and **`failedCommandType`** so API `enrich` logs name the failing step, not only the top-level route command

## API logging

- Wrap `apps/web-app/src/app/api/**/route.ts` handlers with `withLoggedApiRoute` from `@/lib/api-log`
- Pass `commandType` / `aggregateId` via the `enrich` callback when dispatching commands; never log payment card fields
- Cart item routes: use an enricher that reads JSON `{ failedCommandType, code, error }` on **4xx/409** so reserve/dereserve failures show up in structured logs (see `apps/web-app/src/app/api/cart/items/route.ts`)
- Generate correlation IDs with global `crypto.randomUUID()` — not `node:crypto` — so helpers stay valid on Node, Edge, and other Vercel runtimes

## UI

- **Kiosk polling:** product catalog via SWR **15s** + focus revalidate (`packages/ui/src/hooks/use-products.ts`); cart is **not** polled — refetch after commands only (`CartDetails`)
- **Cart `price_in_cents`:** set from catalog in `/api/cart/items`, stored on cart stream events; board snapshot in `manifest.json` → `currentSnapshot` (latest: **`20260930011438_store`**, adds Dereserve spec scenario). After a new EM export, **`sliceStatus` on borders can regress to `Planned`** — restore from prior migration or run `pnpm em:export:merge-status` so snapshot matches `slice.ref.json` / `manifest.json`
- **Clear cart → stock:** `ClearCart` does not dereserve on the command; **`CartClearedAutomator`** reads **`ClearedCartItems`** projection and calls **`RemoveItemFromCart`** orchestration with **`cartAlreadyCleared: true`** (dereserve only; cart lines already empty on stream)
- **Cart ↔ stock:** `AddItemToCart/routes.ts` and `RemoveItemFromCart/routes.ts` require **`on_hand_quantity`** (catalog `quantity`) for `ReserveStockItem` / rollback re-reserve; web-app passes it from `getCatalogRowByProductId`
- Default locale **en-US** in the web shell (`lang="en-US"`, English copy on home/maintenance pages). No i18n framework.
- UI skeleton via `@store-checkout/ui`; pick MUI or Tailwind + shadcn in `packages/ui` (see `UI_STACK.md`)
- No em dashes in user-facing copy

## Stock stream (`stock_id`)

- **`StockItemSold`** must **consume cart-line reservation** in `evolve` (and track **`soldByCartItem`**) so post-checkout clear does not leave phantom reserves
- **`DereserveStockItem`:** if **`soldByCartItem[cart_id:item_id] > 0`**, **`decide` returns `[]`** (no `StockItemDereserved`) — matches EM scenario on the Dereserve column in snapshot `20260930011438_store`

## Verification

- Run `pnpm test`, `pnpm lint`, and `pnpm build` before merging template changes
- Local bootstrap: `make check-deps` fails fast if Node is below 24 (see `.nvmrc`) even when other tools accept an older runtime
- Keep legacy product brand strings out of the repo (grep gate in CI or local checks)
- Keep old npm scope out of imports (use `@store-checkout/*` only)
