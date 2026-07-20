import { defineConfig, devices } from "@playwright/test";

/**
 * Priority 5.3 — Playwright E2E.
 * Skips gracefully when E2E_BASE_URL is unset so CI without a live server passes.
 */
const baseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: baseURL ?? "http://127.0.0.1:5000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
