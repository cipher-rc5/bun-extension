import { defineConfig } from '@playwright/test';
const compatibilityBrowser = Bun.env.COMPAT_CHROMIUM_EXECUTABLE;
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!Bun.env.CI,
  retries: Bun.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: { command: 'bun run e2e/server.ts', url: 'http://127.0.0.1:4173/fixture', reuseExistingServer: false },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    ...(compatibilityBrowser ?
      [{
        name: 'chromium-111',
        testIgnore: '**/extension.spec.ts',
        use: { browserName: 'chromium' as const, launchOptions: { executablePath: compatibilityBrowser, args: ['--headless=new'] } }
      }] :
      [])
  ]
});
