'use client'

import Image from 'next/image'
import { Plus } from 'lucide-react'
import { maxAllowed } from '../hooks/use-cart'
import { formatPrice } from '../lib/format'
import type { Product } from '../lib/kiosk-types'
import { cn } from '../lib/utils'

const LOW_STOCK = 3

interface ProductCardProps {
  product: Product
  inCart: number
  onAdd: (product: Product) => void
}

export function ProductCard({ product, inCart, onAdd }: ProductCardProps) {
  const soldOut = product.stock <= 0
  const reachedMax = !soldOut && inCart >= maxAllowed(product)
  const disabled = soldOut || reachedMax
  const lowStock = !soldOut && product.stock <= LOW_STOCK

  const stockLabel = soldOut ? 'Sold out' : lowStock ? `Only ${product.stock} left` : `${product.stock} in stock`

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={disabled}
      aria-label={
        soldOut
          ? `${product.name}, sold out`
          : `Add ${product.name}, ${formatPrice(product.price)}, ${stockLabel}${inCart ? `, ${inCart} in your order` : ''}`
      }
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-card text-left text-card-foreground transition-transform outline-none focus-visible:ring-4 focus-visible:ring-ring',
        inCart > 0 ? 'border-primary' : 'border-transparent',
        !disabled && 'active:scale-[0.97]',
        soldOut && 'cursor-not-allowed',
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={product.image || '/placeholder.svg'}
          alt=""
          fill
          sizes="(min-width: 1280px) 20vw, 30vw"
          className={cn('object-cover', soldOut && 'opacity-40 grayscale')}
        />

        {soldOut && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-6 bg-destructive py-1.5 text-center font-display text-xl font-extrabold tracking-wide text-destructive-foreground uppercase">
            Sold out
          </span>
        )}

        {inCart > 0 && (
          <span
            key={inCart}
            className="animate-kiosk-bump absolute top-2 left-2 flex h-9 min-w-9 items-center justify-center rounded-full bg-primary px-2.5 text-base font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {inCart}x
          </span>
        )}

        {!soldOut && (
          <span
            className={cn(
              'absolute right-2 bottom-2 rounded-full px-2.5 py-0.5 text-sm font-semibold',
              lowStock ? 'bg-destructive text-destructive-foreground' : 'bg-card/90 text-card-foreground',
            )}
            aria-hidden="true"
          >
            {stockLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <h3 className={cn('text-lg leading-tight font-bold text-balance', soldOut && 'text-muted-foreground')}>
          {product.name}
        </h3>
        <p className="line-clamp-1 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className={cn('font-display text-xl font-bold', soldOut && 'text-muted-foreground line-through')}>
            {formatPrice(product.price)}
          </span>
          {soldOut ? null : reachedMax ? (
            <span className="text-sm font-semibold text-muted-foreground">Limit reached</span>
          ) : (
            <span
              className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              aria-hidden="true"
            >
              <Plus className="size-5" strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
