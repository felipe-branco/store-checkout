import type { Slice, Processor } from "../types/codegen-slice.js";
import { toPascalCase } from "../utils/naming.js";

/**
 * Generate automation test file
 */
export function generateAutomationTestFile(slice: Slice, processor: Processor): string {
  const processorName = toPascalCase(processor.title);
  const sliceNamePascal = toPascalCase(slice.title);

  // Get events that trigger this automation
  const triggerEvents = processor.triggers || [];
  const dependencyEvents = processor.dependencies
    .filter((dep) => dep.elementType === "EVENT")
    .map((dep) => toPascalCase(dep.title));

  const allTriggerEvents = [...new Set([...triggerEvents, ...dependencyEvents])];
  const eventImports = allTriggerEvents
    .map((eventName) => `import type { ${eventName} } from "@store-checkout/core";`)
    .join("\n");
  const firstTriggerEvent = allTriggerEvents[0] || "Event";

  // Outbound commands
  const outboundCommands = processor.dependencies
    .filter((dep) => dep.type === "OUTBOUND" && dep.elementType === "COMMAND")
    .map((dep) => toPascalCase(dep.title));
  const firstOutboundCommand = outboundCommands[0] || "InternalCommand";

  return `import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MessageBus } from "@store-checkout/core";
${eventImports}
import { handle${processorName}Automation } from "./${sliceNamePascal}Automation";

describe("${sliceNamePascal} Automation", () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = {
      send: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
    } as unknown as MessageBus;
  });

  it("should send ${firstOutboundCommand} command via messageBus when ${firstTriggerEvent} is received", async () => {
    // TODO: Create the trigger event
    // const event: ${firstTriggerEvent} = {
    //   type: "${firstTriggerEvent}",
    //   data: {
    //     // Add event data fields
    //   },
    //   metadata: {},
    // };

    // Act
    // await handle${processorName}Automation(event, messageBus);

    // Assert — verify the command was sent via message bus
    // expect(messageBus.send).toHaveBeenCalledTimes(1);
    // const command = (messageBus.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    // expect(command.type).toBe("${firstOutboundCommand}");
    // expect(command.data).toEqual(expect.objectContaining({
    //   // Verify mapped fields
    // }));
  });

  // TODO: Add more test cases
  // - Business rule validation from specifications
  // - Field mapping correctness
  // - Computed fields (timestamps, derived values)
  // - Error handling
  // - Edge cases
});
`;
}
