import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 5000
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests/e2e",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    reuseExistingServer: !process.env.CI,
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }
  ]
});
