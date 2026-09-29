/**
 * Shared type mapping utilities for converting schema field types
 * to TypeScript types and Zod validators.
 *
 * Convention: Fields whose name ends with "At" (e.g., registeredAt, confirmedAt)
 * are always mapped to `number` (Unix timestamp from Date.now()).
 */

/**
 * Check if a field name represents an instant timestamp (`*_at`, `*_time`, camelCase *At).
 * Values use Unix milliseconds — see docs/EVENT_SOURCING_BEST_PRACTICES.md.
 */
export function isTimestampField(fieldName: string): boolean {
  return (
    fieldName.endsWith("At") ||
    fieldName.endsWith("_at") ||
    fieldName.endsWith("_time")
  );
}

/**
 * Map a schema base type to a TypeScript type string.
 * If the field name ends with "At", always returns "number" (timestamp).
 */
export function mapBaseType(type: string, fieldName?: string): string {
  if (fieldName && isTimestampField(fieldName)) {
    return "number";
  }

  switch (type) {
    case "String":
      return "string";
    case "Boolean":
      return "boolean";
    case "Int":
    case "Long":
    case "Double":
    case "Decimal":
      return "number";
    case "Date":
      // Date fields should be strings in YYYY-MM-DD format to avoid serialization issues
      return "string";
    case "DateTime":
      // DateTime fields ending with "At" are handled as timestamps (number) above
      // Other DateTime fields use Date for backward compatibility
      return "Date";
    case "UUID":
      return "string";
    case "Custom":
      return "unknown";
    default:
      return "unknown";
  }
}

/**
 * Map a full schema field (with cardinality & subfields) to a TypeScript type string.
 */
export function mapFieldType(field: {
  name: string;
  type: string;
  cardinality?: string;
  subfields?: Array<{
    name: string;
    type: string;
    optional?: boolean;
    cardinality?: string;
    subfields?: Array<{ name: string; type: string; optional?: boolean }>;
  }>;
}): string {
  // Handle nested fields (Custom type with subfields)
  if (field.type === "Custom" && field.subfields && field.subfields.length > 0) {
    const nestedType = generateNestedType(field.subfields, 0);
    return field.cardinality === "List" ? `${nestedType}[]` : nestedType;
  }

  const baseType = mapBaseType(field.type, field.name);
  return field.cardinality === "List" ? `${baseType}[]` : baseType;
}

/**
 * Generate a nested TypeScript type definition from subfields (recursive)
 */
export function generateNestedType(
  subfields: Array<{
    name: string;
    type: string;
    optional?: boolean;
    cardinality?: string;
    subfields?: Array<{ name: string; type: string; optional?: boolean }>;
  }>,
  indent: number
): string {
  const innerIndent = "  ".repeat(indent + 2);
  const closingIndent = "  ".repeat(indent + 1);

  const fields = subfields
    .map((subfield) => {
      let fieldType: string;

      if (
        subfield.type === "Custom" &&
        subfield.subfields &&
        subfield.subfields.length > 0
      ) {
        fieldType = generateNestedType(subfield.subfields, indent + 1);
      } else {
        fieldType = mapBaseType(subfield.type, subfield.name);
      }

      if (subfield.cardinality === "List") {
        fieldType = `${fieldType}[]`;
      }

      return `${innerIndent}${subfield.name}${subfield.optional ? "?" : ""}: ${fieldType};`;
    })
    .join("\n");

  return `{\n${fields}\n${closingIndent}}`;
}

/**
 * Map a schema field to its Zod validator string.
 * Handles the *At → number convention and optional fields.
 */
export function mapFieldToZod(field: {
  name: string;
  type: string;
  optional?: boolean;
  cardinality?: string;
}): string {
  let zodType: string;

  if (isTimestampField(field.name)) {
    zodType = "z.number()";
  } else {
    switch (field.type) {
      case "String":
        zodType = "z.string().min(1)";
        break;
      case "Boolean":
        zodType = "z.boolean()";
        break;
      case "Int":
        zodType = "z.number().int()";
        break;
      case "Long":
      case "Double":
      case "Decimal":
        zodType = "z.number()";
        break;
      case "Date":
        // Date fields should be strings in YYYY-MM-DD format to avoid serialization issues
        zodType = 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "dateOfBirth must be in YYYY-MM-DD format")';
        break;
      case "DateTime":
        // DateTime fields ending with "At" are handled as timestamps (number)
        // Other DateTime fields use coerce.date() for backward compatibility
        zodType = "z.coerce.date()";
        break;
      case "UUID":
        zodType = "z.uuid()";
        break;
      default:
        zodType = "z.unknown()";
    }
  }

  if (field.cardinality === "List") {
    zodType = `z.array(${zodType})`;
  }

  if (field.optional) {
    zodType = `${zodType}.optional()`;
  }

  return zodType;
}

