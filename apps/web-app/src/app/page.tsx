'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreateCart, CartDetails } from '@store-checkout/slices';

type SessionPhase = 'loading' | 'start' | 'order';

export default function Home() {
  const [phase, setPhase] = useState<SessionPhase>('loading');

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' });
      if (response.ok) {
        setPhase('order');
        return;
      }
      setPhase('start');
    } catch {
      setPhase('start');
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  if (phase === 'loading') {
    return null;
  }

  if (phase === 'start') {
    return <CreateCart onSuccess={() => setPhase('order')} />;
  }

  return (
    <CartDetails
      onExit={() => {
        setPhase('start');
      }}
    />
  );
}
