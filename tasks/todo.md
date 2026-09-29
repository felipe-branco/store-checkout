# Store Checkout — tasks

## Done

- [x] Monorepo, EM snapshot `20260929200131_store`, slice refs
- [x] Kiosk theme in `@store-checkout/ui` + demo at `/` (v0-based)
- [x] In-memory `/api/products` and `/api/orders` for UI demo

## Next

- [ ] Implement EM slices; replace in-memory catalog with event-sourced menu/orders
- [ ] Wire payment translator slice to real API boundary

## Later

- [ ] Auth (if needed)

## Backlog

- [ ] Upgrade React / Next.js when `useEffectEvent` ships in stable React; remove `packages/ui/src/hooks/use-effect-event.ts` and import from `react` in kiosk components (`order-screen`, `idle-guard`, `payment-dialog`)
