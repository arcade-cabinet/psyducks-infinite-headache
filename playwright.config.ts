import { defineConfig, devices } from "@playwright/test";

// Detect if running in GitHub Copilot environment
const isGitHubCopilot =
  !!process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
  !!process.env.COPILOT_INSTANCE_ID ||
  !!process.env.GITHUB_WORKSPACE;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
    screenshot: "on",
    video: "retain-on-failure",
    // Enable Copilot MCP integration if available
    ...(isGitHubCopilot && {
      contextOptions: {
        recordVideo: {
          dir: "test-results/videos",
          size: { width: 1280, height: 720 },
        },
      },
    }),
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: "pnpm build && pnpm preview -- --port 4321 --strictPort",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
