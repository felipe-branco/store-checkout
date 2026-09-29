# State Change Slice — Post-Generation Implementation Plan

After generating a STATE_CHANGE slice using the slice generator, follow these steps to complete the implementation. The generator produces well-structured scaffolding with TODOs; this plan guides an AI agent (or developer) through each task.

## Prerequisites

- A `slice.json` file has been created for the state change (from Miro export or manually)
- The generator has been run: `pnpm slice:generate <path-to-slice.json>`
- Generated files are in place:
  - `packages/core/src/events/<EventName>.ts` — domain event type (emmett `Event<Type, Data, Metadata>`)
  - `packages/core/src/events/index.ts` — updated with export
  - `packages/slices/src/<SliceName>/<SliceName>Command.ts` — command handler with `decide`/`evolve`/`initialState`
  - `packages/slices/src/<SliceName>/<SliceName>Command.test.ts` — test using `DeciderSpecification`
  - `packages/slices/src/<SliceName>/routes.ts` — route handler with Zod validation
  - `packages/slices/src/<SliceName>/ui/<SliceName>.tsx` — UI component (if screen defined)
  - `packages/slices/src/<SliceName>/slice.json` — copied slice definition

---

## Step 1: Implement the `decide` Function (Business Rules)

The generated `decide(command, state) → events[]` is a pure function with no I/O. It contains a TODO stub that maps command data to event data. The mapping of fields is already generated — you need to add business-rule validations.

### Actions
1. Read `specifications[].comments` from `slice.json` for business rules
2. Add guard clauses using `_state` (e.g., `if (state.exists) throw new Error(...)`)
3. Review field mapping — the generator auto-maps command fields to event fields, and `*At` timestamp fields are set from `metadata.now`
4. Any field marked `generated: true` with a UUID type should use `randomUUID()` — the generator handles this, but verify

### Important
- `decide` is pure — no event store, no message bus, no side effects
- Timestamps use **milliseconds** for new `*_at` fields: `metadata.now.getTime()` (see [docs/EVENT_SOURCING_BEST_PRACTICES.md](../../docs/EVENT_SOURCING_BEST_PRACTICES.md)). Legacy seconds in existing events are not the template for new code.
- **Money** fields on events and commands use **integer minor units** (e.g. cents). Convert from provider major units at translator boundaries (see [docs/EVENT_SOURCING_BEST_PRACTICES.md](../../docs/EVENT_SOURCING_BEST_PRACTICES.md); BRL example: reais → centavos via `majorUnitsToMinorUnits`).
- **Propagate metadata** from command to event: `correlation_id`, `causation_id`, `streamName` (see EVENT_SOURCING_BEST_PRACTICES.md)
- The generator produces `metadata: { now, correlation_id, causation_id, streamName }` — `causation_id` defaults to aggregate ID
- The `decide` function returns an array of events — typically a single event for a creation command

---

## Step 2: Implement the `evolve` Function (State Transitions)

The generated `evolve(state, event) → state` applies events to aggregate state. The default implementation sets `exists: true`.

### Actions
1. Extend `<Aggregate>State` with additional fields if needed for business rules (e.g., `status: "active" | "archived"`)
2. Update `evolve` to actually populate state fields from event data
3. This state is used by `decide` for validation — only include fields that decision logic needs

### Important
- `evolve` is also pure — no side effects
- `initialState` is a factory function: `() => ({ exists: false })`
- Both `decide` and `evolve` are tested via `DeciderSpecification` — no mocks needed

---

## Step 3: Complete the Tests

The generated test uses `DeciderSpecification.for({ decide, evolve, initialState })` with a first test case already wired up using example data from `slice.json`.

### Actions
1. Verify the first test passes as-is: `pnpm --filter @em-slices/slices exec vitest run src/<SliceName>/`
2. **Integration Tests (required)** — The generator produces integration tests by default. Verify they pass to ensure events are persisted to PostgreSQL:
   - Use `CommandHandlerSpec.for()` with `setupTestDatabase()` from `test-utils`
   - Use `expectNewEvents()` helper to verify events are stored correctly
   - Tests use Testcontainers for isolated PostgreSQL instances
3. Add additional test cases for:
   - **Duplicate prevention** — `given([pastEvent]).when(sameCommand).thenThrows(...)` (if `decide` guards against duplicates)
   - **Optional fields** — command with `undefined` optional fields still produces valid event
   - **Validation errors** — invalid data in command triggers descriptive errors
   - **Business rules** — any filtering or transformation logic from specifications

### Pattern
```typescript
given([])
  .when({
    type: "CommandName",
    data: { id, ...fields },
    metadata: { now, correlation_id: id, causation_id: id },
  })
  .then([
    {
      type: "EventName",
      data: { id, ...expectedFields, timestampAt: now },
      metadata: { now, causation_id: id, streamName: id },
    },
  ]);

// Duplicate prevention:
given([{ type: "EventName", data: {...}, metadata: { causation_id: id, streamName: id } }])
  .when({ type: "CommandName", data: {...}, metadata: { now } })
  .thenThrows((error: Error) => error.message === "Already exists");
```

### Important
- `DeciderSpecification` tests `decide` + `evolve` as pure functions — no mocks, no event store
- The `now` timestamp is passed via command metadata, making tests deterministic
- The generated test uses `const now = new Date()` at the describe level — all tests share the same `now`
- **Integration tests** verify events are actually persisted to the database using Testcontainers
- Integration tests filter out stream-level metadata (`globalPosition`, `messageId`, etc.) when comparing
- Date fields in event data should use `string` type (YYYY-MM-DD format), not `Date` objects, to avoid serialization issues
- **Phone numbers**: The generator automatically strips the `+` prefix from phone number examples in test files (e.g., `"+1234567890"` becomes `"1234567890"`). This is because PostgreSQL/emmett may strip the `+` prefix during serialization, so test expectations should match the actual stored format. If you manually add phone numbers to tests, ensure they don't include the `+` prefix.

---

## Step 4: Register Command Handler

After implementing the command handler, register it in `packages/slices/src/commands.ts` so it can be called via `dispatcher.sendCommand()` (webhooks) or `messageBus.send()` (automations).

### Actions
1. Import the command handler and type from your slice
2. Add a `dispatcher.register()` call for webhooks (returns `SendResult`):
   ```typescript
   dispatcher.register<AddItemCommand>("AddItem", (cmd) =>
     handleAddItem(cmd, eventStore)
   );
   ```
3. Add a `messageBus.handle()` call for automations (delegates to dispatcher, throws on failure):
   ```typescript
   messageBus.handle(async (command: AddItemCommand) => {
     const result = await dispatcher.sendCommand(command);
     if (!result.success) {
       throw new Error(result.error.message);
     }
   }, "AddItem");
   ```

### Important
- Command handlers return `CommandResult<T>` (success with `newEvents` or failure with `error`)
- Dispatcher is used by webhooks for `sendCommand()` returning `SendResult`
- Message bus is used by automations for `send()` — delegates to dispatcher, throws on failure

---

## Step 5: Create the Next.js API Route (if `apiEndpoint` is defined)

The generated `routes.ts` is framework-agnostic. Create a thin Next.js adapter.

### Actions
1. Create `apps/web-app/src/app/api/<path-from-apiEndpoint>/route.ts`
2. Import the route handler from the slice and wire it to Next.js
3. **If the slice has `permission` in slice.json**: When you add auth, check the session and required permission before processing; return 403 if unauthorized (see template route comment below).
4. The route handler validates with Zod, creates the command, and dispatches via `dispatcher.sendCommand()`
5. Include `X-Correlation-ID` header in responses when available (for tracing)

### Template
```typescript
import { NextResponse } from "next/server";
import { getCommandDispatcher } from "@/lib/messageBus";
import { handleCommandRoute } from "@em-slices/slices/src/<SliceName>/routes";

export async function POST(request: Request) {
  try {
    // When you add auth: resolve session here and enforce slice.json `permission` before dispatch.
    // Example: if (!session?.can("write:items")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const dispatcher = getCommandDispatcher();
    const correlationId = request.headers.get("X-Correlation-ID") ?? undefined;

    const result = await handleCommandRoute(body, dispatcher, correlationId);

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    }

    const statusCode = result.code === "VALIDATION_ERROR" ? 400 : 500;
    const headers = result.correlationId
      ? { "X-Correlation-ID": result.correlationId }
      : undefined;
    return NextResponse.json(result, { status: statusCode, headers });
  } catch (error) {
    console.error("Route handler error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Clean Up Planning Artifacts (if applicable)

Remove temporary planning files (local notes, draft `slice.json` outside `packages/slices/src/<SliceName>/`) after the slice is generated and registered. Keep only the slice folder under `packages/slices/src/`.

---

## Step 7: Verify

1. **TypeScript**: `pnpm exec tsc --noEmit --project packages/slices/tsconfig.json`
2. **Tests**: `pnpm --filter @em-slices/slices exec vitest run src/<SliceName>/`
3. **Lint**: `pnpm --filter @em-slices/slices lint`

---

## Quick Reference: Where Things Live

| Artifact | Location |
|---|---|
| Domain event type | `packages/core/src/events/<EventName>.ts` |
| Command handler (decide/evolve) | `packages/slices/src/<SliceName>/<SliceName>Command.ts` |
| Command tests | `packages/slices/src/<SliceName>/<SliceName>Command.test.ts` |
| Route handler (agnostic) | `packages/slices/src/<SliceName>/routes.ts` |
| UI component | `packages/slices/src/<SliceName>/ui/<SliceName>.tsx` |
| Next.js route | `apps/web-app/src/app/api/.../<endpoint>/route.ts` (add auth check if slice has `permission`) |
| Slice definition | `packages/slices/src/<SliceName>/slice.json` |

## Key Conventions

- Events use emmett's `Event<Type, Data, EventMetadata>` — `EventMetadata` from `@em-slices/core` includes `correlation_id`, `causation_id`, `streamName`
- Event shape is `{ type: "EventName", data: {...}, metadata: { now, causation_id, streamName } }` — propagate metadata for projections and audit
- Command shape is `{ type: "CommandName", data: {...}, metadata: { now, correlation_id?, causation_id? } }`
- Timestamp fields ending with `At` (e.g., `registeredAt`) are typed as `number` (from `Date.now()`)
- Date fields (e.g., `dateOfBirth`) should use `string` type with YYYY-MM-DD format, not `Date` objects, to avoid PostgreSQL serialization issues
- `decide` and `evolve` are pure functions — tested with `DeciderSpecification` (no mocks)
- `handleXxx` is the event-store wrapper — loads state via `readStream`, calls `decide`, appends via `appendEvents`
- `IEventStore` uses emmett's native `Event` type — no `EventWithMetadata` or `BaseEvent` wrappers
- `initialState` is a factory function: `() => ({ exists: false })`
- Routes validate input with Zod — no validation in `decide`
- Auto-generate UUIDs with `randomUUID()` from `crypto` for aggregate IDs
- Return `CommandResult<T>` from command handlers: `{ success: true, newEvents }` or `{ success: false, error }`
- Route handlers are framework-agnostic; Next.js routes are thin adapters
- Business rules come from `slice.json → specifications[].comments`
- Command handlers must be registered in `packages/slices/src/commands.ts` to enable `dispatcher.sendCommand()` (webhooks) and `messageBus.send()` (automations)
- Integration tests use Testcontainers and verify events are persisted to PostgreSQL
- Integration tests normalize Date objects back to YYYY-MM-DD strings when comparing (PostgreSQL may deserialize dates)
- Phone numbers in test files should not include the `+` prefix, as PostgreSQL/emmett may strip it during serialization. The generator automatically handles this for examples from `slice.json`, but manual test data should also omit the `+` prefix.
- **Slice permission**: If `slice.json` has `permission` (e.g. `write:items`), protect the API route when you add authentication.
- **Zod UUID**: Use `z.uuid()` for UUID fields, not `z.string().uuid()` (deprecated)
- **API validation errors**: Use general 400 messages; avoid leaking which field failed validation in production responses.
