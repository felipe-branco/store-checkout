import type { Slice, Processor } from "../types/codegen-slice.js";
import { toPascalCase, toEventName } from "../utils/naming.js";

/**
 * Generate translator test file
 */
export function generateTranslatorTestFile(slice: Slice, processor: Processor): string {
  const translatorName = toPascalCase(processor.title);
  const sliceNamePascal = toPascalCase(slice.title);

  // External events (INBOUND)
  const inboundEvents = processor.dependencies
    .filter((dep) => dep.type === "INBOUND" && dep.elementType === "EVENT")
    .map((dep) => toEventName(dep.title, "EXTERNAL"));

  const externalSliceEvents = slice.events
    .filter((e) => e.context === "EXTERNAL")
    .map((e) => toEventName(e.title, e.context));

  const allExternalEvents = [...new Set([...inboundEvents, ...externalSliceEvents])];

  // Internal commands (OUTBOUND)
  const outboundCommands = processor.dependencies
    .filter((dep) => dep.type === "OUTBOUND" && dep.elementType === "COMMAND")
    .map((dep) => toPascalCase(dep.title));

  const internalSliceCommands = slice.commands
    .filter((c) => c.context === "INTERNAL")
    .map((c) => toPascalCase(c.title));

  const allInternalCommands = [...new Set([...outboundCommands, ...internalSliceCommands])];

  const eventImports = allExternalEvents
    .map((eventName) => `import type { ${eventName} } from "@em-slices/core";`)
    .join("\n");

  const firstExternalEvent = allExternalEvents[0] || "ExternalEvent";
  const firstInternalCommand = allInternalCommands[0] || "InternalCommand";

  return `import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ICommandDispatcher } from "@em-slices/core";
${eventImports}
import { translate${translatorName}, parseExternalPayload } from "./${sliceNamePascal}Translator";

describe("${sliceNamePascal} Translator", () => {
  let dispatcher: ICommandDispatcher;

  beforeEach(() => {
    dispatcher = {
      sendCommand: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as ICommandDispatcher;
  });

  describe("translate${translatorName}", () => {
    it("should send ${firstInternalCommand} command via dispatcher", async () => {
      // TODO: Create external event
      // const externalEvent: ${firstExternalEvent} = {
      //   type: "${firstExternalEvent}",
      //   data: {
      //     // Add external event fields
      //   },
      //   metadata: {},
      // };

      // Act
      // await translate${translatorName}(externalEvent, dispatcher);

      // Assert — verify the command was sent via dispatcher
      // expect(dispatcher.sendCommand).toHaveBeenCalledTimes(1);
      // const [command] = (dispatcher.sendCommand as ReturnType<typeof vi.fn>).mock.calls[0]!;
      // expect(command.type).toBe("${firstInternalCommand}");
      // expect(command.data).toEqual(expect.objectContaining({
      //   // Verify mapped fields
      // }));
    });

    // TODO: Add more test cases
    // - Test field mapping correctness
    // - Test with missing optional fields
    // - Test business rule filtering (e.g., ignore certain source systems)
    // - Test error handling for invalid external events
    // - Test sendCommand returns { success: false } — translator returns SendResult
  });

  describe("parseExternalPayload", () => {
    it("should parse raw payload into typed external event", () => {
      // TODO: Create raw payload matching external system format
      // const rawPayload = {
      //   // Raw external fields
      // };

      // Act
      // const typedEvent = parseExternalPayload(rawPayload);

      // Assert
      // expect(typedEvent.type).toBe("${firstExternalEvent}");
      // expect(typedEvent.data).toEqual(expect.objectContaining({
      //   // Verify parsed fields
      // }));
    });

    // TODO: Add more test cases
    // - Test with malformed payload
    // - Test with missing required fields
    // - Test payload validation
  });
});
`;
}
