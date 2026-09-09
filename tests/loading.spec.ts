import { test, expect } from './fixtures';
import { openFilter } from './helpers';
import {
  albumCards, expectAlbums, filterInput, filterPanel, preparePlayground,
} from './playground-helpers';

test('new batches receive the current filter without Rescan or Auto-load', async ({ page, context }) => {
  await preparePlayground(page, { total: 48, batch: 24 });
  await openFilter(page, context);
  const firstTitles = await page.locator('[data-af-album-title]').allTextContents();
  await filterInput(page).fill('a');
  await expectAlbums(page, firstTitles.filter(title => /a/i.test(title)), 24);

  await page.getByRole('button', { name: 'Load next batch', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(48);
  const allTitles = await page.locator('[data-af-album-title]').allTextContents();
  const newTitles = allTitles.slice(24);
  expect(newTitles.some(title => /a/i.test(title))).toBe(true);
  expect(newTitles.some(title => !/a/i.test(title))).toBe(true);
  await expectAlbums(page, allTitles.filter(title => /a/i.test(title)), 48);
  await expect(filterPanel(page).getByRole('button', { name: 'Stop', exact: true }))
    .toBeDisabled();
  await expect(page.locator('#auto-load')).toHaveAttribute('aria-pressed', 'false');
});

test('typing and Rescan do not start extension-driven loading', async ({ page, context }) => {
  await page.clock.install();
  await preparePlayground(page, { total: 48, batch: 24 });
  await openFilter(page, context);
  await filterInput(page).fill('Las Vegas');
  await filterPanel(page).getByRole('button', { name: 'Rescan', exact: true }).click();

  // Advance the playground timers rather than sleep to test absence of new loads.
  await page.clock.runFor(4000);
  await expect(albumCards(page)).toHaveCount(24);
  await expect(page.locator('#auto-load')).toHaveAttribute('aria-pressed', 'false');
  await expect(filterPanel(page).getByRole('button', { name: 'Auto-load', exact: true }))
    .toHaveAttribute('aria-pressed', 'false');
  await expect(filterPanel(page).getByRole('button', { name: 'Stop', exact: true }))
    .toBeDisabled();
});

test('Auto-load filters all batches and stops at the explicit end marker', async ({ page, context }) => {
  await preparePlayground(page, { total: 72, batch: 24, delay: 300 });
  await openFilter(page, context);
  await filterInput(page).fill('Las Vegas');
  const panel = filterPanel(page);
  const stop = panel.getByRole('button', { name: 'Stop', exact: true });
  const warning = panel.getByText('Warning: Auto-load may scroll/jump the page to trigger more loading.');
  await expect(stop).toBeDisabled();
  await expect(warning).toBeHidden();

  await panel.getByRole('button', { name: 'Auto-load', exact: true }).click();
  await expect(stop).toBeEnabled();
  await expect(panel.getByRole('button', { name: 'Auto-loading', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(warning).toBeVisible();
  await expect(albumCards(page)).toHaveCount(72);
  await expect(page.locator('[data-af-end]')).toBeVisible();
  await expect(stop).toBeDisabled({ timeout: 8000 });
  await expect(warning).toBeHidden();
  await expect(panel.getByRole('button', { name: 'Auto-load', exact: true }))
    .toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#auto-load')).toHaveAttribute('aria-pressed', 'false');
  const titles = await page.locator('[data-af-album-title]').allTextContents();
  const matches = titles.filter(title => /las/i.test(title) && /vegas/i.test(title));
  expect(matches.length).toBeGreaterThan(0);
  // Completion can replace the counter text, so check cards directly here.
  await expect(page.locator('[data-af-album-card]:visible [data-af-album-title]'))
    .toHaveText(matches);
});

for (const action of ['Stop', 'close panel']) {
  test(`${action} stops scheduling batches while allowing the in-flight batch to finish`, async ({ page, context }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await preparePlayground(page, { total: 96, batch: 24, delay: 500 });
    await openFilter(page, context);
    await filterInput(page).fill('Las Vegas');
    await expect(filterPanel(page).locator('.af-status')).toContainText('Showing:');
    await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));

    await filterPanel(page).getByRole('button', { name: 'Auto-load', exact: true }).click();
    await expect(page.locator('[data-af-loading]')).toBeVisible();
    await expect(albumCards(page)).toHaveCount(24);
    if (action === 'Stop') {
      await filterPanel(page).getByRole('button', { name: 'Stop', exact: true }).click();
      await expect(filterPanel(page).getByRole('button', { name: 'Stop', exact: true }))
        .toBeDisabled();
    } else {
      await page.getByRole('button', { name: 'Close panel', exact: true }).click();
      await expect(filterPanel(page)).toHaveCount(0);
    }

    await expect(page.locator('#auto-load')).toHaveAttribute('aria-pressed', 'false');
    await page.clock.runFor(2000);
    await expect(page.locator('[data-af-loading]')).toBeHidden();
    await expect(albumCards(page)).toHaveCount(48);
    await page.clock.runFor(3000);
    await expect(albumCards(page)).toHaveCount(48);

    if (action === 'close panel') {
      await expect(page.locator('[data-af-album-card]:visible')).toHaveCount(48);
    } else {
      const titles = await page.locator('[data-af-album-title]').allTextContents();
      await expectAlbums(page, titles.filter(title => /las/i.test(title) && /vegas/i.test(title)), 48);
    }
  });
}
