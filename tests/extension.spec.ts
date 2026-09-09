import { test, expect } from './fixtures';
import { openFilter } from './helpers';

test('loads the extension background worker', async ({ context }) => {
  let [worker] = context.serviceWorkers();

  if (!worker) {
    worker = await context.waitForEvent('serviceworker');
  }

  expect(worker.url()).toMatch(
    /^chrome-extension:\/\/[a-p]{32}\/background\.js$/,
  );
});

test('opens the filter with its input focused', async ({ page, context }) => {
  await page.goto('http://127.0.0.1:3000');
  await openFilter(page, context);
  const input = page.getByPlaceholder('Filter albums by title...');
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();

});

test('shows matching albums and hides nonmatches', async ({ page, context }) => {
  await page.goto('http://127.0.0.1:3000');
  await openFilter(page, context);

  const matchingAlbum = page.getByRole('link', {
    name: /^Las Vegas, Final\b/,
    includeHidden: true,
  });
  const nonmatchingAlbum = page.getByRole('link', {
    name: /^Orange, 2025\b/,
    includeHidden: true,
  });

  await expect(matchingAlbum).toBeVisible();
  await expect(nonmatchingAlbum).toBeVisible();

  await page.getByPlaceholder('Filter albums by title...').fill('Las Vegas');

  await expect(matchingAlbum).toBeVisible();
  await expect(nonmatchingAlbum).toBeHidden();
});
