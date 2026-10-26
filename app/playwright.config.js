import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: true },
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
