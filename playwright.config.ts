import { defineConfig, devices } from "@playwright/test";

/* End-to-end checks against the production build, phone-first.
   Chromium only (it's what CI images ship); the iPhone project emulates
   Safari's viewport, touch and device scale. */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4174", trace: "retain-on-failure", serviceWorkers: "block",
    /* sandboxes with a preinstalled browser point at it; CI uses Playwright's own */
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: "npm run build && npx vite preview --port 4174 --strictPort",
    url: "http://localhost:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "iphone-se", use: { ...devices["iPhone SE"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
  ],
});
