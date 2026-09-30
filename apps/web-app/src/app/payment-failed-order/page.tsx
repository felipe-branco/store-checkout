'use client';

import { PaymentFailedOrder } from '@store-checkout/slices';

/** Standalone preview — kiosk checkout uses this via CartDetails → OrderScreen. */
export default function PaymentFailedOrderPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <PaymentFailedOrder
        message="The payment provider declined this transaction."
        onRetry={() => window.history.back()}
        onChangeMethod={() => window.history.back()}
        onBack={() => window.history.back()}
      />
    </div>
  );
}
