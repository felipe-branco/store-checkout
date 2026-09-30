# Store Checkout — tasks

Tracking aligned with `.cursor/plans/em_checkout_completion_3883e44f.plan.md`.

## Phase 2 — Documentation map

- [x] [`docs/project/README.md`](../docs/project/README.md) — status, doc index, rebuild note
- [x] [`docs/project/EVENT_MODEL.md`](../docs/project/EVENT_MODEL.md) — slices, API, projections, automations, kiosk session
- [x] [`docs/project/DECISIONS.md`](../docs/project/DECISIONS.md) — catalog, cart/stock, gate, rebuild, checkout flow
- [x] [`docs/LOCAL_SETUP.md`](../docs/LOCAL_SETUP.md) — Makefile, env, smoke test, verification commands
- [x] [`tasks/lessons.md`](./lessons.md) — ongoing append during implementation
- [x] Archive plan → [`docs/plans/em-checkout-completion.md`](../docs/plans/em-checkout-completion.md) (2026-09-30)

## Milestones (implementation)

- [x] Monorepo, EM snapshot **`20260930011438_store`**, slice refs + drift clean
- [x] Kiosk theme in `@store-checkout/ui` + demo at `/`
- [x] Static catalog; `GET /api/products` via Stock Products List projection
- [x] Stock — Reserve / Dereserve / Sell
- [x] Cart — Create / Add / Remove / Clear + Cart Details + reserve/dereserve on items API
- [x] Order + External Payment Simulator Translator + `/api/orders`, `/api/webhooks/payment`
- [x] PaymentFailedOrder, OrderFinishedDetails + `/api/orders/status` polling
- [x] Automators (Cart Cleared, Order Paid, Sold Items, Webhook Simulator) + **`ClearedCartItems`** projection
- [x] Registration checklist — commands, projections, **manual-rebuild-config**, [`api/README.md`](../apps/web-app/src/app/api/README.md)
- [x] Production kiosk gate — magic word, HttpOnly session, middleware (no client bearer secret)

## Phase 3 — Kiosk completion

- [x] Server-backed cart only (`CartDetails` + `cart_id` cookie); no in-memory cart in `OrderScreen`
- [x] Static catalog only (no runtime stock mutation); availability via **`GET /api/products`** projection
- [x] Payment dialog → **`POST /api/orders`**, status polling, stock + payment failure views
- [x] Cart add **409** / checkout **stock** conflicts surfaced in UI; menu refresh syncs server cart
- [x] Manual E2E script in [LOCAL_SETUP.md](../docs/LOCAL_SETUP.md)

## Phase 4 — Verification gates

- [x] `make setup` (Node 24 via `.nvmrc`; Postgres healthy)
- [x] `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm em:slice:check-drift --all` (2026-09-30)
- [x] API smoke: `make health`, `GET /api/products`, `POST /api/cart` — kiosk happy/fail paths in [LOCAL_SETUP.md](../docs/LOCAL_SETUP.md) for manual UI
- [x] Plan archived + linked from [project README](../docs/project/README.md)

## Backlog

- [ ] Upgrade React / Next.js when `useEffectEvent` ships in stable React; remove `packages/ui/src/hooks/use-effect-event.ts`
