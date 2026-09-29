# Event sourcing — conventions and best practices

Guidance for domain events, commands, metadata, timestamps, and money in EM Slices applications.

## Money values

### Standard (all event-store money fields)

**Every monetary amount** written to the event store — in domain events, commands, and translated external events in `packages/core/src/events` — must be stored as an **integer in the currency’s minor unit** (e.g. **cents** for USD, **centavos** for BRL).

Use one minor unit per major unit for your currency (typically `100` for two-decimal currencies). Helpers live in `packages/core/src/money.ts`: `majorUnitsToMinorUnits`, `minorUnitsToMajorUnits`.

**Example (BRL):** store amounts in centavos; do not mix reais and centavos in the event store.

| Display (BRL) | Event-store value (centavos) |
|---------------|------------------------------|
| R$ 2,30 | `230` |
| R$ 230,00 | `23000` |

Field names vary (`amount`, `paid_amount`, `price`, …) but the **unit is always minor units**. Document the currency in slice or API docs when it matters for adopters.

```typescript
import { majorUnitsToMinorUnits } from "@store-checkout/core";

// ✅ Persist minor units in decide / translator output
const amount = majorUnitsToMinorUnits(checkoutTotalMajor);

// ❌ Do not append provider-native major units to domain events
const amount = checkout.items[0].value; // e.g. gateway sends dollars/reais
```

### External APIs and payment gateways

Providers use different units at the HTTP boundary (major units, minor units, or strings). At the **translator / webhook adapter**:

1. Keep provider-native shapes in Zod schemas for raw payloads only.
2. **Normalize to minor units** before `messageBus.publish`, `decide`, or command dispatch.
3. Prefer `majorUnitsToMinorUnits(n)` (or a documented multiplier) over scattered `* 100`.

### UI and read models

- **Event store:** minor units only.
- **APIs / UI:** may expose major units for display (`minor / 100`) or minor units with a clear field name — document per route. Projections should usually store the same unit as the events they evolve.

## Timestamps

### Standard (new code)

**All instant timestamps** in domain events and commands — fields named `*_at`, `*_time` when they represent a point in time — must be stored as **Unix time in milliseconds** (same unit as `new Date().getTime()`).

```typescript
const at = metadata.now.getTime(); // ✅ canonical
```

Use `command.metadata.now.getTime()` in `decide` when the EM field is generated from “now”. Do **not** divide by 1000 for new internal events.

### External translators (webhooks, third-party APIs)

At the boundary (translator / route that maps external JSON → command or internal event):

1. Detect whether the provider sends seconds or milliseconds (document per integration).
2. **Normalize to milliseconds** before writing domain events or commands, unless the field is intentionally a provider-native opaque value (rare).
3. Prefer explicit conversion (e.g. `seconds * 1000`) in one place rather than scattered in slices.

```typescript
// Example: provider sends Unix seconds
const occurred_at_ms = external.occurred_at * 1000;
```

Keep provider-native seconds only in adapter DTOs/schemas, not in `packages/core/src/events`.

## Event and command metadata

Propagate from command → event in `decide`:

- `correlation_id`
- `causation_id` (default: aggregate / stream id)
- `streamName` (stream id)
- `now` (`Date` on metadata; use `.getTime()` for numeric `*_at` fields per standard above)

Types: `packages/core/src/eventMetadata.ts` (`EventMetadata`, `CommandMetadata`).

## Related docs

- [docs/ZOD.md](./ZOD.md) — runtime validation at HTTP/webhook boundaries
- [docs/SLICE_IMPLEMENTATION_WORKFLOW.md](./SLICE_IMPLEMENTATION_WORKFLOW.md) — EM slice workflow
