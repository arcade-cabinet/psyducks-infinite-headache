import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

/** GPU-accelerated WebGL args for headless Chrome */
const GPU_ARGS = [
  "--no-sandbox",
  "--use-angle=gl", // GPU-accelerated WebGL in headless
  "--enable-webgl",
  "--ignore-gpu-blocklist",
  "--mute-audio",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  // Window position off-screen as fallback (ignored in true headless)
  "--window-position=9999,9999",
];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [
    ["html", { open: isCI ? "never" : "on-failure" }],
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  timeout: 90000,
  use: {
    baseURL: "http://localhost:4321/psyducks-infinite-headache/",
    trace: isCI ? "on-first-retry" : "on",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "on",
    actionTimeout: 10000,
    navigationTimeout: 60000,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  expect: {
    timeout: 30000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: "disabled",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        channel: "chrome",
        headless: true,
        launchOptions: {
          slowMo: isCI ? 0 : 50,
          args: GPU_ARGS,
        },
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm exec astro preview --port 4321 --host",
    url: "http://localhost:4321/psyducks-infinite-headache/",
    reuseExistingServer: !isCI,
    timeout: 120000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
