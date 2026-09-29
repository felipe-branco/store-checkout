# Automation Slice — Post-Generation Implementation Plan

After generating an AUTOMATION slice using the slice generator, follow these steps to complete the implementation. The generator produces scaffolding with TODOs; this plan guides an AI agent (or developer) through each required task.

## Prerequisites

- The STATE_CHANGE slice(s) that produce the trigger events **and** the target commands have already been generated
  - Trigger event type (e.g., `ItemAdded`) exists in `packages/core/src/events/`
  - Target command type (e.g., `ScheduleAssessmentCommand`) exists in `packages/slices/src/<TargetSlice>/`
  - Target command handler is registered in `packages/slices/src/commands.ts`
- The generator has been run: `pnpm slice:generate <path-to-slice.json>`
- Generated files are in place:
  - `packages/slices/src/<SliceName>/<SliceName>Automation.ts` — automation handler
  - `packages/slices/src/<SliceName>/<SliceName>Automation.test.ts` — test scaffold
  - `packages/slices/src/<SliceName>/slice.json` — copied slice definition
  - Event types are NOT re-generated (skipped if they already exist)

> **Important:** An automation connects two STATE_CHANGE slices: it subscribes to events from one and dispatches commands to another. Both must exist before implementing the automation. The target command handler must be registered in `commands.ts`.

---

## Step 1: Implement the Automation Handler

Replace the TODO stub in `<SliceName>Automation.ts` with the business logic.

### Actions
1. Read `specifications[].comments` from `slice.json` for business rules
2. Import the target command **type** from the STATE_CHANGE slice:
   ```typescript
   import type { ScheduleAssessmentCommand } from "../ScheduleAssessment/ScheduleAssessmentCommand";
   ```
   > Note: Only import the **type** — NOT the handler function. The handler is registered in `commands.ts`.
3. Map trigger event data → command data fields
4. Auto-generate aggregate IDs with `randomUUID()` for new aggregates
5. Set `metadata: { now: new Date() }` on the command (Date object, not number)
6. Dispatch via `await messageBus.send(command)` — the registered command handler will run the decider, append events, and publish them
7. Remove the `void` suppressors for unused parameters

### Template
```typescript
import { randomUUID } from "crypto";
import type { MessageBus } from "@store-checkout/core";
import type { ItemAdded } from "@store-checkout/core";
import type { ScheduleAssessmentCommand } from "../ScheduleAssessment/ScheduleAssessmentCommand";

export async function handleAutomation(
  event: ItemAdded,
  messageBus: MessageBus
): Promise<void> {
  const { data } = event;

  // Apply business rules from specifications
  const command: ScheduleAssessmentCommand = {
    type: "ScheduleAssessment",
    data: {
      assessmentId: randomUUID(),
      itemId: data.itemId,
      // Map fields per business rules
    },
    metadata: { now: new Date() },
  };

  // Dispatch via message bus
  await messageBus.send(command);
}
```

### Important
- The automation handler only imports the command **type** — NOT the handler function
- The automation handler only receives `messageBus` — NOT `eventStore`
- Command routing is handled by `commands.ts` which calls the handler, appends events, and publishes them
- The command handler manages aggregate state loading and event persistence
- Automation handlers have no API routes — they are triggered by event subscriptions

---

## Step 2: Write Tests

Replace the test scaffold TODOs with real assertions.

### Test Cases to Cover

1. **Happy path** — trigger event → `messageBus.send` called with correctly shaped command
2. **Field mapping** — all fields correctly mapped from event to command
3. **Computed fields** — timestamps, derived values calculated correctly
4. **Auto-generated fields** — UUIDs are valid format
5. **Business rules** — specific rules from specifications (e.g., "7 days from registration")
6. **Notes/metadata** — any notes or metadata constructed from event data

### Mock Setup Pattern
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MessageBus } from "@store-checkout/core";

let messageBus: MessageBus;

beforeEach(() => {
  messageBus = {
    send: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
  } as unknown as MessageBus;
});
```

### Asserting Commands Sent
```typescript
expect(messageBus.send).toHaveBeenCalledTimes(1);

const command = (messageBus.send as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
  type: string;
  data: Record<string, unknown>;
};

expect(command.type).toBe("ScheduleAssessment");
expect(command.data.itemId).toBe("item-123");
```

### Important
- Use `!` non-null assertions when accessing array elements from mock calls (strict TS)
- No `eventStore` mock needed — the automation only uses `messageBus`
- Assert on `messageBus.send` — NOT on `eventStore.appendEvents`

---

## Step 3: Register the Automation

Add the event subscription to `packages/slices/src/automations.ts` so the automation is wired up at runtime.

### Actions
1. Import the automation handler
2. Subscribe to the trigger event type on the message bus

### Template
```typescript
import type { MessageBus, EventSubscription } from "@store-checkout/core";
import type { ItemAdded } from "@store-checkout/core";
import { handleNotifyItemAddedAutomation } from "./NotifyItemAddedAutomator/NotifyItemAddedAutomation";

export function registerAllAutomations(
  messageBus: MessageBus & EventSubscription
): void {
  messageBus.subscribe(
    async (event: ItemAdded) => {
      await handleNotifyItemAddedAutomation(event, messageBus);
    },
    "ItemAdded"
  );
}
```

### Important
- The `messageBus` parameter must be typed as `MessageBus & EventSubscription` to have both `send` and `subscribe`
- `registerAllAutomations` no longer receives `eventStore` — automations only need `messageBus`
- Each automation gets its own `subscribe` call with the specific event type
- The event type name string (e.g., `"ItemAdded"`) must match the event's `type` field exactly

---

## Step 4: Register Command Handler (if not already done)

Ensure the target command handler is registered in `packages/slices/src/commands.ts`. If the STATE_CHANGE slice was generated before this automation, it should already be there.

### Check
```typescript
// commands.ts should contain:
messageBus.handle(async (command: ScheduleAssessmentCommand) => {
  const { newEvents } = await handleScheduleAssessment(command, eventStore);
  for (const event of newEvents) {
    await messageBus.publish(event);
  }
}, "ScheduleAssessment");
```

If it's missing, add the registration following the existing pattern.

---

## Step 5: Verify

1. **TypeScript**: `pnpm exec tsc --noEmit --project packages/slices/tsconfig.json`
2. **Tests**: `pnpm --filter @store-checkout/slices exec vitest run src/<SliceName>/`
3. **All tests**: check all tests still pass after changes

---

## Quick Reference: Where Things Live

| Artifact | Location |
|---|---|
| Trigger event type | `packages/core/src/events/<EventName>.ts` (from source STATE_CHANGE slice) |
| Target command type | `packages/slices/src/<TargetSlice>/<TargetSlice>Command.ts` |
| Command handler registration | `packages/slices/src/commands.ts` |
| Automation handler | `packages/slices/src/<SliceName>Automator/<SliceName>Automation.ts` |
| Automation tests | `packages/slices/src/<SliceName>Automator/<SliceName>Automation.test.ts` |
| Automation registration | `packages/slices/src/automations.ts` |
| Slice definition | `packages/slices/src/<SliceName>Automator/slice.json` |

## Key Conventions

- Automations have **no API routes** — they are triggered by event subscriptions only
- Automations connect two STATE_CHANGE slices: subscribe to events from one, dispatch commands to another
- The automation handler only imports the command **type** — NOT the handler function
- The automation handler only receives `messageBus` — NOT `eventStore`
- Commands are dispatched via `messageBus.send(command)` — command handlers are registered in `commands.ts`
- Commands use shape `{ type, data, metadata: { now } }` — set `now: new Date()` (Date object, not number)
- `registerAllAutomations` no longer receives `eventStore`
- Import both the event type (from `@store-checkout/core`) and command type (from STATE_CHANGE slice)
- Business rules come from `slice.json → specifications[].comments`
- Use `randomUUID()` for new aggregate IDs
- Use `!` non-null assertions when accessing array elements from mock calls (strict TS)
- Mock `messageBus` with `{ send: vi.fn(), publish: vi.fn() }` in tests
