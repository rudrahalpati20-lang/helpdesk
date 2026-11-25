import "./lib/env";
import path from "path";

import Sentry from "./lib/sentry";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import agentsRouter from "./routes/agents";
import webhooksRouter from "./routes/webhooks";
import repliesRouter from "./routes/replies";
import { startQueue, stopQueue } from "./lib/queue";
import { startGmailListener, stopGmailListener } from "./lib/gmail-listener";

if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = "dev-secret-key-32-chars-long-helpdesk-app-jwt";
  console.warn("Notice: BETTER_AUTH_SECRET was not set in environment, using default development secret.");
}

const app = express();
const port = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        connectSrc: ["'self'", "https://*.ingest.us.sentry.io", "https://*.sentry.io"],
        workerSrc: ["'self'", "blob:"],
        upgradeInsecureRequests:
          process.env.BETTER_AUTH_URL?.startsWith("https://") ? [] : null,
      },
    },
  })
);
app.use(
  cors({
    origin: process.env.TRUSTED_ORIGINS?.split(",") ?? [],
    credentials: true,
  })
);

const isProduction = process.env.NODE_ENV === "production";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  skip: () => !isProduction,
});

// Mount Better Auth handler BEFORE express.json()
// Better Auth parses its own request bodies
// toNodeHandler returns a promise; must be caught for Express 5
app.all("/api/auth/{*any}", authLimiter, (req, res, next) => {
  toNodeHandler(auth)(req, res).catch(next);
});

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/tickets/:ticketId/replies", repliesRouter);
app.use("/api/webhooks", webhooksRouter);

Sentry.setupExpressErrorHandler(app);

// Global JSON error handler for API errors
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ error: message });
});

// In production, serve the built React client as static files
if (isProduction) {
  const clientDist = path.resolve(import.meta.dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // SPA fallback: serve index.html for any non-API route
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

if (!process.env.WEBHOOK_SECRET) {
  console.warn("Warning: WEBHOOK_SECRET is not set. Webhook endpoints will return 500.");
}

async function boot() {
  try {
    await startQueue();
  } catch (queueErr) {
    console.warn("Notice: Job queue (pg-boss) not started (requires PostgreSQL):", queueErr instanceof Error ? queueErr.message : queueErr);
  }

  startGmailListener().catch((err) => {
    console.warn("Notice: Gmail listener not started:", err?.message || err);
  });

  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    try {
      await stopGmailListener();
    } catch {}
    try {
      await stopQueue();
    } catch {}
    try {
      await Sentry.flush(2000);
    } catch {}
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    tags: { mechanism: "unhandledRejection" },
  });
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught exception:", error);
  Sentry.captureException(error, {
    tags: { mechanism: "uncaughtException" },
  });
  try {
    await Sentry.flush(2000);
  } catch {}
  process.exit(1);
});

boot().catch(async (error) => {
  Sentry.captureException(error);
  console.error("Failed to start server:", error);
  try {
    await Sentry.flush(2000);
  } catch {}
  process.exit(1);
});
