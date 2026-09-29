'use client'

import Image from 'next/image'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { maxAllowed } from '../hooks/use-cart'
import { formatPrice, pluralize } from '../lib/format'
import type { Product } from '../lib/kiosk-types'
import { cn } from '../lib/utils'

export interface CartLine {
  product: Product
  quantity: number
}

interface CartPanelProps {
  lines: CartLine[]
  itemCount: number
  total: number
  onIncrement: (product: Product) => void
  onDecrement: (id: string) => void
  onClear: () => void
  onCheckout: () => void
}

export function CartPanel({ lines, itemCount, total, onIncrement, onDecrement, onClear, onCheckout }: CartPanelProps) {
  const empty = lines.length === 0

  return (
    <aside
      aria-labelledby="cart-title"
      className="flex h-full w-80 shrink-0 flex-col border-l-2 bg-card text-card-foreground lg:w-96"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-4">
        <h2 id="cart-title" className="flex items-center gap-2 font-display text-2xl font-bold">
          <ShoppingBag className="size-6" aria-hidden="true" />
          Your order
        </h2>
        {!empty && (
          <span className="text-base font-medium text-muted-foreground">{pluralize(itemCount, 'item', 'items')}</span>
        )}
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted" aria-hidden="true">
            <ShoppingBag className="size-9 text-muted-foreground" />
          </div>
          <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
            Your order is empty. Tap any item to add it.
          </p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto overscroll-contain border-y px-5">
          {lines.map(({ product, quantity }) => {
            const atMax = quantity >= maxAllowed(product)
            return (
              <li key={product.id} className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image src={product.image || '/placeholder.svg'} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base leading-tight font-semibold">{product.name}</span>
                    <span className="text-sm text-muted-foreground">{formatPrice(product.price)} each</span>
                  </div>
                  <span className="text-lg font-bold tabular-nums">{formatPrice(product.price * quantity)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-destructive">{atMax ? `Max ${quantity} per order` : ''}</span>
                  <div className="flex items-center gap-1 rounded-full bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => onDecrement(product.id)}
                      className={cn(
                        'flex size-12 items-center justify-center rounded-full bg-card active:scale-95',
                        quantity === 1 && 'text-destructive',
                      )}
                      aria-label={quantity === 1 ? `Remove ${product.name}` : `Decrease ${product.name}`}
                    >
                      {quantity === 1 ? <Trash2 className="size-5" /> : <Minus className="size-5" />}
                    </button>
                    <span className="w-9 text-center text-xl font-bold tabular-nums" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrement(product)}
                      disabled={atMax}
                      className="flex size-12 items-center justify-center rounded-full bg-card active:scale-95 disabled:opacity-35"
                      aria-label={`Increase ${product.name}`}
                    >
                      <Plus className="size-5" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-col gap-3 px-5 pt-4 pb-6">
        {!empty && (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-lg font-semibold">Total</span>
            <span className="font-display text-3xl font-extrabold tabular-nums">{formatPrice(total)}</span>
          </div>
        )}
        <button
          type="button"
          onClick={onCheckout}
          disabled={empty}
          className="flex h-20 w-full items-center justify-center rounded-full bg-primary px-6 font-display text-2xl font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:bg-muted disabled:text-lg disabled:text-muted-foreground"
        >
          {empty ? 'Add items to pay' : 'Checkout'}
        </button>
        {!empty && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-destructive text-base font-semibold text-destructive active:bg-destructive active:text-destructive-foreground"
          >
            <Trash2 className="size-5" aria-hidden="true" />
            Clear order
          </button>
        )}
      </div>
    </aside>
  )
}
