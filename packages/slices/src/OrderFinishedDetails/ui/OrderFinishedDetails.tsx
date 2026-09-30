'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { CartLine } from '@store-checkout/ui';
import { formatPrice } from '@store-checkout/ui';

const SUCCESS_RETURN_SECONDS = 15;

export interface OrderFinishedDetailsViewProps {
  orderNumber: string;
  totalInCents: number;
  lines: CartLine[];
  onFinish: () => void;
}

export default function OrderFinishedDetailsView({
  orderNumber,
  totalInCents,
  lines,
  onFinish,
}: OrderFinishedDetailsViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(SUCCESS_RETURN_SECONDS);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (secondsLeft <= 0) {
      onFinishRef.current();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-8 px-8 py-16 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-28 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-16" strokeWidth={3} aria-hidden="true" />
        </div>
        <h2 className="font-display text-5xl leading-tight font-extrabold text-balance">
          Payment approved!
        </h2>
      </div>

      <div className="flex w-full max-w-lg flex-col items-center gap-2 rounded-4xl bg-secondary px-8 py-10 text-secondary-foreground">
        <span className="text-xl font-semibold tracking-[0.2em] uppercase">Your order number</span>
        <span className="font-display text-[10rem] leading-none font-extrabold tabular-nums" aria-live="polite">
          {orderNumber}
        </span>
        <span className="text-xl leading-relaxed text-pretty">
          Wait for your number to be called, then pick up at the counter.
        </span>
      </div>

      <ul className="flex w-full max-w-lg flex-col gap-1 text-lg text-muted-foreground" aria-label="Paid items">
        {lines.map(({ product, quantity }) => (
          <li key={product.id} className="flex justify-between gap-4">
            <span>
              {quantity}x {product.name}
            </span>
            <span className="tabular-nums">{formatPrice(product.price * quantity)}</span>
          </li>
        ))}
        <li className="mt-2 flex justify-between gap-4 border-t pt-2 text-xl font-bold text-foreground">
          <span>Total paid</span>
          <span className="tabular-nums">{formatPrice(totalInCents)}</span>
        </li>
      </ul>

      <button
        type="button"
        onClick={onFinish}
        className="flex h-20 w-full max-w-lg items-center justify-center gap-3 rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground active:scale-[0.98]"
      >
        Done
        <span className="text-lg font-medium opacity-70">({secondsLeft}s)</span>
      </button>
    </div>
  );
}
