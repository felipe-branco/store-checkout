import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import {
  decide,
  evolve,
  initialState,
  handleCreateCart,
  type CreateCartCommand,
} from "./CreateCartCommand";
import type { CartCreated } from "@store-checkout/core";
import { CommandHandlerSpec, existingStream } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("CreateCart", () => {
  const id = randomUUID();
  const now = new Date();

  describe("When Cart does not exist", () => {
    it("should emit CartCreated on valid command", () => {
      given([])
        .when({
          type: "CreateCart",
          data: { cart_id: id },
          metadata: { now, correlation_id: id, causation_id: id },
        })
        .then([
          {
            type: "CartCreated",
            data: {
              cart_id: id,
              items: [],
              created_at: now.getTime(),
            },
            metadata: { now, causation_id: id, streamName: id },
          },
        ]);
    });
  });

  describe("When Cart already exists", () => {
    it("should do nothing (idempotent)", () => {
      const pastEvent: CartCreated = {
        type: "CartCreated",
        data: {
          cart_id: id,
          items: [],
          created_at: now.getTime(),
        },
        metadata: { now, causation_id: id, streamName: id },
      };

      given([pastEvent])
        .when({
          type: "CreateCart",
          data: { cart_id: id },
          metadata: { now, correlation_id: id, causation_id: id },
        })
        .then([]);
    });
  });

  if (runIntegrationTests) {
    describe("Integration Tests", () => {
      let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;
      let integrationGiven: ReturnType<
        typeof CommandHandlerSpec.for<CreateCartCommand, CartCreated>
      >;

      beforeAll(async () => {
        testDb = await setupTestDatabase();
        integrationGiven = CommandHandlerSpec.for({
          handler: handleCreateCart,
          connectionString: testDb.connectionString,
        });
      }, 60000);

      it("should persist CartCreated to database", async () => {
        const streamId = randomUUID();
        const command: CreateCartCommand = {
          type: "CreateCart",
          data: { cart_id: streamId },
          metadata: { now: new Date() },
        };

        const expectedEvent: CartCreated = {
          type: "CartCreated",
          data: {
            cart_id: streamId,
            items: [],
            created_at: command.metadata!.now.getTime(),
          },
          metadata: {
            now: command.metadata!.now,
            causation_id: streamId,
            streamName: streamId,
          },
        };

        await integrationGiven([])
          .when(command)
          .then(expectNewEvents(streamId, [expectedEvent]));
      });

      it("should do nothing when cart already exists (idempotent)", async () => {
        const streamId = randomUUID();
        const nowIntegration = new Date();
        const pastEvent: CartCreated = {
          type: "CartCreated",
          data: {
            cart_id: streamId,
            items: [],
            created_at: nowIntegration.getTime(),
          },
          metadata: { now: nowIntegration, causation_id: streamId, streamName: streamId },
        };

        const command: CreateCartCommand = {
          type: "CreateCart",
          data: { cart_id: streamId },
          metadata: { now: nowIntegration },
        };

        await integrationGiven([existingStream(streamId, [pastEvent])])
          .when(command)
          .then(expectNewEvents(streamId, []));
      });
    });
  }
});
