'use client';

import { OrderFinishedDetails } from '@store-checkout/slices';

/** Standalone preview — kiosk checkout uses this via CartDetails → OrderScreen. */
export default function OrderFinishedDetailsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <OrderFinishedDetails
        orderNumber="128"
        totalInCents={1250}
        lines={[
          {
            product: {
              id: 'demo',
              name: 'Demo snack',
              description: '',
              price: 625,
              image: '/placeholder.svg',
              category: 'snacks',
              stock: 5,
            },
            quantity: 2,
          },
        ]}
        onFinish={() => {
          window.history.back();
        }}
      />
    </div>
  );
}
