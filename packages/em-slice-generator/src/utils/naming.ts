/**
 * Utility functions for converting slice titles to various naming conventions
 */

/**
 * Convert a title to PascalCase
 * Example: "Create User Account" -> "CreateUserAccount"
 */
export function toPascalCase(title: string): string {
  return title
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Convert a title to kebab-case
 * Example: "Create User Account" -> "create-user-account"
 */
export function toKebabCase(title: string): string {
  return title
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .join("-");
}

/**
 * Convert a title to camelCase
 * Example: "Create User Account" -> "createUserAccount"
 * If the input is already in camelCase (no spaces, starts with lowercase), return as-is
 * Example: "patientId" -> "patientId" (not "patientid")
 */
export function toCamelCase(title: string): string {
  // If already in camelCase format (no spaces, starts with lowercase), return as-is
  if (!/\s/.test(title) && title.length > 0 && title.charAt(0) === title.charAt(0).toLowerCase()) {
    return title;
  }
  const pascal = toPascalCase(title);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Get the proper event type name, prefixing with "External" when context is EXTERNAL
 * Example: "User Updated" + EXTERNAL -> "ExternalUserUpdated"
 * Example: "Item Added" + INTERNAL -> "ItemAdded"
 */
export function toEventName(title: string, context?: string): string {
  const baseName = toPascalCase(title);
  if (context === "EXTERNAL" && !baseName.startsWith("External")) {
    return `External${baseName}`;
  }
  return baseName;
}
