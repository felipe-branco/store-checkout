'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreateCart, CartDetails } from '@store-checkout/slices';
import { KioskAccessGate } from '@/components/KioskAccessGate';

type SessionPhase = 'loading' | 'gate' | 'start' | 'order';

export default function Home() {
  const [phase, setPhase] = useState<SessionPhase>('loading');

  const refreshSession = useCallback(async () => {
    try {
      const sessionRes = await fetch('/api/kiosk/session', { cache: 'no-store' });
      const session = (await sessionRes.json()) as {
        gateEnabled?: boolean;
        authorized?: boolean;
      };
      if (session.gateEnabled && !session.authorized) {
        setPhase('gate');
        return;
      }

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

  if (phase === 'gate') {
    return <KioskAccessGate onUnlocked={() => void refreshSession()} />;
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
