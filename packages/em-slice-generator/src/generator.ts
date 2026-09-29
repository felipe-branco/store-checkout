import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { ResolvedSliceView } from "@em-slices/em-manager";
import type { Slice } from "./types/codegen-slice.js";
import { resolvedViewToSlice } from "./resolved-view-to-slice.js";
import { toPascalCase, toKebabCase, toEventName } from "./utils/naming.js";
import { generateEmmettCommandHandler } from "./templates/emmett-command.template.js";
import { generateTestFile } from "./templates/test.template.js";
import { generateEventType } from "./templates/event.template.js";
import { generateProjectionHandler } from "./templates/projection.template.js";
import { generateProjectionTestFile } from "./templates/projection-test.template.js";
import {
  generateCommandRoute,
  generateProjectionRoute,
  generateTranslatorRoute,
} from "./templates/route.template.js";
import { generateAutomationHandler } from "./templates/automation.template.js";
import { generateAutomationTestFile } from "./templates/automation-test.template.js";
import { generateTranslatorHandler } from "./templates/translator.template.js";
import { generateTranslatorTestFile } from "./templates/translator-test.template.js";
import { generateUIComponent } from "./templates/ui-component.template.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate slice files from a ResolvedSliceView (Event Modelers workflow).
 */
export function generateFromResolvedView(
  resolved: ResolvedSliceView,
  sliceDir: string,
  overwrite: boolean = false
): void {
  const slice = resolvedViewToSlice(resolved);
  generateIntoExistingSliceDir(slice, sliceDir, overwrite);
}

function generateIntoExistingSliceDir(
  slice: Slice,
  sliceDir: string,
  overwrite: boolean
): void {
  const baseSliceName = toPascalCase(slice.title);
  const sliceNamePascal =
    slice.sliceType === "AUTOMATION" && !baseSliceName.endsWith("Automator")
      ? baseSliceName + "Automator"
      : baseSliceName;

  if (!existsSync(sliceDir)) {
    mkdirSync(sliceDir, { recursive: true });
  }

  generateEvents(slice, overwrite);

  switch (slice.sliceType) {
    case "STATE_CHANGE":
      generateStateChangeSlice(slice, sliceDir, sliceNamePascal, overwrite);
      break;
    case "STATE_VIEW":
      generateStateViewSlice(slice, sliceDir, sliceNamePascal, overwrite);
      break;
    case "AUTOMATION":
      generateAutomationSlice(slice, sliceDir, baseSliceName, overwrite);
      break;
    case "TRANSLATOR":
      generateTranslatorSlice(slice, sliceDir, sliceNamePascal, overwrite);
      break;
    default:
      throw new Error(`Unknown slice type: ${slice.sliceType}`);
  }

  updateSlicesIndex(sliceNamePascal, overwrite);
}

/**
 * Generate slice files from a legacy Slice shape (after resolvedViewToSlice conversion).
 */
export function generateSlice(
  slice: Slice,
  outputDir: string,
  overwrite: boolean = false
): void {
  const baseSliceName = toPascalCase(slice.title);
  const sliceNamePascal =
    slice.sliceType === "AUTOMATION" && !baseSliceName.endsWith("Automator")
      ? baseSliceName + "Automator"
      : baseSliceName;
  const sliceDir = join(outputDir, sliceNamePascal);

  if (!existsSync(sliceDir)) {
    mkdirSync(sliceDir, { recursive: true });
  }

  generateEvents(slice, overwrite);

  switch (slice.sliceType) {
    case "STATE_CHANGE":
      generateStateChangeSlice(slice, sliceDir, sliceNamePascal, overwrite);
      break;
    case "STATE_VIEW":
      generateStateViewSlice(slice, sliceDir, sliceNamePascal, overwrite);
      break;
    case "AUTOMATION":
      generateAutomationSlice(slice, sliceDir, baseSliceName, overwrite);
      break;
    case "TRANSLATOR":
      generateTranslatorSlice(slice, sliceDir, sliceNamePascal, overwrite);
      break;
    default:
      throw new Error(`Unknown slice type: ${slice.sliceType}`);
  }

  updateSlicesIndex(sliceNamePascal, overwrite);
}

function generateEvents(slice: Slice, overwrite: boolean): void {
  const eventsDir = getCoreEventsDir();
  const eventsIndexPath = join(eventsDir, "index.ts");

  if (!existsSync(eventsDir)) {
    mkdirSync(eventsDir, { recursive: true });
  }

  const generatedEvents: string[] = [];

  for (const event of slice.events) {
    const eventName = toEventName(event.title, event.context);
    const eventPath = join(eventsDir, `${eventName}.ts`);

    if (!existsSync(eventPath) || overwrite) {
      const eventCode = generateEventType(event);
      writeFileSync(eventPath, eventCode, "utf-8");
      console.log(`✓ Generated: ${eventPath}`);
      generatedEvents.push(eventName);
    } else {
      console.log(`⊘ Skipped (exists): ${eventPath}`);
      generatedEvents.push(eventName);
    }
  }

  if (generatedEvents.length > 0) {
    const existingExports = existsSync(eventsIndexPath)
      ? readFileSync(eventsIndexPath, "utf-8")
      : "";

    const existingExportLines = existingExports
      .split("\n")
      .filter((line) => line.trim().startsWith("export * from"))
      .map((line) => line.trim());

    const newExports = generatedEvents
      .filter((eventName) => {
        const exportLine = `export * from "./${eventName}";`;
        return !existingExportLines.includes(exportLine);
      })
      .map((eventName) => `export * from "./${eventName}";`);

    const allExports = [...existingExportLines, ...newExports].sort();
    const indexContent = `/**
 * Domain Events
 *
 * All domain events are exported from here.
 * Events are named using PascalCase convention (e.g., ItemAdded).
 */

${allExports.join("\n")}
`;

    writeFileSync(eventsIndexPath, indexContent, "utf-8");
    if (newExports.length > 0) {
      console.log(`✓ Updated: ${eventsIndexPath}`);
    }
  }
}

function generateStateViewSlice(
  slice: Slice,
  sliceDir: string,
  sliceNamePascal: string,
  overwrite: boolean
) {
  const readModel = slice.readmodels[0];

  if (!readModel) {
    console.error(`Error: STATE_VIEW slice "${slice.title}" has no read models defined.`);
    return;
  }

  const projectionPath = join(sliceDir, `${sliceNamePascal}Projection.ts`);
  if (!existsSync(projectionPath) || overwrite) {
    const projectionCode = generateProjectionHandler(slice, readModel);
    writeFileSync(projectionPath, projectionCode, "utf-8");
    console.log(`✓ Generated: ${projectionPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${projectionPath}`);
  }

  const testPath = join(sliceDir, `${sliceNamePascal}Projection.test.ts`);
  if (!existsSync(testPath) || overwrite) {
    const testCode = generateProjectionTestFile(slice, readModel);
    writeFileSync(testPath, testCode, "utf-8");
    console.log(`✓ Generated: ${testPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${testPath}`);
  }

  if (readModel.apiEndpoint) {
    const routesPath = join(sliceDir, "routes.ts");
    if (!existsSync(routesPath) || overwrite) {
      const routesCode = generateProjectionRoute(slice, readModel);
      writeFileSync(routesPath, routesCode, "utf-8");
      console.log(`✓ Generated: ${routesPath}`);
    } else {
      console.log(`⊘ Skipped (exists): ${routesPath}`);
    }
  }

  if (slice.readmodels && slice.readmodels.length > 0) {
    const primaryReadModel = slice.readmodels[0];
    if (primaryReadModel) {
      const uiDir = join(sliceDir, "ui");
      if (!existsSync(uiDir)) {
        mkdirSync(uiDir, { recursive: true });
      }

      const uiComponentPath = join(uiDir, `${sliceNamePascal}.tsx`);
      if (!existsSync(uiComponentPath) || overwrite) {
        const uiSource = slice.screens?.[0] ?? primaryReadModel;
        const uiCode = generateUIComponent(slice, uiSource);
        writeFileSync(uiComponentPath, uiCode, "utf-8");
        console.log(`✓ Generated: ${uiComponentPath}`);
      } else {
        console.log(`⊘ Skipped (exists): ${uiComponentPath}`);
      }

      generateStateViewPage(slice, sliceNamePascal, primaryReadModel, overwrite);
    }
  } else {
    console.log(`⊘ Skipped UI component: No read model defined for slice "${slice.title}"`);
  }
}

function generateStateChangeSlice(
  slice: Slice,
  sliceDir: string,
  sliceNamePascal: string,
  overwrite: boolean
): void {
  const command = slice.commands[0];

  if (!command) {
    throw new Error(`Slice ${slice.title} has no commands`);
  }

  const commandPath = join(sliceDir, `${sliceNamePascal}Command.ts`);
  if (!existsSync(commandPath) || overwrite) {
    const commandCode = generateEmmettCommandHandler(slice, command);
    writeFileSync(commandPath, commandCode, "utf-8");
    console.log(`✓ Generated: ${commandPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${commandPath}`);
  }

  const testPath = join(sliceDir, `${sliceNamePascal}Command.test.ts`);
  if (!existsSync(testPath) || overwrite) {
    const testCode = generateTestFile(slice, command);
    writeFileSync(testPath, testCode, "utf-8");
    console.log(`✓ Generated: ${testPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${testPath}`);
  }

  if (command.apiEndpoint) {
    const routesPath = join(sliceDir, "routes.ts");
    if (!existsSync(routesPath) || overwrite) {
      const routesCode = generateCommandRoute(slice, command);
      writeFileSync(routesPath, routesCode, "utf-8");
      console.log(`✓ Generated: ${routesPath}`);
    } else {
      console.log(`⊘ Skipped (exists): ${routesPath}`);
    }
  }

  if (slice.screens && slice.screens.length > 0) {
    const screen = slice.screens[0];
    if (screen) {
      const uiDir = join(sliceDir, "ui");
      if (!existsSync(uiDir)) {
        mkdirSync(uiDir, { recursive: true });
      }

      const uiComponentPath = join(uiDir, `${sliceNamePascal}.tsx`);
      if (!existsSync(uiComponentPath) || overwrite) {
        const uiCode = generateUIComponent(slice, screen);
        writeFileSync(uiComponentPath, uiCode, "utf-8");
        console.log(`✓ Generated: ${uiComponentPath}`);
      } else {
        console.log(`⊘ Skipped (exists): ${uiComponentPath}`);
      }
    }
  } else {
    console.log(`⊘ Skipped UI component: No screen defined for slice "${slice.title}"`);
  }
}

function generateAutomationSlice(
  slice: Slice,
  sliceDir: string,
  baseSliceName: string,
  overwrite: boolean
): void {
  const processor = slice.processors[0];

  if (!processor) {
    throw new Error(`Slice ${slice.title} has no processors`);
  }

  const automationPath = join(sliceDir, `${baseSliceName}Automation.ts`);
  if (!existsSync(automationPath) || overwrite) {
    const automationCode = generateAutomationHandler(slice, processor);
    writeFileSync(automationPath, automationCode, "utf-8");
    console.log(`✓ Generated: ${automationPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${automationPath}`);
  }

  const testPath = join(sliceDir, `${baseSliceName}Automation.test.ts`);
  if (!existsSync(testPath) || overwrite) {
    const testCode = generateAutomationTestFile(slice, processor);
    writeFileSync(testPath, testCode, "utf-8");
    console.log(`✓ Generated: ${testPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${testPath}`);
  }
}

function generateTranslatorSlice(
  slice: Slice,
  sliceDir: string,
  sliceNamePascal: string,
  overwrite: boolean
): void {
  const processor = slice.processors[0];

  if (!processor) {
    throw new Error(`Slice ${slice.title} has no processors`);
  }

  const translatorPath = join(sliceDir, `${sliceNamePascal}Translator.ts`);
  if (!existsSync(translatorPath) || overwrite) {
    const translatorCode = generateTranslatorHandler(slice, processor);
    writeFileSync(translatorPath, translatorCode, "utf-8");
    console.log(`✓ Generated: ${translatorPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${translatorPath}`);
  }

  const testPath = join(sliceDir, `${sliceNamePascal}Translator.test.ts`);
  if (!existsSync(testPath) || overwrite) {
    const testCode = generateTranslatorTestFile(slice, processor);
    writeFileSync(testPath, testCode, "utf-8");
    console.log(`✓ Generated: ${testPath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${testPath}`);
  }

  if (processor.apiEndpoint) {
    const routesPath = join(sliceDir, "routes.ts");
    if (!existsSync(routesPath) || overwrite) {
      const routesCode = generateTranslatorRoute(slice, processor);
      writeFileSync(routesPath, routesCode, "utf-8");
      console.log(`✓ Generated: ${routesPath}`);
    } else {
      console.log(`⊘ Skipped (exists): ${routesPath}`);
    }
  }
}

export function getSlicesOutputDir(): string {
  const rootDir = join(__dirname, "../../..");
  return join(rootDir, "packages", "slices", "src");
}

export function getCoreEventsDir(): string {
  const rootDir = join(__dirname, "../../..");
  return join(rootDir, "packages", "core", "src", "events");
}


function getWebAppAppDir(): string {
  const rootDir = join(__dirname, "../../..");
  return join(rootDir, "apps", "web-app", "src", "app");
}

function generateStateViewPage(
  slice: Slice,
  sliceNamePascal: string,
  readModel: { apiEndpoint?: string },
  overwrite: boolean
): void {
  const pathSegment = toKebabCase(slice.title);
  const pageDir = join(getWebAppAppDir(), pathSegment);
  const pagePath = join(pageDir, "page.tsx");

  if (!existsSync(pageDir)) {
    mkdirSync(pageDir, { recursive: true });
  }

  if (!existsSync(pagePath) || overwrite) {
    const apiEndpointProp = readModel.apiEndpoint
      ? `\n  return <${sliceNamePascal} apiEndpoint="${readModel.apiEndpoint}" />;\n`
      : `\n  return <${sliceNamePascal} />;\n`;

    const pageCode = `import { ${sliceNamePascal} } from "@em-slices/slices";

export default function Page() {${apiEndpointProp}}
`;

    writeFileSync(pagePath, pageCode, "utf-8");
    console.log(`✓ Generated: ${pagePath}`);
  } else {
    console.log(`⊘ Skipped (exists): ${pagePath}`);
  }
}

function getSlicesIndexPath(): string {
  const rootDir = join(__dirname, "../../..");
  return join(rootDir, "packages", "slices", "src", "index.ts");
}

function updateSlicesIndex(sliceNamePascal: string, overwrite: boolean): void {
  const indexPath = getSlicesIndexPath();
  const uiComponentPath = `./${sliceNamePascal}/ui/${sliceNamePascal}`;

  const uiDir = join(getSlicesOutputDir(), sliceNamePascal, "ui", `${sliceNamePascal}.tsx`);
  if (!existsSync(uiDir)) {
    return;
  }

  const existingContent = existsSync(indexPath) ? readFileSync(indexPath, "utf-8") : "";

  const existingExportLines = existingContent
    .split("\n")
    .filter((line) => line.trim().startsWith("export"))
    .map((line) => line.trim());

  const uiExportLine = `export { default as ${sliceNamePascal} } from "${uiComponentPath}";`;
  if (existingExportLines.includes(uiExportLine)) {
    if (!overwrite) {
      return;
    }
  }

  const newExports = existingExportLines.filter((line) => !line.includes(uiComponentPath));
  newExports.push(uiExportLine);
  newExports.sort();

  const otherExports = existingExportLines.filter((line) => !line.includes("/ui/"));
  const allExports = [
    ...otherExports,
    ...newExports.filter((line) => line.includes("/ui/")),
  ].sort();

  const indexContent = `/**
 * Vertical Slices Package
 *
 * Each slice should be self-contained and focused on a specific domain.
 * Slice structure:
 * - {slice-name}/
 *   - CommandHandler.ts
 *   - CommandHandler.test.ts
 *   - events.ts (event definitions)
 *   - projections.ts (read models/projections)
 *   - types.ts (domain types)
 *   - ui/ (UI components if needed)
 *   - routes.ts (API routes if needed)
 */

${allExports.length > 0 ? allExports.join("\n") : "// Export all slices from here as they are created\n// Example: export * from './example-slice';"}
`;

  writeFileSync(indexPath, indexContent, "utf-8");
  console.log(`✓ Updated: ${indexPath}`);
}
