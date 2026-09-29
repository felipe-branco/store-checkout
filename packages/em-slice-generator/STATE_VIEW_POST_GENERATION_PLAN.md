# State View Slice — Post-Generation Implementation Plan

After generating a STATE_VIEW slice using the slice generator, follow these steps to complete the implementation. The generator produces scaffolding with TODOs; this plan guides an AI agent (or developer) through each required task.

## Terminology

- **READMODEL** — The projection output from STATE_VIEW slices (e.g. `ItemListReadModel`). It is the data structure produced by the projection's `evolve` function, stored in Pongo. Not to be confused with GET routes.
- **SCREENS** — The interface to display and interact with READMODEL data. Screens define which fields to show, which are read-only, and which are editable. When a slice has a screen with editable fields, the generator produces a form component that fetches READMODEL data (GET) and submits updates (POST).
- **GET routes** — API endpoints that expose READMODEL data. Separate from the READMODEL concept itself.

## Prerequisites

- A STATE_CHANGE slice has already been generated that produces the events this projection subscribes to
- The event type (e.g., `ItemAdded`) exists in `packages/core/src/events/`
- The generator has been run: `pnpm slice:generate <path-to-slice.json>`
- Generated files are in place:
  - `packages/slices/src/<SliceName>/<SliceName>Projection.ts` — projection handler + read model type + query functions
  - `packages/slices/src/<SliceName>/<SliceName>Projection.test.ts` — test scaffold
  - `packages/slices/src/<SliceName>/routes.ts` — framework-agnostic query route (if readmodel has apiEndpoint)
  - `packages/slices/src/<SliceName>/ui/<SliceName>.tsx` — UI component (from SCREEN when present, else from readmodel)
  - `packages/slices/src/<SliceName>/slice.json` — copied slice definition
  - `apps/web-app/src/app/<kebab-case-slice-title>/page.tsx` — Next.js page that renders the slice UI
  - Event types are NOT re-generated (skipped if they already exist)

> **Important:** The projection subscribes to events produced by STATE_CHANGE slices. Those slices must be generated first so the event types exist in `@store-checkout/core`.

---

## Step 1: Implement the `evolve` Function

The `evolve` function is the core of the projection. It maps domain events to read model documents.

### Actions
1. Find the `evolve` function in `<SliceName>Projection.ts`
2. Replace the TODO stub for each event case with field mappings
3. **Note:** The `evolve` function is automatically exported by the generator
4. Map event `data` fields → read model fields
5. **Important:** Date fields in read models should be mapped as strings (YYYY-MM-DD format) to match the event data type

### Template
```typescript
export const evolve = (
    document: ReadModelType | null,
    event: ReadEvent<EventType, PostgresReadEventMetadata>
): ReadModelType | null => {
    switch (event.type) {
        case "ItemAdded": {
            const { data } = event;
            return {
                itemId: data.itemId,
                firstName: data.firstName,
                lastName: data.lastName,
                // ... map all fields from event data to read model
            };
        }
        default:
            return document;
    }
};
```

### Important
- The evolve function must be **pure** — no I/O, no side effects
- Return a new document for "create" events (first event for an aggregate)
- Return a modified copy for "update" events: `{ ...document!, field: data.field }`
- Return `null` to remove the document from the projection
- `pongoSingleStreamProjection` stores one document per stream (aggregate)

---

## Step 2: Implement Query Functions

The generator now automatically generates the correct query functions based on `readModel.listElement`:
- **List views** (`listElement: true`): Generates both `getAll${readModelName}` and `get${readModelName}ById`
- **Detail views** (`listElement: false`): Generates only `get${readModelName}ById`

### Actions
1. Verify the generated query functions match your needs
2. For list views, both `getAll${readModelName}` and `get${readModelName}ById` are available
3. For detail views, only `get${readModelName}ById` is generated
4. Update function names only if the generated names don't match your domain language

### Template (list view)
```typescript
export const getAllItems = async (
    db: PongoDb
): Promise<ReadModelType[]> => {
    const results = await db
        .collection<ReadModelType>(collectionName)
        .find({});
    return results as ReadModelType[];
};
```

### Important
- Pongo's `find({})` returns `Promise<WithIdAndVersion<T>[]>` — cast to your read model type
- Pongo's `findOne({_id: streamId})` returns a single document by stream ID
- For list views, you may want to add sorting, filtering, or pagination later

---

## Step 3: Update the Route Handler

The generator now automatically generates route handlers that:
- Import the correct query functions based on `listElement`
- Handle both single document and list responses appropriately
- Use correct response types (array for list views, single document for detail views)

### Actions
1. Verify the generated route handler matches your API design
2. The handler automatically calls `getAll${readModelName}` when no `streamId` is provided (list views)
3. The handler calls `get${readModelName}ById` when `streamId` is provided
4. Response types are automatically set to support arrays for list views

### Template
```typescript
import type { PongoDb } from "@store-checkout/event-store";
import { getAllItems, getItemById, type ReadModelType } from "./SliceNameProjection";

export async function handleReadModelRoute(
  params: { itemId?: string },
  db: PongoDb
): Promise<RouteResult> {
  try {
    if (params.itemId) {
      const item = await getItemById(db, params.itemId);
      return { success: true, data: item };
    }
    const items = await getAllItems(db);
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
```

### Important
- The generated route imports `EventStore` from emmett and passes it through unused — remove it
- Projection routes only need `PongoDb` for querying

---

## Step 4: Write Tests

The generated test file includes both unit tests (for the `evolve` function) and integration tests (to verify projections are built from events in the database).

### Test Cases to Cover

**`evolve` (pure function, no DB needed)**
1. Event → new read model document (happy path)
2. All event fields correctly mapped to read model fields
3. Optional fields missing → read model has `undefined` for those fields
4. Unknown event type → returns current document unchanged (or null)

**Integration Tests (using Testcontainers)**
1. **Register the projection** in `packages/slices/test-utils/test-database.ts`:
   - Import the projection: `import { ${projectionName}Projection } from "../src/${SliceName}/${SliceName}Projection";`
   - Add it to `projections.inline([...])` in `setupTestDatabase()`
2. Store events in PostgreSQL using event store
3. Wait for projection to process (emmett auto-processes)
4. Verify documents exist in Pongo collection with correct data
5. Verify query functions (`getAllXxx`, `getXxxById`) return expected data

### Pattern
```typescript
import { describe, it, expect } from "vitest";
import type { EventType } from "@store-checkout/core";
import type { ReadEvent, PostgresReadEventMetadata } from "@store-checkout/event-store";
import { evolve } from "./SliceNameProjection";

describe("evolve", () => {
  const makeEvent = (overrides = {}): ReadEvent<EventType, PostgresReadEventMetadata> =>
    ({
      type: "ItemAdded",
      data: { /* event fields */ ...overrides },
      metadata: { streamName: "item-123" },
    }) as unknown as ReadEvent<EventType, PostgresReadEventMetadata>;

  it("should project event into read model", () => {
    const result = evolve(null, makeEvent());
    expect(result).not.toBeNull();
    expect(result!.field).toBe("expected value");
  });
});
```

### Important
- Use `as unknown as ReadEvent<...>` to construct test events — the full ReadEvent type is complex
- Use `!` non-null assertions when accessing fields on the result (strict TS)
- **Integration tests** are included by default and use Testcontainers for isolated PostgreSQL instances
- Integration tests verify that events stored in the database are correctly projected into read models
- Integration tests use `expectProjectionDocument()` and `expectProjectionDocuments()` helpers from `../../test-utils/helpers`
- Integration tests normalize Date objects and BigInt values for consistent comparison
- **Projection registration is required** for projections to process events:
  - In tests: Register in `packages/slices/test-utils/test-database.ts`
  - In application: Register in `apps/web-app/src/lib/eventStore.ts`

---

## Step 5: Fix UI Component (if generated)

The generator **always creates STATE_VIEW UI based on the SCREEN when present** in slice.json. If no screen exists, it falls back to the readmodel.

- **When a SCREEN exists with editable fields**: The generator produces a fetch+form component that (1) fetches READMODEL via GET, (2) redirects when a condition is met (e.g. `signup_completed`), (3) shows read-only fields from READMODEL and editable fields from the screen, (4) submits via POST to the same API endpoint.
- **When a SCREEN exists with only display fields**: Or when no screen exists, the generator produces a display component (list or detail) from the readmodel.

### Common Issues (if any remain)
1. **Field name casing**: If field names don't match, verify they use camelCase (e.g., `itemId`, not `itemid`)
2. **Timestamp formatting**: Fields ending with "At" are numbers and should be converted to Date: `formatDate(new Date(item.registeredAt))`
3. **Form submit endpoint**: For STATE_VIEW forms, ensure the API route supports both GET (readmodel fetch) and POST (form submission). Pass the correct `apiEndpoint` prop from the page.

### Actions
1. Verify the generated UI component imports the read model type correctly
2. Verify the API supports GET (readmodel) and POST (form submit) when the screen has editable fields
3. Verify field names match the screen/readmodel (camelCase)

---

## Step 6: Register Projection

Projections must be registered with the event store to process events. This needs to be done in two places:

### In Test Database Setup

Update `packages/slices/test-utils/test-database.ts`:

```typescript
import { ${projectionName}Projection } from "../src/${SliceName}/${SliceName}Projection";

// In setupTestDatabase():
const eventStore = createEmmettEventStore(connectionString, {
  projections: projections.inline([
    ItemListProjection,  // existing
    ${projectionName}Projection,  // add your new projection
  ]),
  schema: { autoMigration: 'None' }
});
```

### In Application Event Store

Update `apps/web-app/src/lib/eventStore.ts`:

```typescript
import { ${projectionName}Projection } from "@store-checkout/slices/src/${SliceName}/${SliceName}Projection";

// In initializeEventStore():
eventStoreInstance = createEmmettEventStoreFromEnv({
  projections: projections.inline([
    ItemListProjection,  // existing
    ${projectionName}Projection,  // add your new projection
  ]),
  schema: { autoMigration: 'None' }
});
```

### In Projections Registry (for rebuild CLI/CI)

Update `packages/slices/src/projections-registry.ts`:

```typescript
import { ${projectionName}Projection } from "./${SliceName}/${SliceName}Projection";

export const PROJECTION_REGISTRY = {
  // ...existing
  ${SliceName}: ${projectionName}Projection,
};
```

### In Manual Rebuild Config (required for pnpm rebuild:projections)

Update `scripts/manual-rebuild-config.ts`:

1. Add import: `import { evolve as yourSliceNameEvolve } from "@store-checkout/slices/src/YourSliceName/YourSliceNameProjection";`
2. Add to MANUAL_REBUILD_CONFIG:

```typescript
YourSliceName: {
  collectionName: "yourslicename-collection",
  canHandle: ["EventType1", "EventType2", ...],  // events the projection handles
  evolve: yourSliceNameEvolve as ManualRebuildConfig["evolve"],
  getDocumentId?: (e, streamId) => string,  // only for multi-stream (e.g. alternate document key)
},
```

Use the same projection name in both registry and manual config. Without manual-rebuild-config, `pnpm rebuild:projections` cannot rebuild the projection.

### Important
- Projections must be registered **before** events are stored, otherwise they won't process existing events
- The projection will automatically process new events as they are appended to the event store
- For integration tests, the projection registration in `test-database.ts` ensures the projection processes events during tests

---

## Step 7: Create/verify web app page

The generator automatically creates a Next.js page at `apps/web-app/src/app/<kebab-case-slice-title>/page.tsx` that renders the slice UI component.

### Path rule

- **Path**: `toKebabCase(slice.title)` — e.g. "Request new calendar" → `request-new-calendar`
- **Route**: `/{path}` — e.g. `/request-new-calendar`

### Actions

1. **If the page was generated**: Verify it renders correctly at `http://localhost:3000/<path>`
2. **If the page was skipped** (exists, no `--overwrite`): Manually create it using this template:

```tsx
import { <SliceNamePascal> } from "@store-checkout/slices";

export default function Page() {
  return <SliceNamePascal />;
}
```

3. **For list/detail views** (readmodel has `apiEndpoint`): The generator passes `apiEndpoint` as a prop. If you need a different endpoint, update the page to pass the correct `apiEndpoint` or `createEndpoint` prop.
4. **If the slice has `permission` in slice.json**: Create a layout at `apps/web-app/src/app/<kebab-case-slice-title>/layout.tsx` that checks the permission and redirects unauthorized users to `/`:

```tsx
import { redirect } from "next/navigation";

export default async function SliceLayout({ children }: { children: React.ReactNode }) {
  // When you add auth: resolve session and enforce slice.json `permission` here.
  // if (!session?.can("<permission-from-slice>")) redirect("/");
  return <>{children}</>;
}
```

   Wire the API route under `apps/web-app/src/app/api/<path>/route.ts`. Optionally add a nav item in `AppSidebar`.

### Important

- The page imports the slice UI from `@store-checkout/slices`
- Form slices (no readmodel `apiEndpoint`) render `<SliceName />` with no props — the component uses its own defaults
- List/detail slices (readmodel has `apiEndpoint`) render `<SliceName apiEndpoint="/api/..." />`
- Slices with `permission` should use a layout (or middleware) that enforces authorization when you add auth

---

## Step 8: Verify

1. **TypeScript**: `pnpm exec tsc --noEmit --project packages/slices/tsconfig.json`
2. **Tests**: `pnpm --filter @store-checkout/slices exec vitest run src/<SliceName>/`
3. **All tests**: check all tests still pass after changes
4. **Projection registration**: Verify the projection is registered in both `test-database.ts` and `eventStore.ts`
5. **Web app page**: Visit `/{kebab-case-slice-title}` and verify the slice UI renders

---

## Quick Reference: Where Things Live

| Artifact | Location |
|---|---|
| Source event type(s) | `packages/core/src/events/<EventName>.ts` (from STATE_CHANGE slice) |
| Projection handler | `packages/slices/src/<SliceName>/<SliceName>Projection.ts` |
| Read model type | `packages/slices/src/<SliceName>/<SliceName>Projection.ts` (same file) |
| Query functions | `packages/slices/src/<SliceName>/<SliceName>Projection.ts` (same file) |
| Projection tests | `packages/slices/src/<SliceName>/<SliceName>Projection.test.ts` |
| Route handler (agnostic) | `packages/slices/src/<SliceName>/routes.ts` |
| UI component (from SCREEN when present) | `packages/slices/src/<SliceName>/ui/<SliceName>.tsx` |
| Web app page | `apps/web-app/src/app/<kebab-case-slice-title>/page.tsx` |
| Layout (if permission) | `apps/web-app/src/app/<kebab-case-slice-title>/layout.tsx` |
| Next.js API route | `apps/web-app/src/app/api/<path>/route.ts` |
| Slice definition | `packages/slices/src/<SliceName>/slice.json` |

## Key Conventions

- Projections use emmett's `pongoSingleStreamProjection` — one document per aggregate stream
- The `evolve` function is **automatically exported** by the generator for unit testing
- Read model types are defined in the projection file, not in `@store-checkout/core`
- Query functions use Pongo's `collection.find()` and `collection.findOne()`
- Pongo's `find({})` returns `Promise<WithIdAndVersion<T>[]>` — cast to your type
- Route handlers use `PongoDb`, NOT `IEventStore` or `EventStore`
- Events used by the projection are defined by the STATE_CHANGE slice (already exist)
- **STATE_VIEW UI source**: When a slice has a SCREEN, the generator uses the screen (not the readmodel) for the UI. SCREENS are the interface for READMODEL data. When the screen has editable fields, a form component is generated that fetches READMODEL (GET) and submits (POST).
- The generated UI may have name mismatches — check and fix imports and type references
- **Integration tests** use Testcontainers and run by default — they verify events are persisted and projections work correctly
- Integration tests use `setupTestDatabase()` from `../../test-utils/test-database` which provides both `eventStore` and `pongoDb`
- Integration tests normalize read model data (Date objects, BigInt) for consistent comparison
- **Date fields in read models** are automatically generated as `string` type (YYYY-MM-DD format) by the generator to avoid PostgreSQL serialization issues
- The generator automatically generates `get${readModelName}ById` and (for list views) `getAll${readModelName}` query functions based on `readModel.listElement`
- Route handlers are automatically configured to use the correct query functions and response types based on `listElement`
- **Projections must be registered** in both `test-database.ts` (for tests) and `eventStore.ts` (for application) to process events
- When creating a new STATE_VIEW slice, remember to add the projection to both registration locations
- **Web app page**: The generator creates `apps/web-app/src/app/<kebab-case-slice-title>/page.tsx`. Path = `toKebabCase(slice.title)`. The page imports and renders the slice UI from `@store-checkout/slices`
- **Slice permission**: When you add auth later, protect routes in middleware or route handlers. Optionally add nav items in `AppSidebar`.
- **API validation errors**: Do not include which fields are missing in 400 responses. Use general messages like "Campos obrigatórios não preenchidos".

