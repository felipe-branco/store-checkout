"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppLayout, AppSidebar, Box } from "@em-slices/ui";

const PLAIN_FULL_WIDTH_PREFIXES = ["/maintenance", "/system-error"];

function isPlainFullWidthPath(pathname: string): boolean {
  return PLAIN_FULL_WIDTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function AppLayoutGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  if (isPlainFullWidthPath(pathname)) {
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
        title: "EM Slices Starter",
        description: "Vertical slices com event sourcing",
      }}
    >
      {children}
    </AppLayout>
  );
}
