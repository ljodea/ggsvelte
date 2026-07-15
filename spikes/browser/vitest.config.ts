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
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: true,
            screenshotDirectory: 'test-results/screenshots',
            trace: { mode: 'retain-on-failure', tracesDir: 'test-results/traces' },
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
