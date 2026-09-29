import { listProducts } from "@/lib/kiosk/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(listProducts(), {
    headers: { "Cache-Control": "no-store" },
  });
}
