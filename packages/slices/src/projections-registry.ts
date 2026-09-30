import { CartDetailsProjection } from "./CartDetails/CartDetailsProjection";
import { StockProductsListProjection } from "./CartDetails/stockProductsListProjection";
import { PaymentFailedOrderProjection } from "./PaymentFailedOrder/PaymentFailedOrderProjection";
import { OrderFinishedDetailsProjection } from "./OrderFinishedDetails/OrderFinishedDetailsProjection";

export const PROJECTION_REGISTRY = {
  CartDetails: CartDetailsProjection,
  StockProductsList: StockProductsListProjection,
  PaymentFailedOrder: PaymentFailedOrderProjection,
  OrderFinishedDetails: OrderFinishedDetailsProjection,
};
