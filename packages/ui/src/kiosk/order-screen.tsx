'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEffectEvent } from '../hooks/use-effect-event'
import { Info, RotateCcw, X } from 'lucide-react'
import { CartPanel, type CartLine } from './cart-panel'
import { ConfirmDialog } from './confirm-dialog'
import { IdleGuard } from './idle-guard'
import { PaymentDialog } from './payment-dialog'
import { ProductCard } from './product-card'
import { ThemeToggle } from '../ThemeToggle'
import {
  findCartAdjustments,
  maxAllowed,
  useCart,
  type Cart,
  type CartAdjustment,
} from '../hooks/use-cart'
import { useProducts } from '../hooks/use-products'
import { CATEGORIES, type Category, type Product } from '../lib/kiosk-types'
import { cn } from '../lib/utils'

type Confirm = 'clear' | 'exit' | null

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3'

export type ServerCartBinding = {
  cart: Cart
  onAdd: (product: Product) => Promise<void>
  onDecrement: (productId: string) => Promise<void>
  onClear: () => Promise<void>
}

export function OrderScreen({
  onExit,
  serverCart,
}: {
  onExit: () => void
  serverCart?: ServerCartBinding
}) {
  const { data: products, error, isLoading, mutate } = useProducts()
  const [localCart, dispatch] = useCart()
  const cart = serverCart?.cart ?? localCart
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [adjustments, setAdjustments] = useState<CartAdjustment[]>([])
  const [announcement, setAnnouncement] = useState('')

  const syncCart = useEffectEvent((list: Product[]) => {
    if (paymentOpen || serverCart) return
    const changes = findCartAdjustments(cart, list)
    if (changes.length === 0) return
    dispatch({ type: 'sync', products: list })
    setAdjustments(changes)
  })

  useEffect(() => {
    if (products) syncCart(products)
  }, [products])

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
    // Available items first, sold out at the end so they never block the good stuff.
    return [...filtered].sort((a, b) => Number(a.stock <= 0) - Number(b.stock <= 0))
  }, [products, category])

  async function handleAdd(product: Product) {
    const current = cart[product.id] ?? 0
    if (product.stock <= 0 || current >= maxAllowed(product)) return
    if (serverCart) {
      await serverCart.onAdd(product)
    } else {
      dispatch({ type: 'add', product })
    }
    setAnnouncement(`${product.name} added. ${current + 1} in your order.`)
  }

  async function handleDecrement(id: string) {
    const product = products?.find((p) => p.id === id)
    if (serverCart) {
      await serverCart.onDecrement(id)
    } else {
      dispatch({ type: 'decrement', id })
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

        {adjustments.length > 0 && (
          <div
            role="status"
            className="mx-6 mb-4 flex items-start gap-4 rounded-2xl bg-secondary p-4 text-secondary-foreground"
          >
            <Info className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-lg font-bold">We updated your order because stock changed.</p>
              <ul className="text-base leading-relaxed">
                {adjustments.map((a) => (
                  <li key={a.name}>
                    {a.name}: {a.to === 0 ? 'sold out and was removed' : `changed from ${a.from} to ${a.to}`}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setAdjustments([])}
              className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-foreground/10"
              aria-label="Dismiss notice"
            >
              <X className="size-6" />
            </button>
          </div>
        )}

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
        onCheckout={() => {
          setAdjustments([])
          setPaymentOpen(true)
        }}
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
            if (serverCart) {
              await serverCart.onClear()
            } else {
              dispatch({ type: 'clear' })
            }
            setAdjustments([])
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
          }}
          onFinish={onExit}
        />
      )}

      <IdleGuard active={!paymentOpen} hasItems={itemCount > 0} onTimeout={onExit} />
    </main>
  )
}
