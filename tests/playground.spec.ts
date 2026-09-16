import { test, expect, type Page } from '@playwright/test';
import { albumCards, preparePlayground } from './playground-helpers';

const titleNodes = (page: Page) => page.locator('[data-af-album-title]');

async function columnCount(page: Page) {
  return page.locator('[data-af-album-grid]').evaluate(element => (
    getComputedStyle(element).gridTemplateColumns.split(' ').length
  ));
}

test('opens the album playground without the extension fixture', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000');

  await expect(
    page.getByRole('heading', {
      name: 'Album Filter Playground',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('#album-filter-panel')).toHaveCount(0);
});

test('generates the configured initial batch with stable album DOM markers', async ({ page }) => {
  await preparePlayground(page, { total: 50, batch: 12 });

  await expect(albumCards(page)).toHaveCount(12);
  await expect(page.locator('#status')).toHaveText('Loaded 12 / 50 albums');
  await expect(page.locator('[data-af-system-card="create"]')).toHaveCount(1);
  await expect(titleNodes(page)).toHaveCount(12);
  await expect(page.locator('[data-af-album-count]')).toHaveCount(12);
  await expect(page.locator('[data-af-end]')).toBeHidden();

  const markers = await albumCards(page).evaluateAll(cards => cards.map(card => ({
    card: card.getAttribute('data-af-album-card'),
    id: card.getAttribute('data-af-album-id'),
    title: card.querySelector('[data-af-album-title]')?.getAttribute('data-af-album-title'),
    count: card.querySelector('[data-af-album-count]')?.getAttribute('data-af-album-count'),
  })));
  expect(markers).toEqual(Array.from({ length: 12 }, (_, index) => ({
    card: '1',
    id: String(index + 1),
    title: '1',
    count: '1',
  })));
});

test('uses the seed to generate a deterministic dataset', async ({ page }) => {
  await preparePlayground(page, { total: 24, batch: 24 });
  await page.getByLabel('Random seed', { exact: true }).fill('contract-seed');
  await page.getByRole('button', { name: 'Generate list', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(24);
  const first = await titleNodes(page).allTextContents();

  await page.getByRole('button', { name: 'Generate list', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(24);
  expect(await titleNodes(page).allTextContents()).toEqual(first);

  await page.getByLabel('Random seed', { exact: true }).fill('different-contract-seed');
  await page.getByRole('button', { name: 'Generate list', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(24);
  expect(await titleNodes(page).allTextContents()).not.toEqual(first);
});

test('manual loading appends batches and exposes the explicit end marker', async ({ page }) => {
  await preparePlayground(page, { total: 30, batch: 12 });
  const loadNext = page.getByRole('button', { name: 'Load next batch', exact: true });

  await loadNext.click();
  await expect(page.locator('[data-af-loading]')).toBeVisible();
  await expect(albumCards(page)).toHaveCount(24);
  await expect(page.locator('#status')).toHaveText('Loaded 24 / 30 albums');
  await expect(page.locator('[data-af-end]')).toBeHidden();

  await loadNext.click();
  await expect(albumCards(page)).toHaveCount(30);
  await expect(page.locator('#status')).toHaveText('Complete • Loaded 30 / 30 albums');
  await expect(page.locator('[data-af-end]')).toBeVisible();
});

test('Auto-load advances by batches and stops at completion', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await preparePlayground(page, { total: 30, batch: 10, delay: 300 });
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const autoLoad = page.locator('#auto-load');

  await autoLoad.click();
  await expect(autoLoad).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-af-loading]')).toBeVisible();
  await page.clock.runFor(300);
  await expect(albumCards(page)).toHaveCount(20);

  await page.clock.runFor(120);
  await expect(page.locator('[data-af-loading]')).toBeVisible();
  await page.clock.runFor(300);
  await expect(albumCards(page)).toHaveCount(30);
  await expect(page.locator('[data-af-end]')).toBeVisible();
  await expect(autoLoad).toHaveAttribute('aria-pressed', 'false');
  await expect(autoLoad).toHaveText('Auto-load all');
});

test('Stop prevents later Auto-load scheduling but allows the in-flight batch to finish', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await preparePlayground(page, { total: 40, batch: 10, delay: 500 });
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const autoLoad = page.locator('#auto-load');

  await autoLoad.click();
  await expect(page.locator('[data-af-loading]')).toBeVisible();
  await expect(albumCards(page)).toHaveCount(10);
  await autoLoad.click();
  await expect(autoLoad).toHaveAttribute('aria-pressed', 'false');

  await page.clock.runFor(500);
  await expect(albumCards(page)).toHaveCount(20);
  await expect(page.locator('[data-af-loading]')).toBeHidden();
  await page.clock.runFor(2000);
  await expect(albumCards(page)).toHaveCount(20);
  await expect(page.locator('[data-af-end]')).toBeHidden();
});

test('Generate list replaces the dataset and resets loading state', async ({ page }) => {
  await preparePlayground(page, { total: 24, batch: 12 });
  await page.getByRole('button', { name: 'Load next batch', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(24);
  await expect(page.locator('[data-af-end]')).toBeVisible();
  const oldCard = await albumCards(page).first().elementHandle();
  const oldTitles = await titleNodes(page).allTextContents();

  await page.getByLabel('Total albums', { exact: true }).fill('30');
  await page.getByLabel('Batch size', { exact: true }).fill('6');
  await page.getByLabel('Random seed', { exact: true }).fill('replacement-contract-seed');
  await page.getByRole('button', { name: 'Generate list', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(6);

  expect(await oldCard!.evaluate(card => card.isConnected)).toBe(false);
  await oldCard!.dispose();
  expect(await titleNodes(page).allTextContents()).not.toEqual(oldTitles.slice(0, 6));
  await expect(page.locator('[data-af-end]')).toBeHidden();
  await expect(page.locator('#auto-load')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#status')).toHaveText('Loaded 6 / 30 albums');
});

for (const { viewport, expected } of [
  { viewport: { width: 1280, height: 900 }, expected: 7 },
  { viewport: { width: 390, height: 844 }, expected: 2 },
]) {
  test(`applies configured columns at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await preparePlayground(page, { total: 20, batch: 20 });
    await page.getByLabel('Desktop columns', { exact: true }).fill('7');
    await page.getByRole('button', { name: 'Generate list', exact: true }).click();
    await expect(albumCards(page)).toHaveCount(20);

    expect(await columnCount(page)).toBe(expected);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
