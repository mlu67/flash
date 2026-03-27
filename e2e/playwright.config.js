import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'cd ../server && npm run dev',
      port: 3001,
      reuseExistingServer: true,
      timeout: 10_000,
    },
    {
      command: 'cd ../client && npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 10_000,
    },
  ],
});
