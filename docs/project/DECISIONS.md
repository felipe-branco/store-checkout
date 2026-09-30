# Decisions

Brief notes for the take-home. Expand when needed.

- **Why this stack:** Event sourcing fits persisted orders and auditability; the repo started from an EM + vertical-slices starter, so the take-home is modeled in [Event Modelers](https://app.eventmodelers.ai/) instead of ad-hoc CRUD.
- **EM board:** **MashginCheckout** — snapshot `20260929200131_store` in `packages/em-manager/migrations/` (re-import that JSON in Event Modelers to sync). Slice list: [EVENT_MODEL.md](./EVENT_MODEL.md).
- **UI / theme:** Kiosk UX from [Vercel v0](https://v0.dev); source archive [vercel-v0-self-service-store-theme-source.zip](./vercel-v0-self-service-store-theme-source.zip). Implemented in `@store-checkout/ui` (Tailwind 4 + shadcn tokens, kiosk components, mustard/charcoal palette).
- **Persistence:** orders as domain events (PostgreSQL / Emmett) — in progress; demo **order placement** is still in-memory until order slices land. Menu availability uses event projections. Money/timestamps: [EVENT_SOURCING_BEST_PRACTICES.md](../EVENT_SOURCING_BEST_PRACTICES.md).
- **Menu / stock (no DB seed):** static catalog in `apps/web-app/src/lib/kiosk/product-catalog.ts`. Kiosk shows catalog `quantity` as `stock` for now; target **`available = quantity − reserved − sold`** via **Cart Details** read model (see [EVENT_MODEL.md](./EVENT_MODEL.md)). **Stock commands** (`ReserveStockItem`, `DereserveStockItem`, `SellStockItem`) registered on the shared `stock_id` stream; `ReserveStockItem` takes **`on_hand_quantity`** from the static catalog at dispatch time (EM command fields omit catalog quantity).
- **Payment:** simulated only; no real gateway; no card data in events or logs.
- **UX:** self-service kiosk at `/`; English (`en-US`); auth not required for v0.1.
- **Local bootstrap:** root [Makefile](../Makefile) — `make setup` (deps, env, Postgres, `pnpm install`); Node **24+** enforced via `make check-deps` and `package.json` engines. Details: [LOCAL_SETUP.md](../LOCAL_SETUP.md).
- **API logging:** App Router routes use `@/lib/api-log` (`withLoggedApiRoute`) — structured stdout (+ optional Axiom); `correlationId`, timing, status; no card data in logs.

**Out of scope for now:** real payments, back-office menu admin, required Sentry/Axiom locally.
