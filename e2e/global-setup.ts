import { Client } from "pg";
import { hashPassword } from "better-auth/crypto";
import path from "path";
import dotenv from "dotenv";

export default async function globalSetup() {
  const envPath = path.resolve(__dirname, "../server/.env.test");
  dotenv.config({ path: envPath });

  console.log("Resetting and seeding test database (helpdesk_test)...");

  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:vaishu@localhost:5432/helpdesk_test?schema=public",
  });

  await client.connect();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "password123";
  const hashedPassword = await hashPassword(password);
  const now = new Date();
  const userId = "user_admin_test";

  // Reset test tables
  await client.query('DELETE FROM "reply"');
  await client.query('DELETE FROM "ticket"');
  await client.query('DELETE FROM "session"');
  await client.query('DELETE FROM "account"');
  await client.query('DELETE FROM "user"');

  // Insert seed admin user
  await client.query(
    `
    INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `,
    [userId, "Admin", email, false, "admin", now, now]
  );

  // Insert credential account for admin
  await client.query(
    `
    INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `,
    ["acc_admin_test", userId, "credential", userId, hashedPassword, now, now]
  );

  // Insert AI agent user
  await client.query(
    `
    INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `,
    ["ai-agent", "AI", "ai@helpdesk.local", false, "agent", now, now]
  );

  await client.end();
  console.log("Test database ready.");
}
