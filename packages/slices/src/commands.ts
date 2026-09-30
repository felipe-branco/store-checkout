import type { MessageBus, PostgresEventStore } from "@store-checkout/event-store";
import type { ICommandDispatcher } from "@store-checkout/core";
import {
  handleReserveStockItem,
  type ReserveStockItemCommand,
} from "./ReserveStockItem/ReserveStockItemCommand";
import {
  handleDereserveStockItem,
  type DereserveStockItemCommand,
} from "./DereserveStockItem/DereserveStockItemCommand";
import {
  handleSellStockItem,
  type SellStockItemCommand,
} from "./SellStockItem/SellStockItemCommand";

export function registerAllCommandHandlers(
  dispatcher: ICommandDispatcher,
  _messageBus: MessageBus,
  eventStore: PostgresEventStore
): void {
  dispatcher.register<ReserveStockItemCommand>("ReserveStockItem", (cmd) =>
    handleReserveStockItem(cmd, eventStore)
  );
  dispatcher.register<DereserveStockItemCommand>("DereserveStockItem", (cmd) =>
    handleDereserveStockItem(cmd, eventStore)
  );
  dispatcher.register<SellStockItemCommand>("SellStockItem", (cmd) =>
    handleSellStockItem(cmd, eventStore)
  );
}
