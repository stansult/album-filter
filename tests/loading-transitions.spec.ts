import { test, expect } from './fixtures';
import { openFilter } from './helpers';
import { albumCards, expectAlbums, filterInput, filterPanel, preparePlayground } from './playground-helpers';

test('a query changed during loading applies to the arriving batch', async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await preparePlayground(page, { total: 48, batch: 24, delay: 500 });
  await openFilter(page, context);
  await filterInput(page).fill('Las Vegas');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  await page.getByRole('button', { name: 'Load next batch', exact: true }).click();
  await expect(page.locator('[data-af-loading]')).toBeVisible();
  await filterInput(page).fill('a');
  await expect(albumCards(page)).toHaveCount(24);
  await page.clock.runFor(500);
  await expect(albumCards(page)).toHaveCount(48);
  const titles = await page.locator('[data-af-album-title]').allTextContents();
  const incoming = titles.slice(24);
  expect(incoming.some(title => /a/i.test(title) && !/las vegas/i.test(title))).toBe(true);
  expect(incoming.some(title => !/a/i.test(title))).toBe(true);
  await expectAlbums(page, titles.filter(title => /a/i.test(title)), 48);
  await expect(filterInput(page)).toHaveValue('a');
});

test('clearing during pending hide keeps every arriving card visible', async ({ page, context }) => {
  await preparePlayground(page, { total: 48, batch: 24, delay: 300 });
  await openFilter(page, context);
  await filterInput(page).fill('Las Vegas');
  await expect(page.locator('[data-af-album-card]:not(:visible)')).not.toHaveCount(0);

  await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('[data-af-album-grid]')!;
    const observer = new MutationObserver(() => {
      const pending = grid.querySelector<HTMLElement>(
        '.album-filter-card-pending:not(.album-filter-card-hidden)',
      );
      if (!pending) return;
      observer.disconnect();
      grid.dataset.testClearedPending = String(pending.getClientRects().length > 0);
      // Act within the real 160 ms hide window, without a round trip to the test runner.
      document.querySelector<HTMLButtonElement>('#album-filter-panel .af-input-clear')!.click();
      let hiddenAfterClear = false;
      const check = () => {
        hiddenAfterClear ||= Array.from(grid.querySelectorAll<HTMLElement>('[data-af-album-card]'))
          .some(card => card.getClientRects().length === 0);
      };
      check();
      const guard = new MutationObserver(check);
      guard.observe(grid, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
      // Observe beyond the extension's hide deadline; page.clock does not control isolated-world timers.
      setTimeout(() => {
        check();
        guard.disconnect();
        grid.dataset.testClearResult = hiddenAfterClear ? 'hidden' : 'visible';
      }, 500);
    });
    observer.observe(grid, { attributes: true, childList: true, subtree: true, attributeFilter: ['class'] });
  });

  await page.getByRole('button', { name: 'Load next batch', exact: true }).click();
  const grid = page.locator('[data-af-album-grid]');
  await expect(grid).toHaveAttribute('data-test-cleared-pending', 'true');
  await expect(grid).toHaveAttribute('data-test-clear-result', 'visible');
  await expect(filterInput(page)).toHaveValue('');
  const titles = await page.locator('[data-af-album-title]').allTextContents();
  await expectAlbums(page, titles, 48);
  await expect(page.locator('#album-filter-inline-notice')).toHaveCount(0);
  for (const card of await albumCards(page).all()) await expect(card).toHaveCSS('opacity', '1');
});

test('Auto-load resumes after Stop without duplicate albums or lost filtering', async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await preparePlayground(page, { total: 96, batch: 24, delay: 500 });
  await openFilter(page, context);
  await filterInput(page).fill('a');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const panel = filterPanel(page);
  await panel.getByRole('button', { name: 'Auto-load', exact: true }).click();
  await expect(page.locator('[data-af-loading]')).toBeVisible();
  await panel.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.clock.runFor(1500);
  await expect(albumCards(page)).toHaveCount(48);
  await expect(page.locator('[data-af-loading]')).toBeHidden();
  await expect(panel.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
  const firstTitles = await page.locator('[data-af-album-title]').allTextContents();
  await expectAlbums(page, firstTitles.filter(title => /a/i.test(title)), 48);

  await panel.getByRole('button', { name: 'Auto-load', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
  await expect(page.locator('#auto-load')).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(500);
  await expect(albumCards(page)).toHaveCount(72);
  await page.clock.runFor(1500);
  await expect(albumCards(page)).toHaveCount(96);
  await expect(page.locator('[data-af-end]')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled({ timeout: 8000 });
  await expect(page.locator('#auto-load')).toHaveAttribute('aria-pressed', 'false');
  const ids = await albumCards(page).evaluateAll(cards => cards.map(card => card.getAttribute('data-af-album-id')));
  expect(new Set(ids).size).toBe(96);
  const titles = await page.locator('[data-af-album-title]').allTextContents();
  await expect(page.locator('[data-af-album-card]:visible [data-af-album-title]'))
    .toHaveText(titles.filter(title => /a/i.test(title)));
  await expect(filterInput(page)).toHaveValue('a');
});

test('Generate list replaces albums while preserving filtering and layout', async ({ page, context }) => {
  await preparePlayground(page, { total: 48, batch: 24 });
  await openFilter(page, context);
  await filterInput(page).fill('a');
  const oldCard = await albumCards(page).first().elementHandle();
  const oldTitles = await page.locator('[data-af-album-title]').allTextContents();
  await expectAlbums(page, oldTitles.filter(title => /a/i.test(title)), 24);

  await page.getByLabel('Total albums', { exact: true }).fill('36');
  await page.getByLabel('Batch size', { exact: true }).fill('36');
  await page.getByLabel('Random seed', { exact: true }).fill('replacement-dataset');
  await page.getByRole('button', { name: 'Generate list', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(36);
  expect(await oldCard!.evaluate(card => card.isConnected)).toBe(false);
  await oldCard!.dispose();
  const titles = await page.locator('[data-af-album-title]').allTextContents();
  expect(titles).not.toEqual(oldTitles);
  const matches = titles.filter(title => /a/i.test(title));
  expect(matches.length).toBeGreaterThan(0);
  expect(matches.length).toBeLessThan(36);
  await expectAlbums(page, matches, 36);
  await expect(filterInput(page)).toHaveValue('a');
  await expect(filterPanel(page)).toHaveCount(1);
  await expect(page.locator('#album-filter-inline-notice')).toHaveCount(1);
  await expect(page.locator('#album-filter-inline-notice')).toContainText(`showing ${matches.length} of 36 loaded`);
  await expect(page.locator('[data-af-album-grid]')).toHaveCSS('display', 'grid');
  await expect(page.locator('[data-af-album-grid]')).toHaveAttribute('data-af-compact', 'true');
  for (const card of await page.locator('[data-af-album-card]:visible').all()) {
    await expect(card).toHaveCSS('opacity', '1');
  }
  await expect(page.locator('[data-af-system-card="create"]')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter', exact: true }).click();
  await expectAlbums(page, titles, 36);
});
