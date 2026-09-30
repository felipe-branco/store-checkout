'use client'

import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { CartPanel, type CartLine } from './cart-panel'
import { ConfirmDialog } from './confirm-dialog'
import { IdleGuard } from './idle-guard'
import { PaymentDialog } from './payment-dialog'
import { ProductCard } from './product-card'
import { ThemeToggle } from '../ThemeToggle'
import type { Cart } from '../hooks/use-cart'
import { useProducts } from '../hooks/use-products'
import { CATEGORIES, type Category, type Product } from '../lib/kiosk-types'
import { cn } from '../lib/utils'

type Confirm = 'clear' | 'exit' | null

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3'

export type ServerCartBinding = {
  cart: Cart
  refresh: () => Promise<Cart>
  onAdd: (product: Product) => Promise<{ ok: true } | { ok: false; reason: 'stock' | 'error'; message?: string }>
  onDecrement: (productId: string) => Promise<{ ok: true } | { ok: false; reason: 'error'; message?: string }>
  onClear: () => Promise<{ ok: true } | { ok: false; reason: 'error'; message?: string }>
}

export function OrderScreen({
  onExit,
  serverCart,
  orderStatusEndpoint = '/api/orders/status',
  CheckoutSuccessView = PlaceholderCheckoutSuccessView,
  CheckoutFailedView = PlaceholderCheckoutFailedView,
}: {
  onExit: () => void
  serverCart: ServerCartBinding
  orderStatusEndpoint?: string
  CheckoutSuccessView?: React.ComponentType<import('./payment-dialog').CheckoutSuccessViewProps>
  CheckoutFailedView?: React.ComponentType<import('./payment-dialog').CheckoutFailedViewProps>
}) {
  const { data: products, error, isLoading, mutate } = useProducts()
  const cart = serverCart.cart
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [announcement, setAnnouncement] = useState('')

  const lines: CartLine[] = useMemo(() => {
    if (!products) return []
    return products
      .filter((p) => (cart[p.id] ?? 0) > 0)
      .map((p) => ({ product: p, quantity: cart[p.id] ?? 0 }))
  }, [products, cart])

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)

  const visible = useMemo(() => {
    if (!products) return []
    const filtered = category === 'all' ? products : products.filter((p) => p.category === category)
    return [...filtered].sort((a, b) => Number(a.stock <= 0) - Number(b.stock <= 0))
  }, [products, category])

  async function handleAdd(product: Product) {
    const current = cart[product.id] ?? 0
    const result = await serverCart.onAdd(product)
    if (!result.ok) {
      if (result.reason === 'stock') {
        setAnnouncement(`${product.name} is no longer available in that quantity.`)
        await mutate()
        await serverCart.refresh()
      } else {
        setAnnouncement(result.message ?? 'Could not add item.')
      }
      return
    }
    setAnnouncement(`${product.name} added. ${current + 1} in your order.`)
  }

  async function handleDecrement(id: string) {
    const product = products?.find((p) => p.id === id)
    const result = await serverCart.onDecrement(id)
    if (!result.ok) {
      setAnnouncement(result.message ?? 'Could not update item.')
      return
    }
    if (product) {
      const next = (cart[id] ?? 0) - 1
      setAnnouncement(next > 0 ? `${product.name}: ${next} in your order.` : `${product.name} removed.`)
    }
  }

  function requestExit() {
    if (itemCount === 0) onExit()
    else setConfirm('exit')
  }

  return (
    <main className="flex h-dvh bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-6 pt-6 pb-4">
          <h1 className="font-display text-4xl font-extrabold tracking-tighter">STORE</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestExit}
              className="flex h-14 items-center gap-2 rounded-full border-2 bg-card px-5 text-lg font-semibold active:bg-muted"
            >
              <RotateCcw className="size-5" aria-hidden="true" />
              Start over
            </button>
            <ThemeToggle />
          </div>
        </header>

        <nav aria-label="Categories" className="px-6 pb-4">
          <ul className="flex gap-2 overflow-x-auto overscroll-contain [scrollbar-width:none]">
            {CATEGORIES.map((c) => {
              const active = c.id === category
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setCategory(c.id)}
                    aria-pressed={active}
                    className={cn(
                      'h-14 rounded-full px-6 text-lg font-semibold transition-colors',
                      active ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-foreground active:bg-border',
                    )}
                  >
                    {c.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section aria-label="Menu" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
          {error && !products ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center" role="alert">
              <p className="font-display text-3xl font-bold text-balance">{"We couldn't load the menu"}</p>
              <p className="text-xl text-muted-foreground">Check the connection or ask a staff member.</p>
              <button
                type="button"
                onClick={() => mutate()}
                className="h-16 rounded-full bg-primary px-10 font-display text-xl font-bold text-primary-foreground"
              >
                Try again
              </button>
            </div>
          ) : isLoading && !products ? (
            <div className={GRID} aria-busy="true" aria-label="Loading menu">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className={GRID}>
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} inCart={cart[product.id] ?? 0} onAdd={handleAdd} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CartPanel
        lines={lines}
        itemCount={itemCount}
        total={total}
        onIncrement={handleAdd}
        onDecrement={handleDecrement}
        onClear={() => setConfirm('clear')}
        onCheckout={() => setPaymentOpen(true)}
      />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <ConfirmDialog
        open={confirm === 'clear'}
        title="Clear your order?"
        description={`All ${itemCount} items will be removed. You can keep browsing afterwards.`}
        cancelLabel="Keep my items"
        confirmLabel="Yes, clear everything"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          void (async () => {
            const result = await serverCart.onClear()
            if (!result.ok) {
              setAnnouncement(result.message ?? 'Could not clear cart.')
              setConfirm(null)
              return
            }
            setConfirm(null)
            setAnnouncement('Order cleared.')
          })()
        }}
      />

      <ConfirmDialog
        open={confirm === 'exit'}
        title="Cancel and start over?"
        description="Your order will be discarded and the screen will go back to the start. You haven't been charged."
        cancelLabel="Continue my order"
        confirmLabel="Discard and start over"
        onCancel={() => setConfirm(null)}
        onConfirm={onExit}
      />

      {paymentOpen && (
        <PaymentDialog
          lines={lines}
          total={total}
          onClose={() => setPaymentOpen(false)}
          onStockConflict={async () => {
            setPaymentOpen(false)
            await mutate()
            await serverCart.refresh()
          }}
          onFinish={onExit}
          orderStatusEndpoint={orderStatusEndpoint}
          CheckoutSuccessView={CheckoutSuccessView}
          CheckoutFailedView={CheckoutFailedView}
        />
      )}

      <IdleGuard active={!paymentOpen} hasItems={itemCount > 0} onTimeout={onExit} />
    </main>
  )
}

function PlaceholderCheckoutSuccessView({
  orderNumber,
  onFinish,
}: import('./payment-dialog').CheckoutSuccessViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <p className="font-display text-4xl font-bold">Payment approved — {orderNumber}</p>
      <button
        type="button"
        onClick={onFinish}
        className="h-16 rounded-full bg-primary px-10 font-display text-xl font-bold text-primary-foreground"
      >
        Done
      </button>
    </div>
  )
}

function PlaceholderCheckoutFailedView({
  message,
  onRetry,
}: import('./payment-dialog').CheckoutFailedViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <p className="text-2xl text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="h-16 rounded-full bg-primary px-10 text-xl font-bold text-primary-foreground">
        Try again
      </button>
    </div>
  )
}
