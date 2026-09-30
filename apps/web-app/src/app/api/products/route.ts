import { listProducts } from "@/lib/kiosk/catalog";
import { withLoggedApiRoute } from "@/lib/api-log";

export const dynamic = "force-dynamic";

export const GET = withLoggedApiRoute("GET", "/api/products", async () => {
  return Response.json(listProducts(), {
    headers: { "Cache-Control": "no-store" },
  });
});
