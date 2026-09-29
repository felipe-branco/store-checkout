# Decisions

Brief notes for the take-home. Expand when needed.

- **Persistence:** orders as domain events (PostgreSQL / Emmett). Money and timestamps: [EVENT_SOURCING_BEST_PRACTICES.md](../EVENT_SOURCING_BEST_PRACTICES.md).
- **Modeling:** Event Modelers + `pnpm em:slice:*`. Slice map lives in [EVENT_MODEL.md](./EVENT_MODEL.md) after the checkout board is imported.
- **Payment:** simulated only; no real gateway; no card data in events or logs.
- **UX:** self-service kiosk; English UI (`en-US`); auth not required for v0.1.

**Out of scope for now:** real payments, back-office menu admin, required Sentry/Axiom locally.
