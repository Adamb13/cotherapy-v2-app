/**
 * Playwright Configuration for CoTherapy UI Tests
 *
 * Runs automated UI tests against the Vite dev server.
 * Tests verify page loads, navigation, and basic interactions.
 *
 * Usage:
 *   npm run test:ui         — headless (CI-friendly)
 *   npm run test:ui:headed  — visible browser (debugging)
 */

import { defineConfig } from '@playwright/test'

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers — all tests share one Supabase backend
  // and too many concurrent requests can cause data-loading races.
  workers: process.env.CI ? 1 : 2,

  // Reporter to use
  reporter: 'list',

  // Shared settings for all projects
  use: {
    // Base URL for tests — Vite dev server default port
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Timeout for each action
    actionTimeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],

  // Run your local dev server before starting the tests
  // Comment this out if you want to run against an already-running server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
