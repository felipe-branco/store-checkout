# Store Checkout — tasks

## Done

- [x] Monorepo, EM snapshot (current **`20260930011438_store`**), slice refs
- [x] Kiosk theme in `@store-checkout/ui` + demo at `/` (v0-based)
- [x] Static product catalog; `GET /api/products` via Stock Products List projection
- [x] Milestone A — stock SC slices: Reserve / Dereserve / Sell + registrations
- [x] Milestone B — Create/Add/Remove/Clear cart, Cart Details UI + API; cart slices **Done** in EM; **`ReserveStockItem` / `DereserveStockItem` wired** on `/api/cart/items` (see DECISIONS + EVENT_MODEL)
- [x] API logging via `withLoggedApiRoute` on cart, health, products, orders
- [x] Milestone C — CreateOrder, Pay/Fail/Finish order, External Payment Simulator Translator + `/api/orders`, `/api/webhooks/payment` (EM **Done**)
- [x] Milestone D — PaymentFailedOrder, OrderFinishedDetails + `/api/orders/status` polling in checkout UI (EM **Done**)

## Next

- [ ] Pin `manifest.json` slice `pinnedSnapshot` ids to **`20260930011438_store`** when borders change on that migration (optional hygiene; `currentSnapshot` already updated)
- [x] **Clear Cart** stock dereserve — **Cart Cleared Automator** + **Cleared Cart Items** projection; sold-line dereserve guard in **Dereserve Stock Item**
- [x] Milestone E — Cart Cleared / Order Paid / Sold Items / Webhook Simulator automators (EM **Done**)

## Later

- [ ] Auth (if needed)

## Backlog

- [ ] Upgrade React / Next.js when `useEffectEvent` ships in stable React; remove `packages/ui/src/hooks/use-effect-event.ts` and import from `react` in kiosk components (`order-screen`, `idle-guard`, `payment-dialog`)
