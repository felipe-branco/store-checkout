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
import {
  handleCreateCart,
  type CreateCartCommand,
} from "./CreateCart/CreateCartCommand";
import {
  handleAddItemToCart,
  type AddItemToCartCommand,
} from "./AddItemToCart/AddItemToCartCommand";
import {
  handleRemoveItemFromCart,
  type RemoveItemFromCartCommand,
} from "./RemoveItemFromCart/RemoveItemFromCartCommand";
import {
  handleClearCart,
  type ClearCartCommand,
} from "./ClearCart/ClearCartCommand";

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
  dispatcher.register<CreateCartCommand>("CreateCart", (cmd) =>
    handleCreateCart(cmd, eventStore)
  );
  dispatcher.register<AddItemToCartCommand>("AddItemToCart", (cmd) =>
    handleAddItemToCart(cmd, eventStore)
  );
  dispatcher.register<RemoveItemFromCartCommand>("RemoveItemFromCart", (cmd) =>
    handleRemoveItemFromCart(cmd, eventStore)
  );
  dispatcher.register<ClearCartCommand>("ClearCart", (cmd) =>
    handleClearCart(cmd, eventStore)
  );
}
