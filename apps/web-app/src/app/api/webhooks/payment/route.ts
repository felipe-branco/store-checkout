import { initializeEventStore } from "@/lib/eventStore";
import { initializeMessageBus, getCommandDispatcher } from "@/lib/messageBus";
import { withLoggedApiRoute } from "@/lib/api-log";
import { handleExternalPaymentSimulatorRoute } from "@store-checkout/slices/server";

export const dynamic = "force-dynamic";

async function ensureBackendReady(): Promise<void> {
  await initializeEventStore();
  await initializeMessageBus();
}

export const POST = withLoggedApiRoute(
  "POST",
  "/api/webhooks/payment",
  async (request) => {
    await ensureBackendReady();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const correlationId = crypto.randomUUID();
    const dispatcher = getCommandDispatcher();
    const result = await handleExternalPaymentSimulatorRoute(body, dispatcher, correlationId);

    if (!result.success) {
      return Response.json(result, { status: result.code === "VALIDATION_ERROR" ? 400 : 422 });
    }

    return Response.json(result, { status: 200 });
  },
  {
    enrich: () => ({ commandType: "ExternalPaymentSimulatorTranslator" }),
  }
);
