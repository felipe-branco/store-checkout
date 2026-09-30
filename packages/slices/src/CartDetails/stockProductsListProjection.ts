import { pongoSingleStreamProjection } from "@store-checkout/event-store";
import type { ReadEvent, PostgresReadEventMetadata, PongoDb } from "@store-checkout/event-store";
import type {
  StockItemReserved,
  StockItemDereserved,
  StockItemSold,
} from "@store-checkout/core";

type StockProductsListEvent =
  | StockItemReserved
  | StockItemDereserved
  | StockItemSold;

export type StockAvailabilityReadModel = {
  stock_id: string;
  reservedByItem: Record<string, number>;
  soldByItem: Record<string, number>;
};

const emptyDoc = (stock_id: string): StockAvailabilityReadModel => ({
  stock_id,
  reservedByItem: {},
  soldByItem: {},
});

export const evolveStockProductsList = (
  document: StockAvailabilityReadModel | null,
  event: ReadEvent<StockProductsListEvent, PostgresReadEventMetadata>
): StockAvailabilityReadModel | null => {
  const stock_id = event.data.stock_id;
  const base = document ?? emptyDoc(stock_id);

  switch (event.type) {
    case "StockItemReserved": {
      const { item_id, quantity } = event.data;
      return {
        ...base,
        stock_id,
        reservedByItem: {
          ...base.reservedByItem,
          [item_id]: (base.reservedByItem[item_id] ?? 0) + quantity,
        },
      };
    }
    case "StockItemDereserved": {
      const { item_id, quantity } = event.data;
      return {
        ...base,
        stock_id,
        reservedByItem: {
          ...base.reservedByItem,
          [item_id]: (base.reservedByItem[item_id] ?? 0) - quantity,
        },
      };
    }
    case "StockItemSold": {
      const { item_id, quantity } = event.data;
      return {
        ...base,
        stock_id,
        soldByItem: {
          ...base.soldByItem,
          [item_id]: (base.soldByItem[item_id] ?? 0) + quantity,
        },
      };
    }
    default:
      return document;
  }
};

const collectionName = "stock-products-list-collection";

export const StockProductsListProjection = pongoSingleStreamProjection({
  canHandle: ["StockItemReserved", "StockItemDereserved", "StockItemSold"],
  collectionName,
  evolve: evolveStockProductsList,
});

export const getStockAvailabilityByStockId = (
  db: PongoDb,
  stockId: string
): Promise<StockAvailabilityReadModel | null> => {
  return db.collection<StockAvailabilityReadModel>(collectionName).findOne({ _id: stockId });
};
