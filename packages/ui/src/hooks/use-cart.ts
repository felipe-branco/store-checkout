import type { Product } from '../lib/kiosk-types'
import { MAX_QTY_PER_ITEM } from '../lib/kiosk-types'

/** Product id → quantity (from `GET /api/cart` kiosk map). */
export type Cart = Record<string, number>

/** Soft UI cap for menu/cart controls; stock enforcement is on the server (`ReserveStockItem`). */
export function maxAllowed(product: Product) {
  return Math.min(product.stock, MAX_QTY_PER_ITEM)
}
