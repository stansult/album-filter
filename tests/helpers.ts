import type { BrowserContext, Page } from '@playwright/test';
import { expect } from './fixtures';

export async function toggleFilter(page: Page, context: BrowserContext) {

  let [worker] = context.serviceWorkers();
  if (!worker) {
    worker = await context.waitForEvent('serviceworker');
  }
  const extensionId = new URL(worker.url()).hostname;

  await expect.poll(
    () => worker.evaluate('chrome.action.onClicked.hasListeners()'),
    { message: 'Extension action handler should be ready' },
  ).toBe(true);

  const browser = context.browser();
  if (!browser) throw new Error('Browser connection is unavailable');

  const browserSession = await browser.newBrowserCDPSession();

  try {
    const { targetInfos } = await browserSession.send('Target.getTargets', {
      filter: [{ type: 'tab' }],
    });

    const targetInfo = targetInfos.find(target => target.url === page.url());
    if (!targetInfo) throw new Error('Playground tab target not found');

    await browserSession.send('Extensions.triggerAction', {
      id: extensionId,
      targetId: targetInfo.targetId,
    });
  } finally {
    await browserSession.detach();
  }
}

export async function openFilter(page: Page, context: BrowserContext) {
  await toggleFilter(page, context);
  await expect(page.getByPlaceholder('Filter albums by title...')).toBeVisible();
}
