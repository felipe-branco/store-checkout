import { NextResponse } from "next/server";
import {
  initializeEventStore,
  getEventStore,
  getInitializationError as getEventStoreInitError,
} from "@/lib/eventStore";
import {
  initializeMessageBus,
  getInitializationError as getMessageBusInitError,
} from "@/lib/messageBus";
import { logger } from "@/lib/logger";
import { withLoggedApiRoute } from "@/lib/api-log";

const HEALTH_CHECK_STREAM_ID = "__health_check__";
const CACHE_MAX_AGE_SECONDS = 5;

const cacheHeaders = {
  "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
};

export const GET = withLoggedApiRoute("GET", "/api/health", async () => {
  try {
    const eventStoreError = getEventStoreInitError();
    if (eventStoreError) {
      logger.warn(
        { component: "eventStore", error: eventStoreError.message },
        "Health check failed: event store initialization error"
      );
      return NextResponse.json(
        {
          status: "unhealthy",
          eventStore: "error",
          messageBus: "error",
          details: eventStoreError.message,
        },
        { status: 503 }
      );
    }

    const messageBusError = getMessageBusInitError();
    if (messageBusError) {
      logger.warn(
        { component: "messageBus", error: messageBusError.message },
        "Health check failed: message bus initialization error"
      );
      return NextResponse.json(
        {
          status: "unhealthy",
          eventStore: "ok",
          messageBus: "error",
          details: messageBusError.message,
        },
        { status: 503 }
      );
    }

    await initializeEventStore();
    await initializeMessageBus();

    const eventStore = getEventStore();
    try {
      await eventStore.readStream(HEALTH_CHECK_STREAM_ID);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isStreamNotFound =
        errorMessage.includes("not found") ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("StreamNotFound") ||
        errorMessage.includes("ENOENT");

      if (!isStreamNotFound) {
        logger.warn(
          { component: "eventStore", error: errorMessage },
          "Health check failed: event store read error"
        );
        return NextResponse.json(
          {
            status: "unhealthy",
            eventStore: "error",
            messageBus: "ok",
            details: errorMessage,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        status: "healthy",
        eventStore: "ok",
        messageBus: "ok",
      },
      { status: 200, headers: cacheHeaders }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, "Health check failed: unexpected error");
    return NextResponse.json(
      {
        status: "unhealthy",
        eventStore: "error",
        messageBus: "error",
        details: errorMessage,
      },
      { status: 503 }
    );
  }
});
