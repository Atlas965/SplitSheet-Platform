import { test, expect } from "@playwright/test";

const enabled = !!process.env.E2E_BASE_URL;

test.describe("smoke", () => {
  test.skip(!enabled, "Set E2E_BASE_URL to run against a live server");

  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
  });

  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("operator workflow (placeholders)", () => {
  test.skip(true, "Requires LOCAL_DEV auth + seeded DB — enable when E2E harness is ready");

  test("login → create project → confirmations → license score", async () => {
    // Outline (Priority 5.3):
    // 1. /api/login (LOCAL_DEV)
    // 2. create client + project with 3 collaborators totaling 100%
    // 3. send confirmations; confirm via public tokens
    // 4. assert project status confirmed + SL-SONG + license score update
  });
});
