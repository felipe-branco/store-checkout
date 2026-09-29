# Translator Slice — Post-Generation Implementation Plan

After generating a TRANSLATOR slice using the slice generator, follow these steps to complete the implementation. The generator produces scaffolding with TODOs; this plan guides an AI agent (or developer) through each required task.

## Prerequisites

- The internal command's STATE_CHANGE slice has already been generated — the command type (e.g., `AddItemCommand`) and handler (`handleAddItem`) exist in `packages/slices/src/<StateChangeSlice>/<StateChangeSlice>Command.ts`
- The command handler is registered in `packages/slices/src/commands.ts` — so `dispatcher.sendCommand(command)` routes correctly
- A `slice.json` file has been created for the translator (from Miro export or manually)
- The generator has been run: `pnpm slice:generate <path-to-slice.json>`
- Generated files are in place:
  - `packages/core/src/events/<ExternalEventName>.ts` — external event type (prefixed with `External`)
  - `packages/core/src/events/index.ts` — updated with export
  - `packages/slices/src/<SliceName>/<SliceName>Translator.ts` — translator handler
  - `packages/slices/src/<SliceName>/<SliceName>Translator.test.ts` — test scaffold
  - `packages/slices/src/<SliceName>/routes.ts` — framework-agnostic webhook route
  - `packages/slices/src/<SliceName>/slice.json` — copied slice definition

> **Important:** The translator dispatches an internal command defined by a STATE_CHANGE slice. That slice must be generated first so the command type and its `decide`/`evolve`/`handle*` functions already exist. The command handler must also be registered in `commands.ts`.

---

## Step 1: Implement `parseExternalPayload`

In the generated `<SliceName>Translator.ts`, replace the `parseExternalPayload` stub. This function validates raw webhook/message payloads using Zod and maps them into the typed external event.

### Actions
1. Import `z` from `"zod"` and `randomUUID` from `"crypto"` (if needed)
2. Define a Zod schema matching the **raw external payload structure** (e.g. nested JSON from a webhook provider)
3. Define a second Zod schema for validating the **external event data** (the flattened structure after parsing)
4. Use `z.object({...}).parse(payload)` to validate and extract fields from the raw payload
5. Map the nested payload structure to the flattened external event structure
6. Return a typed external event object with `{ type, data, metadata: {} }`
7. **Money:** normalize all amounts to **integer minor units** (e.g. cents) before the external event is published. Convert from provider major units at the boundary. See [docs/EVENT_SOURCING_BEST_PRACTICES.md](../../docs/EVENT_SOURCING_BEST_PRACTICES.md).

### Template
```typescript
import { z } from "zod";

// Schema for raw external payload (e.g. webhook JSON)
export const ExternalPayloadSchema = z.object({
  data: z.object({
    object: z.object({
      email: z.email(),
      email_verified: z.boolean(),
      user_id: z.string().min(1),
      user_metadata: z.object({
        role_id: z.string().min(1),
        role_name: z.string().min(1),
      }),
    }),
  }),
});

// Schema for external event data (flattened structure)
export const ExternalEventSchema = z.object({
  email: z.email(),
  email_verified: z.boolean(),
  user_id: z.string().min(1),
  role_id: z.string().min(1),
  role_name: z.string().min(1),
});

export function parseExternalPayload(payload: ExternalPayload): ExternalEventName {
  // Validate raw payload structure
  const validated = ExternalPayloadSchema.parse(payload);
  const { object } = validated.data;
  const { user_metadata } = object;

  // Map nested structure to flattened external event
  return {
    type: "ExternalEventName",
    data: {
      email: object.email,
      email_verified: object.email_verified,
      user_id: object.user_id,
      role_id: user_metadata.role_id,
      role_name: user_metadata.role_name,
    },
    metadata: {},
  };
}
```

### Important
- The external event type uses `EventMetadata` — include `metadata: {}` for external events (no streamName)
- Zod is already a dependency of `@em-slices/slices`
- Remove the `throw new Error(...)` and `void payload;` lines from the generated stub

---

## Step 2: Implement the Translation Function

Replace the `translate<SliceName>` stub with field mapping and business rules. This function translates the external event into an internal command and dispatches it **via the command dispatcher**.

### Actions
1. Read `specifications[].comments` from `slice.json` for business rules
2. Import the internal command **type** from the STATE_CHANGE slice:
   ```typescript
   import type { AddItemCommand } from "../AddItem/AddItemCommand";
   ```
   > Note: Only import the **type** — NOT the handler function. The handler is registered in `commands.ts`.
3. Map external event fields → internal command fields using the field mapping comments generated in the code
4. Auto-generate aggregate IDs with `randomUUID()` if the command creates a new aggregate
5. Set `metadata: { now: new Date(), correlation_id: correlationId, causation_id: aggregateId }` on the command (propagate for audit trail)
6. Dispatch via `return dispatcher.sendCommand(command, correlationId)` — returns `SendResult` for explicit error handling
7. Implement any filtering/ignoring logic from business rules (e.g., `if (data.source !== "expected") return;`)
8. Remove the `void` suppressors for unused parameters

### Template
```typescript
import { randomUUID } from "crypto";
import type { ICommandDispatcher, SendResult } from "@em-slices/core";
import type { ExternalItemRegistered } from "@em-slices/core";
import type { AddItemCommand } from "../AddItem/AddItemCommand";

export async function translateSliceName(
  externalEvent: ExternalItemRegistered,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<SendResult> {
  const { data } = externalEvent;

  // Apply business rules (e.g., filter by field value)
  if (data.source_system !== "expected-source") return;

  const aggregateId = randomUUID();
  const command: AddItemCommand = {
    type: "AddItem",
    data: {
      aggregateId,
      // Map external fields → command fields (refer to field mapping comments)
    },
    metadata: {
      now: new Date(),
      correlation_id: correlationId,
      causation_id: aggregateId,
    },
  };

  return dispatcher.sendCommand(command, correlationId);
}
```

### Important
- The translator does NOT import the command handler — only the command type
- The translator does NOT receive `eventStore` — it only needs `dispatcher`
- Command routing is handled by `commands.ts` which registers handlers with the dispatcher
- The command shape is `{ type, data, metadata: { now, correlation_id?, causation_id? } }` — propagate for audit trail
- Returns `SendResult` for explicit error handling (success or failure with error details)

---

## Step 3: Write Tests

Replace the test scaffold TODOs with real assertions.

### Test Cases to Cover

**`parseExternalPayload` (validation)**
1. Valid payload → typed event with correct data and `metadata: {}`
2. Valid payload with optional fields omitted → works, optional fields undefined
3. Empty payload → throws ZodError
4. Missing each required field → throws (one test per field)
5. Invalid field format (e.g., invalid email) → throws

**`translate*` (translation logic)**
1. Happy path — external event → `dispatcher.sendCommand` called with correctly shaped command
2. Complex field mapping — e.g., name splitting, date parsing
3. Auto-generated fields — UUID is valid format, timestamps set
4. Business rule filtering — events that don't match criteria → `dispatcher.sendCommand` NOT called
5. Optional fields missing → command sent with `undefined` for those fields
6. `sendCommand` returns `{ success: false }` — translator returns `SendResult`

### Mock Setup Pattern
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ICommandDispatcher } from "@em-slices/core";

let dispatcher: ICommandDispatcher;

beforeEach(() => {
  dispatcher = {
    sendCommand: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as ICommandDispatcher;
});
```

### Asserting Commands Sent
```typescript
expect(dispatcher.sendCommand).toHaveBeenCalledTimes(1);

const [command] = (dispatcher.sendCommand as ReturnType<typeof vi.fn>).mock.calls[0]!;

expect(command.type).toBe("AddItem");
expect(command.data).toEqual(expect.objectContaining({ ... }));
```

### Important
- Use `!` non-null assertions when accessing array elements from mock calls (strict TS)
- No `eventStore` mock needed — the translator only uses `dispatcher`
- Assert on `dispatcher.sendCommand` — NOT on `eventStore.appendEvents`

---

## Step 4: Register Command Handler (if not already done)

Ensure the target command handler is registered in `packages/slices/src/commands.ts`. If the STATE_CHANGE slice was generated before this translator, it should already be there.

### Check
```typescript
// commands.ts should contain:
dispatcher.register<AddItemCommand>("AddItem", (cmd) =>
  handleAddItem(cmd, eventStore)
);

messageBus.handle(async (command: AddItemCommand) => {
  const result = await dispatcher.sendCommand(command);
  if (!result.success) {
    throw new Error(result.error.message);
  }
}, "AddItem");
```

If it's missing, add the registration following the existing pattern.

---

## Step 5: Create the Next.js Webhook Route

Create a thin Next.js adapter at the webhook endpoint defined in `slice.json → processors[].apiEndpoint`.

### Actions
1. Create `apps/web-app/src/app/api/<path-from-apiEndpoint>/route.ts`
2. Import the framework-agnostic route handler from the slice
3. Wire it to Next.js `POST`
4. Extract `correlationId` from request headers or payload (e.g. provider event id) and include `X-Correlation-ID` in error responses

### Template
```typescript
import { NextResponse } from "next/server";
import { getCommandDispatcher } from "@/lib/messageBus";
import { handleTranslatorRoute } from "@em-slices/slices/src/<SliceName>/routes";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const dispatcher = getCommandDispatcher();
    // Extract correlation ID from payload or X-Correlation-ID header
    const correlationId = payload?.id ?? request.headers.get("X-Correlation-ID") ?? undefined;

    const result = await handleTranslatorRoute(
      { payload, correlationId },
      dispatcher
    );

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    }

    const statusCode = result.code === "PARSE_ERROR" ? 400 : 500;
    const headers = result.correlationId
      ? { "X-Correlation-ID": result.correlationId }
      : undefined;
    return NextResponse.json(result, { status: statusCode, headers });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
```

### Important
- Webhook routes should bypass authentication — add the path to public routes config if needed
- The dispatcher is initialized centrally by middleware (`initializeMessageBus()`), so command handlers are already registered
- Use `getCommandDispatcher()` from `@/lib/messageBus` — it returns the initialized dispatcher instance
- The route handler receives `dispatcher` — NOT `eventStore` or `messageBus`
- Map nested webhook shapes in `parseExternalPayload`; use a stable provider id as `correlationId` when available

---

## Step 6: Verify

1. **TypeScript**: `pnpm exec tsc --noEmit --project packages/slices/tsconfig.json`
2. **Tests**: `pnpm --filter @em-slices/slices exec vitest run src/<SliceName>/`
3. **All tests**: `pnpm --filter @em-slices/slices exec vitest run` (note: tinypool may cause exit code 1 even when all tests pass — check test results, not exit code)

---

## Quick Reference: Where Things Live

| Artifact | Location |
|---|---|
| External event type | `packages/core/src/events/<ExternalEventName>.ts` |
| Internal command type | `packages/slices/src/<StateChangeSlice>/<StateChangeSlice>Command.ts` |
| Command handler registration | `packages/slices/src/commands.ts` |
| Translator handler | `packages/slices/src/<SliceName>/<SliceName>Translator.ts` |
| Translator tests | `packages/slices/src/<SliceName>/<SliceName>Translator.test.ts` |
| Route handler (agnostic) | `packages/slices/src/<SliceName>/routes.ts` |
| Next.js webhook route | `apps/web-app/src/app/api/.../<endpoint>/route.ts` |
| Slice definition | `packages/slices/src/<SliceName>/slice.json` |

## Key Conventions

- External events are prefixed with `External` (e.g., `ItemRegistered` → `ExternalItemRegistered`)
- Events use emmett's `Event<Type, Data, Record<string, unknown>>` — always include `metadata: {}`
- Command types live in their STATE_CHANGE slice folder, NOT in `@em-slices/core`
- Commands use shape `{ type, data, metadata: { now } }` — set `now: new Date()` (Date object, not number)
- Timestamp fields ending with `At` are typed as `number`
- The translator only imports the command **type** — NOT the handler function
- The translator only receives `dispatcher` — NOT `eventStore` or `messageBus`
- Commands are dispatched via `dispatcher.sendCommand(command, correlationId)` — returns `SendResult`
- Zod is used for external payload validation
- Business rules from `slice.json → specifications[].comments` guide filtering logic
- Use `!` non-null assertions when accessing array elements from mock calls (strict TS)
- Mock `dispatcher` with `{ sendCommand: vi.fn().mockResolvedValue({ success: true }) }` in tests
- Date fields in commands should use `string` type (YYYY-MM-DD format), not `Date` objects, to match the command type definition
- Phone numbers in test data should not include the `+` prefix, as PostgreSQL/emmett may strip it during serialization
- **Zod UUID**: Use `z.uuid()` for UUID fields, not `z.string().uuid()` (deprecated)
