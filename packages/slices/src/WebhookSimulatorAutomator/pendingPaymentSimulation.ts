export type PendingPaymentSimulation = {
  status: "success" | "fail";
  paymentMethod: string;
  valuePaid: number;
  currency: string;
  webhookItems: {
    stock_id: string;
    item_id: string;
    price_in_cents: number;
    quantity: number;
  }[];
};

const pendingByOrderId = new Map<string, PendingPaymentSimulation>();

export function registerPendingPaymentSimulation(
  orderId: string,
  simulation: PendingPaymentSimulation
): void {
  pendingByOrderId.set(orderId, simulation);
}

export function consumePendingPaymentSimulation(
  orderId: string
): PendingPaymentSimulation | undefined {
  const simulation = pendingByOrderId.get(orderId);
  pendingByOrderId.delete(orderId);
  return simulation;
}
