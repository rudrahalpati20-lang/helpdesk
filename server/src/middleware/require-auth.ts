import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import Sentry from "../lib/sentry";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if ((session.user as any)?.deletedAt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  Sentry.setUser({
    id: session.user.id,
    email: session.user.email,
    username: session.user.name,
  });

  (req as any).user = session.user;
  (req as any).session = session.session;
  next();
};
