'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, OrderScreen, type ServerCartBinding, type Product, type Cart } from '@store-checkout/ui';
import OrderFinishedDetails from '../../OrderFinishedDetails/ui/OrderFinishedDetails';
import PaymentFailedOrder from '../../PaymentFailedOrder/ui/PaymentFailedOrder';

interface CartApiResponse {
  success: boolean;
  kioskCart?: Cart;
  error?: string;
  code?: string;
}

interface CartDetailsProps {
  onExit?: () => void;
  cartApiEndpoint?: string;
}

type MutationResult =
  | { ok: true }
  | { ok: false; reason: 'stock' | 'error'; message?: string };

export default function CartDetails({
  onExit,
  cartApiEndpoint = '/api/cart',
}: CartDetailsProps = {}) {
  const [cart, setCart] = useState<Cart>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async (): Promise<Cart> => {
    const response = await fetch(cartApiEndpoint, { cache: 'no-store' });
    const data = (await response.json()) as CartApiResponse;
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load cart');
    }
    const next = data.kioskCart ?? {};
    setCart(next);
    return next;
  }, [cartApiEndpoint]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadCart();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cart');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCart]);

  const parseItemMutation = async (response: Response): Promise<MutationResult> => {
    const data = (await response.json()) as CartApiResponse;
    if (response.ok && data.success) {
      await loadCart();
      return { ok: true };
    }
    if (response.status === 409 && data.code === 'STOCK_RESERVE_FAILED') {
      await loadCart();
      return { ok: false, reason: 'stock', message: data.error };
    }
    return { ok: false, reason: 'error', message: data.error || 'Request failed' };
  };

  const serverCart: ServerCartBinding = {
    cart,
    refresh: loadCart,
    onAdd: async (product: Product) => {
      const response = await fetch(`${cartApiEndpoint}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      return parseItemMutation(response);
    },
    onDecrement: async (productId: string) => {
      const response = await fetch(`${cartApiEndpoint}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const result = await parseItemMutation(response);
      if (result.ok) {
        return result;
      }
      return { ok: false as const, reason: 'error' as const, message: result.message };
    },
    onClear: async () => {
      const response = await fetch(`${cartApiEndpoint}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) {
        return { ok: false, reason: 'error', message: data.error || 'Could not clear cart' };
      }
      await loadCart();
      return { ok: true };
    },
  };

  if (loading) {
    return (
      <Box className="flex h-dvh items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="flex h-dvh items-center justify-center px-6 text-center text-lg text-destructive">
        {error}
      </Box>
    );
  }

  return (
    <OrderScreen
      serverCart={serverCart}
      orderStatusEndpoint="/api/orders/status"
      CheckoutSuccessView={OrderFinishedDetails}
      CheckoutFailedView={PaymentFailedOrder}
      onExit={() => {
        void (async () => {
          await fetch(cartApiEndpoint, { method: 'DELETE' });
          onExit?.();
        })();
      }}
    />
  );
}
