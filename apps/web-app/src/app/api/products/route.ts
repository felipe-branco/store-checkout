import { initializeEventStore, getPongoDb } from "@/lib/eventStore";
import { withLoggedApiRoute } from "@/lib/api-log";
import { handleStockProductsListRoute } from "@store-checkout/slices/server";
import {
  getDefaultStockId,
  getStockProductsListCatalogRows,
} from "@/lib/kiosk/stock-products-list";

export const dynamic = "force-dynamic";

export const GET = withLoggedApiRoute("GET", "/api/products", async () => {
  await initializeEventStore();
  const db = getPongoDb();
  const catalog = getStockProductsListCatalogRows();
  const stockId = getDefaultStockId();

  const result = await handleStockProductsListRoute({ stockId, catalog }, db);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json(result.data, {
    headers: { "Cache-Control": "no-store" },
  });
});
