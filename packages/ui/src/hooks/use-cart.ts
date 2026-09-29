'use client'

import { useReducer } from 'react'
import type { Product } from '../lib/kiosk-types'
import { MAX_QTY_PER_ITEM } from '../lib/kiosk-types'

export type Cart = Record<string, number>

export interface CartAdjustment {
  name: string
  from: number
  to: number
}

type Action =
  | { type: 'add'; product: Product }
  | { type: 'decrement'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'sync'; products: Product[] }

export function maxAllowed(product: Product) {
  return Math.min(product.stock, MAX_QTY_PER_ITEM)
}

function reducer(cart: Cart, action: Action): Cart {
  switch (action.type) {
    case 'add': {
      const current = cart[action.product.id] ?? 0
      if (current >= maxAllowed(action.product)) return cart
      return { ...cart, [action.product.id]: current + 1 }
    }
    case 'decrement': {
      const current = cart[action.id] ?? 0
      if (current <= 1) {
        const { [action.id]: _removed, ...rest } = cart
        return rest
      }
      return { ...cart, [action.id]: current - 1 }
    }
    case 'remove': {
      const { [action.id]: _removed, ...rest } = cart
      return rest
    }
    case 'clear':
      return {}
    case 'sync': {
      const byId = new Map(action.products.map((p) => [p.id, p]))
      let changed = false
      const next: Cart = {}
      for (const [id, qty] of Object.entries(cart)) {
        const product = byId.get(id)
        const allowed = product ? Math.min(qty, maxAllowed(product)) : 0
        if (allowed !== qty) changed = true
        if (allowed > 0) next[id] = allowed
      }
      return changed ? next : cart
    }
  }
}

export function findCartAdjustments(cart: Cart, products: Product[]): CartAdjustment[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const adjustments: CartAdjustment[] = []
  for (const [id, qty] of Object.entries(cart)) {
    const product = byId.get(id)
    if (!product) continue
    const allowed = Math.min(qty, maxAllowed(product))
    if (allowed !== qty) adjustments.push({ name: product.name, from: qty, to: allowed })
  }
  return adjustments
}

export function useCart() {
  return useReducer(reducer, {})
}
