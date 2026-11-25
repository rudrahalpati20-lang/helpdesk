import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

// Load server/.env.test so WEBHOOK_SECRET, BETTER_AUTH_URL, etc. are available
// to the Playwright process (e.g. for use in test files via process.env)
const envTestPath = path.resolve(__dirname, "server", ".env.test");
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
}

// Resolve the bun binary — on Windows it lives in ~/.bun/bin/bun.exe
const BUN = process.platform === "win32"
  ? path.join(process.env.USERPROFILE ?? "C:/Users/LOQ", ".bun", "bin", "bun.exe")
  : "bun";

export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  outputDir: "./e2e/test-results",
  reporter: [["html", { outputFolder: "./e2e/playwright-report" }]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // Run the backend server against the test database (port 3001)
      command: `"${BUN}" run --env-file=.env.test src/index.ts`,
      cwd: path.resolve(__dirname, "server"),
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: "test",
        PORT: process.env.PORT ?? "3001",
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
        TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS ?? "http://localhost:5174",
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? "",
      },
    },
    {
      // Run the Vite client in test mode (picks up client/.env.test for VITE_API_URL)
      command: "npx vite --port 5174 --mode test",
      cwd: path.resolve(__dirname, "client"),
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        VITE_API_URL: "http://localhost:3001",
      },
    },
  ],
});
