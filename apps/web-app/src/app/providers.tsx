"use client";

import type { ReactNode } from "react";
import { CheckoutThemeProvider } from "@store-checkout/ui";
import { AppLayoutGate } from "@/components/AppLayoutGate";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CheckoutThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AppLayoutGate>{children}</AppLayoutGate>
    </CheckoutThemeProvider>
  );
}
