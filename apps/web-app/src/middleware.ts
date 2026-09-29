import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isMaintenanceEnabled(): boolean {
  const v = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname === "/maintenance" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/health")
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isMaintenanceEnabled() && !isMaintenanceExempt(pathname)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "MAINTENANCE" },
        { status: 503, headers: { "Retry-After": "86400" } }
      );
    }
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
