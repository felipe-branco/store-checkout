export type Category = 'snacks' | 'sandwiches' | 'drinks' | 'sweets'

export interface Product {
  id: string
  name: string
  description: string
  /** Price in cents */
  price: number
  image: string
  category: Category
  stock: number
}

export type PaymentMethod = 'credit' | 'debit' | 'tap'

export interface OrderItemInput {
  productId: string
  quantity: number
}

export interface CreateOrderInput {
  items: OrderItemInput[]
  paymentMethod: PaymentMethod
  idempotencyKey: string
}

export interface StockConflict {
  productId: string
  name: string
  requested: number
  available: number
}

export interface OrderResult {
  orderNumber: string
  total: number
  itemCount: number
}

export type CreateOrderResponse =
  | { ok: true; order: OrderResult }
  | { ok: false; error: 'stock'; conflicts: StockConflict[] }
  | { ok: false; error: 'invalid'; message: string }
  | { ok: false; error: 'failed'; message: string }

export const CATEGORIES: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'sandwiches', label: 'Hot food' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'sweets', label: 'Sweets' },
]

export const MAX_QTY_PER_ITEM = 10
