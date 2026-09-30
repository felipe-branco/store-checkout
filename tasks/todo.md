# Store Checkout — tasks

## Done

- [x] Monorepo, EM snapshot `20260929231730_store`, slice refs
- [x] Kiosk theme in `@store-checkout/ui` + demo at `/` (v0-based)
- [x] Static product catalog in web-app (`product-catalog.ts`); availability formula (minus reserved/sold) not wired yet
- [x] Milestone A — stock SC slices: Reserve / Dereserve / Sell + `commands.ts` registration
- [x] API logging via `withLoggedApiRoute` on `/api/health`, `/api/products`, `/api/orders`
- [x] In-memory `/api/products` and `/api/orders` for UI demo

## Next

- [ ] Milestone B — cart slices + **Cart Details** (Stock Products List read model)
- [ ] Wire payment translator slice to real API boundary

## Later

- [ ] Auth (if needed)

## Backlog

- [ ] Upgrade React / Next.js when `useEffectEvent` ships in stable React; remove `packages/ui/src/hooks/use-effect-event.ts` and import from `react` in kiosk components (`order-screen`, `idle-guard`, `payment-dialog`)
