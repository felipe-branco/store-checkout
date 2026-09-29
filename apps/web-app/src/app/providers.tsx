"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@em-slices/ui";
import { AppLayoutGate } from "@/components/AppLayoutGate";
import type { ResolvedThemeMode } from "@/lib/theme-server";

export function Providers({
  children,
  initialResolvedMode,
}: {
  children: ReactNode;
  initialResolvedMode: ResolvedThemeMode;
}) {
  return (
    <ThemeProvider initialResolvedMode={initialResolvedMode}>
      <AppLayoutGate>{children}</AppLayoutGate>
    </ThemeProvider>
  );
}
