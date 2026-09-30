'use client'

import { useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Loader2,
  Nfc,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { CartLine } from './cart-panel'
import { formatPrice, pluralize } from '../lib/format'
import type { CreateOrderResponse, PaymentMethod, StockConflict } from '../lib/kiosk-types'
import { useOrderCheckoutStatus } from '../hooks/use-order-checkout-status'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '../lib/utils'

function randomWebhookDelayMs(): number {
  return 300 + Math.floor(Math.random() * 1701)
}

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
  | { name: 'simulator'; method: PaymentMethod }
  | { name: 'authorizing'; method: PaymentMethod }
  | {
      name: 'awaitingOutcome'
      cartId: string
      orderId: string
      method: PaymentMethod
      totalInCents: number
    }
  | { name: 'stock'; conflicts: StockConflict[] }
  | { name: 'failed'; method: PaymentMethod; message: string }

export interface CheckoutSuccessViewProps {
  orderNumber: string
  totalInCents: number
  lines: CartLine[]
  onFinish: () => void
}

export interface CheckoutFailedViewProps {
  message?: string
  onRetry: () => void
  onChangeMethod: () => void
  onBack: () => void
}

interface PaymentDialogProps {
  lines: CartLine[]
  total: number
  onClose: () => void
  onStockConflict: () => void
  onFinish: () => void
  orderStatusEndpoint?: string
  CheckoutSuccessView: React.ComponentType<CheckoutSuccessViewProps>
  CheckoutFailedView: React.ComponentType<CheckoutFailedViewProps>
}

export function PaymentDialog({
  lines: liveLines,
  total: liveTotal,
  onClose,
  onStockConflict,
  onFinish,
  orderStatusEndpoint = '/api/orders/status',
  CheckoutSuccessView,
  CheckoutFailedView,
}: PaymentDialogProps) {
  // Freeze the order the customer is paying for, so background stock refreshes can't change it mid-payment.
  const [{ lines, total }] = useState(() => ({ lines: liveLines, total: liveTotal }))
  const [phase, setPhase] = useState<Phase>({ name: 'review' })
  const idempotencyKey = useRef<string | null>(null)

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)

  async function runCheckoutSimulation(method: PaymentMethod, paymentOutcome: 'success' | 'fail') {
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
    setPhase({ name: 'authorizing', method })

    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          paymentMethod: method,
          idempotencyKey: idempotencyKey.current,
        }),
      })
      const orderData = (await orderRes.json()) as CreateOrderResponse

      if (!orderData.ok) {
        if (orderData.error === 'stock') {
          setPhase({ name: 'stock', conflicts: orderData.conflicts })
          return
        }
        setPhase({
          name: 'failed',
          method,
          message: 'message' in orderData ? orderData.message : 'Could not create order.',
        })
        return
      }

      await new Promise((resolve) => setTimeout(resolve, randomWebhookDelayMs()))

      const webhookRes = await fetch('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_id: orderData.cartId,
          order_id: orderData.orderId,
          items: orderData.webhookItems,
          value_paid: orderData.order.total,
          currency: orderData.currency,
          payment_method: orderData.paymentMethod,
          status: paymentOutcome,
        }),
      })
      const webhookData = (await webhookRes.json()) as {
        success?: boolean
        error?: string
        paymentStatus?: 'success' | 'fail'
      }

      if (!webhookRes.ok || webhookData.success !== true) {
        setPhase({
          name: 'failed',
          method,
          message: webhookData.error ?? 'Payment simulation failed.',
        })
        return
      }

      setPhase({
        name: 'awaitingOutcome',
        cartId: orderData.cartId,
        orderId: orderData.orderId,
        method,
        totalInCents: orderData.order.total,
      })
    } catch {
      setPhase({ name: 'failed', method, message: "We couldn't reach the payment system." })
    }
  }

  function selectPaymentMethod(method: PaymentMethod) {
    setPhase({ name: 'simulator', method })
  }

  const canDismiss = phase.name === 'review' || phase.name === 'simulator'

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && canDismiss && onClose()} disablePointerDismissal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 flex h-dvh w-screen flex-col bg-background text-foreground outline-none duration-200 data-open:animate-in data-open:slide-in-from-bottom-8"
          aria-describedby={undefined}
        >
          {phase.name === 'review' && (
            <ReviewPhase lines={lines} total={total} itemCount={itemCount} onBack={onClose} onSelect={selectPaymentMethod} />
          )}
          {phase.name === 'simulator' && (
            <SimulatorPhase
              method={phase.method}
              total={total}
              onBack={() => setPhase({ name: 'review' })}
              onSimulateSuccess={() => void runCheckoutSimulation(phase.method, 'success')}
              onSimulateFailure={() => void runCheckoutSimulation(phase.method, 'fail')}
            />
          )}
          {phase.name === 'authorizing' && <AuthorizingPhase total={total} />}
          {phase.name === 'awaitingOutcome' && (
            <AwaitingOutcomePhase
              cartId={phase.cartId}
              orderId={phase.orderId}
              totalInCents={phase.totalInCents}
              lines={lines}
              orderStatusEndpoint={orderStatusEndpoint}
              CheckoutSuccessView={CheckoutSuccessView}
              CheckoutFailedView={CheckoutFailedView}
              onFinish={onFinish}
              onRetry={() => {
                idempotencyKey.current = crypto.randomUUID()
                setPhase({ name: 'simulator', method: phase.method })
              }}
              onChangeMethod={() => setPhase({ name: 'review' })}
              onBack={onClose}
            />
          )}
          {phase.name === 'stock' && <StockPhase conflicts={phase.conflicts} onReview={onStockConflict} />}
          {phase.name === 'failed' && (
            <CheckoutFailedView
              message={phase.message}
              onRetry={() => {
                idempotencyKey.current = crypto.randomUUID()
                setPhase({ name: 'simulator', method: phase.method })
              }}
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

function SimulatorPhase({
  method,
  total,
  onBack,
  onSimulateSuccess,
  onSimulateFailure,
}: {
  method: PaymentMethod
  total: number
  onBack: () => void
  onSimulateSuccess: () => void
  onSimulateFailure: () => void
}) {
  const info = METHODS.find((m) => m.id === method)!
  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex h-14 items-center gap-2 rounded-full border-2 px-6 text-lg font-semibold active:bg-muted"
        >
          <ArrowLeft className="size-6" aria-hidden="true" />
          Change method
        </button>
        <span className="font-display text-2xl font-extrabold tracking-tight">STORE</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-8 py-10 text-center">
        <PhaseTitle className="max-w-xl">Simulate payment</PhaseTitle>
        <p className="text-xl text-muted-foreground">
          {info.label} · <span className="text-foreground tabular-nums">{formatPrice(total)}</span>
        </p>
        <p className="max-w-lg text-lg text-muted-foreground">
          Creates the order, waits like an external provider, then posts the payment webhook.
        </p>
        <div className="flex w-full max-w-lg flex-col gap-4">
          <button
            type="button"
            onClick={onSimulateSuccess}
            className="h-20 rounded-full bg-success font-display text-2xl font-bold text-success-foreground active:scale-[0.98]"
          >
            Simulate Payment
          </button>
          <button
            type="button"
            onClick={onSimulateFailure}
            className="h-20 rounded-full bg-destructive font-display text-2xl font-bold text-destructive-foreground active:scale-[0.98]"
          >
            Simulate Payment Failure
          </button>
        </div>
      </div>
    </>
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

function AwaitingOutcomePhase({
  cartId,
  orderId,
  totalInCents,
  lines,
  orderStatusEndpoint,
  CheckoutSuccessView,
  CheckoutFailedView,
  onFinish,
  onRetry,
  onChangeMethod,
  onBack,
}: {
  cartId: string
  orderId: string
  totalInCents: number
  lines: CartLine[]
  orderStatusEndpoint: string
  CheckoutSuccessView: React.ComponentType<CheckoutSuccessViewProps>
  CheckoutFailedView: React.ComponentType<CheckoutFailedViewProps>
  onFinish: () => void
  onRetry: () => void
  onChangeMethod: () => void
  onBack: () => void
}) {
  const { status, orderNumber, error, timedOut } = useOrderCheckoutStatus(
    cartId,
    orderId,
    orderStatusEndpoint,
    true
  )

  if (status === 'payment_succeeded' && orderNumber) {
    return (
      <CheckoutSuccessView
        orderNumber={orderNumber}
        totalInCents={totalInCents}
        lines={lines}
        onFinish={onFinish}
      />
    )
  }

  if (status === 'payment_failed') {
    return (
      <CheckoutFailedView
        message="The payment provider declined this transaction."
        onRetry={onRetry}
        onChangeMethod={onChangeMethod}
        onBack={onBack}
      />
    )
  }

  if (timedOut || error) {
    return (
      <CheckoutFailedView
        message={error ?? 'Payment status unavailable.'}
        onRetry={onRetry}
        onChangeMethod={onChangeMethod}
        onBack={onBack}
      />
    )
  }

  return <AuthorizingPhase total={totalInCents} />
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
