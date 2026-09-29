import { placeOrder, validateOrderPayload } from "@/lib/kiosk/catalog";
import type { CreateOrderResponse } from "@store-checkout/ui";

export async function POST(request: Request) {
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
}
