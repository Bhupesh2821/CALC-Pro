import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright-browsers')
export default defineConfig({
  testDir: './e2e', timeout: 90_000, expect: { timeout: 10_000 }, fullyParallel: true, workers: 3,
  forbidOnly: !!process.env.CI, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'evidence/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'allow' },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 30_000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'] } },
  ],
})
