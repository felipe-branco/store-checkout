'use client'

import { useEffect, useRef, useState } from 'react'
import { useEffectEvent } from '../hooks/use-effect-event'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  Nfc,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { CartLine } from './cart-panel'
import { formatPrice, pluralize } from '../lib/format'
import type { CreateOrderResponse, OrderResult, PaymentMethod, StockConflict } from '../lib/kiosk-types'
import { cn } from '../lib/utils'

const TERMINAL_WAIT_MS = 3500
const SUCCESS_RETURN_SECONDS = 15

const METHODS: { id: PaymentMethod; label: string; hint: string; icon: LucideIcon; instruction: string }[] = [
  {
    id: 'credit',
    label: 'Credit',
    hint: 'Visa, Mastercard, Amex',
    icon: CreditCard,
    instruction: 'Insert or tap your credit card on the card reader',
  },
  {
    id: 'debit',
    label: 'Debit',
    hint: 'PIN may be required',
    icon: WalletCards,
    instruction: 'Insert or tap your debit card on the card reader',
  },
  {
    id: 'tap',
    label: 'Tap to pay',
    hint: 'Apple Pay, Google Pay',
    icon: Nfc,
    instruction: 'Hold your phone or watch near the card reader',
  },
]

type Phase =
  | { name: 'review' }
  | { name: 'waiting'; method: PaymentMethod }
  | { name: 'authorizing'; method: PaymentMethod }
  | { name: 'success'; order: OrderResult }
  | { name: 'stock'; conflicts: StockConflict[] }
  | { name: 'failed'; method: PaymentMethod; message: string }

interface PaymentDialogProps {
  lines: CartLine[]
  total: number
  onClose: () => void
  onStockConflict: () => void
  onFinish: () => void
}

export function PaymentDialog({ lines: liveLines, total: liveTotal, onClose, onStockConflict, onFinish }: PaymentDialogProps) {
  // Freeze the order the customer is paying for, so background stock refreshes can't change it mid-payment.
  const [{ lines, total }] = useState(() => ({ lines: liveLines, total: liveTotal }))
  const [phase, setPhase] = useState<Phase>({ name: 'review' })
  const idempotencyKey = useRef<string | null>(null)
  const terminalTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)

  useEffect(() => () => {
    if (terminalTimer.current) clearTimeout(terminalTimer.current)
  }, [])

  async function authorize(method: PaymentMethod) {
    setPhase({ name: 'authorizing', method })
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          paymentMethod: method,
          idempotencyKey: idempotencyKey.current,
        }),
      })
      const data = (await res.json()) as CreateOrderResponse
      if (data.ok) setPhase({ name: 'success', order: data.order })
      else if (data.error === 'stock') setPhase({ name: 'stock', conflicts: data.conflicts })
      else setPhase({ name: 'failed', method, message: data.message })
    } catch {
      setPhase({ name: 'failed', method, message: "We couldn't reach the payment system." })
    }
  }

  function startPayment(method: PaymentMethod, { retry = false } = {}) {
    if (!retry || !idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
    setPhase({ name: 'waiting', method })
    terminalTimer.current = setTimeout(() => authorize(method), TERMINAL_WAIT_MS)
  }

  function cancelWaiting() {
    if (terminalTimer.current) clearTimeout(terminalTimer.current)
    setPhase({ name: 'review' })
  }

  const canDismiss = phase.name === 'review'

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && canDismiss && onClose()} disablePointerDismissal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 flex h-dvh w-screen flex-col bg-background text-foreground outline-none duration-200 data-open:animate-in data-open:slide-in-from-bottom-8"
          aria-describedby={undefined}
        >
          {phase.name === 'review' && (
            <ReviewPhase lines={lines} total={total} itemCount={itemCount} onBack={onClose} onSelect={startPayment} />
          )}
          {phase.name === 'waiting' && (
            <WaitingPhase method={phase.method} total={total} onCancel={cancelWaiting} />
          )}
          {phase.name === 'authorizing' && <AuthorizingPhase total={total} />}
          {phase.name === 'success' && <SuccessPhase order={phase.order} lines={lines} onFinish={onFinish} />}
          {phase.name === 'stock' && <StockPhase conflicts={phase.conflicts} onReview={onStockConflict} />}
          {phase.name === 'failed' && (
            <FailedPhase
              message={phase.message}
              onRetry={() => startPayment(phase.method, { retry: true })}
              onChangeMethod={() => setPhase({ name: 'review' })}
              onBack={onClose}
            />
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function PhaseTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Title className={cn('font-display text-5xl leading-tight font-extrabold text-balance', className)}>
      {children}
    </DialogPrimitive.Title>
  )
}

function ReviewPhase({
  lines,
  total,
  itemCount,
  onBack,
  onSelect,
}: {
  lines: CartLine[]
  total: number
  itemCount: number
  onBack: () => void
  onSelect: (method: PaymentMethod) => void
}) {
  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex h-14 items-center gap-2 rounded-full border-2 px-6 text-lg font-semibold active:bg-muted"
        >
          <ArrowLeft className="size-6" aria-hidden="true" />
          Back to order
        </button>
        <span className="font-display text-2xl font-extrabold tracking-tight">STORE</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-8 px-8 pt-8 pb-10">
        <PhaseTitle>Checkout</PhaseTitle>

        <section aria-label="Order summary" className="flex min-h-0 flex-col rounded-3xl bg-card p-6">
          <ul className="flex min-h-0 flex-col divide-y overflow-y-auto overscroll-contain">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center justify-between gap-4 py-3 text-lg">
                <span>
                  <span className="font-bold tabular-nums">{quantity}x</span> {product.name}
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(product.price * quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t-2 border-foreground pt-4">
            <span className="text-xl font-semibold">Total · {pluralize(itemCount, 'item', 'items')}</span>
            <span className="font-display text-5xl font-extrabold tabular-nums">{formatPrice(total)}</span>
          </div>
        </section>

        <section aria-labelledby="method-title" className="mt-auto flex flex-col gap-4">
          <h3 id="method-title" className="text-2xl font-bold">
            How would you like to pay?
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {METHODS.map(({ id, label, hint, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-foreground/15 bg-card px-4 py-8 transition-transform active:scale-[0.97] active:border-primary active:bg-primary active:text-primary-foreground"
              >
                <Icon className="size-12" strokeWidth={1.75} aria-hidden="true" />
                <span className="font-display text-2xl font-bold">{label}</span>
                <span className="text-base text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-base text-muted-foreground">This kiosk is card only. No cash accepted.</p>
        </section>
      </div>
    </>
  )
}

function WaitingPhase({ method, total, onCancel }: { method: PaymentMethod; total: number; onCancel: () => void }) {
  const info = METHODS.find((m) => m.id === method)!
  const Icon = info.icon
  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-8 px-8 py-16 text-center">
      <p className="text-xl font-semibold text-muted-foreground">
        {info.label} · <span className="text-foreground tabular-nums">{formatPrice(total)}</span>
      </p>

      <div className="flex flex-col items-center gap-10">
        <div className="animate-kiosk-pulse flex size-56 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="size-28" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <PhaseTitle className="max-w-lg">{info.instruction}</PhaseTitle>
        <p role="status" className="text-2xl text-muted-foreground">
          Waiting for payment…
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-xl font-semibold">
          The card reader is right below the screen
          <ArrowDown className="size-12 animate-bounce" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-16 w-full max-w-md rounded-full border-2 text-xl font-semibold active:bg-muted"
        >
          Cancel payment
        </button>
      </div>
    </div>
  )
}

function AuthorizingPhase({ total }: { total: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center" role="status">
      <Loader2 className="size-28 animate-spin text-foreground" strokeWidth={1.5} aria-hidden="true" />
      <PhaseTitle>Processing payment</PhaseTitle>
      <p className="font-display text-4xl font-bold tabular-nums">{formatPrice(total)}</p>
      <p className="max-w-md text-2xl leading-relaxed text-muted-foreground">
        Keep your card in the reader and stay here. This only takes a few seconds.
      </p>
    </div>
  )
}

function SuccessPhase({ order, lines, onFinish }: { order: OrderResult; lines: CartLine[]; onFinish: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(SUCCESS_RETURN_SECONDS)
  const finish = useEffectEvent(onFinish)

  useEffect(() => {
    if (secondsLeft <= 0) {
      finish()
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-8 px-8 py-16 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-28 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-16" strokeWidth={3} aria-hidden="true" />
        </div>
        <PhaseTitle>Payment approved!</PhaseTitle>
      </div>

      <div className="flex w-full max-w-lg flex-col items-center gap-2 rounded-4xl bg-secondary px-8 py-10 text-secondary-foreground">
        <span className="text-xl font-semibold tracking-[0.2em] uppercase">Your order number</span>
        <span className="font-display text-[10rem] leading-none font-extrabold tabular-nums" aria-live="polite">
          {order.orderNumber}
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
          <span className="tabular-nums">{formatPrice(order.total)}</span>
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
  )
}

function StockPhase({ conflicts, onReview }: { conflicts: StockConflict[]; onReview: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center">
      <AlertTriangle className="size-24 text-destructive" strokeWidth={1.75} aria-hidden="true" />
      <PhaseTitle className="max-w-lg">Some items sold out while you were ordering</PhaseTitle>
      <ul className="flex w-full max-w-lg flex-col gap-3 rounded-3xl bg-card p-6 text-left text-xl">
        {conflicts.map((c) => (
          <li key={c.productId} className="flex justify-between gap-4">
            <span className="font-semibold">{c.name}</span>
            <span className="text-muted-foreground">
              {c.available === 0 ? 'Sold out' : `Only ${c.available} left (you asked for ${c.requested})`}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-2xl font-semibold">You have not been charged.</p>
      <button
        type="button"
        onClick={onReview}
        className="h-20 w-full max-w-lg rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground active:scale-[0.98]"
      >
        Review my order
      </button>
    </div>
  )
}

function FailedPhase({
  message,
  onRetry,
  onChangeMethod,
  onBack,
}: {
  message: string
  onRetry: () => void
  onChangeMethod: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center" role="alert">
      <AlertTriangle className="size-24 text-destructive" strokeWidth={1.75} aria-hidden="true" />
      <PhaseTitle>Payment not completed</PhaseTitle>
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
  )
}
