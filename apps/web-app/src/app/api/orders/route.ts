import { placeOrder, validateOrderPayload } from "@/lib/kiosk/catalog";
import { withLoggedApiRoute } from "@/lib/api-log";
import type { CreateOrderResponse } from "@store-checkout/ui";

async function enrichPlaceOrderLog(response: Response): Promise<{
  commandType: string;
  success?: boolean;
  error?: string;
}> {
  try {
    const body = (await response.clone().json()) as CreateOrderResponse;
    if (body.ok) {
      return { commandType: "demo.PlaceOrder", success: true };
    }
    return {
      commandType: "demo.PlaceOrder",
      success: false,
      error: "error" in body ? body.error : "invalid",
    };
  } catch {
    return { commandType: "demo.PlaceOrder" };
  }
}

export const POST = withLoggedApiRoute(
  "POST",
  "/api/orders",
  async (request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "invalid", message: "Invalid order." } satisfies CreateOrderResponse,
        { status: 400 }
      );
    }

    const parsed = validateOrderPayload(body);
    if (!parsed.ok) {
      return Response.json(
        { ok: false, error: "invalid", message: parsed.message } satisfies CreateOrderResponse,
        { status: 400 }
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const result = placeOrder(parsed.items, parsed.idempotencyKey);
    return Response.json(result, { status: result.ok ? 201 : 409 });
  },
  {
    enrich: async ({ response }) => enrichPlaceOrderLog(response),
  }
);
