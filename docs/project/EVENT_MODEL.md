# Event model

**Board:** MashginCheckout  
**Snapshot:** `20260929200131_store` (`packages/em-manager/migrations/`, `manifest.json` → `currentSnapshot`)

Planned slices (prefix = EM type: SC state change, SV state view, AUT automation, TR translator):

| Slice |
|-------|
| [SC] Create Cart |
| [SC] Add Item to Cart |
| [SC] Remove Item from Cart |
| [SC] Clear Cart |
| [SC] Reserve Stock Item |
| [SC] Dereserve Stock Item |
| [SC] Create Order |
| [SC] Pay Order |
| [SC] Fail Order Payment |
| [SC] Sell Stock Item |
| [SC] Finish Order |
| [SV] Cart Details |
| [SV] Payment Failed Order |
| [SV] Order Finished Details |
| [AUT] Cart Cleared Automator |
| [AUT] Webhook Simulator Automator |
| [AUT] Order Paid Automator |
| [AUT] Sold Items Order Automator |
| [TR] External Payment Simulator Translator |

Implement in dependency order per [SLICE_IMPLEMENTATION_WORKFLOW.md](../SLICE_IMPLEMENTATION_WORKFLOW.md). Slice refs: `packages/slices/src/<SliceDir>/slice.ref.json` after `pnpm em:slice:init --all-planned`.

## Stock Products List (read model — planned)

The board defines read model **Stock Products List** (`READMODEL` in the migration JSON). Not implemented in code yet.

| Source | Role |
|--------|------|
| [`apps/web-app/src/lib/kiosk/product-catalog.ts`](../../apps/web-app/src/lib/kiosk/product-catalog.ts) | Static `initial_products` today (no DB seed). All items use one **stock source** (`STOCK_SOURCES` → shared `stockId`); add sources when inventory is split |
| Planned | **`available = quantity − reserved − sold`** — `reserved` / `sold` from stock slice projections after Reserve / Dereserve / Sell land |
| API today | `GET /api/products` returns static catalog `quantity` as kiosk `stock` |
