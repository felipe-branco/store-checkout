import type { EventSubscription, MessageBus, PostgresEventStore, PongoDb } from "@store-checkout/event-store";
import type { ICommandDispatcher } from "@store-checkout/core";
import type { CartCleared, OrderCreated, OrderPaid, StockItemSold } from "@store-checkout/core";
import {
  createCartClearedAutomatorContext,
  type CartClearedAutomatorContext,
  type CartLineCatalogRow,
} from "./CartClearedAutomator/CartClearedAutomatorContext";
import { getClearedCartItemsById } from "./CartClearedAutomator/ClearedCartItemsProjection";
import { handleCartClearedAutomatorAutomation } from "./CartClearedAutomator/CartClearedAutomatorAutomation";
import { handleOrderPaidAutomatorAutomation } from "./OrderPaidAutomator/OrderPaidAutomatorAutomation";
import type { OrderPaidAutomatorContext } from "./OrderPaidAutomator/OrderPaidAutomatorContext";
import { handleSoldItemsOrderAutomatorAutomation } from "./SoldItemsOrderAutomator/SoldItemsOrderAutomatorAutomation";
import { handleWebhookSimulatorAutomatorAutomation } from "./WebhookSimulatorAutomator/WebhookSimulatorAutomatorAutomation";
import type { WebhookSimulatorAutomatorContext } from "./WebhookSimulatorAutomator/WebhookSimulatorAutomatorContext";

export type RegisterAutomationsDeps = {
  dispatcher: ICommandDispatcher;
  eventStore: PostgresEventStore;
  pongoDb: PongoDb;
  paymentWebhookUrl: string;
  resolveCartLineCatalog: (itemId: string) => CartLineCatalogRow | null;
};

async function runAutomation(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`${label} failed:`, error);
  }
}

export function registerAllAutomations(
  messageBus: MessageBus & EventSubscription,
  deps: RegisterAutomationsDeps
): void {
  const sendCommand: OrderPaidAutomatorContext["sendCommand"] = (command, correlationId) =>
    deps.dispatcher.sendCommand(command, correlationId);

  const orderContext: OrderPaidAutomatorContext = {
    sendCommand,
    eventStore: deps.eventStore,
  };

  const webhookContext: WebhookSimulatorAutomatorContext = {
    paymentWebhookUrl: deps.paymentWebhookUrl,
  };

  const cartClearedContext: CartClearedAutomatorContext = createCartClearedAutomatorContext({
    pongoDb: deps.pongoDb,
    getClearedCartItemsById,
    resolveCartLineCatalog: deps.resolveCartLineCatalog,
  });

  messageBus.subscribe(async (event: CartCleared) => {
    await runAutomation("CartClearedAutomator", () =>
      handleCartClearedAutomatorAutomation(event, cartClearedContext, deps.dispatcher)
    );
  }, "CartCleared");

  messageBus.subscribe(async (event: OrderCreated) => {
    await runAutomation("WebhookSimulatorAutomator", () =>
      handleWebhookSimulatorAutomatorAutomation(event, webhookContext)
    );
  }, "OrderCreated");

  messageBus.subscribe(async (event: OrderPaid) => {
    await runAutomation("OrderPaidAutomator", () =>
      handleOrderPaidAutomatorAutomation(event, orderContext)
    );
  }, "OrderPaid");

  messageBus.subscribe(async (event: StockItemSold) => {
    await runAutomation("SoldItemsOrderAutomator", () =>
      handleSoldItemsOrderAutomatorAutomation(event, orderContext)
    );
  }, "StockItemSold");
}
