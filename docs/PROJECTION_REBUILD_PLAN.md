# Projection rebuild (EM Slices starter)

How to replay events into Pongo read models in this template.

## Context

- **Architecture:** Event sourcing with Emmett, vertical slices, Pongo/PostgreSQL projections.
- **Runtime:** Projections register via `projections.inline([...])` in the event store setup and process events when the app handles requests.
- **Starter state:** Register each STATE_VIEW (and other inline projections you rebuild) in `packages/slices/src/projections-registry.ts` and **`packages/slices/src/manual-rebuild-config.ts`** (re-exported to `scripts/manual-rebuild-config.ts` for `pnpm rebuild:projections`).

## Why a manual rebuild engine

Emmett’s `rebuildPostgreSQLProjections` can truncate collections but, in our setup, writes from that consumer did not persist reliably. The repo ships a **manual rebuild engine** that:

1. Reads stream IDs from `emt_messages`
2. Loads events via `eventStore.readStream`
3. Filters with each projection’s `canHandle`
4. Runs `evolve` and writes to Pongo (or deletes when `evolve` returns `null`)

**Scripts:**

```bash
# List available names (from MANUAL_REBUILD_CONFIG)
pnpm rebuild:projections

# Rebuild one or more projections (after you register them)
DATABASE_URL="postgresql://..." pnpm rebuild:projections ItemList

DATABASE_URL="postgresql://..." pnpm rebuild:projections --all
```

**Diagnostics:**

```bash
DATABASE_URL="postgresql://..." pnpm diagnose:rebuild [stream_id]
```

## Registered projections (MashginCheckout)

| Registry key | Pongo collection |
|--------------|------------------|
| `CartDetails` | `cartdetails-collection` |
| `StockProductsList` | `stock-products-list-collection` |
| `PaymentFailedOrder` | `paymentfailedorder-collection` |
| `OrderFinishedDetails` | `orderfinisheddetails-collection` |
| `ClearedCartItems` | `clearedcartitems-collection` |

Config lives in `packages/slices/src/manual-rebuild-config.ts` (must match `PROJECTION_REGISTRY` keys).

## When you add a projection

1. Register inline handler in `packages/slices/src/projections-inline.ts`.
2. Add an entry to `packages/slices/src/projections-registry.ts` (for discovery).
3. Add matching config to **`packages/slices/src/manual-rebuild-config.ts`** (`collectionName`, `canHandle`, `evolve`, optional `getDocumentId` for multi-document streams). Keys must match `PROJECTION_REGISTRY`.

For multi-stream projections, `getDocumentId` might map an event to a document key other than `streamId` (e.g. a user id). Document that rule in the slice.

## Emmett `rebuildPostgreSQLProjections` (optional)

You can still use Emmett’s built-in rebuild for experiments. See [Consumers and projectors in Emmett](https://event-driven.io/en/consumers_processors_in_emmett/) and [rebuildPostgreSQLProjections source](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/consumers/rebuildPostgreSQLProjections.ts).

Production rebuilds: prefer low-traffic windows, selective projection names (not `--all` unless necessary), and environment-specific `DATABASE_URL`.

## References

- [Rebuilding event-driven read models safely](https://event-driven.io/en/rebuilding_event_driven_read_models/)
- [docs/LOCAL_SETUP.md](./LOCAL_SETUP.md) — database URL and Docker
