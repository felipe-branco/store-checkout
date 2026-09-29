import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { getInitialResolvedMode } from "@/lib/theme-server";
import { Providers } from "./providers";
import "./globals.css";
import "@store-checkout/ui/tokens.css";
import "@store-checkout/ui/skeleton.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "optional",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "optional",
});

export const metadata: Metadata = {
  title: "Store Checkout",
  description: "Self-service snack bar checkout with event-sourced orders",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialResolvedMode = await getInitialResolvedMode();

  return (
    <html lang="en-US" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta httpEquiv="Accept-CH" content="sec-ch-prefers-color-scheme" />
      </head>
      <body>
        <Providers initialResolvedMode={initialResolvedMode}>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
