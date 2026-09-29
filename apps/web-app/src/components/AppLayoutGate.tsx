"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppLayout, AppSidebar, Box } from "@store-checkout/ui";

const KIOSK_PATH = "/";
const CENTERED_FULL_WIDTH_PREFIXES = ["/maintenance", "/system-error"];

function isKioskPath(pathname: string): boolean {
  return pathname === KIOSK_PATH;
}

function isCenteredFullWidthPath(pathname: string): boolean {
  return CENTERED_FULL_WIDTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function AppLayoutGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  if (isKioskPath(pathname)) {
    return <>{children}</>;
  }

  if (isCenteredFullWidthPath(pathname)) {
    return (
      <Box className="ui-min-h-screen-center" style={{ minHeight: "100vh", width: "100%" }}>
        {children}
      </Box>
    );
  }

  return (
    <AppLayout
      sidebar={<AppSidebar />}
      header={{
        title: "Store Checkout",
        description: "Event-sourced self-service checkout",
      }}
    >
      {children}
    </AppLayout>
  );
}
