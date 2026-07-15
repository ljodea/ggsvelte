import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts'],
          retry: process.env.CI === 'true' ? 1 : 0,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: true,
            screenshotDirectory: 'test-results/screenshots',
            trace: {
              mode: 'on-first-retry',
              tracesDir: 'test-results/traces',
              screenshots: true,
              snapshots: false,
            },
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'ssr',
          include: ['tests/ssr/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
