'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@store-checkout/ui';
import { OrderScreen, type ServerCartBinding, type Product, type Cart } from '@store-checkout/ui';

interface CartApiResponse {
  success: boolean;
  kioskCart?: Cart;
  error?: string;
}

interface CartDetailsProps {
  onExit?: () => void;
  cartApiEndpoint?: string;
}

export default function CartDetails({
  onExit,
  cartApiEndpoint = '/api/cart',
}: CartDetailsProps = {}) {
  const [cart, setCart] = useState<Cart>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    const response = await fetch(cartApiEndpoint, { cache: 'no-store' });
    const data = (await response.json()) as CartApiResponse;
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load cart');
    }
    setCart(data.kioskCart ?? {});
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

  const serverCart: ServerCartBinding = {
    cart,
    onAdd: async (product: Product) => {
      const response = await fetch(`${cartApiEndpoint}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not add item');
      }
      await loadCart();
    },
    onDecrement: async (productId: string) => {
      const response = await fetch(`${cartApiEndpoint}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not update item');
      }
      await loadCart();
    },
    onClear: async () => {
      const response = await fetch(`${cartApiEndpoint}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not clear cart');
      }
      await loadCart();
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
      onExit={() => {
        void (async () => {
          await fetch(cartApiEndpoint, { method: 'DELETE' });
          onExit?.();
        })();
      }}
    />
  );
}
