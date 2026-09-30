'use client';

import { AlertTriangle } from 'lucide-react';

export interface PaymentFailedOrderViewProps {
  message?: string;
  onRetry: () => void;
  onChangeMethod: () => void;
  onBack: () => void;
}

export default function PaymentFailedOrderView({
  message = 'The payment provider declined this transaction.',
  onRetry,
  onChangeMethod,
  onBack,
}: PaymentFailedOrderViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center" role="alert">
      <AlertTriangle className="size-24 text-destructive" strokeWidth={1.75} aria-hidden="true" />
      <h2 className="font-display text-5xl leading-tight font-extrabold text-balance">Payment not completed</h2>
      <p className="max-w-md text-2xl leading-relaxed text-muted-foreground">{message}</p>
      <p className="max-w-md text-2xl leading-relaxed font-semibold text-pretty">
        {"It's safe to try again: you'll never be charged twice for the same order."}
      </p>
      <div className="flex w-full max-w-lg flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="h-20 rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground active:scale-[0.98]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onChangeMethod}
          className="h-16 rounded-full border-2 text-xl font-semibold active:bg-muted"
        >
          Choose another payment method
        </button>
        <button type="button" onClick={onBack} className="h-14 text-lg font-semibold text-muted-foreground">
          Back to order
        </button>
      </div>
    </div>
  );
}
