# Store Checkout — tasks

## Done

- [x] Monorepo, EM snapshot `20260929231730_store`, slice refs
- [x] Kiosk theme in `@store-checkout/ui` + demo at `/` (v0-based)
- [x] Static product catalog; `GET /api/products` via Stock Products List projection
- [x] Milestone A — stock SC slices: Reserve / Dereserve / Sell + registrations
- [x] Milestone B (in progress) — Create/Add/Remove/Clear cart, Cart Details UI + API; **`ReserveStockItem` / `DereserveStockItem` wired** on `/api/cart/items` (see DECISIONS + EVENT_MODEL)
- [x] API logging via `withLoggedApiRoute` on cart, health, products, orders
- [x] Demo `/api/orders` (in-memory until order slices)

## Next

- [ ] Finish Milestone B — mark cart slices Done in EM; **Clear Cart** stock dereserve (automator or explicit flow)
- [ ] Milestone C — order + payment translator slices

## Later

- [ ] Auth (if needed)

## Backlog

- [ ] Upgrade React / Next.js when `useEffectEvent` ships in stable React; remove `packages/ui/src/hooks/use-effect-event.ts` and import from `react` in kiosk components (`order-screen`, `idle-guard`, `payment-dialog`)
