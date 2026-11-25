---
name: better-auth
description: >-
  Use this skill to configure and set up Better Auth in Node.js, Express, or
  Bun backends with email/password authentication and database sessions.
  Follows the bare minimum, zero-bloat, no-UI specification.
---

# Better Auth Skill (Bare Minimum Setup)

This skill provides step-by-step instructions and reference code for setting up
**Better Auth** with email & password authentication and database sessions in an
Express / Node / Bun backend without any frontend UI.

---

## 1. Prerequisites & Dependencies

In your backend `package.json`:

```json
{
  "dependencies": {
    "better-auth": "^1.4.18",
    "express": "^5.0.0"
  }
}
```

If using Prisma as the database adapter:
- `@prisma/client`
- `better-auth/adapters/prisma`

---

## 2. Database Schema (Prisma)

Better Auth with database sessions requires 4 core tables: `user`, `session`, `account`, and `verification`.

```prisma
model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]

  @@map("user")
}

model Session {
  id        String   @id @default(uuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id @default(uuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String    @id @default(uuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt

  @@map("verification")
}
```

---

## 3. Server Configuration (`src/lib/auth.ts`)

Bare minimum initialization with database sessions and email/password:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../db";

export const auth = betterAuth({
  basePath: "/api/auth",
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "sqlite", "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // Refresh every 1 day
  },
});
```

---

## 4. Express Integration (`src/index.ts`)

Mount the handler **before** `express.json()` because Better Auth handles its own body parsing:

```typescript
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

const app = express();

// Mount Better Auth handler on /api/auth/*
app.all("/api/auth/*", (req, res) => {
  return toNodeHandler(auth)(req, res);
});

// Middleware after auth handler
app.use(express.json());
```

---

## 5. Protected Route Middleware (`src/middleware/require-auth.ts`)

Protect any API endpoint using Better Auth database session lookup:

```typescript
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import type { Request, Response, NextFunction } from "express";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Attach session & user to request
  (req as any).user = session.user;
  (req as any).session = session.session;
  next();
}
```

---

## 6. Endpoints Available (No UI required)

Better Auth automatically provides standard REST endpoints under `/api/auth/*`:

- `POST /api/auth/sign-up/email`: `{ email, password, name }`
- `POST /api/auth/sign-in/email`: `{ email, password }`
- `POST /api/auth/sign-out`: `{}`
- `GET  /api/auth/get-session`: Returns active user & database session token from cookie / bearer
