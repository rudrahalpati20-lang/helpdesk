import Sentry from "../lib/sentry";

const dsn = process.env.SENTRY_DSN?.trim();

if (!dsn) {
  console.error("❌ SENTRY_DSN is empty in server/.env. Add your Sentry DSN first.");
  process.exit(1);
}

console.log("Sending test error event to Sentry...");
const eventId = Sentry.captureException(new Error("Sentry Test Error from Helpdesk Server"), {
  tags: { test: "true", source: "test-sentry-script" },
});
console.log("Captured Event ID:", eventId);

const flushed = await Sentry.flush(5000);
if (flushed) {
  console.log("✅ Sentry test error sent and flushed! Check your Sentry Issues dashboard.");
  process.exit(0);
} else {
  console.warn("⚠️ Sentry flush timed out. Verify your SENTRY_DSN and internet connection.");
  process.exit(1);
}
