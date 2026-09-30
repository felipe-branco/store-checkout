# Event model

**Board:** MashginCheckout  
**Snapshot:** `20260929231730_store` (`packages/em-manager/migrations/`, `manifest.json` → `currentSnapshot`)

Planned slices (prefix = EM type: SC state change, SV state view, AUT automation, TR translator):

| Slice | Status |
|-------|--------|
| [SC] Create Cart | **Done** — `packages/slices/src/CreateCart/` |
| [SC] Add Item to Cart | **Done** — `packages/slices/src/AddItemToCart/` |
| [SC] Remove Item from Cart | **Done** — `packages/slices/src/RemoveItemFromCart/` |
| [SC] Clear Cart | **Done** — `packages/slices/src/ClearCart/` |
| [SC] Reserve Stock Item | **Done** — `packages/slices/src/ReserveStockItem/` |
| [SC] Dereserve Stock Item | **Done** — `packages/slices/src/DereserveStockItem/` |
| [SC] Create Order | **Done** — `packages/slices/src/CreateOrder/` |
| [SC] Pay Order | **Done** — `packages/slices/src/PayOrder/` |
| [SC] Fail Order Payment | **Done** — `packages/slices/src/FailOrderPayment/` |
| [SC] Sell Stock Item | **Done** — `packages/slices/src/SellStockItem/` |
| [SC] Finish Order | **Done** — `packages/slices/src/FinishOrder/` |
| [SV] Cart Details | **Done** — `packages/slices/src/CartDetails/` (includes **Stock Products List** read model) |
| [SV] Payment Failed Order | **Done** — `packages/slices/src/PaymentFailedOrder/` |
| [SV] Order Finished Details | **Done** — `packages/slices/src/OrderFinishedDetails/` |
| [AUT] Cart Cleared Automator | **Done** — `packages/slices/src/CartClearedAutomator/` |
| [AUT] Webhook Simulator Automator | **Done** — `packages/slices/src/WebhookSimulatorAutomator/` (server POST to `/api/webhooks/payment`) |
| [AUT] Order Paid Automator | **Done** — `packages/slices/src/OrderPaidAutomator/` |
| [AUT] Sold Items Order Automator | **Done** — `packages/slices/src/SoldItemsOrderAutomator/` |
| [TR] External Payment Simulator Translator | **Done** — `packages/slices/src/ExternalPaymentSimulatorTranslator/` |

Implement in dependency order per [SLICE_IMPLEMENTATION_WORKFLOW.md](../SLICE_IMPLEMENTATION_WORKFLOW.md). Slice refs: `packages/slices/src/<SliceDir>/slice.ref.json` after `pnpm em:slice:init --all-planned`.

## Stock Products List (read model — in Cart Details)

The board defines read model **Stock Products List** (`READMODEL` in the migration JSON). **Not a separate slice** — implemented inside **[SV] Cart Details** (static catalog + reserved/sold projections).

| Source | Role |
|--------|------|
| [`apps/web-app/src/lib/kiosk/product-catalog.ts`](../../apps/web-app/src/lib/kiosk/product-catalog.ts) | Static `initial_products` (no DB seed). Shared `stockId` per `STOCK_SOURCES` |
| Stock stream (`stock_id`) | Events `StockItemReserved`, `StockItemDereserved`, `StockItemSold` — handlers in `ReserveStockItem`, `DereserveStockItem`, `SellStockItem` |
| Target formula | **`available = quantity − reserved − sold`** per `item_id` |
| API | `GET /api/products` uses `buildStockProductsList` + Pongo projection `stock-products-list-collection` |

## Kiosk client refresh

| Read path | API | Client behavior |
|-----------|-----|-----------------|
| Stock Products List (menu + `stock` badges) | `GET /api/products` | SWR in `@store-checkout/ui` — poll every **15s**, revalidate on window focus ([`use-products.ts`](../../packages/ui/src/hooks/use-products.ts)) |
| Cart Details (line items, totals) | `GET /api/cart` | Fetch on mount + after mutations only — [`CartDetails.tsx`](../../packages/slices/src/CartDetails/ui/CartDetails.tsx); no interval |
| Session (start vs order) | `GET /api/cart` | Once on mount — [`apps/web-app/src/app/page.tsx`](../../apps/web-app/src/app/page.tsx) |

Rationale: shared stock read model can change without this kiosk issuing commands; cart state is owned by this session’s commands. Documented in [DECISIONS.md](./DECISIONS.md).

## Cart stream events (Add / Remove)

| Event | Notable payload fields |
|-------|-------------------------|
| `ItemAddedToCart` | `cart_id`, `stock_id`, `item_id`, **`price_in_cents`**, `quantity`, `added_at` |
| `ItemRemovedFromCart` | `cart_id`, `stock_id`, `item_id`, **`price_in_cents`**, `quantity`, `removed_at` |

Commands **Add Item to Cart** and **Remove Item from Cart** include **`price_in_cents`** (from static catalog at dispatch in `POST`/`DELETE` `/api/cart/items`).

**API orchestration:** those routes dispatch **`ReserveStockItem` then `AddItemToCart`**, or **`DereserveStockItem` then `RemoveItemFromCart`**, with rollback if the cart step fails after stock succeeds. See [DECISIONS.md](./DECISIONS.md).

## HTTP API (kiosk cart)

| Method | Path | Commands (order) | Notes |
|--------|------|------------------|--------|
| `POST` | `/api/cart` | `CreateCart` | Sets HttpOnly `cart_id` cookie |
| `GET` | `/api/cart` | — | Cart Details projection → kiosk cart map |
| `DELETE` | `/api/cart` | end session | Clears cookie (see route) |
| `POST` | `/api/cart/items` | `ReserveStockItem` → `AddItemToCart` | Body: `productId`, optional `quantity`; catalog supplies `stock_id`, `item_id`, `price_in_cents`, `on_hand_quantity` |
| `DELETE` | `/api/cart/items` | `DereserveStockItem` → `RemoveItemFromCart` | Same body shape as POST |
| `POST` | `/api/cart/clear` | `ClearCart` | Does not bulk-dereserve stock yet (automator planned) |
| `GET` | `/api/products` | — | Stock Products List projection + static catalog |
| `POST` | `/api/orders` | `CreateOrder` | Kiosk checkout; returns ids for payment simulator |
| `POST` | `/api/webhooks/payment` | External payment translator → `PayOrder` / `FailOrderPayment` | Simulated provider callback |
| `GET` | `/api/orders/status` | — | Poll `cart_id` + `order_id` → payment read models |

Orchestration lives in `packages/slices/src/AddItemToCart/routes.ts` and `RemoveItemFromCart/routes.ts`; thin handlers in `apps/web-app/src/app/api/cart/**`.
