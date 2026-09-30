# API routes

Thin Next.js adapters over handlers in `packages/slices/src/{SliceName}/routes.ts`. Wrap with [`withLoggedApiRoute`](../../lib/api-log.ts). Call `initializeEventStore()` (and `initializeMessageBus()` when dispatching commands) before event store / Pongo access.

## Route map (MashginCheckout)

| Method | Path | Slice handler | Commands / notes |
|--------|------|---------------|------------------|
| `GET` | `/api/health` | inline | Postgres ping; no slice |
| `GET` | `/api/products` | CartDetails | Stock Products List read model |
| `POST` | `/api/cart` | CreateCart | `CreateCart` |
| `GET` | `/api/cart` | CartDetails | Cart Details projection |
| `DELETE` | `/api/cart` | ClearCart / session | End session (see route) |
| `POST` | `/api/cart/items` | AddItemToCart | `ReserveStockItem` → `AddItemToCart` |
| `DELETE` | `/api/cart/items` | RemoveItemFromCart | `DereserveStockItem` → `RemoveItemFromCart` |
| `POST` | `/api/cart/clear` | ClearCart | `ClearCart` → **Cart Cleared Automator** dereserves |
| `POST` | `/api/orders` | CreateOrder | `CreateOrder`; optional payment simulation |
| `GET` | `/api/orders/status` | CartDetails | Order Finished Details + Payment Failed Order |
| `POST` | `/api/webhooks/payment` | ExternalPaymentSimulatorTranslator | → `PayOrder` / `FailOrderPayment` |
| `GET` | `/api/kiosk/session` | inline | Gate status (`gateEnabled`, `authorized`) |
| `POST` | `/api/kiosk/access` | inline | Magic word → HttpOnly `kiosk_session` cookie |

Automations (not HTTP): registered in `packages/slices/src/automations.ts` via `initializeMessageBus()`.

## Production kiosk gate (HttpOnly session)

When **`NODE_ENV=production`** and **`KIOSK_ACCESS_MAGIC_WORD`** is set:

1. **`/`** shows an access-code form until **`POST /api/kiosk/access`** succeeds.
2. Middleware requires a signed **`kiosk_session`** cookie on **`/api/*`** except:
   - **`/api/health`**
   - **`/api/kiosk/access`**, **`/api/kiosk/session`**
   - **`/api/webhooks/payment`** (server-side Webhook Simulator; protect via network or add a dedicated secret later)

Local dev: leave **`KIOSK_ACCESS_MAGIC_WORD`** unset — no gate, no cookie checks.

Optional **`KIOSK_SESSION_SECRET`** signs cookies (recommended in production; falls back to the magic word if unset).

## Registration checklist (SC / SV)

When adding a slice, update:

- **Commands:** `packages/slices/src/commands.ts`
- **Inline projections:** `packages/slices/src/projections-inline.ts`
- **State views:** `packages/slices/src/projections-registry.ts` + `packages/slices/src/manual-rebuild-config.ts`
- **Events:** `packages/core/src/events/`
- **Server exports:** `packages/slices/server.ts` (route handlers as needed)
- **API:** new `apps/web-app/src/app/api/.../route.ts` + row in this table

Run `pnpm em:slice:check-drift --all` after EM changes.

## Logging

Each completion log includes:

- `correlationId` — from `x-correlation-id` / `x-request-id`, or generated; echoed on `x-correlation-id` response header
- `route`, `method`, `durationMs`, `status`, `success`
- Optional: `commandType`, `aggregateId`, `error` (no card/PAN data)

Use the `enrich` option for command-specific fields. See `api/orders/route.ts`.

See [docs/TEMPLATE.md](../../../../docs/TEMPLATE.md) for the first-slice walkthrough and [docs/project/EVENT_MODEL.md](../../../../docs/project/EVENT_MODEL.md) for the full model.
