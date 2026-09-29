import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_ENV:
      process.env.VERCEL_ENV ?? (process.env.NODE_ENV === "development" ? "development" : ""),
  },
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: [
    "@store-checkout/ui",
    "@store-checkout/slices",
    "@store-checkout/event-store",
    "@store-checkout/core",
  ],
  serverExternalPackages: [
    "pg",
    "cpu-features",
    "import-in-the-middle",
    "require-in-the-middle",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization, X-Correlation-ID",
          },
        ],
      },
    ];
  },
};

const isVercelProduction = process.env.VERCEL_ENV === "production";

export default withSentryConfig(nextConfig, {
  org: isVercelProduction ? process.env.SENTRY_ORG : undefined,
  project: isVercelProduction ? process.env.SENTRY_PROJECT : undefined,
  authToken: isVercelProduction ? process.env.SENTRY_AUTH_TOKEN : undefined,
  silent: !process.env.CI,
});
