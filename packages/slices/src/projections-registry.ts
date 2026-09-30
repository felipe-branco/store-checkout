import { CartDetailsProjection } from "./CartDetails/CartDetailsProjection";
import { StockProductsListProjection } from "./CartDetails/stockProductsListProjection";

export const PROJECTION_REGISTRY = {
  CartDetails: CartDetailsProjection,
  StockProductsList: StockProductsListProjection,
};
