# Decisions

Brief notes for the take-home. Expand when needed.

- **Why this stack:** Event sourcing fits persisted orders and auditability; the repo started from an EM + vertical-slices starter, so the take-home is modeled in [Event Modelers](https://app.eventmodelers.ai/) instead of ad-hoc CRUD.
- **EM board:** **MashginCheckout** — snapshot `20260929200131_store` in `packages/em-manager/migrations/` (re-import that JSON in Event Modelers to sync). Slice list: [EVENT_MODEL.md](./EVENT_MODEL.md).
- **UI / theme:** Kiosk UX from [Vercel v0](https://v0.dev); source archive [vercel-v0-self-service-store-theme-source.zip](./vercel-v0-self-service-store-theme-source.zip). Implemented in `@store-checkout/ui` (Tailwind 4 + shadcn tokens, kiosk components, mustard/charcoal palette).
- **Persistence:** orders as domain events (PostgreSQL / Emmett) — in progress; demo menu/orders API is in-memory until slices land. Money/timestamps: [EVENT_SOURCING_BEST_PRACTICES.md](../EVENT_SOURCING_BEST_PRACTICES.md).
- **Payment:** simulated only; no real gateway; no card data in events or logs.
- **UX:** self-service kiosk at `/`; English (`en-US`); auth not required for v0.1.
- **Local bootstrap:** root [Makefile](../Makefile) — `make setup` (deps, env, Postgres, `pnpm install`); Node **24+** enforced via `make check-deps` and `package.json` engines. Details: [LOCAL_SETUP.md](../LOCAL_SETUP.md).

**Out of scope for now:** real payments, back-office menu admin, required Sentry/Axiom locally.
