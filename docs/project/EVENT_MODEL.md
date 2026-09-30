# Event model

**Board:** MashginCheckout  
**Snapshot:** `20260929200131_store` (`packages/em-manager/migrations/`, `manifest.json` → `currentSnapshot`)

Planned slices (prefix = EM type: SC state change, SV state view, AUT automation, TR translator):

| Slice | Status |
|-------|--------|
| [SC] Create Cart | Planned |
| [SC] Add Item to Cart | Planned |
| [SC] Remove Item from Cart | Planned |
| [SC] Clear Cart | Planned |
| [SC] Reserve Stock Item | **Done** — `packages/slices/src/ReserveStockItem/` |
| [SC] Dereserve Stock Item | **Done** — `packages/slices/src/DereserveStockItem/` |
| [SC] Create Order | Planned |
| [SC] Pay Order | Planned |
| [SC] Fail Order Payment | Planned |
| [SC] Sell Stock Item | **Done** — `packages/slices/src/SellStockItem/` |
| [SC] Finish Order | Planned |
| [SV] Cart Details | Planned (includes **Stock Products List** read model composition) |
| [SV] Payment Failed Order | Planned |
| [SV] Order Finished Details | Planned |
| [AUT] Cart Cleared Automator | Planned |
| [AUT] Webhook Simulator Automator | Planned |
| [AUT] Order Paid Automator | Planned |
| [AUT] Sold Items Order Automator | Planned |
| [TR] External Payment Simulator Translator | Planned |

Implement in dependency order per [SLICE_IMPLEMENTATION_WORKFLOW.md](../SLICE_IMPLEMENTATION_WORKFLOW.md). Slice refs: `packages/slices/src/<SliceDir>/slice.ref.json` after `pnpm em:slice:init --all-planned`.

## Stock Products List (read model — planned in Cart Details)

The board defines read model **Stock Products List** (`READMODEL` in the migration JSON). **Not a separate slice** — implement inside **[SV] Cart Details** (static catalog + reserved/sold projections).

| Source | Role |
|--------|------|
| [`apps/web-app/src/lib/kiosk/product-catalog.ts`](../../apps/web-app/src/lib/kiosk/product-catalog.ts) | Static `initial_products` (no DB seed). Shared `stockId` per `STOCK_SOURCES` |
| Stock stream (`stock_id`) | Events `StockItemReserved`, `StockItemDereserved`, `StockItemSold` — handlers in `ReserveStockItem`, `DereserveStockItem`, `SellStockItem` |
| Target formula | **`available = quantity − reserved − sold`** per `item_id` |
| API today | `GET /api/products` still returns static `quantity` as kiosk `stock` until Cart Details + wiring land |
