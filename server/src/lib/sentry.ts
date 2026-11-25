import "./env";
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN?.trim();
const environment = process.env.SENTRY_ENVIRONMENT || "development";

Sentry.init({
  dsn,
  environment,
  enabled: !!dsn,
  tracesSampleRate: 1.0,
});

if (dsn) {
  console.log(`[Sentry] Error logging enabled (env: ${environment})`);
} else {
  console.log("[Sentry] SENTRY_DSN not set. Server error logging to Sentry is disabled.");
}

export default Sentry;
