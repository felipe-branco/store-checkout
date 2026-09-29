import * as Sentry from "@sentry/nextjs";

import {
  browserTracesSampleRate,
  getSentryEnvironment,
  isSentryReportingEnabled,
} from "./src/sentry.common";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: isSentryReportingEnabled(),
  environment: getSentryEnvironment(),

  tracesSampleRate: browserTracesSampleRate,
});
