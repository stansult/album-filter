import { test as base, chromium } from '@playwright/test';
import path from 'node:path';

export const test = base.extend({
  context: async ({ headless, viewport }, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      viewport,
      args: [
        `--disable-extensions-except=${path.resolve(__dirname, '..')}`,
        `--load-extension=${path.resolve(__dirname, '..')}`,
        '--enable-unsafe-extension-debugging',
      ],
    });

    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});

export { expect } from '@playwright/test';
