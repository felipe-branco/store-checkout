import type { PongoDb } from "@store-checkout/event-store";
import {
  getCartDetailsById,
  type CartDetailsReadModel,
} from "./CartDetailsProjection";
import {
  getStockAvailabilityByStockId,
  type StockAvailabilityReadModel,
} from "./stockProductsListProjection";
import {
  buildStockProductsList,
  type StockProductsListCatalogRow,
} from "./buildStockProductsList";
import type { Product } from "@store-checkout/ui";
import { getPaymentFailedOrderById } from "../PaymentFailedOrder/PaymentFailedOrderProjection";
import { getOrderFinishedDetailsById } from "../OrderFinishedDetails/OrderFinishedDetailsProjection";
import { orderDisplayNumber } from "../CreateOrder/routes";
import type { PaymentFailedOrderReadModel } from "../PaymentFailedOrder/PaymentFailedOrderProjection";
import type { OrderFinishedDetailsReadModel } from "../OrderFinishedDetails/OrderFinishedDetailsProjection";

export interface CartDetailsRouteParams {
  cartId: string;
}

export interface CartDetailsRouteResponse {
  success: true;
  data: CartDetailsReadModel | null;
}

export interface CartDetailsRouteError {
  success: false;
  error: string;
}

export type CartDetailsRouteResult = CartDetailsRouteResponse | CartDetailsRouteError;

export async function handleCartDetailsRoute(
  params: CartDetailsRouteParams,
  db: PongoDb
): Promise<CartDetailsRouteResult> {
  try {
    const data = await getCartDetailsById(db, params.cartId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export interface StockProductsListRouteParams {
  stockId: string;
  catalog: StockProductsListCatalogRow[];
}

export interface StockProductsListRouteResponse {
  success: true;
  data: Product[];
}

export interface StockProductsListRouteError {
  success: false;
  error: string;
}

export type StockProductsListRouteResult =
  | StockProductsListRouteResponse
  | StockProductsListRouteError;

export async function handleStockProductsListRoute(
  params: StockProductsListRouteParams,
  db: PongoDb
): Promise<StockProductsListRouteResult> {
  try {
    const availabilityDoc = await getStockAvailabilityByStockId(db, params.stockId);
    const availability: StockAvailabilityReadModel = availabilityDoc ?? {
      stock_id: params.stockId,
      reservedByItem: {},
      soldByItem: {},
    };
    const data = buildStockProductsList(params.catalog, {
      reservedByItem: availability.reservedByItem,
      soldByItem: availability.soldByItem,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function catalogRowsToKioskCart(
  readModel: CartDetailsReadModel | null,
  catalog: StockProductsListCatalogRow[]
): Record<string, number> {
  if (!readModel) {
    return {};
  }
  const productIdByItemId = new Map(catalog.map((row) => [row.itemId, row.id]));
  const cart: Record<string, number> = {};
  for (const line of readModel.items) {
    const productId = productIdByItemId.get(line.item_id);
    if (productId) {
      cart[productId] = line.quantity;
    }
  }
  return cart;
}

export type OrderCheckoutStatus = "pending" | "payment_failed" | "payment_succeeded";

export interface OrderCheckoutStatusRouteParams {
  cartId: string;
  orderId: string;
}

export interface OrderCheckoutStatusRouteResponse {
  success: true;
  status: OrderCheckoutStatus;
  orderNumber: string;
  paymentFailed: PaymentFailedOrderReadModel | null;
  orderFinished: OrderFinishedDetailsReadModel | null;
}

export interface OrderCheckoutStatusRouteError {
  success: false;
  error: string;
}

export type OrderCheckoutStatusRouteResult =
  | OrderCheckoutStatusRouteResponse
  | OrderCheckoutStatusRouteError;

export async function handleOrderCheckoutStatusRoute(
  params: OrderCheckoutStatusRouteParams,
  db: PongoDb
): Promise<OrderCheckoutStatusRouteResult> {
  try {
    const { cartId, orderId } = params;
    const orderNumber = orderDisplayNumber(orderId);

    const [paymentFailed, orderFinished] = await Promise.all([
      getPaymentFailedOrderById(db, cartId),
      getOrderFinishedDetailsById(db, cartId),
    ]);

    const failedForOrder =
      paymentFailed && paymentFailed.order_id === orderId ? paymentFailed : null;

    const finishedForOrder =
      orderFinished && orderFinished.order_id === orderId ? orderFinished : null;

    const paidOrFinished =
      finishedForOrder &&
      (finishedForOrder.paid_at !== null || finishedForOrder.finished_at !== null);

    let status: OrderCheckoutStatus = "pending";
    if (failedForOrder) {
      status = "payment_failed";
    } else if (paidOrFinished) {
      status = "payment_succeeded";
    }

    return {
      success: true,
      status,
      orderNumber,
      paymentFailed: failedForOrder,
      orderFinished: paidOrFinished ? finishedForOrder : null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
