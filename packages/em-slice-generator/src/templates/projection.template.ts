import type { Slice, ReadModel } from "../types/codegen-slice.js";
import { toPascalCase, toKebabCase } from "../utils/naming.js";
import { mapFieldType, isTimestampField } from "../utils/type-mapping.js";

/**
 * Generate projection handler code
 */
export function generateProjectionHandler(slice: Slice, readModel: ReadModel): string {
  const projectionName = toPascalCase(slice.title);
  const readModelName = toPascalCase(readModel.title);
  const aggregateName = readModel.aggregate;
  const collectionName = `${toKebabCase(readModelName)}-collection`;

  const readModelDescription = readModel.description || `${readModelName} read model`;
  const readModelContext = readModel.context || "INTERNAL";

  const readModelFields = readModel.fields.length > 0
    ? readModel.fields
        .map(
          (field) => {
            // For read models, Date/DateTime fields should be strings (YYYY-MM-DD format)
            // to avoid PostgreSQL serialization issues
            let fieldType = mapFieldType(field);
            if ((field.type === "Date" || field.type === "DateTime") && !isTimestampField(field.name)) {
              fieldType = "string"; // YYYY-MM-DD format
            }
            return `  ${field.name}${field.optional ? "?" : ""}: ${fieldType};`;
          }
        )
        .join("\n")
    : "  // No fields defined";

  // Get events that this projection should handle
  // For STATE_VIEW, typically all events in the slice
  const eventNames = slice.events.map((e) => toPascalCase(e.title));
  const eventImports = eventNames
    .map((name) => `import type { ${name} } from "@store-checkout/core";`)
    .join("\n");
  const eventUnionType = eventNames.join(" | ");

  // Generate evolve function cases
  const evolveCases = eventNames
    .map(
      (eventName) => `        case "${eventName}": {
            // TODO: Implement evolution logic for ${eventName}
            return document;
        }`
    )
    .join("\n\n");

  const canHandleArray = eventNames.map((n) => `"${n}"`).join(", ");

  return `import { pongoSingleStreamProjection } from "@store-checkout/event-store";
import type { ReadEvent, PostgresReadEventMetadata, PongoDb } from "@store-checkout/event-store";
${eventImports}

/**
 * ${readModelDescription}
 *
 * Aggregate: ${aggregateName}
 * Context: ${readModelContext}
 */
export type ${readModelName}ReadModel = {
${readModelFields}
};

export const evolve = (
    document: ${readModelName}ReadModel | null,
    event: ReadEvent<${eventUnionType}, PostgresReadEventMetadata>
): ${readModelName}ReadModel | null => {
    const { type, data } = event;

    switch (type) {
${evolveCases}

        default:
            return document;
    }
};

const collectionName = "${collectionName}";

export const ${projectionName}Projection = pongoSingleStreamProjection({
    canHandle: [${canHandleArray}],
    collectionName,
    evolve,
});

/**
 * Get a single ${readModelName} read model by stream ID
 */
export const get${readModelName}ById = (
    db: PongoDb,
    streamId: string
): Promise<${readModelName}ReadModel | null> => {
    return db
        .collection<${readModelName}ReadModel>(collectionName)
        .findOne({ _id: streamId });
};

${readModel.listElement ? `/**
 * Get all ${readModelName} (list view)
 */
export const getAll${readModelName} = async (
    db: PongoDb
): Promise<${readModelName}ReadModel[]> => {
    const results = await db
        .collection<${readModelName}ReadModel>(collectionName)
        .find({});
    return results as ${readModelName}ReadModel[];
};` : ""}
`;
}
