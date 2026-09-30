'use client';

import { useEffect, useState } from 'react';

export type OrderCheckoutStatus = 'pending' | 'payment_failed' | 'payment_succeeded';

export interface OrderCheckoutStatusPayload {
  success: boolean;
  status?: OrderCheckoutStatus;
  orderNumber?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 400;
const POLL_TIMEOUT_MS = 30_000;

export function useOrderCheckoutStatus(
  cartId: string | null,
  orderId: string | null,
  apiEndpoint: string,
  enabled: boolean
): {
  status: OrderCheckoutStatus;
  orderNumber: string | null;
  error: string | null;
  timedOut: boolean;
} {
  const [status, setStatus] = useState<OrderCheckoutStatus>('pending');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!enabled || !cartId || !orderId) {
      return;
    }

    let cancelled = false;
    const started = Date.now();

    async function poll() {
      while (!cancelled) {
        if (Date.now() - started > POLL_TIMEOUT_MS) {
          setTimedOut(true);
          setError('Payment is taking longer than expected. Please try again or ask for help.');
          return;
        }

        try {
          const url = `${apiEndpoint}?cart_id=${encodeURIComponent(cartId!)}&order_id=${encodeURIComponent(orderId!)}`;
          const response = await fetch(url, { cache: 'no-store' });
          const body = (await response.json()) as OrderCheckoutStatusPayload;

          if (!response.ok || !body.success || !body.status) {
            setError(body.error ?? 'Could not load payment status.');
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

          setOrderNumber(body.orderNumber ?? null);
          setStatus(body.status);
          setError(null);

          if (body.status !== 'pending') {
            return;
          }
        } catch {
          setError('Could not reach the server.');
        }

        await sleep(POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [apiEndpoint, cartId, enabled, orderId]);

  return { status, orderNumber, error, timedOut };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
